import { NextResponse } from "next/server";
import { completeRoutine } from "@/features/routines/server";

type RouteContext = {
  params: Promise<{ routineId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { routineId } = await context.params;
    const logId = await completeRoutine(routineId);
    return NextResponse.json({ logId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete routine" }, { status: 400 });
  }
}
