import { NextResponse } from "next/server";
import { analyze, BackendError, isRelationshipType, RELATIONSHIP_TYPES } from "@/lib/backend";
import { ANALYZE_TEXT_MAX } from "@/lib/limits";
import { clientIpOf } from "@/lib/request-params";

/** 분석이 25초 안팎이라 기본 실행 시간으로는 부족하다. */
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
  if (text.length > ANALYZE_TEXT_MAX) {
    return NextResponse.json(
      { error: `분석할 문장은 ${ANALYZE_TEXT_MAX}자 이하여야 합니다.` },
      { status: 400 },
    );
  }

  // 비어 있으면 사내로 보내고, 모르는 값은 400 으로 거절한다.
  const raw = payload.relationshipType;
  const given = raw === undefined || raw === null || raw === "";
  if (!given && !isRelationshipType(raw)) {
    return NextResponse.json(
      { error: `relationshipType 은(는) 다음 중 하나여야 합니다: ${RELATIONSHIP_TYPES.join(", ")}` },
      { status: 400 },
    );
  }
  const relationshipType = given ? "INTERNAL" : raw;

  try {
    // 사용자별 요청 제한을 위해 IP 를 넘긴다
    return NextResponse.json(await analyze(text, relationshipType, clientIpOf(request)));
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
