import { NextResponse } from "next/server";
import { markNotificationRead } from "@/features/notifications/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark notification as read";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
