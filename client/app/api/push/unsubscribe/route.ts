import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { removePushSubscriptionByEndpoint } from "@/features/push/server";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = unsubscribeSchema.parse(await request.json());
    await removePushSubscriptionByEndpoint(user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove push subscription" },
      { status: 400 }
    );
  }
}
