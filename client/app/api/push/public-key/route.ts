import { NextResponse } from "next/server";
import { getPushPublicKey } from "@/features/push/server";

export async function GET() {
  const publicKey = getPushPublicKey();

  if (!publicKey) {
    return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 });
  }

  return NextResponse.json({ publicKey });
}
