import { NextResponse } from "next/server";
import { createFamily, updateFamily } from "@/features/families/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const familyId = await createFamily(body);
    return NextResponse.json({ familyId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create family";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateFamily(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update family";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
