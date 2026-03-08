import { NextResponse } from "next/server";
import { createExpense, getExpenses, getMonthlySummary } from "@/features/expenses/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");
  const search = searchParams.get("search") ?? undefined;
  const mode = searchParams.get("mode");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    if (mode === "summary") {
      const summary = await getMonthlySummary(familyId);
      return NextResponse.json({ summary });
    }

    const expenses = await getExpenses(familyId, search);
    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load expenses" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expenseId = await createExpense(body);
    return NextResponse.json({ expenseId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create expense" }, { status: 400 });
  }
}
