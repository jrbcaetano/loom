import { NextResponse } from "next/server";
import { markConversationRead } from "@/features/messages/server";

type RouteParams = { params: Promise<{ conversationId: string }> };

export async function PATCH(_request: Request, { params }: RouteParams) {
  const { conversationId } = await params;

  try {
    await markConversationRead(conversationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to mark conversation as read" }, { status: 400 });
  }
}
