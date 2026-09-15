import { NextResponse } from "next/server";
import { getPhrases, createPhrase, BackendError, type PhraseRequest } from "@/lib/backend";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const situation = params.get("situation")?.trim();

  // 백엔드가 상한(100)과 하한을 다시 걸어 주므로 여기서는 숫자로만 만들어 넘긴다.
  const page = toNumber(params.get("page"), 0);
  const size = toNumber(params.get("size"), 20);

  try {
    return NextResponse.json(await getPhrases(situation || undefined, page, size));
  } catch (error) {
    return toErrorResponse(error, "숙어를 불러오지 못했습니다.");
  }
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

function toNumber(raw: string | null, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
