import { NextResponse } from "next/server";
import { deleteNote, getNoteById, updateNote } from "@/features/notes/server";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { noteId } = await context.params;
    const note = await getNoteById(noteId);
    return NextResponse.json({ note });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load note" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { noteId } = await context.params;
    const body = await request.json();
    await updateNote(noteId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update note" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { noteId } = await context.params;
    await deleteNote(noteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete note" }, { status: 400 });
  }
}
