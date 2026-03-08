import { NextResponse } from "next/server";
import { deleteRoutine, getRoutineById, updateRoutine } from "@/features/routines/server";

type RouteContext = {
  params: Promise<{ routineId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { routineId } = await context.params;
    const routine = await getRoutineById(routineId);
    return NextResponse.json({ routine });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load routine" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { routineId } = await context.params;
    const body = await request.json();
    await updateRoutine(routineId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update routine" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { routineId } = await context.params;
    await deleteRoutine(routineId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete routine" }, { status: 400 });
  }
}
