import { NextResponse } from "next/server";
import { getPhrases, BackendError } from "@/lib/backend";

export async function GET(request: Request) {
  const situation = new URL(request.url).searchParams.get("situation")?.trim();

  try {
    return NextResponse.json(await getPhrases(situation || undefined));
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "숙어를 불러오지 못했습니다." }, { status: 500 });
  }
}
