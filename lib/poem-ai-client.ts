import type { PoemAiRequest } from "../types/poem-ai";

export async function requestPoemAi(
  request: PoemAiRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl("/api/ai/poem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json() as { text?: string; error?: string };
  if (!response.ok || !payload.text) {
    throw new Error(payload.error ?? "AI 요청에 실패했습니다.");
  }
  return payload.text;
}
