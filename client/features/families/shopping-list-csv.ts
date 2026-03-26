import { addListItem, deleteListItem, getListById, getShoppingListIdForFamily, updateList, updateListItem } from "@/features/lists/server";

const SHOPPING_LIST_CSV_HEADERS = ["action", "id", "text", "quantity", "price", "category", "is_completed"] as const;
const SHOPPING_LIST_CATEGORY_CSV_HEADERS = ["action", "value"] as const;

type ShoppingListCsvAction = "upsert" | "delete";
type ShoppingListCategoryCsvAction = "upsert" | "delete";

type ParsedShoppingListCsvRow = {
  rowNumber: number;
  action: ShoppingListCsvAction;
  id: string;
  text: string;
  quantity: string;
  price: string;
  category: string;
  isCompleted: string;
};

export type ShoppingListCsvRowResult = {
  rowNumber: number;
  action: ShoppingListCsvAction;
  itemRef: string;
  status: "success" | "error";
  error: string | null;
};

export type ShoppingListCsvImportReport = {
  fileName: string;
  shoppingListId: string;
  processedRows: number;
  successCount: number;
  errorCount: number;
  results: ShoppingListCsvRowResult[];
};

type ParsedShoppingListCategoryCsvRow = {
  rowNumber: number;
  action: ShoppingListCategoryCsvAction;
  value: string;
};

export type ShoppingListCategoryCsvRowResult = {
  rowNumber: number;
  action: ShoppingListCategoryCsvAction;
  categoryRef: string;
  status: "success" | "error";
  error: string | null;
};

export type ShoppingListCategoryCsvImportReport = {
  fileName: string;
  shoppingListId: string;
  processedRows: number;
  successCount: number;
  errorCount: number;
  results: ShoppingListCategoryCsvRowResult[];
};

type ShoppingListSnapshotItem = {
  id: string;
  text: string;
  quantity: string | null;
  price: string | number | null;
  category: string | null;
  isCompleted: boolean;
};

function encodeCsvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (isQuoted && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      isQuoted = !isQuoted;
      continue;
    }

    if (character === "," && !isQuoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvRows(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const expectedHeaders = [...SHOPPING_LIST_CSV_HEADERS];
  if (headers.join("|") !== expectedHeaders.join("|")) {
    throw new Error(`Invalid CSV headers. Expected: ${expectedHeaders.join(", ")}`);
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const values = expectedHeaders.map((_, index) => cells[index] ?? "");
    const [action, id, text, quantity, price, category, isCompleted] = values;

    if (action !== "upsert" && action !== "delete") {
      throw new Error(`Invalid action on row ${rowIndex + 2}. Use "upsert" or "delete".`);
    }

    return {
      rowNumber: rowIndex + 2,
      action,
      id,
      text,
      quantity,
      price,
      category,
      isCompleted
    } satisfies ParsedShoppingListCsvRow;
  });
}

function parseCategoryCsvRows(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const expectedHeaders = [...SHOPPING_LIST_CATEGORY_CSV_HEADERS];
  if (headers.join("|") !== expectedHeaders.join("|")) {
    throw new Error(`Invalid CSV headers. Expected: ${expectedHeaders.join(", ")}`);
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const values = expectedHeaders.map((_, index) => cells[index] ?? "");
    const [action, value] = values;

    if (action !== "upsert" && action !== "delete") {
      throw new Error(`Invalid action on row ${rowIndex + 2}. Use "upsert" or "delete".`);
    }

    return {
      rowNumber: rowIndex + 2,
      action,
      value
    } satisfies ParsedShoppingListCategoryCsvRow;
  });
}

function parseOptionalBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new Error('Use "true" or "false" for is_completed.');
}

function normalizeItemRef(row: ParsedShoppingListCsvRow) {
  return row.text.trim() || row.id.trim() || `row-${row.rowNumber}`;
}

export async function exportShoppingListCsvTemplate() {
  const rows = [
    SHOPPING_LIST_CSV_HEADERS.join(","),
    ["upsert", "", "Milk", "1", "1.89", "Dairy", "false"].map(encodeCsvCell).join(","),
    ["upsert", "", "Apples", "0.75", "2.99", "Produce", "true"].map(encodeCsvCell).join(","),
    ["delete", "existing-item-id", "Old item name", "", "", "", ""].map(encodeCsvCell).join(",")
  ];

  return rows.join("\n");
}

export async function exportShoppingListCategoryCsvTemplate() {
  const rows = [
    SHOPPING_LIST_CATEGORY_CSV_HEADERS.join(","),
    ["upsert", "Dairy"].map(encodeCsvCell).join(","),
    ["upsert", "Produce"].map(encodeCsvCell).join(","),
    ["delete", "Old category"].map(encodeCsvCell).join(",")
  ];

  return rows.join("\n");
}

function normalizeLookupKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function syncMaps(
  itemsById: Map<string, ShoppingListSnapshotItem>,
  itemsByText: Map<string, ShoppingListSnapshotItem>,
  nextItem: ShoppingListSnapshotItem,
  previousText?: string | null
) {
  itemsById.set(nextItem.id, nextItem);

  if (previousText && normalizeLookupKey(previousText) !== normalizeLookupKey(nextItem.text)) {
    itemsByText.delete(normalizeLookupKey(previousText));
  }

  itemsByText.set(normalizeLookupKey(nextItem.text), nextItem);
}

export async function exportShoppingListCsvForFamily(familyId: string) {
  const shoppingListId = await getShoppingListIdForFamily(familyId);
  if (!shoppingListId) {
    throw new Error("Shopping List not found for this family.");
  }

  const list = await getListById(shoppingListId);
  if (!list) {
    throw new Error("Shopping List not found.");
  }

  const rows = [
    SHOPPING_LIST_CSV_HEADERS.join(","),
    ...list.items.map((item) =>
      [
        "upsert",
        item.id,
        item.text,
        item.quantity ?? "",
        item.price ?? "",
        item.category ?? "",
        item.isCompleted ? "true" : "false"
      ]
        .map(encodeCsvCell)
        .join(",")
    )
  ];

  return {
    shoppingListId,
    csv: rows.join("\n")
  };
}

export async function exportShoppingListCategoryCsvForFamily(familyId: string) {
  const shoppingListId = await getShoppingListIdForFamily(familyId);
  if (!shoppingListId) {
    throw new Error("Shopping List not found for this family.");
  }

  const list = await getListById(shoppingListId);
  if (!list) {
    throw new Error("Shopping List not found.");
  }

  const rows = [
    SHOPPING_LIST_CATEGORY_CSV_HEADERS.join(","),
    ...list.categories.map((category) => ["upsert", category.value].map(encodeCsvCell).join(","))
  ];

  return {
    shoppingListId,
    csv: rows.join("\n")
  };
}

export async function importShoppingListCsvForFamily(familyId: string, fileName: string, csvText: string): Promise<ShoppingListCsvImportReport> {
  const shoppingListId = await getShoppingListIdForFamily(familyId);
  if (!shoppingListId) {
    throw new Error("Shopping List not found for this family.");
  }

  const parsedRows = parseCsvRows(csvText);
  const list = await getListById(shoppingListId);
  if (!list) {
    throw new Error("Shopping List not found.");
  }

  const itemsById = new Map<string, ShoppingListSnapshotItem>(list.items.map((item) => [item.id, item]));
  const itemsByText = new Map<string, ShoppingListSnapshotItem>(list.items.map((item) => [normalizeLookupKey(item.text), item]));
  const results: ShoppingListCsvRowResult[] = [];

  for (const row of parsedRows) {
    const itemRef = normalizeItemRef(row);

    try {
      if (row.action === "delete") {
        const existingItem =
          (row.id.trim() ? itemsById.get(row.id.trim()) : null) ??
          (row.text.trim() ? itemsByText.get(normalizeLookupKey(row.text)) : null);

        if (!existingItem) {
          throw new Error("Item not found for deletion.");
        }

        await deleteListItem(existingItem.id);
        itemsById.delete(existingItem.id);
        itemsByText.delete(normalizeLookupKey(existingItem.text));
      } else {
        const isCompleted = parseOptionalBoolean(row.isCompleted);

        if (row.id.trim()) {
          const existingItem = itemsById.get(row.id.trim());
          if (!existingItem) {
            throw new Error("Item id was not found in the Shopping List.");
          }

          const updateBody: Record<string, unknown> = { itemId: row.id.trim() };
          if (row.text.trim()) updateBody.text = row.text.trim();
          updateBody.quantity = row.quantity.trim() || null;
          updateBody.price = row.price.trim() || null;
          updateBody.category = row.category.trim() || null;
          if (typeof isCompleted === "boolean") updateBody.isCompleted = isCompleted;

          await updateListItem(updateBody);

          syncMaps(itemsById, itemsByText, {
            ...existingItem,
            text: row.text.trim() || existingItem.text,
            quantity: row.quantity.trim() || null,
            price: row.price.trim() || null,
            category: row.category.trim() || null,
            isCompleted: typeof isCompleted === "boolean" ? isCompleted : existingItem.isCompleted
          }, existingItem.text);
        } else {
          if (!row.text.trim()) {
            throw new Error("Text is required for new items.");
          }

          const existingByText = itemsByText.get(normalizeLookupKey(row.text));
          if (existingByText) {
            throw new Error("A Shopping List item with the same name already exists. Use its id to update it.");
          }

          const itemId = await addListItem({
            listId: shoppingListId,
            text: row.text.trim(),
            quantity: row.quantity.trim() || null,
            price: row.price.trim() || null,
            category: row.category.trim() || null
          });

          const createdItem: ShoppingListSnapshotItem = {
            id: itemId,
            text: row.text.trim(),
            quantity: row.quantity.trim() || null,
            price: row.price.trim() || null,
            category: row.category.trim() || null,
            isCompleted: typeof isCompleted === "boolean" ? isCompleted : false
          };

          if (typeof isCompleted === "boolean") {
            await updateListItem({ itemId, isCompleted });
          }

          syncMaps(itemsById, itemsByText, createdItem);
        }
      }

      results.push({
        rowNumber: row.rowNumber,
        action: row.action,
        itemRef,
        status: "success",
        error: null
      });
    } catch (error) {
      results.push({
        rowNumber: row.rowNumber,
        action: row.action,
        itemRef,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown import error"
      });
    }
  }

  const successCount = results.filter((result) => result.status === "success").length;
  const errorCount = results.length - successCount;

  return {
    fileName,
    shoppingListId,
    processedRows: results.length,
    successCount,
    errorCount,
    results
  };
}

export async function importShoppingListCategoryCsvForFamily(
  familyId: string,
  fileName: string,
  csvText: string
): Promise<ShoppingListCategoryCsvImportReport> {
  const shoppingListId = await getShoppingListIdForFamily(familyId);
  if (!shoppingListId) {
    throw new Error("Shopping List not found for this family.");
  }

  const parsedRows = parseCategoryCsvRows(csvText);
  const list = await getListById(shoppingListId);
  if (!list) {
    throw new Error("Shopping List not found.");
  }

  const categoryMap = new Map(list.categories.map((category) => [normalizeLookupKey(category.value), category.value]));
  const usageMap = new Map<string, number>();
  for (const item of list.items) {
    const category = item.category?.trim();
    if (!category) continue;
    const key = normalizeLookupKey(category);
    usageMap.set(key, (usageMap.get(key) ?? 0) + 1);
  }

  const results: ShoppingListCategoryCsvRowResult[] = [];

  for (const row of parsedRows) {
    const categoryRef = row.value.trim() || `row-${row.rowNumber}`;

    try {
      const normalizedValue = normalizeLookupKey(row.value);
      if (!normalizedValue) {
        throw new Error("Category value is required.");
      }

      if (row.action === "delete") {
        const existingCategory = categoryMap.get(normalizedValue);
        if (!existingCategory) {
          throw new Error("Category not found for deletion.");
        }

        const usageCount = usageMap.get(normalizedValue) ?? 0;
        if (usageCount > 0) {
          throw new Error(`Category is still used by ${usageCount} items.`);
        }

        categoryMap.delete(normalizedValue);
      } else {
        categoryMap.set(normalizedValue, row.value.trim());
      }

      results.push({
        rowNumber: row.rowNumber,
        action: row.action,
        categoryRef,
        status: "success",
        error: null
      });
    } catch (error) {
      results.push({
        rowNumber: row.rowNumber,
        action: row.action,
        categoryRef,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown import error"
      });
    }
  }

  const hasSuccessfulChanges = results.some((result) => result.status === "success");
  if (hasSuccessfulChanges) {
    await updateList(shoppingListId, {
      categories: Array.from(categoryMap.values()).map((value) => ({ value }))
    });
  }

  const successCount = results.filter((result) => result.status === "success").length;
  const errorCount = results.length - successCount;

  return {
    fileName,
    shoppingListId,
    processedRows: results.length,
    successCount,
    errorCount,
    results
  };
}
