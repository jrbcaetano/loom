import { createClient } from "@/lib/supabase/server";

export type UserSpace = {
  id: string;
  name: string;
  role: "admin" | "member";
};

type SpaceMembershipQueryRow = {
  id: string;
  name: string;
  space_memberships: { role: "admin" | "member" }[];
};

export async function getUserSpaces(userId: string): Promise<UserSpace[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spaces")
    .select("id, name, space_memberships!inner(role)")
    .eq("space_memberships.user_id", userId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as SpaceMembershipQueryRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.space_memberships[0]?.role ?? "member"
  }));
}
