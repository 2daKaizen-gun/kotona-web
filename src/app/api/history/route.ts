import { NextResponse } from "next/server";
import { getHistory, BackendError } from "@/lib/backend";
import { toNumber } from "@/lib/request-params";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // 백엔드가 상한(100)과 하한을 다시 걸어 주므로 여기서는 숫자로만 만들어 넘긴다.
  const page = toNumber(params.get("page"), 0);
  const size = toNumber(params.get("size"), 20);

  try {
    return NextResponse.json(await getHistory(page, size));
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "이력을 불러오지 못했습니다." }, { status: 500 });
  }
}
