import { NextResponse } from "next/server";
import { getHistory, BackendError } from "@/lib/backend";

export async function GET() {
  try {
    return NextResponse.json(await getHistory());
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "이력을 불러오지 못했습니다." }, { status: 500 });
  }
}
