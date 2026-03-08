import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const expenseSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  amount: z.number().nonnegative(),
  currency: z.string().trim().min(1).max(10).default("EUR"),
  category: z.string().trim().max(120).optional().nullable(),
  paidByUserId: z.string().uuid().optional().nullable(),
  date: z.string().date(),
  notes: z.string().trim().max(2000).optional().nullable()
});

export async function getExpenses(familyId: string, search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("id, family_id, title, amount, currency, category, paid_by_user_id, date, notes, created_at")
    .eq("family_id", familyId)
    .order("date", { ascending: false });

  if (search && search.trim().length > 0) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getExpenseById(expenseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").select("*").eq("id", expenseId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createExpense(input: unknown) {
  const parsed = expenseSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      family_id: parsed.familyId,
      title: parsed.title,
      amount: parsed.amount,
      currency: parsed.currency,
      category: parsed.category ?? null,
      paid_by_user_id: parsed.paidByUserId ?? null,
      date: parsed.date,
      notes: parsed.notes ?? null
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateExpense(expenseId: string, input: unknown) {
  const parsed = expenseSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      title: parsed.title,
      amount: parsed.amount,
      currency: parsed.currency,
      category: parsed.category ?? null,
      paid_by_user_id: parsed.paidByUserId ?? null,
      date: parsed.date,
      notes: parsed.notes ?? null
    })
    .eq("id", expenseId);

  if (error) throw new Error(error.message);
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);
}

export async function getMonthlySummary(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, date")
    .eq("family_id", familyId);

  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const month = (row.date as string).slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + Number(row.amount));
  }

  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}
