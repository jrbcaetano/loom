import { NextResponse } from "next/server";
import { createTaskLabel, getTaskLabels } from "@/features/tasks/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const familyId = searchParams.get("familyId");

  if (scope !== "personal" && scope !== "family") {
    return NextResponse.json({ error: "scope must be personal or family" }, { status: 400 });
  }

  if (scope === "family" && !familyId) {
    return NextResponse.json({ error: "familyId is required for family labels" }, { status: 400 });
  }

  try {
    const labels = await getTaskLabels({ scope, familyId });
    return NextResponse.json({ labels });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch task labels";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const label = await createTaskLabel(body);
    return NextResponse.json({ label });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task label";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
