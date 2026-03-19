import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FamilySummary = {
  id: string;
  name: string;
  role: "admin" | "adult" | "child";
};

export type ActiveFamilyContext = {
  activeFamilyId: string | null;
  families: FamilySummary[];
};

export const getActiveFamilyContext = cache(async function getActiveFamilyContext(userId: string): Promise<ActiveFamilyContext> {
  const supabase = await createClient();

  await supabase.rpc("claim_family_invites_for_current_user");

  const { data: memberships, error: membershipsError } = await supabase
    .from("family_members")
    .select("family_id, role, families!family_members_family_id_fkey(id, name)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const families =
    memberships?.flatMap((row) => {
      const family = Array.isArray(row.families) ? row.families[0] : row.families;
      if (!family) {
        return [];
      }

      return [
        {
          id: family.id,
          name: family.name,
          role: row.role
        }
      ];
    }) ?? [];

  const { data: settings } = await supabase.from("user_settings").select("active_family_id").eq("user_id", userId).maybeSingle();

  let activeFamilyId = settings?.active_family_id ?? null;

  if (families.length > 0 && (!activeFamilyId || !families.some((family) => family.id === activeFamilyId))) {
    activeFamilyId = families[0].id;
    await supabase.rpc("set_active_family", { target_family_id: activeFamilyId });
  }

  return {
    activeFamilyId,
    families
  };
});
