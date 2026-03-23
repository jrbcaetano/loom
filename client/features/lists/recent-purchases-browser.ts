"use client";

const OCR_LANGUAGE = "por";
const OCR_TIMEOUT_MS = 45_000;
const OCR_MAX_IMAGE_DIMENSION = 1280;

type BrowserOcrWorker = {
  recognize(image: Blob): Promise<{ data: { text: string } }>;
  setParameters(parameters: Record<string, string | number>): Promise<unknown>;
};

let browserOcrWorkerPromise: Promise<BrowserOcrWorker> | null = null;

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

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to read image "${file.name}".`));
    };

    image.src = objectUrl;
  });
}

async function prepareImageForBrowserOcr(file: File) {
  const image = await loadImage(file);
  const largestSide = Math.max(image.width, image.height);

  if (!largestSide) {
    return file;
  }

  const scale = Math.min(1, OCR_MAX_IMAGE_DIMENSION / largestSide);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return file;
  }

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
    const threshold = grayscale > 180 ? 255 : 0;
    pixels[index] = threshold;
    pixels[index + 1] = threshold;
    pixels[index + 2] = threshold;
  }

  context.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Failed to preprocess image "${file.name}".`));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.82
    );
  });
}

async function getBrowserOcrWorker() {
  if (!browserOcrWorkerPromise) {
    browserOcrWorkerPromise = (async () => {
      const { PSM, createWorker } = await import("tesseract.js");
      const worker = await createWorker(OCR_LANGUAGE, 1, {
        logger: () => undefined
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK
      });

      return worker;
    })().catch((error) => {
      browserOcrWorkerPromise = null;
      throw error;
    });
  }

  return await browserOcrWorkerPromise;
}

export async function extractReceiptTextsFromImagesInBrowser(files: File[]) {
  const worker = await withTimeout(
    getBrowserOcrWorker(),
    OCR_TIMEOUT_MS,
    "Image OCR timed out while starting on this device."
  );
  const texts: string[] = [];

  for (const file of files) {
    const preparedImage = await prepareImageForBrowserOcr(file);
    const result = await withTimeout(
      worker.recognize(preparedImage),
      OCR_TIMEOUT_MS,
      `Image OCR timed out while reading "${file.name}".`
    );

    texts.push(result.data.text ?? "");
  }

  return texts;
}
