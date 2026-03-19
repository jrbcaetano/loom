import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthAvatarUrl, getAuthDisplayName } from "@/lib/auth-user";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  preferredLocale: z.enum(["en", "pt"]).default("en"),
  avatarUrl: z.string().url().nullable().optional()
});

export type ProfileRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  preferredLocale: string;
};

export const getMyProfile = cache(async function getMyProfile(): Promise<ProfileRow | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, preferred_locale")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      id: user.id,
      email: user.email ?? null,
      fullName: getAuthDisplayName(user),
      avatarUrl: getAuthAvatarUrl(user),
      preferredLocale: "en"
    };
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name ?? getAuthDisplayName(user),
    avatarUrl: data.avatar_url ?? getAuthAvatarUrl(user),
    preferredLocale: data.preferred_locale
  };
});

export async function updateMyProfile(input: unknown) {
  const parsed = profileSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.from("profiles").update({
    full_name: parsed.fullName,
    preferred_locale: parsed.preferredLocale,
    avatar_url: parsed.avatarUrl ?? null
  }).eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
