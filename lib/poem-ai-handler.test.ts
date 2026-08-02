import { describe, expect, it } from "vitest";

import { handlePoemAiRequest } from "./poem-ai-handler";

describe("poem AI HTTP handler", () => {
  it("fails closed when the Gemini server key is not configured", async () => {
    const request = new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "generate", input: "봄비" }),
    });

    const response = await handlePoemAiRequest(request, { apiKey: undefined });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "AI 서비스가 아직 설정되지 않았습니다.",
      code: "AI_NOT_CONFIGURED",
    });
  });

  it("returns generated text for a valid request", async () => {
    const request = new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "generate", input: "봄비" }),
    });
    const response = await handlePoemAiRequest(request, {
      apiKey: "unit-test-value",
      fetchImpl: async () => new Response(JSON.stringify({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: "봄비의 시" }] } }],
      }), { status: 200 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "봄비의 시" });
  });

  it("rejects unsupported AI operations before calling the provider", async () => {
    let called = false;
    const request = new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "image", input: "봄비" }),
    });
    const response = await handlePoemAiRequest(request, {
      apiKey: "unit-test-value",
      fetchImpl: async () => { called = true; return new Response(); },
    });

    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("rejects an empty AI input before calling the provider", async () => {
    let called = false;
    const request = new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "refine", input: "   " }),
    });
    const response = await handlePoemAiRequest(request, {
      apiKey: "unit-test-value",
      fetchImpl: async () => { called = true; return new Response(); },
    });

    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("rejects content beyond the per-operation limits", async () => {
    const payloads = [
      { operation: "generate", input: "가".repeat(101) },
      { operation: "refine", input: "가".repeat(30_001) },
      { operation: "selection", input: "가".repeat(12_001), context: "전체 시" },
      { operation: "selection", input: "선택", context: "가".repeat(30_001) },
    ];

    for (const payload of payloads) {
      let called = false;
      const response = await handlePoemAiRequest(new Request("http://localhost/api/ai/poem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }), {
        apiKey: "unit-test-value",
        fetchImpl: async () => { called = true; return new Response(); },
      });
      expect(response.status).toBe(400);
      expect(called).toBe(false);
    }
  });

  it("requires the whole poem context for a selection rewrite", async () => {
    let called = false;
    const response = await handlePoemAiRequest(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "selection", input: "선택 영역" }),
    }), {
      apiKey: "unit-test-value",
      fetchImpl: async () => { called = true; return new Response(); },
    });

    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("returns a safe 400 response for malformed JSON", async () => {
    const response = await handlePoemAiRequest(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{broken",
    }), { apiKey: "unit-test-value" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "올바른 AI 요청 형식이 아닙니다.", code: "INVALID_JSON" });
  });

  it("maps Gemini failures to a retryable safe response", async () => {
    const request = new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "generate", input: "봄비" }),
    });
    const response = await handlePoemAiRequest(request, {
      apiKey: "unit-test-value",
      fetchImpl: async () => new Response("upstream-internal-detail", { status: 429 }),
    });

    expect(response.status).toBe(502);
    const payload = await response.json();
    expect(payload).toEqual({ error: "AI 생성에 실패했습니다. 잠시 후 다시 시도하세요.", code: "AI_UPSTREAM_ERROR" });
    expect(JSON.stringify(payload)).not.toContain("upstream-internal-detail");
  });

  it("rejects an empty Gemini result instead of erasing the poem", async () => {
    const request = new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "refine", input: "원본 시" }),
    });
    const response = await handlePoemAiRequest(request, {
      apiKey: "unit-test-value",
      fetchImpl: async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    });

    expect(response.status).toBe(502);
  });

  it("rejects a non-object JSON body", async () => {
    const response = await handlePoemAiRequest(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null",
    }), { apiKey: "unit-test-value" });

    expect(response.status).toBe(400);
  });

  it("returns 429 before invoking Gemini when the caller is rate limited", async () => {
    let called = false;
    const response = await handlePoemAiRequest(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "generate", input: "봄" }),
    }), {
      apiKey: "unit-test-value",
      allowRequest: () => false,
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    expect(response.status).toBe(429);
    expect(called).toBe(false);
  });

  it("returns 503 before invoking Gemini when shared rate-limit storage fails", async () => {
    let called = false;
    const response = await handlePoemAiRequest(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      body: JSON.stringify({ operation: "generate", input: "봄" }),
    }), {
      apiKey: "unit-test-value",
      allowRequest: async () => {
        throw new Error("rate store unavailable");
      },
      fetchImpl: (async () => {
        called = true;
        return new Response();
      }) as typeof fetch,
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "AI_RATE_LIMIT_UNAVAILABLE" });
    expect(called).toBe(false);
  });
});
