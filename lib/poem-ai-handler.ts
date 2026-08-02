import type { PoemAiRequest } from "../types/poem-ai";
import { createGeminiPoemService } from "./gemini-poem-service";

export interface PoemAiHandlerOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  allowRequest?: (request: Request) => boolean | Promise<boolean>;
}

function jsonError(status: number, error: string, code: string): Response {
  return Response.json({ error, code }, { status });
}

export async function handlePoemAiRequest(
  request: Request,
  options: PoemAiHandlerOptions,
): Promise<Response> {
  if (!options.apiKey?.trim()) {
    return jsonError(503, "AI 서비스가 아직 설정되지 않았습니다.", "AI_NOT_CONFIGURED");
  }
  if (options.allowRequest) {
    try {
      if (!await options.allowRequest(request)) {
        return jsonError(429, "AI 요청이 너무 많습니다. 잠시 후 다시 시도하세요.", "AI_RATE_LIMITED");
      }
    } catch {
      return jsonError(503, "AI 요청 보호 서비스를 사용할 수 없습니다. 잠시 후 다시 시도하세요.", "AI_RATE_LIMIT_UNAVAILABLE");
    }
  }
  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonError(400, "올바른 AI 요청 형식이 아닙니다.", "INVALID_JSON");
  }
  if (rawPayload === null || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return jsonError(400, "올바른 AI 요청 형식이 아닙니다.", "INVALID_JSON");
  }
  const payload = rawPayload as Record<string, unknown>;
  if (!(["generate", "refine", "selection"] as const).includes(payload.operation as never)) {
    return jsonError(400, "지원하지 않는 AI 작업입니다.", "INVALID_OPERATION");
  }
  if (typeof payload.input !== "string" || !payload.input.trim()) {
    return jsonError(400, "AI 작업에 필요한 내용을 입력하세요.", "INVALID_INPUT");
  }
  const inputLimit = payload.operation === "generate" ? 100 : payload.operation === "selection" ? 12_000 : 30_000;
  if (payload.input.length > inputLimit || (payload.operation === "selection" && typeof payload.context === "string" && payload.context.length > 30_000)) {
    return jsonError(400, "AI 요청 내용이 허용 길이를 초과했습니다.", "INPUT_TOO_LONG");
  }
  if (payload.operation === "selection" && (typeof payload.context !== "string" || !payload.context.trim())) {
    return jsonError(400, "선택 영역 수정에는 전체 시 문맥이 필요합니다.", "INVALID_CONTEXT");
  }
  const service = createGeminiPoemService({
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
  });
  try {
    const text = await service.run(payload as unknown as PoemAiRequest);
    return Response.json({ text });
  } catch {
    return jsonError(502, "AI 생성에 실패했습니다. 잠시 후 다시 시도하세요.", "AI_UPSTREAM_ERROR");
  }
}
