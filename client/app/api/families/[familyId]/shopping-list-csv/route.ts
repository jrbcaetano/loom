import { NextResponse } from "next/server";
import {
  exportShoppingListCategoryCsvForFamily,
  exportShoppingListCategoryCsvTemplate,
  exportShoppingListCsvForFamily,
  exportShoppingListCsvTemplate,
  importShoppingListCategoryCsvForFamily,
  importShoppingListCsvForFamily
} from "@/features/families/shopping-list-csv";

type RouteParams = {
  params: Promise<{ familyId: string }>;
};

function buildCsvResponse(csv: string, fileName: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store"
    }
  });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { familyId } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const dataset = searchParams.get("dataset") ?? "items";

  try {
    if (mode === "template") {
      if (dataset === "categories") {
        const csv = await exportShoppingListCategoryCsvTemplate();
        return buildCsvResponse(csv, "shopping-list-categories-template.csv");
      }

      const csv = await exportShoppingListCsvTemplate();
      return buildCsvResponse(csv, "shopping-list-template.csv");
    }

    if (mode === "export") {
      if (dataset === "categories") {
        const { csv } = await exportShoppingListCategoryCsvForFamily(familyId);
        return buildCsvResponse(csv, "shopping-list-categories-export.csv");
      }

      const { csv } = await exportShoppingListCsvForFamily(familyId);
      return buildCsvResponse(csv, "shopping-list-export.csv");
    }

    return NextResponse.json({ error: 'Invalid mode. Use "template" or "export".' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare CSV";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { familyId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const dataset = String(formData.get("dataset") ?? "items");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("A CSV file is required.");
    }

    const lowerName = file.name.toLowerCase();
    if (!(file.type === "text/csv" || lowerName.endsWith(".csv"))) {
      throw new Error("Only CSV files are supported.");
    }

    if (dataset === "categories") {
      const report = await importShoppingListCategoryCsvForFamily(familyId, file.name, await file.text());
      return NextResponse.json(report);
    }

    const report = await importShoppingListCsvForFamily(familyId, file.name, await file.text());
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import CSV";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
