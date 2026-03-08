import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const choreSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  points: z.number().int().nonnegative(),
  dueDate: z.string().date().optional().nullable(),
  status: z.enum(["todo", "done"]).default("todo")
});

export async function getChores(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chores")
    .select("id, family_id, title, description, assigned_to_user_id, points, due_date, status, created_at")
    .eq("family_id", familyId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getChoreById(choreId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("chores").select("*").eq("id", choreId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createChore(input: unknown) {
  const parsed = choreSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chores")
    .insert({
      family_id: parsed.familyId,
      title: parsed.title,
      description: parsed.description ?? null,
      assigned_to_user_id: parsed.assignedToUserId ?? null,
      points: parsed.points,
      due_date: parsed.dueDate ?? null,
      status: parsed.status
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateChore(choreId: string, input: unknown) {
  const parsed = choreSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("chores")
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      assigned_to_user_id: parsed.assignedToUserId ?? null,
      points: parsed.points,
      due_date: parsed.dueDate ?? null,
      status: parsed.status
    })
    .eq("id", choreId);
  if (error) throw new Error(error.message);
}

export async function deleteChore(choreId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("chores").delete().eq("id", choreId);
  if (error) throw new Error(error.message);
}

export async function completeChore(choreId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_chore", { target_chore_id: choreId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getRewardsForCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: balance } = await supabase
    .from("reward_balances")
    .select("id, user_id, points_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: transactions, error } = await supabase
    .from("reward_transactions")
    .select("id, user_id, points, type, reference_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return {
    balance: balance?.points_balance ?? 0,
    transactions: transactions ?? []
  };
}
