import { NextResponse } from "next/server";
import { deleteMealPlanEntry } from "@/features/meals/server";

type RouteParams = { params: Promise<{ entryId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { entryId } = await params;

  try {
    await deleteMealPlanEntry(entryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete meal entry" }, { status: 400 });
  }
}
