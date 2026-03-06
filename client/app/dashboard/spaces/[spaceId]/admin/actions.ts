"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function inviteMember(
  spaceId: string,
  _prevState: { error: string | null; success: string | null },
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated.", success: null };
  }

  const { error } = await supabase.from("space_invites").insert({
    space_id: spaceId,
    email,
    role: "member",
    invited_by: user.id
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "There is already a pending invite for this email.", success: null };
    }

    return { error: error.message, success: null };
  }

  revalidatePath(`/dashboard/spaces/${spaceId}/admin`);
  return { error: null, success: `Invite sent to ${email}.` };
}
