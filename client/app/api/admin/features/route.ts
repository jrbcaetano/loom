import { NextResponse } from "next/server";
import { getProductFeatureFlags, updateProductFeatureFlag } from "@/features/admin/server";

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
    const features = await getProductFeatureFlags();
    return NextResponse.json({ features });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch product features";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updateProductFeatureFlag(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product feature";
    return NextResponse.json({ error: message }, { status: toStatusCode(message) });
  }
}
