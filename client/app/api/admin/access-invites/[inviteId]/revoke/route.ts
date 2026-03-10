import { NextResponse } from "next/server";
import { revokeAccessInvite } from "@/features/admin/server";

function toStatusCode(message: string) {
  if (message === "Not authenticated") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  return 400;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ inviteId: string }> }
) {
  try {
    const params = await context.params;
    await revokeAccessInvite({ inviteId: params.inviteId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke invite";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}
