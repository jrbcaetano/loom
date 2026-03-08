import { NextResponse } from "next/server";
import { deleteExpense, getExpenseById, updateExpense } from "@/features/expenses/server";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { expenseId } = await context.params;
    const expense = await getExpenseById(expenseId);
    return NextResponse.json({ expense });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load expense" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { expenseId } = await context.params;
    const body = await request.json();
    await updateExpense(expenseId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update expense" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { expenseId } = await context.params;
    await deleteExpense(expenseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete expense" }, { status: 400 });
  }
}
