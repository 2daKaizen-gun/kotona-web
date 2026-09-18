import { NextResponse } from "next/server";
import { deleteHistory, getHistoryDetail, BackendError } from "@/lib/backend";
import { toId } from "@/lib/request-params";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await parseId(context);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 이력 ID 입니다." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getHistoryDetail(id));
  } catch (error) {
    return toErrorResponse(error, "이력을 불러오지 못했습니다.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await parseId(context);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 이력 ID 입니다." }, { status: 400 });
  }

  try {
    await deleteHistory(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, "이력을 삭제하지 못했습니다.");
  }
}

async function parseId(context: { params: Promise<{ id: string }> }) {
  return toId((await context.params).id);
}

function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof BackendError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
