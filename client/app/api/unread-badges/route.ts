import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUnreadNotificationsCount } from "@/features/notifications/server";
import { getUnreadMessagesCount } from "@/features/messages/server";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const familyId = url.searchParams.get("familyId");

    const [unreadNotificationsCount, unreadMessagesCount] = await Promise.all([
      getUnreadNotificationsCount(),
      familyId ? getUnreadMessagesCount(familyId) : Promise.resolve(0)
    ]);

    return NextResponse.json({
      unreadNotificationsCount,
      unreadMessagesCount
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load unread badges" },
      { status: 400 }
    );
  }
}
