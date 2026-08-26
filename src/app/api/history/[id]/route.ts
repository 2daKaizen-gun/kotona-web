import { NextResponse } from "next/server";
import { deleteHistory, BackendError } from "@/lib/backend";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "잘못된 이력 ID 입니다." }, { status: 400 });
  }

  try {
    await deleteHistory(numericId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "이력을 삭제하지 못했습니다." }, { status: 500 });
  }
}
