import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { familyId?: string | null } | null;

  if (!body || body.familyId === undefined) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_family", { target_family_id: body.familyId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
