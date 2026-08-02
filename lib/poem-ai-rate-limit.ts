import { createHash } from "node:crypto";
import { ipAddress } from "@vercel/functions";

export interface SharedPoemAiRateLimiterOptions {
  restUrl: string;
  restToken: string;
  maxRequests?: number;
  windowMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

interface PipelineResult {
  result?: unknown;
  error?: unknown;
}

function trustedVercelClientIp(request: Request): string {
  const ip = ipAddress(request);
  if (!ip) throw new Error("Trusted Vercel client IP is unavailable.");
  return ip;
}

export function createSharedPoemAiRateLimiter({
  restUrl,
  restToken,
  maxRequests = 10,
  windowMs = 60_000,
  now = Date.now,
  fetchImpl = fetch,
}: SharedPoemAiRateLimiterOptions): (request: Request) => Promise<boolean> {
  const endpoint = `${restUrl.replace(/\/+$/, "")}/multi-exec`;

  return async (request: Request) => {
    const ip = trustedVercelClientIp(request);
    const clientHash = createHash("sha256").update(ip).digest("hex");
    const bucket = Math.floor(now() / windowMs);
    const key = `poem-ai:${bucket}:${clientHash}`;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${restToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, windowMs, "NX"],
      ]),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("Shared AI rate-limit storage is unavailable.");

    const payload = await response.json() as PipelineResult[];
    if (!Array.isArray(payload) || payload.length !== 2 || payload.some((entry) => !entry || entry.error !== undefined)) {
      throw new Error("Shared AI rate-limit response is invalid.");
    }
    const countResult = payload[0].result;
    const expiryResult = payload[1].result;
    if (typeof countResult !== "number" || !Number.isSafeInteger(countResult) || countResult < 1) {
      throw new Error("Shared AI rate-limit response is invalid.");
    }
    if (typeof expiryResult !== "number" || (expiryResult !== 0 && expiryResult !== 1)) {
      throw new Error("Shared AI rate-limit response is invalid.");
    }
    return countResult <= maxRequests;
  };
}
