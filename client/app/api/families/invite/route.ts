import { NextResponse } from "next/server";
import { inviteFamilyMember } from "@/features/families/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await inviteFamilyMember(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
