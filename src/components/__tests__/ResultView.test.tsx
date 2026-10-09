import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultView from "@/components/ResultView";
import type { NuanceResponse } from "@/lib/backend";
import { pickDemoAnalysis } from "@/lib/demo-data";

/**
 * 결과 화면은 분석 응답을 그대로 그린다. 생성된 타입에서 모든 필드가 선택이라
 * 일부만 담긴 응답도 타입상 합법이다 — 화면이 그걸 견디는지가 핵심이다.
 */
describe("ResultView", () => {
  const full = pickDemoAnalysis("検討させていただきます");

  it("점수와 리스크 등급을 보여 준다", () => {
    render(<ResultView result={full} />);

    expect(screen.getByText("73")).toBeInTheDocument();
    expect(screen.getByText(/리스크 주의/)).toBeInTheDocument();
  });

  it("지표를 배점과 함께 보여 준다", () => {
    // 35/40 을 35 로만 쓰면 얼마나 좋은 점수인지 알 수 없다
    render(<ResultView result={full} />);

    expect(screen.getByText("35 / 40")).toBeInTheDocument();
    expect(screen.getByText("23 / 30")).toBeInTheDocument();
  });

  it("本音과 建前를 나란히 보여 준다", () => {
    render(<ResultView result={full} />);

    expect(screen.getByText(/建前 — 표면적 의미/)).toBeInTheDocument();
    expect(screen.getByText(/本音 — 숨겨진 의도/)).toBeInTheDocument();
    expect(screen.getByText(full.sentiment!.honne!.trueIntent!)).toBeInTheDocument();
  });

  it("추천 답장을 전부 보여 준다", () => {
    render(<ResultView result={full} />);

    for (const reply of full.smartReplies!) {
      expect(screen.getByText(reply.content!)).toBeInTheDocument();
    }
  });

  it("예시일 때만 샘플 표시를 붙인다", () => {
    // 결과 카드만 잘려 공유돼도 알아볼 수 있어야 한다
    const { unmount } = render(<ResultView result={full} sample />);
    expect(screen.getByText("샘플")).toBeInTheDocument();
    unmount();

    render(<ResultView result={full} />);
    expect(screen.queryByText("샘플")).not.toBeInTheDocument();
  });

  it("필드가 비어 있어도 그린다", () => {
    // 타입상 전부 선택이므로, 모델이 일부만 답해도 화면이 죽으면 안 된다
    const sparse: NuanceResponse = { totalScore: 50 };

    expect(() => render(<ResultView result={sparse} />)).not.toThrow();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("아무것도 없는 응답에도 0 점으로 버틴다", () => {
    expect(() => render(<ResultView result={{}} />)).not.toThrow();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("빈 목록은 섹션째 감춘다", () => {
    // 제목만 있고 내용이 없는 빈 상자를 보여 주지 않는다
    render(<ResultView result={{ totalScore: 50, smartReplies: [], suggestions: [] }} />);

    expect(screen.queryByText("추천 답장")).not.toBeInTheDocument();
    expect(screen.queryByText("개선된 표현")).not.toBeInTheDocument();
  });

  it("모르는 리스크 등급이 와도 안전 쪽으로 그린다", () => {
    // 백엔드가 등급을 늘리면 여기서 undefined 를 읽다 죽을 수 있다
    expect(() =>
      render(<ResultView result={{ totalScore: 50, riskAnalysis: { riskLevel: "UNKNOWN" } }} />),
    ).not.toThrow();
  });

  describe("추천 답장 복사", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** jsdom 에는 클립보드가 없다. 쓰기 결과만 바꿔 끼운다. */
    function stubClipboard(writeText: () => Promise<void>) {
      vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn(writeText) } });
    }

    it("복사를 누르면 답장 본문이 클립보드로 간다", async () => {
      // 답장은 그대로 붙여 넣으라고 만든 것이다. 손으로 옮겨 적으면 오타가 난다.
      stubClipboard(async () => {});
      render(<ResultView result={full} />);

      await userEvent.click(screen.getAllByRole("button", { name: "복사" })[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(full.smartReplies?.[0]?.content);
      expect(await screen.findByRole("button", { name: "복사됨" })).toBeInTheDocument();
    });

    it("클립보드 권한이 없으면 조용히 넘어간다", async () => {
      // 본문은 화면에 그대로 보인다. 여기서 화면이 깨지면 읽을 수도 없게 된다.
      stubClipboard(async () => {
        throw new Error("NotAllowedError");
      });
      render(<ResultView result={full} />);

      await userEvent.click(screen.getAllByRole("button", { name: "복사" })[0]);

      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
      expect(screen.getAllByRole("button", { name: "복사" })[0]).toBeInTheDocument();
      expect(screen.getByText(String(full.smartReplies?.[0]?.content))).toBeInTheDocument();
    });
  });

  describe("점수가 나온 과정", () => {
    const adjusted = {
      ...full,
      scoreAdjustments: [
        { metric: "etiquette", before: "25", after: "15", reason: "쿠션어가 쓰이지 않아 감점했습니다." },
        { metric: "riskLevel", before: "SAFE", after: "DANGER", reason: "거절 신호를 찾았습니다: '어렵다(難しい)' 시그널 감지" },
      ],
    };

    it("규칙이 고친 내역을 항목·전후·이유와 함께 보여 준다", async () => {
      // 73 점이 모델의 판단인지 규칙이 깎은 결과인지 구분할 수 없던 자리다
      render(<ResultView result={adjusted} />);

      await userEvent.click(screen.getByText(/이 점수가 나온 과정/));

      expect(screen.getByText("에티켓")).toBeInTheDocument();
      expect(screen.getByText("25 → 15")).toBeInTheDocument();
      expect(screen.getByText(/쿠션어가 쓰이지 않아/)).toBeInTheDocument();
      expect(screen.getByText("SAFE → DANGER")).toBeInTheDocument();
    });

    it("몇 건이 조정됐는지 펼치기 전에 알려 준다", () => {
      render(<ResultView result={adjusted} />);

      expect(screen.getByText(/2건 조정됨/)).toBeInTheDocument();
    });

    it("규칙이 손대지 않았으면 이 영역을 아예 보여 주지 않는다", () => {
      // 조정이 없는데 "조정 0건" 을 띄우면 읽을 것도 없는 접힘만 늘어난다
      render(<ResultView result={{ ...full, scoreAdjustments: [] }} />);

      expect(screen.queryByText(/이 점수가 나온 과정/)).not.toBeInTheDocument();
    });

    it("규칙이 보는 범위가 한정적이라는 것을 함께 밝힌다", async () => {
      render(<ResultView result={adjusted} />);

      await userEvent.click(screen.getByText(/이 점수가 나온 과정/));

      expect(screen.getByText(/완전하지 않습니다/)).toBeInTheDocument();
    });

    // 규칙의 오경보가 0 건이어도, 등급은 둘 중 더 위험한 쪽이라 AI 가 과하게 읽으면
    // 그 경고가 화면에 그대로 뜬다. 그 사실을 카드에서 빼면 수치가 실제보다 좋게 읽힌다.
    it("등급이 둘 중 더 위험한 쪽이라는 것도 밝힌다", async () => {
      render(<ResultView result={adjusted} />);

      await userEvent.click(screen.getByText(/이 점수가 나온 과정/));

      expect(screen.getByText(/더 위험한 쪽/)).toBeInTheDocument();
      expect(screen.getByText(/그 경고가 그대로 표시됩니다/)).toBeInTheDocument();
    });
  });
});
