import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema, visibilitySchema } from "@/features/shared/validation";
import { sanitizeRecurrenceRule, type EventRecurrenceRule } from "@/features/events/recurrence";

export type EventRow = {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  allDay: boolean;
  visibility: "private" | "family" | "selected_members";
  createdByUserId: string;
  createdByName: string | null;
  createdByAvatarUrl: string | null;
  recurrenceRule: EventRecurrenceRule | null;
};

const recurrenceRuleSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().min(1).max(365),
    byWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
    byMonthDay: z.number().int().min(1).max(31).optional(),
    byMonth: z.number().int().min(1).max(12).optional(),
    bySetPos: z.number().int().min(-5).max(5).refine((value) => value !== 0).optional(),
    count: z.number().int().min(1).max(5000).optional(),
    until: z.iso.datetime().optional()
  })
  .nullable()
  .optional();

const eventSchemaBase = z.object({
  familyId: z.string().uuid(),
  title: nonEmptyTextSchema.max(180),
  description: z.string().trim().max(5000).optional().nullable(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  location: z.string().trim().max(240).optional().nullable(),
  allDay: z.boolean().default(false),
  visibility: visibilitySchema,
  selectedMemberIds: z.array(z.string().uuid()).optional().default([]),
  recurrenceRule: recurrenceRuleSchema
});

const createEventSchema = eventSchemaBase.refine((value) => new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(), {
  message: "End date must be after start date",
  path: ["endAt"]
});

const updateEventSchema = eventSchemaBase
  .omit({ familyId: true })
  .partial()
  .superRefine((value, context) => {
    if (!value.startAt || !value.endAt) {
      return;
    }

    if (new Date(value.endAt).getTime() < new Date(value.startAt).getTime()) {
      context.addIssue({
        code: "custom",
        message: "End date must be after start date",
        path: ["endAt"]
      });
    }
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

export async function getEventsForFamily(familyId: string): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, family_id, title, description, start_at, end_at, location, all_day, visibility, recurrence_rule, created_by, profiles!events_created_by_fkey(full_name, avatar_url)"
    )
    .eq("family_id", familyId)
    .eq("archived", false)
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      description: row.description,
      startAt: row.start_at,
      endAt: row.end_at,
      location: row.location,
      allDay: row.all_day,
      visibility: row.visibility,
      createdByUserId: row.created_by,
      createdByName: profile?.full_name ?? null,
      createdByAvatarUrl: profile?.avatar_url ?? null,
      recurrenceRule: sanitizeRecurrenceRule(row.recurrence_rule)
    };
  });
}

export async function getEventById(eventId: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, family_id, title, description, start_at, end_at, location, all_day, visibility, recurrence_rule, created_by, profiles!events_created_by_fkey(full_name, avatar_url)"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  return {
    id: data.id,
    familyId: data.family_id,
    title: data.title,
    description: data.description,
    startAt: data.start_at,
    endAt: data.end_at,
    location: data.location,
    allDay: data.all_day,
    visibility: data.visibility,
    createdByUserId: data.created_by,
    createdByName: profile?.full_name ?? null,
    createdByAvatarUrl: profile?.avatar_url ?? null,
    recurrenceRule: sanitizeRecurrenceRule(data.recurrence_rule)
  };
}

export async function createEvent(input: unknown) {
  const parsed = createEventSchema.parse(input);
  const recurrenceRule = sanitizeRecurrenceRule(parsed.recurrenceRule);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_event_with_shares", {
    target_family_id: parsed.familyId,
    event_title: parsed.title,
    event_start_at: parsed.startAt,
    event_end_at: parsed.endAt,
    event_description: parsed.description ?? null,
    event_location: parsed.location ?? null,
    event_all_day: parsed.allDay,
    event_visibility: parsed.visibility,
    event_recurrence: recurrenceRule,
    selected_member_ids: parsed.visibility === "selected_members" ? parsed.selectedMemberIds : []
  });

  if (error || !data) {
    if (error?.code === "PGRST202" || error?.code === "PGRST205") {
      throw new Error("Event creation RPC not found. Re-run latest migration.");
    }
    throw new Error(error?.message ?? "Failed to create event");
  }

  return data as string;
}

export async function updateEvent(eventId: string, input: unknown) {
  const parsed = updateEventSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase.from("events").select("id, family_id, visibility").eq("id", eventId).single();
  if (existingError) {
    throw new Error(existingError.message);
  }

  const updatePayload: Record<string, unknown> = { updated_by: userId };
  if (parsed.title !== undefined) updatePayload.title = parsed.title;
  if (parsed.description !== undefined) updatePayload.description = parsed.description ?? null;
  if (parsed.startAt !== undefined) updatePayload.start_at = parsed.startAt;
  if (parsed.endAt !== undefined) updatePayload.end_at = parsed.endAt;
  if (parsed.location !== undefined) updatePayload.location = parsed.location ?? null;
  if (parsed.allDay !== undefined) updatePayload.all_day = parsed.allDay;
  if (parsed.visibility !== undefined) updatePayload.visibility = parsed.visibility;
  if (parsed.recurrenceRule !== undefined) updatePayload.recurrence_rule = sanitizeRecurrenceRule(parsed.recurrenceRule);

  const { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  const shouldUpdateShares = parsed.visibility !== undefined || parsed.selectedMemberIds !== undefined;
  if (!shouldUpdateShares) {
    return;
  }

  await supabase.from("entity_shares").delete().eq("entity_type", "event").eq("entity_id", eventId);

  const effectiveVisibility = parsed.visibility ?? existing.visibility;
  const selectedMemberIds = parsed.selectedMemberIds ?? [];

  if (effectiveVisibility === "selected_members" && selectedMemberIds.length > 0) {
    const rows = selectedMemberIds.map((memberId) => ({
      family_id: existing.family_id,
      entity_type: "event" as const,
      entity_id: eventId,
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

export async function archiveEvent(eventId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("events").update({ archived: true, updated_by: userId }).eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}
