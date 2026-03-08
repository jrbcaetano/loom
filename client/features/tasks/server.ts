import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema, visibilitySchema } from "@/features/shared/validation";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  startAt: string | null;
  dueAt: string | null;
  assignedToUserId: string | null;
  visibility: "private" | "family" | "selected_members";
  familyId: string;
  ownerUserId: string;
};

const taskSchema = z.object({
  familyId: z.string().uuid(),
  title: nonEmptyTextSchema.max(180),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  startAt: z.iso.datetime().optional().nullable(),
  dueAt: z.iso.datetime().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  visibility: visibilitySchema,
  selectedMemberIds: z.array(z.string().uuid()).optional().default([])
}).refine((value) => {
  if (!value.startAt || !value.dueAt) {
    return true;
  }
  return new Date(value.dueAt).getTime() >= new Date(value.startAt).getTime();
}, {
  path: ["dueAt"],
  message: "Due date must be after or equal to start date"
});

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

export async function getTasksForFamily(
  familyId: string,
  filters?: { mine?: boolean; status?: "todo" | "doing" | "done" | "all"; priority?: "low" | "medium" | "high" | "all" }
): Promise<TaskRow[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  let query = supabase
    .from("tasks")
    .select("id, title, description, status, priority, start_at, due_at, assigned_to_user_id, visibility, family_id, owner_user_id")
    .eq("family_id", familyId)
    .eq("archived", false)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters?.mine) {
    query = query.eq("assigned_to_user_id", userId);
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startAt: task.start_at,
    dueAt: task.due_at,
    assignedToUserId: task.assigned_to_user_id,
    visibility: task.visibility,
    familyId: task.family_id,
    ownerUserId: task.owner_user_id
  }));
}

export async function getTaskById(taskId: string): Promise<TaskRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, start_at, due_at, assigned_to_user_id, visibility, family_id, owner_user_id")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    startAt: data.start_at,
    dueAt: data.due_at,
    assignedToUserId: data.assigned_to_user_id,
    visibility: data.visibility,
    familyId: data.family_id,
    ownerUserId: data.owner_user_id
  };
}

export async function createTask(input: unknown) {
  const parsed = taskSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_task_with_shares", {
    target_family_id: parsed.familyId,
    task_title: parsed.title,
    task_description: parsed.description ?? null,
    task_status_value: parsed.status,
    task_priority_value: parsed.priority,
    task_due_at: parsed.dueAt ?? null,
    task_assigned_to_user_id: parsed.assignedToUserId ?? null,
    task_visibility: parsed.visibility,
    selected_member_ids: parsed.visibility === "selected_members" ? parsed.selectedMemberIds : [],
    task_start_at: parsed.startAt ?? null
  });

  if (error || !data) {
    if (error?.code === "PGRST202" || error?.code === "PGRST205") {
      throw new Error("Task creation RPC not found. Re-run latest migration.");
    }
    throw new Error(error?.message ?? "Failed to create task");
  }

  return data as string;
}

export async function updateTask(taskId: string, input: unknown) {
  const parsed = taskSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase.from("tasks").select("id, family_id").eq("id", taskId).single();
  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      status: parsed.status,
      priority: parsed.priority,
      start_at: parsed.startAt ?? null,
      due_at: parsed.dueAt ?? null,
      assigned_to_user_id: parsed.assignedToUserId ?? null,
      visibility: parsed.visibility,
      updated_by: userId
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("entity_shares").delete().eq("entity_type", "task").eq("entity_id", taskId);

  if (parsed.visibility === "selected_members" && parsed.selectedMemberIds && parsed.selectedMemberIds.length > 0) {
    const rows = parsed.selectedMemberIds.map((memberId) => ({
      family_id: existing.family_id,
      entity_type: "task" as const,
      entity_id: taskId,
      shared_with_user_id: memberId,
      permission: "edit" as const,
      created_by: userId
    }));

    const { error: shareError } = await supabase.from("entity_shares").insert(rows);
    if (shareError) {
      throw new Error(shareError.message);
    }
  }
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("tasks").update({ archived: true, updated_by: userId }).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}
