import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema, visibilitySchema } from "@/features/shared/validation";

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
};

const eventSchema = z
  .object({
    familyId: z.string().uuid(),
    title: nonEmptyTextSchema.max(180),
    description: z.string().trim().max(5000).optional().nullable(),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    location: z.string().trim().max(240).optional().nullable(),
    allDay: z.boolean().default(false),
    visibility: visibilitySchema,
    selectedMemberIds: z.array(z.string().uuid()).optional().default([])
  })
  .refine((value) => new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(), {
    message: "End date must be after start date",
    path: ["endAt"]
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
    .select("id, family_id, title, description, start_at, end_at, location, all_day, visibility")
    .eq("family_id", familyId)
    .eq("archived", false)
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    allDay: row.all_day,
    visibility: row.visibility
  }));
}

export async function getEventById(eventId: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, family_id, title, description, start_at, end_at, location, all_day, visibility")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    familyId: data.family_id,
    title: data.title,
    description: data.description,
    startAt: data.start_at,
    endAt: data.end_at,
    location: data.location,
    allDay: data.all_day,
    visibility: data.visibility
  };
}

export async function createEvent(input: unknown) {
  const parsed = eventSchema.parse(input);
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
  const parsed = eventSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase.from("events").select("id, family_id").eq("id", eventId).single();
  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      start_at: parsed.startAt,
      end_at: parsed.endAt,
      location: parsed.location ?? null,
      all_day: parsed.allDay,
      visibility: parsed.visibility,
      updated_by: userId
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("entity_shares").delete().eq("entity_type", "event").eq("entity_id", eventId);

  if (parsed.visibility === "selected_members" && parsed.selectedMemberIds && parsed.selectedMemberIds.length > 0) {
    const rows = parsed.selectedMemberIds.map((memberId) => ({
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
