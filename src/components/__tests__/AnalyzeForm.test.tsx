import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnalyzeForm from "@/components/AnalyzeForm";
import { ANALYZE_TEXT_MAX } from "@/lib/limits";
import { pickDemoAnalysis } from "@/lib/demo-data";

/**
 * 분석 화면은 25초 넘게 걸리는 요청 하나를 중심으로 돈다.
 * 그 사이 사용자가 보는 것과, 실패했을 때 무엇을 읽게 되는지를 본다.
 */
describe("AnalyzeForm", () => {
  const result = pickDemoAnalysis("検討させていただきます");

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respondWith(body: unknown, ok = true, status = 200) {
    vi.mocked(fetch).mockResolvedValue({
      ok,
      status,
      json: async () => body,
    } as Response);
  }

  it("입력이 비어 있으면 분석할 수 없다", () => {
    render(<AnalyzeForm />);

    expect(screen.getByRole("button", { name: "분석하기" })).toBeDisabled();
  });

  it("공백만 입력해도 분석할 수 없다", async () => {
    // 공백만 보내면 백엔드가 400 을 주지만, 왕복할 이유가 없다
    render(<AnalyzeForm />);
    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "   ");

    expect(screen.getByRole("button", { name: "분석하기" })).toBeDisabled();
  });

  it("예시 버튼을 누르면 입력란이 채워진다", async () => {
    render(<AnalyzeForm />);

    await userEvent.click(screen.getByRole("button", { name: /ご提案の件/ }));

    expect(screen.getByLabelText("분석할 일본어 문장")).toHaveValue(
      "ご提案の件、社内で検討させていただきます。",
    );
  });

  it("관계를 고른 대로 함께 보낸다", async () => {
    // 관계가 리스크 가중치를 바꾼다. 안 보내면 늘 사내 기준으로 판정된다.
    respondWith(result);
    render(<AnalyzeForm />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByText("면접"));
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.relationshipType).toBe("INTERVIEW");
    expect(body.text).toBe("検討します");
  });

  it("결과가 오면 점수를 보여 준다", async () => {
    respondWith(result);
    render(<AnalyzeForm />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    expect(await screen.findByText("73")).toBeInTheDocument();
  });

  it("백엔드가 준 오류 문구를 그대로 읽힌다", async () => {
    // 일반 문구로 덮으면 "왜 안 되는지" 를 알려 주는 400·429 가 쓸모없어진다
    respondWith({ error: "AI API 호출 한도를 초과했습니다. 잠시 후 다시 시도하세요." }, false, 429);
    render(<AnalyzeForm />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("한도를 초과했습니다");
  });

  it("오류 본문이 비어 있어도 무언가는 말한다", async () => {
    respondWith({}, false, 500);
    render(<AnalyzeForm />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("분석에 실패했습니다");
  });

  it("네트워크가 끊겨도 화면이 멈추지 않는다", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    render(<AnalyzeForm />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("네트워크 오류");
    // 버튼이 "분석 중…" 에 멈춰 있으면 다시 시도할 수 없다
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "분석하기" })).toBeInTheDocument(),
    );
  });

  it("실패한 뒤 다시 시도하면 앞선 오류가 사라진다", async () => {
    respondWith({ error: "일시적인 문제" }, false, 502);
    render(<AnalyzeForm />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    respondWith(result);
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("예시 모드에서는 결과에 샘플 표시가 붙는다", async () => {
    respondWith(result);
    render(<AnalyzeForm demo />);

    await userEvent.type(screen.getByLabelText("분석할 일본어 문장"), "検討します");
    await userEvent.click(screen.getByRole("button", { name: "분석하기" }));

    expect(await screen.findByText("샘플")).toBeInTheDocument();
  });

  describe("길이 한도", () => {
    // 2,000 자를 한 글자씩 치면 느리다. 붙여넣기처럼 한 번에 넣는다.
    function paste(value: string) {
      fireEvent.change(screen.getByLabelText("분석할 일본어 문장"), { target: { value } });
    }

    it("몇 자를 썼는지 보여 준다", () => {
      render(<AnalyzeForm />);

      paste("検討します");

      expect(screen.getByText(`5 / ${ANALYZE_TEXT_MAX.toLocaleString()}`)).toBeInTheDocument();
    });

    it("한도까지는 분석할 수 있다", () => {
      render(<AnalyzeForm />);

      paste("あ".repeat(ANALYZE_TEXT_MAX));

      expect(screen.getByRole("button", { name: "분석하기" })).toBeEnabled();
    });

    it("넘으면 요청을 보내지 않고 얼마나 줄여야 하는지 말한다", async () => {
      // 25초를 기다린 뒤에 거절당하지 않게 화면에서 먼저 막는다
      render(<AnalyzeForm />);

      paste("あ".repeat(ANALYZE_TEXT_MAX + 3));

      expect(screen.getByRole("button", { name: "분석하기" })).toBeDisabled();
      expect(screen.getByText(/3자를 줄여 주세요/)).toBeInTheDocument();
      expect(screen.getByLabelText("분석할 일본어 문장")).toHaveAttribute("aria-invalid", "true");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("붙여넣은 글을 잘라내지 않는다", () => {
      // maxLength 였다면 브라우저가 뒷부분을 말없이 버리고, 잘린 문장이 분석됐다
      render(<AnalyzeForm />);
      const long = "あ".repeat(ANALYZE_TEXT_MAX + 100);

      paste(long);

      expect(screen.getByLabelText("분석할 일본어 문장")).toHaveValue(long);
    });

    it("앞뒤 공백은 세지 않는다", () => {
      // 백엔드가 세는 것은 공백을 걷어낸 문장이다
      render(<AnalyzeForm />);

      paste(`  ${"あ".repeat(ANALYZE_TEXT_MAX)}  `);

      expect(screen.getByRole("button", { name: "분석하기" })).toBeEnabled();
    });
  });
});
