import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeHomeDashboardPreferences } from "@/features/home/dashboard";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("home_dashboard")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    dashboard: normalizeHomeDashboardPreferences(data?.home_dashboard ?? null)
  });
}

export async function POST(request: Request) {
  const rawBody = (await request.json().catch(() => null)) as unknown;
  const dashboard = normalizeHomeDashboardPreferences(rawBody);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      home_dashboard: dashboard
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, dashboard });
}
