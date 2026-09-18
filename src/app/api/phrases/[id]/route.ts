import { NextResponse } from "next/server";
import { updatePhrase, deletePhrase, BackendError, type PhraseRequest } from "@/lib/backend";
import { toId as parseId } from "@/lib/request-params";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 숙어 ID 입니다." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON 이 아닙니다." }, { status: 400 });
  }

  // PUT 은 전체 교체다. 빠진 필드는 백엔드에서 비워지므로 화면은 모든 필드를 보내야 한다.
  try {
    return NextResponse.json(await updatePhrase(id, payload as PhraseRequest));
  } catch (error) {
    return toErrorResponse(error, "숙어를 수정하지 못했습니다.");
  }
}

export async function DELETE(_request: Request, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 숙어 ID 입니다." }, { status: 400 });
  }

  try {
    await deletePhrase(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, "숙어를 삭제하지 못했습니다.");
  }
}

function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof BackendError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
