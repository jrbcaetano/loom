import { NextResponse } from "next/server";
import { archiveTaskLabel, updateTaskLabel } from "@/features/tasks/server";

type RouteParams = {
  params: Promise<{ labelId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { labelId } = await params;

  try {
    const body = await request.json();
    await updateTaskLabel(labelId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task label";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { labelId } = await params;

  try {
    await archiveTaskLabel(labelId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete task label";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
