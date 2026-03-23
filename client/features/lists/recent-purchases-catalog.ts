export type RecentPurchaseCatalogItem = {
  text: string;
  price: string;
  category: string;
};

export type RecentPurchaseParseResult = {
  items: RecentPurchaseCatalogItem[];
  notImportedCount: number;
};

type ParseOptions = {
  storeHint?: string | null;
};

const SECTION_TO_CATEGORY: Record<string, string> = {
  "mercearia salgada": "Pantry - Savory",
  "mercearia doce": "Pantry - Sweet",
  "bens essenciais": "Pantry - Savory",
  "pequeno almoco": "Breakfast",
  congelados: "Frozen",
  "frutas e legumes": "Produce",
  "laticinios/beb. veg.": "Dairy",
  "laticinios /beb. veg.": "Dairy",
  laticinios: "Dairy",
  talho: "Meat",
  peixaria: "Seafood",
  padaria: "Bakery",
  "take away": "Ready Meals",
  "limpeza do lar": "Household - Cleaning",
  higiene: "Household - Hygiene",
  "casa-cozinha/lavand": "Household - Cleaning",
  "petfood and care": "Pet Care"
};

const IGNORED_DESCRIPTIONS = new Set([
  "SACO COMPRAS REUTILIZAVEL",
  "SACO COMPRAS REUTILIZAVEL2"
]);

const STOP_PREFIXES = [
  "TOTAL A PAGAR",
  "SUBTOTAL",
  "CARTAO CREDITO",
  "TOTAL DE DESCONTOS",
  "DESCRICAO",
  "VALOR",
  "MORADA LOJA",
  "TALAO INDISPENSAVEL",
  "PRAZO MAX",
  "CONDICOES/ARTIGOS",
  "CUPOES EMITIDOS",
  "SALDO DE SELOS",
  "JA GANHOU",
  "PROCESSADO POR",
  "IVA INCLUIDO",
  "TERMINAL PAGAMENTO",
  "COMPRA ",
  "ATCUD:",
  "NRO:",
  "MODELO CONTINENTE",
  "CONTINENTE HIPERMERCADOS",
  "BOM DIA",
  "CONTINENTE MONTIJO",
  "UTILIZOU DO SEU CARTAO"
];

const LIDL_STOP_PREFIXES = [
  "TAXA",
  "TOTAL DE PROMOCOES",
  "TOTAL ",
  "MULTIBANCO",
  "AUT:",
  "TERMINAL",
  "APROV.",
  "CARTAO",
  "COPIA CLIENTE",
  "PROCESSADO POR",
  "GARANTIA",
  "DEVOLUCAO",
  "CUPÕES",
  "CUPONS",
  "PONTOS GANHOS",
  "COMPRA REALIZADA",
  "DETALHES DA LOJA"
];

const IMAGE_MIME_PREFIX = "image/";
const OCR_LANGUAGE = "por";
const OCR_TIMEOUT_MS = 60_000;
const OCR_MAX_IMAGE_DIMENSION = 1800;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function ensurePdfRuntimeGlobals() {
  if (
    typeof globalThis.DOMMatrix !== "undefined" &&
    typeof globalThis.ImageData !== "undefined" &&
    typeof globalThis.Path2D !== "undefined"
  ) {
    return;
  }

  const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");

  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;
  }
  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = ImageData as unknown as typeof globalThis.ImageData;
  }
  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;
  }
}

async function prepareImageForOcr(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const image = await loadImage(buffer);
    const largestSide = Math.max(image.width, image.height);

    if (!largestSide) {
      return buffer;
    }

    const scale = Math.min(1, OCR_MAX_IMAGE_DIMENSION / largestSide);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const grayscale = Math.round(
        pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114
      );
      pixels[index] = grayscale;
      pixels[index + 1] = grayscale;
      pixels[index + 2] = grayscale;
    }

    context.putImageData(imageData, 0, 0);
    return canvas.toBuffer("image/png");
  } catch {
    return buffer;
  }
}

function normalizeSectionHeading(value: string) {
  return value
    .trim()
    .replace(/:$/, "")
    .toLocaleLowerCase();
}

function normalizeItemName(value: string) {
  return value
    .trim()
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ");
}

function normalizeItemKey(value: string) {
  return normalizeItemName(value).toLocaleLowerCase();
}

function normalizePrice(value: string) {
  return value.replace(",", ".");
}

function normalizeStoreHint(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[|]/g, "I")
    .replace(/\u00a0/g, " ");
}

function isTaxLine(value: string) {
  return /^\([A-Z]\)$/.test(value.trim());
}

function isPriceLine(value: string) {
  return /^\d+(?:,\d{1,2})$/.test(value.trim());
}

function stripLeadingTaxMarker(value: string) {
  return value.trim().replace(/^\([A-Z]\)\s*/, "").trim();
}

function parseQuantityUnitPrice(value: string) {
  const match = value
    .trim()
    .match(/^(\d+(?:,\d+)?)\s*X\s*(\d+(?:,\d{1,2}))(?:\s+\d+(?:,\d{1,2}))?$/i);
  if (!match) {
    return null;
  }

  return normalizePrice(match[2]);
}

function parseInlineDescriptionWithPrice(value: string) {
  const stripped = stripLeadingTaxMarker(value);
  const match = stripped.match(/^(.*\D)\s+(\d+(?:,\d{1,2}))$/);
  if (!match) {
    return null;
  }

  const description = normalizeItemName(match[1]);
  if (!/[A-Za-zÀ-ÿ]/.test(description)) {
    return null;
  }

  return {
    description,
    price: normalizePrice(match[2])
  };
}

function findPriceInLine(value: string) {
  const matches = value.match(/\d+(?:,\d{1,2})/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  return normalizePrice(matches[matches.length - 1]);
}

function isSectionHeading(value: string) {
  return Object.prototype.hasOwnProperty.call(SECTION_TO_CATEGORY, normalizeSectionHeading(value));
}

function resolveCategory(sectionHeading: string | null) {
  if (!sectionHeading) {
    return "Pantry - Savory";
  }

  return SECTION_TO_CATEGORY[normalizeSectionHeading(sectionHeading)] ?? "Pantry - Savory";
}

function shouldStopAtLine(value: string) {
  const normalized = value.trim().toLocaleUpperCase();
  return STOP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function shouldStopLidlLine(value: string) {
  const normalized = value.trim().toLocaleUpperCase();
  return LIDL_STOP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function looksLikeDescriptionLine(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isTaxLine(trimmed) || isPriceLine(trimmed) || parseQuantityUnitPrice(trimmed)) return false;
  if (trimmed === "POUPANCA" || trimmed === "DESCONTO DIRETO") return false;
  if (trimmed.startsWith("%IVA")) return false;
  if (shouldStopAtLine(trimmed)) return false;
  return /[A-Z]/.test(trimmed);
}

function isLikelyGenericDescriptionLine(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isTaxLine(trimmed)) return false;
  if (shouldStopAtLine(trimmed)) return false;
  if (trimmed === "POUPANCA" || trimmed === "DESCONTO DIRETO") return false;
  if (/^\d+(?:,\d{1,2})$/.test(trimmed)) return false;
  return /[A-Za-zÀ-ÿ]/.test(trimmed);
}

function isLikelyLidlDescriptionLine(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (shouldStopLidlLine(trimmed) || shouldStopAtLine(trimmed)) return false;
  if (trimmed.includes("Lidl Plus")) return false;
  if (/^NIF[:.]/i.test(trimmed)) return false;
  if (/^\d{4,}/.test(trimmed)) return false;
  if (/^\d+(?:,\d+)?\s*kg\s*x\s*\d+(?:,\d{2})/i.test(trimmed)) return false;
  if (/^[\-\d,\sA-Z]+$/.test(trimmed) && !/[A-Za-zÀ-ÿ]/.test(trimmed)) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(trimmed)) return false;
  return true;
}

function inferCategoryFromDescription(description: string) {
  const normalized = description.toLocaleLowerCase();
  if (/(iog|leite|queijo|mimosa|ovos)/.test(normalized)) return "Dairy";
  if (/(bife|frango|hamb|almondegas|novilho|peru)/.test(normalized)) return "Meat";
  if (/(bacalhau|bac |polvo|pota)/.test(normalized)) return "Seafood";
  if (/(pao|dots|brioch|massa mae)/.test(normalized)) return "Bakery";
  if (/(salada|gaspacho|gnocchi|rissol|take away)/.test(normalized)) return "Ready Meals";
  if (/(lixivia|det |viakal|ajax|limpa|saco compras)/.test(normalized)) return "Household - Cleaning";
  if (/(colgate|dettol|shampoo|gel banho|pasta)/.test(normalized)) return "Household - Hygiene";
  if (/(cao|pet|pedigree)/.test(normalized)) return "Pet Care";
  if (/(batata|manga|laranja|clementina|tomate|curgete|couve|gengibre|espinafre|abobora|pimento|salada iceberg)/.test(normalized)) return "Produce";
  return "Pantry - Savory";
}

function parseInlinePrice(value: string) {
  const matches = value.match(/\d+(?:,\d{2})/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  return normalizePrice(matches[matches.length - 1]);
}

function cleanLidlDescription(value: string) {
  return normalizeItemName(
    value
      .replace(/\s+\d+(?:,\d{2})(?:\s*x\s*\d+)?\s*[A-Z]?$/i, "")
      .replace(/\s+\d+(?:,\d{2})\s*x\s*\d+\s+\d+(?:,\d{2})\s*[A-Z]?$/i, "")
  );
}

function parseReceiptText(text: string): RecentPurchaseParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = new Map<string, RecentPurchaseCatalogItem>();
  let notImportedCount = 0;
  let currentSection: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isSectionHeading(line)) {
      currentSection = line;
      continue;
    }

    if (!looksLikeDescriptionLine(line)) {
      continue;
    }

    const inlineParsed = parseInlineDescriptionWithPrice(line);
    const description = inlineParsed ? inlineParsed.description : normalizeItemName(stripLeadingTaxMarker(line));
    if (IGNORED_DESCRIPTIONS.has(description)) {
      notImportedCount += 1;
      continue;
    }

    let cursor = index + 1;
    if (cursor < lines.length && isTaxLine(lines[cursor])) {
      cursor += 1;
    }

    let parsedPrice: string | null = inlineParsed?.price ?? null;

    if (!parsedPrice && cursor < lines.length) {
      parsedPrice = parseQuantityUnitPrice(lines[cursor]);
      if (parsedPrice) {
        cursor += 1;
        if (cursor < lines.length && isPriceLine(lines[cursor])) {
          cursor += 1;
        }
      }
    }

    if (!parsedPrice && cursor < lines.length && isPriceLine(lines[cursor])) {
      parsedPrice = normalizePrice(lines[cursor]);
      cursor += 1;
    }

    if (!parsedPrice) {
      notImportedCount += 1;
      continue;
    }

    items.set(normalizeItemKey(description), {
      text: description,
      price: parsedPrice,
      category: resolveCategory(currentSection)
    });

    index = cursor - 1;
  }

  return {
    items: Array.from(items.values()),
    notImportedCount
  };
}

function parseGenericReceiptText(text: string): RecentPurchaseParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeItemName(stripLeadingTaxMarker(line)))
    .filter(Boolean);

  const items = new Map<string, RecentPurchaseCatalogItem>();
  let notImportedCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isLikelyGenericDescriptionLine(line)) {
      continue;
    }

    const inlineParsed = parseInlineDescriptionWithPrice(line);
    if (inlineParsed) {
      items.set(normalizeItemKey(inlineParsed.description), {
        text: inlineParsed.description,
        price: inlineParsed.price,
        category: inferCategoryFromDescription(inlineParsed.description)
      });
      continue;
    }

    const nextLine = lines[index + 1] ?? "";
    const secondNextLine = lines[index + 2] ?? "";
    const price = parseQuantityUnitPrice(nextLine) ?? findPriceInLine(nextLine) ?? parseQuantityUnitPrice(secondNextLine) ?? findPriceInLine(secondNextLine);
    if (!price) {
      notImportedCount += 1;
      continue;
    }

    items.set(normalizeItemKey(line), {
      text: line,
      price,
      category: inferCategoryFromDescription(line)
    });
  }

  return {
    items: Array.from(items.values()),
    notImportedCount
  };
}

function parseLidlReceiptText(text: string): RecentPurchaseParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeItemName(line))
    .filter(Boolean);

  const items = new Map<string, RecentPurchaseCatalogItem>();
  let notImportedCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (shouldStopLidlLine(line)) {
      break;
    }

    if (!isLikelyLidlDescriptionLine(line)) {
      continue;
    }

    const weightedInfo = lines[index + 1] ?? "";
    const weightedMatch = weightedInfo.match(/kg\s*x\s*(\d+(?:,\d{2}))/i);
    if (weightedMatch) {
      const description = cleanLidlDescription(line);
      if (description) {
        items.set(normalizeItemKey(description), {
          text: description,
          price: normalizePrice(weightedMatch[1]),
          category: inferCategoryFromDescription(description)
        });
      } else {
        notImportedCount += 1;
      }
      continue;
    }

    const inlinePrice = parseInlinePrice(line);
    if (inlinePrice) {
      const description = cleanLidlDescription(line);
      if (description) {
        items.set(normalizeItemKey(description), {
          text: description,
          price: inlinePrice,
          category: inferCategoryFromDescription(description)
        });
      } else {
        notImportedCount += 1;
      }
      continue;
    }

    const nextLine = lines[index + 1] ?? "";
    const nextPrice = findPriceInLine(nextLine);
    if (!nextPrice) {
      notImportedCount += 1;
      continue;
    }

    items.set(normalizeItemKey(line), {
      text: line,
      price: nextPrice,
      category: inferCategoryFromDescription(line)
    });
  }

  return {
    items: Array.from(items.values()),
    notImportedCount
  };
}

function mergeParsedItems(target: Map<string, RecentPurchaseCatalogItem>, source: RecentPurchaseParseResult) {
  for (const item of source.items) {
    target.set(normalizeItemKey(item.text), item);
  }
}

function selectBestParseResult(results: RecentPurchaseParseResult[]) {
  if (results.length === 0) {
    return { items: [], notImportedCount: 0 };
  }

  return results.reduce((best, current) => {
    if (current.items.length > best.items.length) {
      return current;
    }

    if (current.items.length === best.items.length && current.notImportedCount < best.notImportedCount) {
      return current;
    }

    return best;
  });
}

function shouldUseSectionParser(text: string, storeHint?: string | null) {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedStoreHint = normalizeStoreHint(storeHint);

  return (
    normalizedStoreHint.includes("continente") ||
    normalizedStoreHint.includes("bom dia") ||
    normalizedText.includes("continente") ||
    normalizedText.includes("frutas e legumes") ||
    normalizedText.includes("mercearia salgada")
  );
}

function shouldUseLidlParser(text: string, storeHint?: string | null) {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedStoreHint = normalizeStoreHint(storeHint);

  return normalizedStoreHint.includes("lidl") || normalizedText.includes("lidl");
}

async function extractTextFromPdf(file: File) {
  await ensurePdfRuntimeGlobals();
  const { PDFParse } = await import("pdf-parse");
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromImage(file: File) {
  const imageBuffer = await prepareImageForOcr(file);
  const { PSM, createWorker } = await import("tesseract.js");
  const worker = await withTimeout(
    createWorker(OCR_LANGUAGE, 1, {
      langPath: process.cwd(),
      gzip: false,
      cachePath: process.cwd()
    }),
    OCR_TIMEOUT_MS,
    "Image OCR timed out while starting the local recognition worker."
  );

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK
    });

    const recognizeResult = await withTimeout(
      worker.recognize(imageBuffer),
      OCR_TIMEOUT_MS,
      "Image OCR timed out while reading the uploaded receipt."
    );
    const {
      data: { text }
    } = recognizeResult;
    return text;
  } finally {
    await worker.terminate();
  }
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: File) {
  return file.type.startsWith(IMAGE_MIME_PREFIX);
}

export async function parseRecentPurchaseFiles(files: File[], options: ParseOptions = {}) {
  const items = new Map<string, RecentPurchaseCatalogItem>();
  let notImportedCount = 0;

  for (const file of files) {
    const extractedText = isPdfFile(file) ? await extractTextFromPdf(file) : isImageFile(file) ? await extractTextFromImage(file) : "";
    const text = normalizeExtractedText(extractedText);
    if (!text.trim()) {
      notImportedCount += 1;
      continue;
    }

    const candidateResults: RecentPurchaseParseResult[] = [parseGenericReceiptText(text)];

    if (shouldUseSectionParser(text, options.storeHint)) {
      candidateResults.unshift(parseReceiptText(text));
    }

    if (shouldUseLidlParser(text, options.storeHint)) {
      candidateResults.unshift(parseLidlReceiptText(text));
    }

    const result = selectBestParseResult(candidateResults);
    mergeParsedItems(items, result);
    notImportedCount += result.notImportedCount;
  }

  return {
    items: Array.from(items.values()),
    notImportedCount
  };
}
