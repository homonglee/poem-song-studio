import { describe, expect, it } from "vitest";

import { extractKoreanText, normalizeOcrText, validateOcrImage } from "./poem-ocr-service";

describe("poem OCR service", () => {
  it("normalizes OCR whitespace while preserving Korean stanza breaks", () => {
    expect(normalizeOcrText("  봄비  \r\n마음에 내린다   \r\n\r\n\r\n다시 핀다  \n")).toBe("봄비\n마음에 내린다\n\n다시 핀다");
  });

  it("rejects non-image uploads", () => {
    expect(validateOcrImage({ type: "text/plain", size: 100 })).toBe("이미지 파일만 업로드할 수 있습니다.");
  });

  it("rejects images larger than 10 MB", () => {
    expect(validateOcrImage({ type: "image/png", size: 10 * 1024 * 1024 + 1 })).toBe("이미지는 10MB 이하만 업로드할 수 있습니다.");
  });

  it("extracts normalized Korean text and always terminates the OCR worker", async () => {
    const progress: number[] = [];
    let terminated = false;
    const result = await extractKoreanText("image", {
      onProgress: (value) => progress.push(value),
      workerFactory: async (languages, reportProgress) => {
        expect(languages).toEqual(["kor", "eng"]);
        reportProgress(42);
        return {
          recognize: async () => ({ data: { text: "  봄날  \n마음  " } }),
          terminate: async () => { terminated = true; },
        };
      },
    });

    expect(result).toBe("봄날\n마음");
    expect(progress).toEqual([42]);
    expect(terminated).toBe(true);
  });
});
