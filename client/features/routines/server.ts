import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const routineSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  assignedToUserId: z.string().uuid().optional().nullable(),
  scheduleType: z.enum(["daily", "weekly", "custom"]),
  steps: z.array(z.string().trim().min(1).max(240)).default([])
});

export async function getRoutines(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, family_id, title, assigned_to_user_id, schedule_type, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRoutineById(routineId: string) {
  const supabase = await createClient();
  const { data: routine, error } = await supabase.from("routines").select("*").eq("id", routineId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!routine) return null;

  const { data: steps, error: stepsError } = await supabase
    .from("routine_steps")
    .select("id, text, sort_order")
    .eq("routine_id", routineId)
    .order("sort_order", { ascending: true });

  if (stepsError) throw new Error(stepsError.message);

  const { data: logs, error: logsError } = await supabase
    .from("routine_logs")
    .select("id, user_id, completed_at")
    .eq("routine_id", routineId)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (logsError) throw new Error(logsError.message);

  return { ...routine, steps: steps ?? [], logs: logs ?? [] };
}

export async function createRoutine(input: unknown) {
  const parsed = routineSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("routines")
    .insert({
      family_id: parsed.familyId,
      title: parsed.title,
      assigned_to_user_id: parsed.assignedToUserId ?? null,
      schedule_type: parsed.scheduleType
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (parsed.steps.length > 0) {
    const rows = parsed.steps.map((step, index) => ({ routine_id: data.id, text: step, sort_order: index }));
    const { error: stepError } = await supabase.from("routine_steps").insert(rows);
    if (stepError) throw new Error(stepError.message);
  }

  return data.id;
}

export async function updateRoutine(routineId: string, input: unknown) {
  const parsed = routineSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("routines")
    .update({
      title: parsed.title,
      assigned_to_user_id: parsed.assignedToUserId ?? null,
      schedule_type: parsed.scheduleType
    })
    .eq("id", routineId);

  if (error) throw new Error(error.message);

  if (parsed.steps) {
    await supabase.from("routine_steps").delete().eq("routine_id", routineId);
    if (parsed.steps.length > 0) {
      const rows = parsed.steps.map((step, index) => ({ routine_id: routineId, text: step, sort_order: index }));
      const { error: stepError } = await supabase.from("routine_steps").insert(rows);
      if (stepError) throw new Error(stepError.message);
    }
  }
}

export async function deleteRoutine(routineId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw new Error(error.message);
}

export async function completeRoutine(routineId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("routine_logs")
    .insert({ routine_id: routineId, user_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
