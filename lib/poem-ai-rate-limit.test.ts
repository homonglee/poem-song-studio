import { describe, expect, it, vi } from "vitest";

import { createSharedPoemAiRateLimiter } from "./poem-ai-rate-limit";

function requestWithVercelIp(ip = "203.0.113.7") {
  return new Request("https://example.test/api/ai/poem", {
    headers: { "x-real-ip": ip },
  });
}

describe("shared poem AI rate limiter", () => {
  it("uses a hashed trusted Vercel IP with the shared atomic counter", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      { result: 1 },
      { result: 1 },
    ]), { status: 200 }));
    const allow = createSharedPoemAiRateLimiter({
      restUrl: "https://rate-limit.example",
      restToken: "unit-test-value",
      maxRequests: 10,
      windowMs: 60_000,
      now: () => 120_000,
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(allow(requestWithVercelIp())).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const [url, init] = calls[0];
    expect(url).toBe("https://rate-limit.example/multi-exec");
    expect(init?.headers).toEqual({
      authorization: "Bearer unit-test-value",
      "content-type": "application/json",
    });
    const commands = JSON.parse(String(init?.body));
    expect(commands[0][0]).toBe("INCR");
    expect(commands[0][1]).toMatch(/^poem-ai:2:[0-9a-f]{64}$/);
    expect(commands[1]).toEqual(["PEXPIRE", commands[0][1], 60_000, "NX"]);
  });

  it("rejects a request after the shared limit is exceeded", async () => {
    const allow = createSharedPoemAiRateLimiter({
      restUrl: "https://rate-limit.example",
      restToken: "unit-test-value",
      maxRequests: 10,
      windowMs: 60_000,
      fetchImpl: async () => new Response(JSON.stringify([{ result: 11 }, { result: 0 }]), { status: 200 }),
    });

    await expect(allow(requestWithVercelIp())).resolves.toBe(false);
  });

  it("fails closed without a trusted Vercel client IP", async () => {
    const fetchImpl = vi.fn();
    const allow = createSharedPoemAiRateLimiter({
      restUrl: "https://rate-limit.example",
      restToken: "unit-test-value",
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(allow(new Request("https://example.test/api/ai/poem"))).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when the transaction expiry command is missing or fails", async () => {
    const responses = [
      [{ result: 1 }],
      [{ result: 1 }, { error: "expiry failed" }],
      [{ result: 1 }, { result: 2 }],
      [{ result: "1" }, { result: 1 }],
      [{ result: true }, { result: 1 }],
      [{ result: 1 }, { result: "1" }],
      [{ result: 1 }, { result: true }],
      [{ result: null }, { result: 1 }],
      [{ result: 1 }, { result: null }],
      [{}, { result: 1 }],
      [{ result: 1 }, {}],
    ];
    for (const payload of responses) {
      const allow = createSharedPoemAiRateLimiter({
        restUrl: "https://rate-limit.example",
        restToken: "unit-test-value",
        fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200 }),
      });
      await expect(allow(requestWithVercelIp())).rejects.toThrow();
    }
  });

  it("fails closed when shared storage is unavailable", async () => {
    const allow = createSharedPoemAiRateLimiter({
      restUrl: "https://rate-limit.example",
      restToken: "unit-test-value",
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    });

    await expect(allow(requestWithVercelIp())).rejects.toThrow();
  });
});
