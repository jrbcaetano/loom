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
  name: nonEmptyTextSchema.max(120)
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
}

export async function updateFamily(input: unknown) {
  const parsed = updateFamilySchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("families").update({ name: parsed.name }).eq("id", parsed.familyId);

  if (error) {
    throw new Error(error.message);
  }
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
