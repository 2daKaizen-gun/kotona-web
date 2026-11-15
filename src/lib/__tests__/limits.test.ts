import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ANALYZE_TEXT_MAX, MEANING_MAX, PHRASE_MAX, USAGE_EXAMPLE_MAX } from "@/lib/limits";

/** 폼 한도가 백엔드(OpenAPI 스펙)와 같은지. */
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
