import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ANALYZE_TEXT_MAX, MEANING_MAX, PHRASE_MAX, USAGE_EXAMPLE_MAX } from "@/lib/limits";

/**
 * 폼의 한도가 백엔드의 한도와 같은지. 어긋나면 둘 중 하나가 일어난다 —
 * 화면이 더 넉넉하면 사용자는 다 쓰고 나서 거절당하고, 더 빡빡하면 백엔드가
 * 받아 줄 문장을 화면이 막는다. 둘 다 조용히 일어난다.
 */
describe("입력 한도", () => {
  const schemas = JSON.parse(
    readFileSync(resolve(process.cwd(), "openapi/kotona-api.json"), "utf-8"),
  ).components.schemas;

  const maxLengthOf = (schema: string, field: string) =>
    schemas[schema].properties[field].maxLength as number;

  it("분석 문장 한도가 백엔드와 같다", () => {
    expect(ANALYZE_TEXT_MAX).toBe(maxLengthOf("AnalyzeRequestDTO", "text"));
  });

  it("사전 필드 한도가 백엔드와 같다", () => {
    expect(PHRASE_MAX).toBe(maxLengthOf("PhraseRequestDTO", "phrase"));
    expect(MEANING_MAX).toBe(maxLengthOf("PhraseRequestDTO", "meaning"));
    expect(USAGE_EXAMPLE_MAX).toBe(maxLengthOf("PhraseRequestDTO", "usageExample"));
  });
});
