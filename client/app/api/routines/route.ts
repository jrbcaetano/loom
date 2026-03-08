import { NextResponse } from "next/server";
import { createRoutine, getRoutines } from "@/features/routines/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const routines = await getRoutines(familyId);
    return NextResponse.json({ routines });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load routines" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const routineId = await createRoutine(body);
    return NextResponse.json({ routineId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create routine" }, { status: 400 });
  }
}
