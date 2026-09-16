import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhraseDictionary from "@/components/PhraseDictionary";
import { DEMO_PHRASES } from "@/lib/demo-data";

/**
 * 사전 화면은 필터를 서버에 묻는다. 예전에는 전체를 받아 화면에서 걸렀지만,
 * 사용자가 표현을 추가할 수 있게 된 뒤로 그 전제가 성립하지 않는다.
 */
describe("PhraseDictionary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function pageOf(rows: typeof DEMO_PHRASES, hasNext = false) {
    return {
      content: rows,
      page: 0,
      size: 20,
      totalElements: rows.length,
      totalPages: 1,
      hasNext,
    };
  }

  /** situation 쿼리에 따라 걸러서 응답한다 — 실제 백엔드와 같은 방식. */
  function routeFetch(options: { writeOk?: boolean; writeError?: string } = {}) {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input), "http://localhost");

      if (init?.method && init.method !== "GET") {
        return {
          ok: options.writeOk ?? true,
          status: options.writeOk === false ? 409 : 200,
          json: async () => (options.writeError ? { error: options.writeError } : DEMO_PHRASES[0]),
        } as Response;
      }

      const situation = url.searchParams.get("situation");
      const rows = situation
        ? DEMO_PHRASES.filter((phrase) => phrase.situation === situation)
        : DEMO_PHRASES;
      return { ok: true, status: 200, json: async () => pageOf(rows) } as Response;
    });
  }

  it("표현과 뜻을 보여 준다", async () => {
    routeFetch();
    render(<PhraseDictionary />);

    expect(await screen.findByText("承知いたしました")).toBeInTheDocument();
    expect(screen.getByText(/전체 7건 중 7건 표시/)).toBeInTheDocument();
  });

  it("상황을 고르면 서버에 다시 묻는다", async () => {
    // 받아 온 것만 화면에서 거르면, 다음 페이지에 있는 표현이 통째로 빠진다
    routeFetch();
    render(<PhraseDictionary />);
    await screen.findByText("承知いたしました");

    await userEvent.click(screen.getByRole("button", { name: "쿠션어" }));

    await waitFor(() =>
      expect(
        vi.mocked(fetch).mock.calls.some((call) => String(call[0]).includes("situation=CUSHION")),
      ).toBe(true),
    );
    expect(await screen.findByText("恐縮でございますが")).toBeInTheDocument();
  });

  it("필터를 건 상태의 건수를 보여 준다", async () => {
    routeFetch();
    render(<PhraseDictionary />);
    await screen.findByText("承知いたしました");

    await userEvent.click(screen.getByRole("button", { name: "쿠션어" }));

    expect(await screen.findByText(/쿠션어 1건 중 1건 표시/)).toBeInTheDocument();
  });

  it("해당 상황에 표현이 없으면 그렇다고 말한다", async () => {
    routeFetch();
    render(<PhraseDictionary />);
    await screen.findByText("承知いたしました");

    await userEvent.click(screen.getByRole("button", { name: "면접" }));

    expect(await screen.findByText(/등록된 표현이 없습니다/)).toBeInTheDocument();
  });

  it("추가 폼은 버튼을 눌러야 열린다", async () => {
    routeFetch();
    render(<PhraseDictionary />);
    await screen.findByText("承知いたしました");

    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+ 표현 추가" }));

    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("백엔드가 준 409 문구를 폼에 그대로 보여 준다", async () => {
    // "저장 실패" 로 덮으면 왜 안 됐는지(이미 있는 표현) 를 알 수 없다
    routeFetch({ writeOk: false, writeError: "이미 등록된 표현입니다: 承知いたしました" });
    render(<PhraseDictionary />);
    await screen.findByText("承知いたしました");

    await userEvent.click(screen.getByRole("button", { name: "+ 표현 추가" }));
    await userEvent.type(screen.getByLabelText(/표현/), "承知いたしました");
    await userEvent.type(screen.getByLabelText(/뜻/), "알겠습니다");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText(/이미 등록된 표현입니다/)).toBeInTheDocument();
  });

  it("저장에 실패하면 폼을 닫지 않는다", async () => {
    // 닫아 버리면 사용자가 입력한 내용이 사라진다
    routeFetch({ writeOk: false, writeError: "이미 등록된 표현입니다" });
    render(<PhraseDictionary />);
    await screen.findByText("承知いたしました");

    await userEvent.click(screen.getByRole("button", { name: "+ 표현 추가" }));
    await userEvent.type(screen.getByLabelText(/표현/), "テスト");
    await userEvent.type(screen.getByLabelText(/뜻/), "테스트");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await screen.findByText(/이미 등록된 표현입니다/);
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("다음 페이지가 있을 때만 더 보기를 보여 준다", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...pageOf([DEMO_PHRASES[0]]), totalElements: 7, hasNext: true }),
    } as Response);
    render(<PhraseDictionary />);

    expect(await screen.findByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });

  it("목록을 못 불러오면 알린다", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "백엔드에 연결할 수 없습니다." }),
    } as Response);
    render(<PhraseDictionary />);

    expect(await screen.findByRole("alert")).toHaveTextContent("연결할 수 없습니다");
  });
});
