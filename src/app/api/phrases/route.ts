import { NextResponse } from "next/server";
import { getPhrases, createPhrase, BackendError, type PhraseCursor, type PhraseRequest } from "@/lib/backend";
import { toId, toNumber } from "@/lib/request-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const situation = params.get("situation")?.trim();

  // 백엔드가 상한(100)과 하한을 다시 걸어 주므로 여기서는 숫자로만 만들어 넘긴다.
  const page = toNumber(params.get("page"), 0);
  const size = toNumber(params.get("size"), 20);

  // "더 보기" 의 커서. 없으면 첫 페이지이고, 있는데 형식이 틀리면 백엔드까지 갈 이유가 없다.
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

/** 커서가 없으면 undefined, 형식이 틀리면 null. 정중도는 1~5 이고, 없던 행이면 비어 온다. */
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

  // 필드 검증은 백엔드가 맡는다. 왕복이 짧고, 백엔드가 필드별 400·중복 409 문구를 이미 돌려준다.
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
