import type { User } from "@supabase/supabase-js";

type AuthLikeUser = Pick<User, "email" | "user_metadata"> | null | undefined;

function asText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function getAuthAvatarUrl(user: AuthLikeUser) {
  if (!user) return null;
  return asText(user.user_metadata?.avatar_url) ?? asText(user.user_metadata?.picture) ?? null;
}

export function getAuthDisplayName(user: AuthLikeUser) {
  if (!user) return null;
  return (
    asText(user.user_metadata?.full_name) ??
    asText(user.user_metadata?.name) ??
    asText(user.email?.split("@")[0]) ??
    null
  );
}

