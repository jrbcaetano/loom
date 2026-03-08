import { NextResponse } from "next/server";
import { createDirectConversation, getConversations } from "@/features/messages/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const conversations = await getConversations(familyId);
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load conversations" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { familyId: string; otherUserId: string };
    const conversationId = await createDirectConversation({ familyId: body.familyId, otherUserId: body.otherUserId });
    return NextResponse.json({ conversationId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create conversation" }, { status: 400 });
  }
}
