import { NextResponse } from "next/server";
import { getRewardsForCurrentUser } from "@/features/chores/server";

export async function GET() {
  try {
    const rewards = await getRewardsForCurrentUser();
    return NextResponse.json(rewards);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load rewards" }, { status: 400 });
  }
}
