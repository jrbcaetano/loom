import { NextResponse } from "next/server";
import { createTaskComment, getTaskComments } from "@/features/tasks/server";

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { taskId } = await params;

  try {
    const comments = await getTaskComments(taskId);
    return NextResponse.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { taskId } = await params;

  try {
    const body = await request.json();
    const commentId = await createTaskComment(taskId, body);
    return NextResponse.json({ commentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
