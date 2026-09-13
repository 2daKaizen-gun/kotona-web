import { describe, expect, it } from "vitest";
import {
  DEMO_HISTORY,
  DEMO_HISTORY_SUMMARIES,
  DEMO_PHRASES,
  demoHistoryPage,
  findDemoHistory,
  pickDemoAnalysis,
} from "@/lib/demo-data";

/**
 * 예시 데이터는 백엔드 없이 배포된 사이트가 보여 주는 전부다.
 * 여기가 어긋나면 사람들이 보는 화면이 바로 어긋난다.
 */
describe("분석 예시 고르기", () => {
  it("소프트 리젝션 신호가 있으면 그 예시를 고른다", () => {
    const result = pickDemoAnalysis("ご提案の件、社内で検討させていただきます。");

    expect(result.totalScore).toBe(73);
    expect(result.riskAnalysis?.riskLevel).toBe("CAUTION");
  });

  it("정중한 의뢰는 높은 점수 예시를 고른다", () => {
    expect(pickDemoAnalysis("お手数ですが、ご確認いただけますでしょうか。").totalScore).toBe(92);
  });

  it("짧은 반말은 낮은 점수 예시를 고른다", () => {
    expect(pickDemoAnalysis("よろしく").totalScore).toBe(20);
  });

  it("어디에도 걸리지 않는 입력에도 결과를 준다", () => {
    // 화면이 비는 것보다는 예시라도 보이는 편이 낫다. 배너가 예시임을 알린다.
    const result = pickDemoAnalysis("本日の議事録を共有いたします。");

    expect(result.totalScore).toBeDefined();
    expect(result.smartReplies).toHaveLength(3);
  });

  it("입력에 따라 서로 다른 결과가 나온다", () => {
    // 무엇을 넣어도 같은 결과면 고장 난 것처럼 보인다
    const scores = ["検討させていただきます", "よろしく", "お手数ですが"].map(
      (text) => pickDemoAnalysis(text).totalScore,
    );

    expect(new Set(scores).size).toBe(3);
  });

  it("모든 예시가 화면이 그리는 항목을 갖추고 있다", () => {
    // 한 곳이라도 비면 결과 화면에 빈 칸이 생긴다
    for (const text of ["検討", "よろしく", "お手数ですが"]) {
      const result = pickDemoAnalysis(text);

      expect(result.metrics).toBeDefined();
      expect(result.evaluation?.summary).toBeTruthy();
      expect(result.sentiment?.honne?.trueIntent).toBeTruthy();
      expect(result.riskAnalysis?.riskLevel).toBeTruthy();
      expect(result.smartReplies?.length).toBeGreaterThan(0);
      expect(result.suggestions?.length).toBeGreaterThan(0);
    }
  });
});

describe("이력 예시", () => {
  it("목록 요약에는 저장된 분석 결과가 실리지 않는다", () => {
    // 백엔드가 목록에서 뺀 이유와 같다. 예시도 같은 모양이어야 한다.
    for (const summary of DEMO_HISTORY_SUMMARIES) {
      expect(summary).not.toHaveProperty("fullAnalysisJson");
    }
  });

  it("요약과 상세가 같은 값을 가리킨다", () => {
    for (const summary of DEMO_HISTORY_SUMMARIES) {
      const detail = findDemoHistory(summary.id!);

      expect(detail?.userInput).toBe(summary.userInput);
      expect(detail?.totalScore).toBe(summary.totalScore);
      expect(detail?.riskLevel).toBe(summary.riskLevel);
    }
  });

  it("상세에 담긴 JSON 이 실제로 파싱된다", () => {
    // 화면은 이 문자열을 JSON.parse 한다. 깨져 있으면 "읽을 수 없습니다" 가 뜬다.
    for (const record of DEMO_HISTORY) {
      const parsed = JSON.parse(record.fullAnalysisJson!);

      expect(parsed.totalScore).toBe(record.totalScore);
      expect(parsed.riskAnalysis.riskLevel).toBe(record.riskLevel);
    }
  });

  it("최신순으로 정렬되어 있다", () => {
    const dates = DEMO_HISTORY_SUMMARIES.map((row) => Date.parse(row.createdAt!));

    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("없는 id 는 찾지 못한다", () => {
    expect(findDemoHistory(9999)).toBeUndefined();
  });
});

describe("이력 페이지 자르기", () => {
  it("첫 페이지와 다음 페이지가 겹치지 않는다", () => {
    const first = demoHistoryPage(0, 2);
    const second = demoHistoryPage(1, 2);

    expect(first.content).toHaveLength(2);
    expect(first.hasNext).toBe(true);

    const firstIds = first.content!.map((row) => row.id);
    const secondIds = second.content!.map((row) => row.id);
    expect(firstIds.filter((id) => secondIds.includes(id))).toHaveLength(0);
  });

  it("마지막 페이지에서는 다음이 없다고 알린다", () => {
    expect(demoHistoryPage(0, 100).hasNext).toBe(false);
  });

  it("백엔드와 같은 상한·하한을 적용한다", () => {
    // 백엔드는 size 를 1~100 으로 조인다. 예시가 다르게 굴면 화면 동작이 갈린다.
    expect(demoHistoryPage(0, 9999).size).toBe(100);
    expect(demoHistoryPage(0, 0).size).toBe(1);
    expect(demoHistoryPage(-5, 20).page).toBe(0);
  });

  it("전체 건수와 페이지 수가 맞는다", () => {
    const page = demoHistoryPage(0, 2);

    expect(page.totalElements).toBe(DEMO_HISTORY_SUMMARIES.length);
    expect(page.totalPages).toBe(Math.ceil(DEMO_HISTORY_SUMMARIES.length / 2));
  });

  it("범위를 넘는 페이지는 빈 목록을 준다", () => {
    const page = demoHistoryPage(99, 20);

    expect(page.content).toHaveLength(0);
    expect(page.hasNext).toBe(false);
  });
});

describe("숙어 사전 예시", () => {
  it("모든 항목이 사전 화면이 그리는 값을 갖추고 있다", () => {
    for (const phrase of DEMO_PHRASES) {
      expect(phrase.phrase).toBeTruthy();
      expect(phrase.meaning).toBeTruthy();
      expect(phrase.situation).toBeTruthy();
      expect(phrase.usageExample).toBeTruthy();
      expect(phrase.politenessLevel).toBeGreaterThanOrEqual(1);
      expect(phrase.politenessLevel).toBeLessThanOrEqual(5);
    }
  });

  it("id 가 겹치지 않는다", () => {
    // 화면이 id 를 key 로 쓴다
    const ids = DEMO_PHRASES.map((phrase) => phrase.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
