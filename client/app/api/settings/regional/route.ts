import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDateFormatOption, isTimeFormatOption } from "@/lib/regional";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { dateFormat?: string; timeFormat?: string } | null;

  if (!body?.dateFormat || !isDateFormatOption(body.dateFormat)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (!body?.timeFormat || !isTimeFormatOption(body.timeFormat)) {
    return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("loom-date-format", body.dateFormat, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });
  cookieStore.set("loom-time-format", body.timeFormat, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        date_format: body.dateFormat,
        time_format: body.timeFormat
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
