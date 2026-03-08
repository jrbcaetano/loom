import { NextResponse } from "next/server";
import { getMealPlan, upsertMealPlanEntry } from "@/features/meals/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) return NextResponse.json({ error: "familyId is required" }, { status: 400 });

  try {
    const entries = await getMealPlan(familyId);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load meal plan" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entryId = await upsertMealPlanEntry(body);
    return NextResponse.json({ entryId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save meal plan entry" }, { status: 400 });
  }
}
