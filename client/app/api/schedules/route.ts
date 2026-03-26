import { NextResponse } from "next/server";
import { createSchedule, getScheduleOccurrencesForFamily, getSchedulesForFamily } from "@/features/schedules/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    if (start && end) {
      const occurrences = await getScheduleOccurrencesForFamily({
        familyId,
        start,
        end
      });
      return NextResponse.json({ occurrences });
    }

    const schedules = await getSchedulesForFamily(familyId);
    return NextResponse.json({ schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load schedules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scheduleId = await createSchedule(body);
    return NextResponse.json({ scheduleId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
