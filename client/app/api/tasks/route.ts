import { NextResponse } from "next/server";
import { createTask, getTasksForFamily } from "@/features/tasks/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const tasks = await getTasksForFamily(familyId, {
      mine: searchParams.get("mine") === "1",
      status: (searchParams.get("status") as "todo" | "doing" | "done" | "all" | null) ?? "all",
      priority: (searchParams.get("priority") as "low" | "medium" | "high" | "all" | null) ?? "all"
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = await createTask(body);
    return NextResponse.json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
