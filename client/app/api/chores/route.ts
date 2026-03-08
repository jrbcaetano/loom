import { NextResponse } from "next/server";
import { createChore, getChores } from "@/features/chores/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const chores = await getChores(familyId);
    return NextResponse.json({ chores });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load chores" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const choreId = await createChore(body);
    return NextResponse.json({ choreId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create chore" }, { status: 400 });
  }
}
