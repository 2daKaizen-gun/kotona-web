import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryList from "@/components/HistoryList";
import { DEMO_HISTORY, DEMO_HISTORY_SUMMARIES } from "@/lib/demo-data";

/**
 * 이력 화면은 목록과 상세가 따로 온다. 목록에는 저장된 분석 결과가 실려 있지 않고,
 * 행을 펼칠 때 그 행만 따로 가져온다 — 그 순서가 어긋나면 화면이 빈다.
 */
describe("HistoryList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 경로에 따라 목록·상세·삭제를 나눠 응답한다. */
  function routeFetch(overrides: { list?: unknown; detail?: unknown; deleteOk?: boolean } = {}) {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "DELETE") {
        return { ok: overrides.deleteOk ?? true, status: 204, json: async () => ({}) } as Response;
      }
      if (/\/api\/history\/\d+/.test(url)) {
        return {
          ok: true,
          status: 200,
          json: async () => overrides.detail ?? DEMO_HISTORY[0],
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () =>
          overrides.list ?? {
            content: DEMO_HISTORY_SUMMARIES,
            page: 0,
            size: 20,
            totalElements: DEMO_HISTORY_SUMMARIES.length,
            totalPages: 1,
            hasNext: false,
          },
      } as Response;
    });
  }

  it("목록을 최신순으로 보여 준다", async () => {
    routeFetch();
    render(<HistoryList />);

    expect(await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!)).toBeInTheDocument();
    expect(screen.getByText(/전체 3건 중 3건 표시/)).toBeInTheDocument();
  });

  it("이력이 없으면 분석하러 가라고 안내한다", async () => {
    routeFetch({ list: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false } });
    render(<HistoryList />);

    expect(await screen.findByText(/아직 분석 이력이 없습니다/)).toBeInTheDocument();
  });

  it("펼치기 전에는 상세를 부르지 않는다", async () => {
    // 대부분의 행은 펼쳐지지 않는다. 미리 받으면 목록을 나눈 의미가 없다.
    routeFetch();
    render(<HistoryList />);
    await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!);

    const detailCalls = vi.mocked(fetch).mock.calls.filter((call) =>
      /\/api\/history\/\d+/.test(String(call[0])),
    );
    expect(detailCalls).toHaveLength(0);
  });

  it("행을 펼치면 그 행의 분석 결과를 가져와 보여 준다", async () => {
    routeFetch();
    render(<HistoryList />);

    await userEvent.click(await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!));

    // 저장된 JSON 안의 값이 화면에 나와야 한다
    expect(await screen.findByText("73")).toBeInTheDocument();
  });

  it("접었다 다시 펴도 상세를 다시 부르지 않는다", async () => {
    routeFetch();
    render(<HistoryList />);
    const row = await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!);

    await userEvent.click(row);
    await screen.findByText("73");
    await userEvent.click(row);
    await userEvent.click(row);

    const detailCalls = vi.mocked(fetch).mock.calls.filter((call) =>
      /\/api\/history\/\d+/.test(String(call[0])),
    );
    expect(detailCalls).toHaveLength(1);
  });

  it("상세를 못 읽으면 그렇다고 말한다", async () => {
    // 조용히 빈칸을 보여 주면 분석 결과가 없는 것처럼 보인다
    routeFetch({ detail: { fullAnalysisJson: "이건 JSON 이 아니다" } });
    render(<HistoryList />);

    await userEvent.click(await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!));

    expect(await screen.findByText(/읽을 수 없습니다/)).toBeInTheDocument();
  });

  it("삭제는 한 번 더 눌러야 한다", async () => {
    // 첫 클릭에 지워지면 실수로 이력을 날린다
    routeFetch();
    render(<HistoryList />);
    await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!);

    await userEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    expect(screen.getByRole("button", { name: "삭제 확인" })).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter((c) => c[1]?.method === "DELETE")).toHaveLength(0);
  });

  it("확인하면 목록에서 사라지고 건수도 줄어든다", async () => {
    routeFetch();
    render(<HistoryList />);
    const target = DEMO_HISTORY_SUMMARIES[0].userInput!;
    await screen.findByText(target);

    await userEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "삭제 확인" }));

    await waitFor(() => expect(screen.queryByText(target)).not.toBeInTheDocument());
    expect(screen.getByText(/전체 2건 중 2건 표시/)).toBeInTheDocument();
  });

  it("삭제가 실패하면 목록을 그대로 두고 알린다", async () => {
    // 낙관적으로 지워 버리면 실패했는데 사라진 것처럼 보인다
    routeFetch({ deleteOk: false });
    render(<HistoryList />);
    const target = DEMO_HISTORY_SUMMARIES[0].userInput!;
    await screen.findByText(target);

    await userEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(target)).toBeInTheDocument();
  });

  it("다음 페이지가 있을 때만 더 보기를 보여 준다", async () => {
    routeFetch();
    const { unmount } = render(<HistoryList />);
    await screen.findByText(DEMO_HISTORY_SUMMARIES[0].userInput!);
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
    unmount();

    routeFetch({
      list: {
        content: [DEMO_HISTORY_SUMMARIES[0]],
        page: 0,
        size: 1,
        totalElements: 3,
        totalPages: 3,
        hasNext: true,
      },
    });
    render(<HistoryList />);

    expect(await screen.findByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });
});
