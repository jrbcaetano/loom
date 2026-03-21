import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAppDensity } from "@/lib/theme";
import { setDensityCookie } from "@/lib/theme/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { density?: string } | null;

  if (!body?.density || !isAppDensity(body.density)) {
    return NextResponse.json({ error: "Invalid density" }, { status: 400 });
  }

  await setDensityCookie(body.density);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        density: body.density
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
