import { NextResponse } from "next/server";
import { removeFamilyInvite } from "@/features/families/server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const familyId = url.searchParams.get("familyId");
    if (!familyId) {
      return NextResponse.json({ error: "familyId is required" }, { status: 400 });
    }

    await removeFamilyInvite({ familyId, memberId: params.memberId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
