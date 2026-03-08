import { NextResponse } from "next/server";
import { addListItem, deleteListItem, getListById, updateListItem } from "@/features/lists/server";

type RouteParams = {
  params: Promise<{ listId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    const list = await getListById(listId);
    return NextResponse.json({ items: list?.items ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch list items";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    const body = await request.json();
    const itemId = await addListItem({ ...body, listId });
    return NextResponse.json({ itemId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create list item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateListItem(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  try {
    await deleteListItem(itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
