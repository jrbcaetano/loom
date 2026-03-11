import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  PRODUCT_FEATURE_CATALOG,
  getDefaultProductFeatureAvailability,
  isKnownProductFeatureKey,
  normalizeProductFeatureAvailability,
  type ProductFeatureAvailability
} from "@/lib/product-features";
import { createClient } from "@/lib/supabase/server";
import type { AccessInvite, ProductFeatureFlag } from "@/features/admin/types";

const createAccessInviteSchema = z.object({
  email: z.string().email().trim().max(320),
  expiresAt: z.string().datetime().nullable().optional()
});

const revokeAccessInviteSchema = z.object({
  inviteId: z.string().uuid()
});

const updateProductFeatureSchema = z.object({
  featureKey: z.string().min(1),
  isEnabled: z.boolean()
});

function toDisplayName(profile: { full_name: string | null; email: string | null } | undefined) {
  if (!profile) {
    return null;
  }

  return profile.full_name ?? profile.email ?? null;
}

export async function isProductAdminByUserId(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_product_admin", {
    target_user_id: userId
  });

  if (error) {
    if (error.code === "42883" || error.message.includes("is_product_admin")) {
      return false;
    }

    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function requireProductAdminUser() {
  const user = await requireUser();
  const isAdmin = await isProductAdminByUserId(user.id);

  if (!isAdmin) {
    redirect("/home");
  }

  return user;
}

export async function assertProductAdmin() {
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

  const isAdmin = await isProductAdminByUserId(user.id);
  if (!isAdmin) {
    throw new Error("Forbidden");
  }

  return { userId: user.id };
}

export async function getProductFeatureAvailability(): Promise<ProductFeatureAvailability> {
  const defaults = getDefaultProductFeatureAvailability();
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_feature_flags").select("feature_key, is_enabled");

  if (error) {
    return defaults;
  }

  const partial: Partial<ProductFeatureAvailability> = {};
  for (const row of data ?? []) {
    if (!isKnownProductFeatureKey(row.feature_key)) {
      continue;
    }

    partial[row.feature_key] = Boolean(row.is_enabled);
  }

  return normalizeProductFeatureAvailability(partial);
}

export async function getProductFeatureFlags(): Promise<ProductFeatureFlag[]> {
  await assertProductAdmin();

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("product_feature_flags")
    .select("feature_key, is_enabled, updated_at, updated_by");

  if (error) {
    if (error.code === "42P01") {
      return PRODUCT_FEATURE_CATALOG.map((feature) => ({
        featureKey: feature.key,
        isEnabled: true,
        updatedAt: null,
        updatedByUserId: null,
        updatedByLabel: null
      }));
    }

    throw new Error(error.message);
  }

  const actorIds = Array.from(
    new Set((rows ?? []).map((row) => row.updated_by).filter((value): value is string => Boolean(value)))
  );

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email
      });
    }
  }

  const rowMap = new Map<string, { is_enabled: boolean; updated_at: string | null; updated_by: string | null }>();
  for (const row of rows ?? []) {
    rowMap.set(row.feature_key, {
      is_enabled: Boolean(row.is_enabled),
      updated_at: row.updated_at,
      updated_by: row.updated_by
    });
  }

  return PRODUCT_FEATURE_CATALOG.map((feature) => {
    const row = rowMap.get(feature.key);
    const updatedByProfile = row?.updated_by ? profileMap.get(row.updated_by) : undefined;
    return {
      featureKey: feature.key,
      isEnabled: row?.is_enabled ?? true,
      updatedAt: row?.updated_at ?? null,
      updatedByUserId: row?.updated_by ?? null,
      updatedByLabel: toDisplayName(updatedByProfile)
    };
  });
}

export async function getAccessInvites(): Promise<AccessInvite[]> {
  await assertProductAdmin();

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("app_access_invites")
    .select("id, email, status, created_at, updated_at, expires_at, accepted_at, invited_by, accepted_by")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const actorIds = Array.from(
    new Set(
      (rows ?? [])
        .flatMap((row) => [row.invited_by, row.accepted_by])
        .filter((value): value is string => Boolean(value))
    )
  );

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email
      });
    }
  }

  return (rows ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    invitedByUserId: row.invited_by,
    acceptedByUserId: row.accepted_by,
    invitedByLabel: toDisplayName(row.invited_by ? profileMap.get(row.invited_by) : undefined),
    acceptedByLabel: toDisplayName(row.accepted_by ? profileMap.get(row.accepted_by) : undefined)
  }));
}

export async function createAccessInvite(input: unknown) {
  const parsed = createAccessInviteSchema.parse(input);
  await assertProductAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_app_access_invite", {
    target_email: parsed.email,
    target_expires_at: parsed.expiresAt ?? null
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function revokeAccessInvite(input: unknown) {
  const parsed = revokeAccessInviteSchema.parse(input);
  await assertProductAdmin();

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_app_access_invite", {
    target_invite_id: parsed.inviteId
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProductFeatureFlag(input: unknown) {
  const parsed = updateProductFeatureSchema.parse(input);
  if (!isKnownProductFeatureKey(parsed.featureKey)) {
    throw new Error("Unknown feature key");
  }

  const { userId } = await assertProductAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("product_feature_flags").upsert(
    {
      feature_key: parsed.featureKey,
      is_enabled: parsed.isEnabled,
      updated_by: userId
    },
    {
      onConflict: "feature_key"
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}
