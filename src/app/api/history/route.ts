import { NextResponse } from "next/server";
import { getHistory, BackendError } from "@/lib/backend";
import { toId, toNumber } from "@/lib/request-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // 범위는 백엔드가 맞춘다
  const page = toNumber(params.get("page"), 0);
  const size = toNumber(params.get("size"), 20);

  // "더 보기" 커서. id 가 아니면 여기서 400
  const rawBefore = params.get("before");
  const before = rawBefore === null || rawBefore === "" ? undefined : toId(rawBefore);
  if (before === null) {
    return NextResponse.json({ error: "잘못된 커서입니다." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getHistory(page, size, before));
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "이력을 불러오지 못했습니다." }, { status: 500 });
  }
}
