import { NextResponse } from "next/server";
import { getNotifications, markAllNotificationsRead } from "@/features/notifications/server";

export async function GET() {
  try {
    const notifications = await getNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH() {
  try {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark all notifications as read";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
