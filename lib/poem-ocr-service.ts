export interface OcrImageMetadata {
  type: string;
  size: number;
}

export type OcrImageInput = File | Blob | string;

export interface OcrWorker {
  recognize(image: OcrImageInput): Promise<{ data: { text: string } }>;
  terminate(): Promise<unknown>;
}

export type OcrWorkerFactory = (
  languages: string[],
  reportProgress: (progress: number) => void,
) => Promise<OcrWorker>;

export interface ExtractKoreanTextOptions {
  onProgress?: (progress: number) => void;
  workerFactory?: OcrWorkerFactory;
}

export function validateOcrImage(file: OcrImageMetadata): string | null {
  if (!file.type.startsWith("image/")) return "이미지 파일만 업로드할 수 있습니다.";
  if (file.size > 10 * 1024 * 1024) return "이미지는 10MB 이하만 업로드할 수 있습니다.";
  return null;
}

export function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const createBrowserOcrWorker: OcrWorkerFactory = async (languages, reportProgress) => {
  const { createWorker, OEM } = await import("tesseract.js");
  return await createWorker(languages, OEM.LSTM_ONLY, {
    logger: (message) => {
      if (message.status === "recognizing text") {
        reportProgress(Math.round(message.progress * 100));
      }
    },
  });
};

export async function extractKoreanText(
  image: OcrImageInput,
  options: ExtractKoreanTextOptions = {},
): Promise<string> {
  const workerFactory = options.workerFactory ?? createBrowserOcrWorker;
  const worker = await workerFactory(["kor", "eng"], options.onProgress ?? (() => undefined));
  try {
    const result = await worker.recognize(image);
    return normalizeOcrText(result.data.text);
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}
