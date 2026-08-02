import { describe, expect, it } from "vitest";

import { createGeminiPoemService } from "./gemini-poem-service";

describe("Gemini poem service", () => {
  it("generates a poem through Gemini without putting the API key in the URL", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const service = createGeminiPoemService({
      apiKey: "unit-test-value",
      fetchImpl: async (input, init) => {
        requestedUrl = String(input);
        requestedInit = init;
        return new Response(JSON.stringify({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: "봄비가 내린다\n마음에 꽃이 핀다" }] } }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    const result = await service.run({ operation: "generate", input: "봄비" });

    expect(result).toBe("봄비가 내린다\n마음에 꽃이 핀다");
    expect(requestedUrl).toContain("models/gemini-2.5-flash:generateContent");
    expect(requestedUrl).not.toContain("unit-test-value");
    expect(new Headers(requestedInit?.headers).get("x-goog-api-key")).toBe("unit-test-value");
    expect(String(requestedInit?.body)).toContain("봄비");
  });

  it("refines the complete poem through the same provider contract", async () => {
    let body = "";
    const service = createGeminiPoemService({
      apiKey: "unit-test-value",
      fetchImpl: async (_input, init) => {
        body = String(init?.body);
        return new Response(JSON.stringify({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: "정제된 첫 행\n정제된 둘째 행" }] } }],
        }), { status: 200 });
      },
    });

    const result = await service.run({ operation: "refine", input: "원본 첫 행\n원본 둘째 행" });

    expect(result).toBe("정제된 첫 행\n정제된 둘째 행");
    expect(body).toContain("원본 첫 행");
    expect(body).toContain("전체 시");
  });

  it("rewrites only the selected passage while supplying the whole poem as context", async () => {
    let body = "";
    const service = createGeminiPoemService({
      apiKey: "unit-test-value",
      fetchImpl: async (_input, init) => {
        body = String(init?.body);
        return new Response(JSON.stringify({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: "고요한 달빛" }] } }],
        }), { status: 200 });
      },
    });

    const result = await service.run({
      operation: "selection",
      input: "밝은 달빛",
      context: "첫 행\n밝은 달빛\n마지막 행",
    });

    expect(result).toBe("고요한 달빛");
    expect(body).toContain("밝은 달빛");
    expect(body).toContain("첫 행");
    expect(body).toContain("선택 영역");
  });

  it("bounds Gemini requests with an abort signal", async () => {
    let signal: AbortSignal | null | undefined;
    const service = createGeminiPoemService({
      apiKey: "unit-test-value",
      timeoutMs: 500,
      fetchImpl: async (_input, init) => {
        signal = init?.signal;
        return new Response(JSON.stringify({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: "결과" }] } }],
        }), { status: 200 });
      },
    });

    await service.run({ operation: "generate", input: "주제" });

    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects a token-truncated result so it cannot overwrite the poem", async () => {
    const service = createGeminiPoemService({
      apiKey: "unit-test-value",
      fetchImpl: async () => new Response(JSON.stringify({
        candidates: [{
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "잘린 시 본문" }] },
        }],
      }), { status: 200 }),
    });

    await expect(service.run({ operation: "refine", input: "기존의 온전한 시" })).rejects.toThrow();
  });

  it("rejects a result without an explicit STOP finish reason", async () => {
    const service = createGeminiPoemService({
      apiKey: "unit-test-value",
      fetchImpl: async () => new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "완료 여부가 불명확한 시" }] } }],
      }), { status: 200 }),
    });

    await expect(service.run({ operation: "generate", input: "봄" })).rejects.toThrow();
  });
});
