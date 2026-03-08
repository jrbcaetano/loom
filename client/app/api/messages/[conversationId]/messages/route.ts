import { NextResponse } from "next/server";
import { getMessages, sendMessage } from "@/features/messages/server";

type RouteParams = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { conversationId } = await params;

  try {
    const messages = await getMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load messages" }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { conversationId } = await params;

  try {
    const body = (await request.json()) as { content: string };
    const messageId = await sendMessage({ conversationId, content: body.content });
    return NextResponse.json({ messageId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send message" }, { status: 400 });
  }
}
