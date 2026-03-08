import { NextResponse } from "next/server";
import { archiveTask, getTaskById, updateTask } from "@/features/tasks/server";

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { taskId } = await params;

  try {
    const task = await getTaskById(taskId);
    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { taskId } = await params;

  try {
    const body = await request.json();
    await updateTask(taskId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { taskId } = await params;

  try {
    await archiveTask(taskId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to archive task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
