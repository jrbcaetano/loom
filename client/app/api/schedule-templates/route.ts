import { NextResponse } from "next/server";
import { getScheduleTemplates, upsertScheduleTemplate } from "@/features/schedules/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const templates = await getScheduleTemplates(familyId);
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load schedule templates";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templateId = await upsertScheduleTemplate(null, body);
    return NextResponse.json({ templateId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save schedule template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
