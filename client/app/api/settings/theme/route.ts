import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAppTheme } from "@/lib/theme";
import { setThemeCookie } from "@/lib/theme/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { theme?: string } | null;

  if (!body?.theme || !isAppTheme(body.theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  await setThemeCookie(body.theme);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        theme: body.theme
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
