import { NextResponse } from "next/server";
import { archiveSchedule, getScheduleById, updateSchedule } from "@/features/schedules/server";

type RouteContext = {
  params: Promise<{ scheduleId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { scheduleId } = await context.params;
    const schedule = await getScheduleById(scheduleId);
    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { scheduleId } = await context.params;
    const body = await request.json();
    await updateSchedule(scheduleId, body);
    const schedule = await getScheduleById(scheduleId);
    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { scheduleId } = await context.params;
    await archiveSchedule(scheduleId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to archive schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
