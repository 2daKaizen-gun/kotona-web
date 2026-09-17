import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhraseForm from "@/components/PhraseForm";
import type { PhraseRequest } from "@/lib/backend";
import { DEMO_PHRASES } from "@/lib/demo-data";

/**
 * 폼은 사용자가 입력한 것을 백엔드가 받을 모양으로 바꾼다. 공백을 걷어내고,
 * 비워 둔 선택 항목을 빈 문자열이 아니라 "없음" 으로 보낸다.
 * 백엔드 검증은 빈 문자열을 값으로 보므로, 이 둘이 어긋나면 400 이 난다.
 */
describe("PhraseForm", () => {
  function setup(onSubmit = vi.fn<(r: PhraseRequest) => Promise<string | null>>().mockResolvedValue(null)) {
    const onCancel = vi.fn();
    render(<PhraseForm onSubmit={onSubmit} onCancel={onCancel} />);
    return { onSubmit, onCancel };
  }

  const phraseInput = () => screen.getByLabelText(/표현/);
  const meaningInput = () => screen.getByLabelText(/뜻/);
  const saveButton = () => screen.getByRole("button", { name: /저장/ });

  it("표현과 뜻을 채우기 전에는 저장할 수 없다", async () => {
    setup();
    expect(saveButton()).toBeDisabled();

    await userEvent.type(phraseInput(), "承知しました");
    expect(saveButton()).toBeDisabled();

    await userEvent.type(meaningInput(), "알겠습니다");
    expect(saveButton()).toBeEnabled();
  });

  it("공백만 넣어서는 저장할 수 없다", async () => {
    // 브라우저의 required 는 공백만 있어도 통과시킨다
    setup();
    await userEvent.type(phraseInput(), "   ");
    await userEvent.type(meaningInput(), "   ");

    expect(saveButton()).toBeDisabled();
  });

  it("앞뒤 공백을 걷어내고 보낸다", async () => {
    // 백엔드는 공백까지 포함해 중복을 판정한다. 안 걷으면 같은 표현이 둘 등록된다.
    const { onSubmit } = setup();
    await userEvent.type(phraseInput(), "  承知しました  ");
    await userEvent.type(meaningInput(), "  알겠습니다 ");
    await userEvent.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ phrase: "承知しました", meaning: "알겠습니다" }),
    );
  });

  it("비워 둔 선택 항목은 빈 문자열이 아니라 없음으로 보낸다", async () => {
    // 빈 문자열은 JSON 에 그대로 실리고, 백엔드 enum 역직렬화가 400 을 낸다
    const { onSubmit } = setup();
    await userEvent.type(phraseInput(), "承知しました");
    await userEvent.type(meaningInput(), "알겠습니다");
    await userEvent.selectOptions(screen.getByLabelText(/정중도/), "");
    await userEvent.click(saveButton());

    const request = onSubmit.mock.calls[0][0];
    expect(request.situation).toBeUndefined();
    expect(request.politenessLevel).toBeUndefined();
    expect(request.usageExample).toBeUndefined();
  });

  it("공백만 있는 예문도 없음으로 보낸다", async () => {
    const { onSubmit } = setup();
    await userEvent.type(phraseInput(), "承知しました");
    await userEvent.type(meaningInput(), "알겠습니다");
    await userEvent.type(screen.getByLabelText(/예문/), "   ");
    await userEvent.click(saveButton());

    expect(onSubmit.mock.calls[0][0].usageExample).toBeUndefined();
  });

  it("고른 상황과 정중도를 그대로 보낸다", async () => {
    const { onSubmit } = setup();
    await userEvent.type(phraseInput(), "承知しました");
    await userEvent.type(meaningInput(), "알겠습니다");
    await userEvent.selectOptions(screen.getByLabelText(/상황/), "EMAIL");
    await userEvent.selectOptions(screen.getByLabelText(/정중도/), "5");
    await userEvent.click(saveButton());

    // 정중도는 숫자여야 한다. 문자열 "5" 가 가면 백엔드가 거절한다.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ situation: "EMAIL", politenessLevel: 5 });
  });

  it("수정할 때는 기존 값을 채워서 연다", () => {
    const existing = DEMO_PHRASES[0];
    render(<PhraseForm initial={existing} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("표현 수정")).toBeInTheDocument();
    expect(phraseInput()).toHaveValue(existing.phrase);
    expect(meaningInput()).toHaveValue(existing.meaning);
  });

  it("실패 문구를 보여 주고 다시 저장할 수 있게 둔다", async () => {
    const onSubmit = vi.fn().mockResolvedValue("이미 등록된 표현입니다: 承知しました");
    setup(onSubmit);
    await userEvent.type(phraseInput(), "承知しました");
    await userEvent.type(meaningInput(), "알겠습니다");
    await userEvent.click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("이미 등록된 표현입니다");
    // 입력이 그대로 남아 있어야 고쳐서 다시 보낼 수 있다
    expect(phraseInput()).toHaveValue("承知しました");
    expect(saveButton()).toBeEnabled();
  });

  it("저장 중에는 한 번 더 보내지 않는다", async () => {
    // 느린 응답에 버튼을 연타하면 같은 표현이 두 번 들어가고, 두 번째는 409 가 된다
    let finish: (value: string | null) => void = () => {};
    const onSubmit = vi.fn(() => new Promise<string | null>((resolve) => (finish = resolve)));
    setup(onSubmit);
    await userEvent.type(phraseInput(), "承知しました");
    await userEvent.type(meaningInput(), "알겠습니다");

    await userEvent.click(saveButton());
    await userEvent.click(saveButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(saveButton()).toHaveTextContent("저장 중");
    finish("오류");
  });

  it("저장이 예외로 끝나도 폼이 멈추지 않는다", async () => {
    // onSubmit 은 문구를 돌려주기로 약속했지만, 약속을 어기고 던지는 호출자도 있다.
    // 그때 "저장 중…" 에 갇히면 폼을 닫는 것 말고는 방법이 없다.
    const onSubmit = vi.fn().mockRejectedValue(new Error("network down"));
    setup(onSubmit);
    await userEvent.type(phraseInput(), "承知しました");
    await userEvent.type(meaningInput(), "알겠습니다");
    await userEvent.click(saveButton());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeEnabled());
  });

  it("취소를 누르면 부모에게 알린다", async () => {
    const { onCancel } = setup();

    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
