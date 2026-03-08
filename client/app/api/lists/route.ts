import { NextResponse } from "next/server";
import { createList, getListsForFamily } from "@/features/lists/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const lists = await getListsForFamily(familyId);
    return NextResponse.json({ lists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lists";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const listId = await createList(body);
    return NextResponse.json({ listId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
