import { NextResponse } from "next/server";
import { importRecentPurchaseItems } from "@/features/lists/server";
import { parseRecentPurchaseFiles } from "@/features/lists/recent-purchases-catalog";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ listId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    const formData = await request.formData();
    const storeHint = formData.get("storeHint");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one receipt file is required." }, { status: 400 });
    }

    const supportedFiles = files.filter((file) => {
      const lowerName = file.name.toLowerCase();
      return file.type === "application/pdf" || lowerName.endsWith(".pdf") || file.type.startsWith("image/");
    });
    if (supportedFiles.length !== files.length) {
      return NextResponse.json({ error: "Only PDF and image files are supported." }, { status: 400 });
    }

    const parsed = await parseRecentPurchaseFiles(supportedFiles, {
      storeHint: typeof storeHint === "string" ? storeHint : null
    });
    const result = await importRecentPurchaseItems(listId, parsed.items);
    return NextResponse.json({
      ...result,
      notImportedCount: parsed.notImportedCount
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import recent purchases";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
