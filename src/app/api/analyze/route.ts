import { NextResponse } from "next/server";
import { analyze, BackendError, type RelationshipType } from "@/lib/backend";

const RELATIONSHIP_TYPES: RelationshipType[] = ["INTERNAL", "EXTERNAL", "INTERVIEW"];

/** 백엔드 분석은 25초 안팎이라 기본 실행시간으로는 모자란다. */
export const maxDuration = 120;

export async function POST(request: Request) {
  let payload: { text?: unknown; relationshipType?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON 이 아닙니다." }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "분석할 문장을 입력해 주세요." }, { status: 400 });
  }

  // 백엔드도 검증하지만, 잘못된 값으로 왕복 25초를 쓰는 건 낭비다.
  const relationshipType = RELATIONSHIP_TYPES.includes(payload.relationshipType as RelationshipType)
    ? (payload.relationshipType as RelationshipType)
    : "INTERNAL";

  try {
    return NextResponse.json(await analyze(text, relationshipType));
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof BackendError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("분석 요청 처리 실패", error);
  return NextResponse.json({ error: "알 수 없는 오류가 발생했습니다." }, { status: 500 });
}
