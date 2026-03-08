import { NextResponse } from "next/server";
import { completeChore } from "@/features/chores/server";

type RouteContext = {
  params: Promise<{ choreId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { choreId } = await context.params;
    const completionId = await completeChore(choreId);
    return NextResponse.json({ completionId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete chore" }, { status: 400 });
  }
}
