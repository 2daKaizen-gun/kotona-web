import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
