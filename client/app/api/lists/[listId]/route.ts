import { NextResponse } from "next/server";
import { archiveList, getListById, updateList } from "@/features/lists/server";

type RouteParams = {
  params: Promise<{ listId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    const list = await getListById(listId);
    return NextResponse.json({ list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    const body = await request.json();
    await updateList(listId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    await archiveList(listId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
