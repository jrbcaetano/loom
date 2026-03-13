import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { savePushSubscription } from "@/features/push/server";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const userAgent = request.headers.get("user-agent");
    await savePushSubscription(user.id, body, userAgent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save push subscription" },
      { status: 400 }
    );
  }
}
