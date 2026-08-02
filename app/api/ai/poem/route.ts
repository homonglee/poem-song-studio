import { handlePoemAiRequest } from "../../../../lib/poem-ai-handler";
import { createSharedPoemAiRateLimiter } from "../../../../lib/poem-ai-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (apiKey?.trim() && (!restUrl?.trim() || !restToken?.trim())) {
    return Response.json({
      error: "AI 요청 보호 서비스가 아직 설정되지 않았습니다.",
      code: "AI_RATE_LIMIT_NOT_CONFIGURED",
    }, { status: 503 });
  }

  const allowRequest = restUrl?.trim() && restToken?.trim()
    ? createSharedPoemAiRateLimiter({ restUrl, restToken })
    : undefined;
  return await handlePoemAiRequest(request, { apiKey, allowRequest });
}
