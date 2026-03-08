import { NextResponse } from "next/server";
import { createNote, getNotes } from "@/features/notes/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");
  const search = searchParams.get("search") ?? undefined;

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const notes = await getNotes(familyId, search);
    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load notes" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const noteId = await createNote(body);
    return NextResponse.json({ noteId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create note" }, { status: 400 });
  }
}
