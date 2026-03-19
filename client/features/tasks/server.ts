import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema, visibilitySchema } from "@/features/shared/validation";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskLabelScope, type TaskPriority, type TaskStatus, normalizeTaskStatus } from "@/features/tasks/model";

export type TaskLabelRow = {
  id: string;
  name: string;
  color: string;
  scope: TaskLabelScope;
  userId: string | null;
  familyId: string | null;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startAt: string | null;
  dueAt: string | null;
  assignedToUserId: string | null;
  visibility: "private" | "family" | "selected_members";
  familyId: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  labels: TaskLabelRow[];
  selectedMemberIds: string[];
};

export type TaskCommentRow = {
  id: string;
  taskId: string;
  familyId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

const taskStatusSchema = z.enum(TASK_STATUSES);
const taskPrioritySchema = z.enum(TASK_PRIORITIES);
const taskCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

const baseTaskSchema = z.object({
  familyId: z.string().uuid(),
  title: nonEmptyTextSchema.max(180),
  description: z.string().trim().max(5000).optional().nullable(),
  status: taskStatusSchema.default("inbox"),
  priority: taskPrioritySchema.default("medium"),
  startAt: z.iso.datetime().optional().nullable(),
  dueAt: z.iso.datetime().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  visibility: visibilitySchema,
  selectedMemberIds: z.array(z.string().uuid()).optional().default([]),
  labelIds: z.array(z.string().uuid()).optional().default([])
});

const createTaskSchema = baseTaskSchema
  .refine(
    (value) => {
      if (!value.startAt || !value.dueAt) {
        return true;
      }
      return new Date(value.dueAt).getTime() >= new Date(value.startAt).getTime();
    },
    {
      path: ["dueAt"],
      message: "Due date must be after or equal to start date"
    }
  );

const updateTaskSchema = z
  .object({
    title: nonEmptyTextSchema.max(180).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    startAt: z.iso.datetime().optional().nullable(),
    dueAt: z.iso.datetime().optional().nullable(),
    assignedToUserId: z.string().uuid().optional().nullable(),
    visibility: visibilitySchema.optional(),
    selectedMemberIds: z.array(z.string().uuid()).optional(),
    labelIds: z.array(z.string().uuid()).optional()
  })
  .superRefine((value, context) => {
    if (!value.startAt || !value.dueAt) {
      return;
    }
    if (new Date(value.dueAt).getTime() < new Date(value.startAt).getTime()) {
      context.addIssue({
        code: "custom",
        path: ["dueAt"],
        message: "Due date must be after or equal to start date"
      });
    }
  });

const createTaskLabelSchema = z
  .object({
    scope: z.enum(["personal", "family"]),
    familyId: z.string().uuid().optional().nullable(),
    name: nonEmptyTextSchema.max(80),
    color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/)
  })
  .refine((value) => (value.scope === "family" ? Boolean(value.familyId) : true), {
    path: ["familyId"],
    message: "familyId is required for family labels"
  });

const updateTaskLabelSchema = z.object({
  name: nonEmptyTextSchema.max(80).optional(),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  archived: z.boolean().optional()
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

async function loadTaskLabelsByTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return new Map<string, TaskLabelRow[]>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_label_assignments")
    .select("task_id, task_labels(id, name, color, scope, user_id, family_id)")
    .in("task_id", taskIds);

  if (error) {
    if (error.code === "42P01" || error.code === "42704") {
      return new Map<string, TaskLabelRow[]>();
    }
    throw new Error(error.message);
  }

  const labelsByTaskId = new Map<string, TaskLabelRow[]>();

  for (const row of data ?? []) {
    const relation = Array.isArray(row.task_labels) ? row.task_labels[0] : row.task_labels;
    if (!relation) continue;

    const labels = labelsByTaskId.get(row.task_id) ?? [];
    labels.push({
      id: relation.id,
      name: relation.name,
      color: relation.color,
      scope: relation.scope,
      userId: relation.user_id,
      familyId: relation.family_id
    });
    labelsByTaskId.set(row.task_id, labels);
  }

  return labelsByTaskId;
}

async function loadTaskSharedMembersByTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return new Map<string, string[]>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_shares")
    .select("entity_id, shared_with_user_id")
    .eq("entity_type", "task")
    .in("entity_id", taskIds);

  if (error) {
    return new Map<string, string[]>();
  }

  const sharedByTaskId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = sharedByTaskId.get(row.entity_id) ?? [];
    list.push(row.shared_with_user_id);
    sharedByTaskId.set(row.entity_id, list);
  }

  return sharedByTaskId;
}

async function replaceTaskLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  familyId: string,
  userId: string,
  labelIds: string[] | undefined
) {
  if (labelIds === undefined) {
    return;
  }

  const dedupedLabelIds = Array.from(new Set(labelIds));

  const { error: deleteError } = await supabase.from("task_label_assignments").delete().eq("task_id", taskId);
  if (deleteError) {
    if (deleteError.code === "42P01") {
      return;
    }
    throw new Error(deleteError.message);
  }

  if (dedupedLabelIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("task_label_assignments").insert(
    dedupedLabelIds.map((labelId) => ({
      task_id: taskId,
      label_id: labelId,
      family_id: familyId,
      created_by: userId
    }))
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function getTasksForFamily(
  familyId: string,
  filters?: { mine?: boolean; status?: TaskStatus | "all"; priority?: TaskPriority | "all" }
): Promise<TaskRow[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  let query = supabase
    .from("tasks")
    .select("id, title, description, status, priority, start_at, due_at, assigned_to_user_id, visibility, family_id, owner_user_id, created_at, updated_at")
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

  const taskIds = (data ?? []).map((task) => task.id);
  const labelsByTaskId = await loadTaskLabelsByTaskIds(taskIds);
  const sharedMembersByTaskId = await loadTaskSharedMembersByTaskIds(taskIds);

  return (data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: normalizeTaskStatus(task.status),
    priority: task.priority,
    startAt: task.start_at,
    dueAt: task.due_at,
    assignedToUserId: task.assigned_to_user_id,
    visibility: task.visibility,
    familyId: task.family_id,
    ownerUserId: task.owner_user_id,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    labels: labelsByTaskId.get(task.id) ?? [],
    selectedMemberIds: sharedMembersByTaskId.get(task.id) ?? []
  }));
}

export async function getTaskById(taskId: string): Promise<TaskRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, start_at, due_at, assigned_to_user_id, visibility, family_id, owner_user_id, created_at, updated_at")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const labelsByTaskId = await loadTaskLabelsByTaskIds([taskId]);
  const sharedMembersByTaskId = await loadTaskSharedMembersByTaskIds([taskId]);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: normalizeTaskStatus(data.status),
    priority: data.priority,
    startAt: data.start_at,
    dueAt: data.due_at,
    assignedToUserId: data.assigned_to_user_id,
    visibility: data.visibility,
    familyId: data.family_id,
    ownerUserId: data.owner_user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    labels: labelsByTaskId.get(taskId) ?? [],
    selectedMemberIds: sharedMembersByTaskId.get(taskId) ?? []
  };
}

export async function createTask(input: unknown) {
  const parsed = createTaskSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const statusForCreate = parsed.dueAt && parsed.status === "inbox" ? "planned" : parsed.status;

  const { data, error } = await supabase.rpc("create_task_with_shares", {
    target_family_id: parsed.familyId,
    task_title: parsed.title,
    task_description: parsed.description ?? null,
    task_status_value: statusForCreate,
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

  const taskId = data as string;
  await replaceTaskLabels(supabase, taskId, parsed.familyId, userId, parsed.labelIds);

  return taskId;
}

export async function updateTask(taskId: string, input: unknown) {
  const parsed = updateTaskSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("id, family_id, visibility, status")
    .eq("id", taskId)
    .single();
  if (existingError) {
    throw new Error(existingError.message);
  }

  const updatePayload: Record<string, unknown> = { updated_by: userId };
  if (parsed.title !== undefined) updatePayload.title = parsed.title;
  if (parsed.description !== undefined) updatePayload.description = parsed.description ?? null;
  const effectiveStatus = (() => {
    if (parsed.status !== undefined) {
      if (parsed.status === "inbox" && parsed.dueAt !== undefined && parsed.dueAt !== null) {
        return "planned" as const;
      }
      return parsed.status;
    }

    const existingStatus = normalizeTaskStatus(existing.status);
    if (existingStatus === "inbox" && parsed.dueAt !== undefined && parsed.dueAt !== null) {
      return "planned" as const;
    }
    return undefined;
  })();

  if (effectiveStatus !== undefined) updatePayload.status = effectiveStatus;
  if (parsed.priority !== undefined) updatePayload.priority = parsed.priority;
  if (parsed.startAt !== undefined) updatePayload.start_at = parsed.startAt ?? null;
  if (parsed.dueAt !== undefined) updatePayload.due_at = parsed.dueAt ?? null;
  if (parsed.assignedToUserId !== undefined) updatePayload.assigned_to_user_id = parsed.assignedToUserId ?? null;
  if (parsed.visibility !== undefined) updatePayload.visibility = parsed.visibility;

  const { error } = await supabase.from("tasks").update(updatePayload).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  const shouldUpdateShares = parsed.visibility !== undefined || parsed.selectedMemberIds !== undefined;

  if (shouldUpdateShares) {
    await supabase.from("entity_shares").delete().eq("entity_type", "task").eq("entity_id", taskId);

    const effectiveVisibility = parsed.visibility ?? existing.visibility;
    const selectedMemberIds = parsed.selectedMemberIds ?? [];

    if (effectiveVisibility === "selected_members" && selectedMemberIds.length > 0) {
      const rows = selectedMemberIds.map((memberId) => ({
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

  await replaceTaskLabels(supabase, taskId, existing.family_id, userId, parsed.labelIds);
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("tasks").update({ archived: true, updated_by: userId }).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getTaskLabels(options: { scope: TaskLabelScope; familyId?: string | null }): Promise<TaskLabelRow[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  let query = supabase
    .from("task_labels")
    .select("id, name, color, scope, user_id, family_id")
    .eq("scope", options.scope)
    .eq("archived", false)
    .order("name", { ascending: true });

  if (options.scope === "personal") {
    query = query.eq("user_id", userId);
  } else {
    if (!options.familyId) {
      throw new Error("familyId is required for family labels");
    }
    query = query.eq("family_id", options.familyId);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    scope: label.scope,
    userId: label.user_id,
    familyId: label.family_id
  }));
}

export async function createTaskLabel(input: unknown): Promise<TaskLabelRow> {
  const parsed = createTaskLabelSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const payload = {
    scope: parsed.scope,
    user_id: parsed.scope === "personal" ? userId : null,
    family_id: parsed.scope === "family" ? parsed.familyId ?? null : null,
    name: parsed.name.trim(),
    color: parsed.color.toUpperCase(),
    created_by: userId,
    updated_by: userId
  };

  const { data, error } = await supabase
    .from("task_labels")
    .insert(payload)
    .select("id, name, color, scope, user_id, family_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    scope: data.scope,
    userId: data.user_id,
    familyId: data.family_id
  };
}

export async function updateTaskLabel(labelId: string, input: unknown): Promise<void> {
  const parsed = updateTaskLabelSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const payload: Record<string, unknown> = {
    updated_by: userId
  };

  if (parsed.name !== undefined) payload.name = parsed.name.trim();
  if (parsed.color !== undefined) payload.color = parsed.color.toUpperCase();
  if (parsed.archived !== undefined) payload.archived = parsed.archived;

  const { error } = await supabase.from("task_labels").update(payload).eq("id", labelId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function archiveTaskLabel(labelId: string): Promise<void> {
  await updateTaskLabel(labelId, { archived: true });
}

export async function getTaskComments(taskId: string): Promise<TaskCommentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("id, task_id, family_id, author_user_id, body, created_at, updated_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  const authorIds = Array.from(new Set((data ?? []).map((row) => row.author_user_id).filter(Boolean)));
  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; email: string | null }>();

  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .in("id", authorIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email
      });
    }
  }

  return (data ?? []).map((row) => {
    const profile = profileMap.get(row.author_user_id);
    const authorName = profile?.full_name ?? profile?.email ?? "Member";

    return {
      id: row.id,
      taskId: row.task_id,
      familyId: row.family_id,
      authorUserId: row.author_user_id,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName,
      authorAvatarUrl: profile?.avatar_url ?? null
    };
  });
}

export async function createTaskComment(taskId: string, input: unknown): Promise<string> {
  const parsed = taskCommentSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: task, error: taskError } = await supabase.from("tasks").select("family_id").eq("id", taskId).single();
  if (taskError) {
    throw new Error(taskError.message);
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      family_id: task.family_id,
      author_user_id: userId,
      body: parsed.body
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

