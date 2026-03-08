import { NextResponse } from "next/server";
import { deleteChore, getChoreById, updateChore } from "@/features/chores/server";

type RouteContext = {
  params: Promise<{ choreId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { choreId } = await context.params;
    const chore = await getChoreById(choreId);
    return NextResponse.json({ chore });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load chore" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { choreId } = await context.params;
    const body = await request.json();
    await updateChore(choreId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update chore" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { choreId } = await context.params;
    await deleteChore(choreId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete chore" }, { status: 400 });
  }
}
