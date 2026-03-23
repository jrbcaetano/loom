import { NextResponse } from "next/server";
import { importRecentPurchaseItems } from "@/features/lists/server";
import { parseRecentPurchaseFiles, parseRecentPurchaseTexts } from "@/features/lists/recent-purchases-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteParams = {
  params: Promise<{ listId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { listId } = await params;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json")
      ? await (async () => {
          const body = (await request.json()) as { storeHint?: unknown; texts?: unknown };
          const texts = Array.isArray(body.texts) ? body.texts.filter((value): value is string => typeof value === "string") : [];

          if (texts.length === 0) {
            throw new Error("At least one extracted receipt text is required.");
          }

          return parseRecentPurchaseTexts(texts, {
            storeHint: typeof body.storeHint === "string" ? body.storeHint : null
          });
        })()
      : await (async () => {
          const formData = await request.formData();
          const storeHint = formData.get("storeHint");
          const files = formData
            .getAll("files")
            .filter((value): value is File => value instanceof File && value.size > 0);

          if (files.length === 0) {
            throw new Error("At least one receipt file is required.");
          }

          const supportedFiles = files.filter((file) => {
            const lowerName = file.name.toLowerCase();
            return file.type === "application/pdf" || lowerName.endsWith(".pdf") || file.type.startsWith("image/");
          });
          if (supportedFiles.length !== files.length) {
            throw new Error("Only PDF and image files are supported.");
          }

          return await parseRecentPurchaseFiles(supportedFiles, {
            storeHint: typeof storeHint === "string" ? storeHint : null
          });
        })();

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
