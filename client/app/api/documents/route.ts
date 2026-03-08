import { NextResponse } from "next/server";
import { createDocument, getDocuments } from "@/features/documents/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const familyId = searchParams.get("familyId");
  const search = searchParams.get("search") ?? undefined;

  if (!familyId) {
    return NextResponse.json({ error: "familyId is required" }, { status: 400 });
  }

  try {
    const documents = await getDocuments(familyId, search);
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load documents" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const documentId = await createDocument(body);
    return NextResponse.json({ documentId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create document" }, { status: 400 });
  }
}
