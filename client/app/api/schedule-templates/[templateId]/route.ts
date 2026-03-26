import { NextResponse } from "next/server";
import { deleteScheduleTemplate, upsertScheduleTemplate } from "@/features/schedules/server";

type RouteContext = {
  params: Promise<{ templateId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    const body = await request.json();
    await upsertScheduleTemplate(templateId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update schedule template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    await deleteScheduleTemplate(templateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete schedule template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
