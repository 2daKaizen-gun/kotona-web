import { NextResponse } from "next/server";
import { analyze, BackendError, isRelationshipType, RELATIONSHIP_TYPES } from "@/lib/backend";

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

  // 관계를 비워 두는 것은 허용한다 — 백엔드가 사내로 본다. 다만 모르는 값을 사내로
  // 바꿔치기하지는 않는다. 묻지 않은 맥락의 점수를 돌려주느니 무엇이 잘못됐는지 말하는 편이 낫다.
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
