import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSupportedLocale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { locale?: string } | null;

  if (!body?.locale || !isSupportedLocale(body.locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("loom-locale", body.locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").update({ preferred_locale: body.locale }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
