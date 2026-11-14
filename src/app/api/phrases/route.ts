import { NextResponse } from "next/server";
import { getPhrases, createPhrase, BackendError, type PhraseCursor, type PhraseRequest } from "@/lib/backend";
import { toId, toNumber } from "@/lib/request-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const situation = params.get("situation")?.trim();

  // 범위는 백엔드가 맞춘다
  const page = toNumber(params.get("page"), 0);
  const size = toNumber(params.get("size"), 20);

  // "더 보기" 커서. 형식이 틀리면 여기서 400
  const cursor = cursorFrom(params);
  if (cursor === null) {
    return NextResponse.json({ error: "잘못된 커서입니다." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getPhrases(situation || undefined, page, size, cursor));
  } catch (error) {
    return toErrorResponse(error, "숙어를 불러오지 못했습니다.");
  }
}

/** 커서 없으면 undefined, 형식이 틀리면 null. 정중도는 1~5 이고 없을 수 있다. */
function cursorFrom(params: URLSearchParams): PhraseCursor | undefined | null {
  const rawId = params.get("afterId");
  const rawLevel = params.get("afterLevel");
  if (rawId === null || rawId === "") {
    return rawLevel === null || rawLevel === "" ? undefined : null;
  }
  const afterId = toId(rawId);
  if (afterId === null) return null;
  if (rawLevel === null || rawLevel === "") return { afterId };
  const afterLevel = toId(rawLevel);
  return afterLevel === null || afterLevel > 5 ? null : { afterId, afterLevel };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON 이 아닙니다." }, { status: 400 });
  }

  // 필드 검증은 백엔드가 한다
  try {
    return NextResponse.json(await createPhrase(payload as PhraseRequest), { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "숙어를 등록하지 못했습니다.");
  }
}

function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof BackendError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
