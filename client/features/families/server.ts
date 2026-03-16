import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema } from "@/features/shared/validation";

export type FamilyMember = {
  id: string;
  userId: string | null;
  role: "admin" | "adult" | "child";
  status: "active" | "invited" | "inactive";
  invitedEmail: string | null;
  joinedAt: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type FamilyExternalCalendar = {
  id: string;
  displayName: string | null;
  sourceUrl: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FamilySettings = {
  allowMultipleLists: boolean;
};

const createFamilySchema = z.object({
  name: nonEmptyTextSchema.max(120)
});

const inviteSchema = z.object({
  familyId: z.string().uuid(),
  email: z.string().email().trim(),
  role: z.enum(["adult", "child", "admin"]).default("adult")
});

const updateFamilySchema = z.object({
  familyId: z.string().uuid(),
  name: nonEmptyTextSchema.max(120),
  allowMultipleLists: z.boolean().optional(),
  externalCalendars: z
    .array(
      z.object({
        displayName: z.string().trim().max(120).optional().nullable(),
        sourceUrl: z.string().trim().url().max(2000),
        isEnabled: z.boolean().default(true)
      })
    )
    .max(20)
    .optional()
});

export async function createFamily(input: unknown) {
  const parsed = createFamilySchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_family_with_admin", {
    family_name: parsed.name
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function inviteFamilyMember(input: unknown) {
  const parsed = inviteSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_family_member", {
    target_family_id: parsed.familyId,
    invite_email: parsed.email,
    invite_role: parsed.role
  });

  if (error) {
    throw new Error(error.message);
  }

  const { error: accessError } = await supabase.rpc("upsert_app_access_invite_from_family", {
    target_family_id: parsed.familyId,
    target_email: parsed.email
  });

  if (accessError) {
    if (accessError.code === "42883") {
      throw new Error("Access invite migration not found. Re-run latest migration.");
    }
    throw new Error(accessError.message);
  }
}

const removeInviteSchema = z.object({
  familyId: z.string().uuid(),
  memberId: z.string().uuid()
});

export async function removeFamilyInvite(input: unknown) {
  const parsed = removeInviteSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("family_id", parsed.familyId)
    .eq("id", parsed.memberId)
    .eq("status", "invited")
    .is("user_id", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateFamily(input: unknown) {
  const parsed = updateFamilySchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("families")
    .update({
      name: parsed.name,
      allow_multiple_lists: parsed.allowMultipleLists ?? true
    })
    .eq("id", parsed.familyId);

  if (error) {
    throw new Error(error.message);
  }

  if (parsed.externalCalendars === undefined) {
    return;
  }

  const deduped = new Map<string, { displayName: string | null; sourceUrl: string; isEnabled: boolean }>();
  for (const entry of parsed.externalCalendars) {
    const sourceUrl = entry.sourceUrl.trim();
    const key = sourceUrl.toLowerCase();
    deduped.set(key, {
      displayName: entry.displayName?.trim() ? entry.displayName.trim() : null,
      sourceUrl,
      isEnabled: entry.isEnabled
    });
  }

  const { error: deleteError } = await supabase
    .from("family_external_calendars")
    .delete()
    .eq("family_id", parsed.familyId);

  if (deleteError && deleteError.code !== "42P01") {
    throw new Error(deleteError.message);
  }

  const rows = Array.from(deduped.values());
  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("family_external_calendars").insert(
    rows.map((entry) => ({
      family_id: parsed.familyId,
      display_name: entry.displayName,
      source_url: entry.sourceUrl,
      is_enabled: entry.isEnabled,
      created_by: user.id,
      updated_by: user.id
    }))
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function getFamilySettings(familyId: string): Promise<FamilySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("families").select("allow_multiple_lists").eq("id", familyId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    allowMultipleLists: data?.allow_multiple_lists ?? true
  };
}

export async function getFamilyExternalCalendars(familyId: string): Promise<FamilyExternalCalendar[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_external_calendars")
    .select("id, display_name, source_url, is_enabled, created_at, updated_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    sourceUrl: row.source_url,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("family_members")
    .select("id, user_id, role, status, invited_email, joined_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const userIds = rows?.map((row) => row.user_id).filter(Boolean) as string[];
  const profileMap = new Map<string, { full_name: string | null; email: string | null; avatar_url: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url
      });
    }
  }

  return (rows ?? []).map((row) => {
    const profile = row.user_id ? profileMap.get(row.user_id) : null;

    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      invitedEmail: row.invited_email,
      joinedAt: row.joined_at,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? row.invited_email ?? null,
      avatarUrl: profile?.avatar_url ?? null
    };
  });
}
