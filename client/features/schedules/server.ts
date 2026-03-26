import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  expandSchedulesForFamily
} from "@/features/schedules/occurrences";
import {
  scheduleSeriesSchema,
  scheduleTemplateSchema,
  type ScheduleBlockRow,
  type ScheduleOccurrence,
  type ScheduleOverrideBlockRow,
  type ScheduleOverrideDayRow,
  type SchedulePauseRow,
  type ScheduleSeriesRow,
  type ScheduleTemplateRow
} from "@/features/schedules/model";

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

async function getFamilyMemberLookup(supabase: Awaited<ReturnType<typeof createClient>>, familyId: string) {
  const { data: memberRows, error: memberError } = await supabase
    .from("family_members")
    .select("id, user_id, role, invited_email")
    .eq("family_id", familyId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  const userIds = Array.from(new Set((memberRows ?? []).map((row) => row.user_id).filter((value): value is string => Boolean(value))));
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email
      });
    }
  }

  return new Map(
    (memberRows ?? []).map((row) => {
      const profile = row.user_id ? profileMap.get(row.user_id) : undefined;
      const displayName = profile?.full_name ?? profile?.email ?? row.invited_email ?? "Member";
      return [
        row.id,
        {
          id: row.id,
          role: row.role as "admin" | "adult" | "child",
          displayName
        }
      ] as const;
    })
  );
}

function mapTemplateRow(row: Record<string, unknown>): ScheduleTemplateRow {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    title: String(row.title),
    category: row.category as ScheduleTemplateRow["category"],
    location: row.location ? String(row.location) : null,
    startsAtLocal: String(row.starts_at_local),
    endsAtLocal: String(row.ends_at_local),
    spansNextDay: Boolean(row.spans_next_day),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapBlockRow(row: Record<string, unknown>): ScheduleBlockRow {
  return {
    id: String(row.id),
    scheduleId: String(row.schedule_id),
    templateId: row.template_id ? String(row.template_id) : null,
    weekIndex: Number(row.week_index),
    weekday: Number(row.weekday),
    title: String(row.title),
    location: row.location ? String(row.location) : null,
    startsAtLocal: String(row.starts_at_local),
    endsAtLocal: String(row.ends_at_local),
    spansNextDay: Boolean(row.spans_next_day),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapPauseRow(row: Record<string, unknown>): SchedulePauseRow {
  return {
    id: String(row.id),
    scheduleId: String(row.schedule_id),
    startOn: String(row.start_on),
    endOn: String(row.end_on),
    reason: row.reason ? String(row.reason) : null
  };
}

function mapOverrideBlockRow(row: Record<string, unknown>): ScheduleOverrideBlockRow {
  return {
    id: String(row.id),
    overrideDayId: String(row.override_day_id),
    templateId: row.template_id ? String(row.template_id) : null,
    title: String(row.title),
    location: row.location ? String(row.location) : null,
    startsAtLocal: String(row.starts_at_local),
    endsAtLocal: String(row.ends_at_local),
    spansNextDay: Boolean(row.spans_next_day),
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function hydrateSeriesRows(
  rawSeries: Record<string, unknown>[],
  memberLookup: Map<string, { id: string; role: "admin" | "adult" | "child"; displayName: string }>,
  blocks: ScheduleBlockRow[],
  pauses: SchedulePauseRow[],
  overrideDays: ScheduleOverrideDayRow[]
): ScheduleSeriesRow[] {
  return rawSeries.map((row) => {
    const familyMemberId = String(row.family_member_id);
    const member = memberLookup.get(familyMemberId);
    return {
      id: String(row.id),
      familyId: String(row.family_id),
      familyMemberId,
      familyMemberName: member?.displayName ?? "Member",
      familyMemberRole: member?.role ?? "adult",
      title: String(row.title),
      category: row.category as ScheduleSeriesRow["category"],
      color: String(row.color ?? "#7c88d9"),
      location: row.location ? String(row.location) : null,
      notes: row.notes ? String(row.notes) : null,
      startsOn: String(row.starts_on),
      endsOn: row.ends_on ? String(row.ends_on) : null,
      cycleLengthWeeks: Number(row.cycle_length_weeks ?? 1),
      isEnabled: Boolean(row.is_enabled),
      archived: Boolean(row.archived),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      blocks: blocks.filter((block) => block.scheduleId === String(row.id)),
      pauses: pauses.filter((pause) => pause.scheduleId === String(row.id)),
      overrideDays: overrideDays.filter((overrideDay) => overrideDay.scheduleId === String(row.id))
    };
  });
}

async function loadSeriesChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleIds: string[]
) {
  if (scheduleIds.length === 0) {
    return {
      blocks: [] as ScheduleBlockRow[],
      pauses: [] as SchedulePauseRow[],
      overrideDays: [] as ScheduleOverrideDayRow[]
    };
  }

  const [{ data: blockRows, error: blockError }, { data: pauseRows, error: pauseError }, { data: overrideDayRows, error: overrideDayError }] = await Promise.all([
    supabase
      .from("schedule_blocks")
      .select("id, schedule_id, template_id, week_index, weekday, title, location, starts_at_local, ends_at_local, spans_next_day, sort_order")
      .in("schedule_id", scheduleIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("schedule_pauses")
      .select("id, schedule_id, start_on, end_on, reason")
      .in("schedule_id", scheduleIds)
      .order("start_on", { ascending: true }),
    supabase
      .from("schedule_override_days")
      .select("id, schedule_id, override_date, notes")
      .in("schedule_id", scheduleIds)
      .order("override_date", { ascending: true })
  ]);

  if (blockError) {
    throw new Error(blockError.message);
  }

  if (pauseError) {
    throw new Error(pauseError.message);
  }

  if (overrideDayError) {
    throw new Error(overrideDayError.message);
  }

  const blocks = (blockRows ?? []).map((row) => mapBlockRow(row));
  const pauses = (pauseRows ?? []).map((row) => mapPauseRow(row));
  const overrideDayIds = (overrideDayRows ?? []).map((row) => String(row.id));

  let overrideBlocks: ScheduleOverrideBlockRow[] = [];
  if (overrideDayIds.length > 0) {
    const { data: overrideBlockRows, error: overrideBlockError } = await supabase
      .from("schedule_override_blocks")
      .select("id, override_day_id, template_id, title, location, starts_at_local, ends_at_local, spans_next_day, sort_order")
      .in("override_day_id", overrideDayIds)
      .order("sort_order", { ascending: true });

    if (overrideBlockError) {
      throw new Error(overrideBlockError.message);
    }

    overrideBlocks = (overrideBlockRows ?? []).map((row) => mapOverrideBlockRow(row));
  }

  const overrideDays = (overrideDayRows ?? []).map((row) => ({
    id: String(row.id),
    scheduleId: String(row.schedule_id),
    overrideDate: String(row.override_date),
    notes: row.notes ? String(row.notes) : null,
    blocks: overrideBlocks.filter((block) => block.overrideDayId === String(row.id))
  }));

  return { blocks, pauses, overrideDays };
}

export async function getScheduleTemplates(familyId: string): Promise<ScheduleTemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_templates")
    .select("id, family_id, title, category, location, starts_at_local, ends_at_local, spans_next_day, notes, created_at, updated_at")
    .eq("family_id", familyId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapTemplateRow(row));
}

export async function upsertScheduleTemplate(templateId: string | null, input: unknown) {
  const parsed = scheduleTemplateSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const payload = {
    family_id: parsed.familyId,
    title: parsed.title,
    category: parsed.category,
    location: parsed.location ?? null,
    starts_at_local: parsed.startsAtLocal,
    ends_at_local: parsed.endsAtLocal,
    spans_next_day: parsed.spansNextDay,
    notes: parsed.notes ?? null,
    updated_by: userId
  };

  if (!templateId) {
    const { data, error } = await supabase
      .from("schedule_templates")
      .insert({
        ...payload,
        created_by: userId
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return String(data.id);
  }

  const { error } = await supabase.from("schedule_templates").update(payload).eq("id", templateId);
  if (error) {
    throw new Error(error.message);
  }

  return templateId;
}

export async function deleteScheduleTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_templates").delete().eq("id", templateId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSchedulesForFamily(familyId: string): Promise<ScheduleSeriesRow[]> {
  const supabase = await createClient();
  const [{ data: seriesRows, error: seriesError }, memberLookup] = await Promise.all([
    supabase
      .from("schedule_series")
      .select("id, family_id, family_member_id, title, category, color, location, notes, starts_on, ends_on, cycle_length_weeks, is_enabled, archived, created_at, updated_at")
      .eq("family_id", familyId)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    getFamilyMemberLookup(supabase, familyId)
  ]);

  if (seriesError) {
    throw new Error(seriesError.message);
  }

  const scheduleIds = (seriesRows ?? []).map((row) => String(row.id));
  const { blocks, pauses, overrideDays } = await loadSeriesChildren(supabase, scheduleIds);

  return hydrateSeriesRows((seriesRows ?? []) as Record<string, unknown>[], memberLookup, blocks, pauses, overrideDays);
}

export async function getScheduleById(scheduleId: string): Promise<ScheduleSeriesRow | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("schedule_series")
    .select("id, family_id, family_member_id, title, category, color, location, notes, starts_on, ends_on, cycle_length_weeks, is_enabled, archived, created_at, updated_at")
    .eq("id", scheduleId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!row) {
    return null;
  }

  const memberLookup = await getFamilyMemberLookup(supabase, String(row.family_id));
  const { blocks, pauses, overrideDays } = await loadSeriesChildren(supabase, [String(row.id)]);
  const [series] = hydrateSeriesRows([row as Record<string, unknown>], memberLookup, blocks, pauses, overrideDays);
  return series ?? null;
}

async function validateScheduleFamilyMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
  familyMemberId: string
) {
  const { data, error } = await supabase
    .from("family_members")
    .select("id")
    .eq("family_id", familyId)
    .eq("id", familyMemberId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selected family member does not belong to this family");
  }
}

function normalizeSchedulePayload(input: unknown) {
  const parsed = scheduleSeriesSchema.parse(input);

  if (parsed.endsOn && parsed.endsOn < parsed.startsOn) {
    throw new Error("Schedule end date must be on or after the start date");
  }

  for (const pause of parsed.pauses) {
    if (pause.endOn < pause.startOn) {
      throw new Error("Pause end date must be on or after the start date");
    }
  }

  return parsed;
}

async function replaceScheduleChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string,
  payload: ReturnType<typeof normalizeSchedulePayload>
) {
  await supabase.from("schedule_blocks").delete().eq("schedule_id", scheduleId);
  await supabase.from("schedule_pauses").delete().eq("schedule_id", scheduleId);

  const { data: existingOverrideDays } = await supabase
    .from("schedule_override_days")
    .select("id")
    .eq("schedule_id", scheduleId);

  const existingOverrideIds = (existingOverrideDays ?? []).map((row) => row.id);
  if (existingOverrideIds.length > 0) {
    await supabase.from("schedule_override_blocks").delete().in("override_day_id", existingOverrideIds);
  }
  await supabase.from("schedule_override_days").delete().eq("schedule_id", scheduleId);

  const blockRows = payload.blocks.map((block, index) => ({
    schedule_id: scheduleId,
    template_id: block.templateId ?? null,
    week_index: block.weekIndex,
    weekday: block.weekday,
    title: block.title,
    location: block.location ?? null,
    starts_at_local: block.startsAtLocal,
    ends_at_local: block.endsAtLocal,
    spans_next_day: block.spansNextDay,
    sort_order: block.sortOrder ?? index
  }));

  if (blockRows.length > 0) {
    const { error: blockError } = await supabase.from("schedule_blocks").insert(blockRows);
    if (blockError) {
      throw new Error(blockError.message);
    }
  }

  if (payload.pauses.length > 0) {
    const { error: pauseError } = await supabase.from("schedule_pauses").insert(
      payload.pauses.map((pause) => ({
        schedule_id: scheduleId,
        start_on: pause.startOn,
        end_on: pause.endOn,
        reason: pause.reason ?? null
      }))
    );

    if (pauseError) {
      throw new Error(pauseError.message);
    }
  }

  for (const overrideDay of payload.overrideDays) {
    const { data: insertedOverride, error: overrideError } = await supabase
      .from("schedule_override_days")
      .insert({
        schedule_id: scheduleId,
        override_date: overrideDay.overrideDate,
        notes: overrideDay.notes ?? null
      })
      .select("id")
      .single();

    if (overrideError) {
      throw new Error(overrideError.message);
    }

    if (overrideDay.blocks.length > 0) {
      const { error: overrideBlockError } = await supabase.from("schedule_override_blocks").insert(
        overrideDay.blocks.map((block, index) => ({
          override_day_id: insertedOverride.id,
          template_id: block.templateId ?? null,
          title: block.title,
          location: block.location ?? null,
          starts_at_local: block.startsAtLocal,
          ends_at_local: block.endsAtLocal,
          spans_next_day: block.spansNextDay,
          sort_order: block.sortOrder ?? index
        }))
      );

      if (overrideBlockError) {
        throw new Error(overrideBlockError.message);
      }
    }
  }
}

export async function createSchedule(input: unknown) {
  const parsed = normalizeSchedulePayload(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  await validateScheduleFamilyMember(supabase, parsed.familyId, parsed.familyMemberId);

  const { data, error } = await supabase
    .from("schedule_series")
    .insert({
      family_id: parsed.familyId,
      family_member_id: parsed.familyMemberId,
      title: parsed.title,
      category: parsed.category,
      color: parsed.color,
      location: parsed.location ?? null,
      notes: parsed.notes ?? null,
      starts_on: parsed.startsOn,
      ends_on: parsed.endsOn ?? null,
      cycle_length_weeks: parsed.cycleLengthWeeks,
      is_enabled: parsed.isEnabled,
      created_by: userId,
      updated_by: userId
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await replaceScheduleChildren(supabase, String(data.id), parsed);
  return String(data.id);
}

export async function updateSchedule(scheduleId: string, input: unknown) {
  const parsed = normalizeSchedulePayload(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  await validateScheduleFamilyMember(supabase, parsed.familyId, parsed.familyMemberId);

  const { error } = await supabase
    .from("schedule_series")
    .update({
      family_id: parsed.familyId,
      family_member_id: parsed.familyMemberId,
      title: parsed.title,
      category: parsed.category,
      color: parsed.color,
      location: parsed.location ?? null,
      notes: parsed.notes ?? null,
      starts_on: parsed.startsOn,
      ends_on: parsed.endsOn ?? null,
      cycle_length_weeks: parsed.cycleLengthWeeks,
      is_enabled: parsed.isEnabled,
      updated_by: userId
    })
    .eq("id", scheduleId);

  if (error) {
    throw new Error(error.message);
  }

  await replaceScheduleChildren(supabase, scheduleId, parsed);
}

export async function archiveSchedule(scheduleId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase
    .from("schedule_series")
    .update({ archived: true, updated_by: userId })
    .eq("id", scheduleId);

  if (error) {
    throw new Error(error.message);
  }
}

const occurrenceRangeSchema = z.object({
  familyId: z.string().uuid(),
  start: z.coerce.date(),
  end: z.coerce.date()
});

export async function getScheduleOccurrencesForFamily(input: unknown): Promise<ScheduleOccurrence[]> {
  const parsed = occurrenceRangeSchema.parse(input);
  const schedules = await getSchedulesForFamily(parsed.familyId);
  return expandSchedulesForFamily(schedules, parsed.start, parsed.end);
}
