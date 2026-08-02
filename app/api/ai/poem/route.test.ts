import { afterEach, describe, expect, it } from "vitest";

import { POST } from "./route";

const originalKey = process.env.GEMINI_API_KEY;
const originalRateUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRateToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalRateUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalRateUrl;
  if (originalRateToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalRateToken;
});

describe("POST /api/ai/poem", () => {
  it("reads Gemini configuration only from the server environment", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await POST(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      body: JSON.stringify({ operation: "generate", input: "봄" }),
    }));

    expect(response.status).toBe(503);
  });

  it("fails closed when Gemini is configured without shared rate-limit storage", async () => {
    process.env.GEMINI_API_KEY = "unit-test-value";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const response = await POST(new Request("http://localhost/api/ai/poem", {
      method: "POST",
      body: JSON.stringify({ operation: "generate", input: "봄" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "AI_RATE_LIMIT_NOT_CONFIGURED" });
  });
});
