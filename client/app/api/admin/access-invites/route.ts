import { NextResponse } from "next/server";
import { createAccessInvite, getAccessInvites } from "@/features/admin/server";

function toStatusCode(message: string) {
  if (message === "Not authenticated") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  return 400;
}

export async function GET() {
  try {
    const invites = await getAccessInvites();
    return NextResponse.json({ invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch access invites";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inviteId = await createAccessInvite(body);
    return NextResponse.json({ inviteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invite";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}
