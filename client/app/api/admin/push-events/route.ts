import { NextResponse } from "next/server";
import { getPushEventFlags, updatePushEventFlag } from "@/features/push/server";

export async function GET() {
  try {
    const events = await getPushEventFlags();
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load push event settings" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updatePushEventFlag(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update push event setting" },
      { status: 400 }
    );
  }
}
