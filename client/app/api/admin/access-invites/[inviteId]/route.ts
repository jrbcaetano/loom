import { NextResponse } from "next/server";
import { deleteAccessInvite, setAccessInviteActive } from "@/features/admin/server";

function toStatusCode(message: string) {
  if (message === "Not authenticated") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  return 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ inviteId: string }> }
) {
  try {
    const params = await context.params;
    const body = (await request.json().catch(() => null)) as { isActive?: boolean } | null;
    if (typeof body?.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    await setAccessInviteActive({ inviteId: params.inviteId, isActive: body.isActive });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update invite";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ inviteId: string }> }
) {
  try {
    const params = await context.params;
    await deleteAccessInvite({ inviteId: params.inviteId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete invite";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}
