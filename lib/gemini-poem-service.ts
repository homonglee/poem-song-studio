import type { PoemAiRequest } from "../types/poem-ai";

export interface GeminiPoemServiceOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const SYSTEM_INSTRUCTION = [
  "당신은 한국어 현대시를 쓰고 다듬는 전문 시인입니다.",
  "결과에는 설명, 마크다운, 따옴표를 붙이지 말고 시 본문만 반환하세요.",
  "사용자가 제공한 의미와 고유명사를 존중하고 자연스러운 한국어를 사용하세요.",
].join(" ");

const GEMINI_MODEL = "gemini-2.5-flash";

function createPrompt(request: PoemAiRequest): string {
  if (request.operation === "selection") {
    return [
      "다음 전체 시의 문맥 안에서 선택 영역만 더 자연스럽고 서정적으로 수정하세요.",
      "선택 영역을 대체할 문구만 반환하고 나머지 시는 반환하지 마세요.",
      `전체 시:\n${request.context}`,
      `선택 영역:\n${request.input}`,
    ].join("\n\n");
  }
  if (request.operation === "refine") {
    return `다음 전체 시의 의미와 목소리는 유지하면서 어색한 표현, 중복, 리듬과 행갈이를 정제하세요. 전체 시:\n${request.input}`;
  }
  return `다음 주제어를 바탕으로 3~5연의 새로운 한국어 시를 작성하세요. 주제어: ${request.input}`;
}

export function createGeminiPoemService({
  apiKey,
  fetchImpl = fetch,
  timeoutMs = 60_000,
}: GeminiPoemServiceOptions) {
  return {
    async run(request: PoemAiRequest): Promise<string> {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ role: "user", parts: [{ text: createPrompt(request) }] }],
            generationConfig: {
              temperature: request.operation === "generate" ? 0.9 : 0.7,
              maxOutputTokens: request.operation === "refine" ? 8192 : 4096,
            },
          }),
        },
      );
      if (!response.ok) throw new Error("Gemini request failed");
      const payload = await response.json() as GeminiResponse;
      const candidate = payload.candidates?.[0];
      if (candidate?.finishReason !== "STOP") {
        throw new Error("Gemini did not complete the response");
      }
      const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
      if (!text) throw new Error("Gemini returned no text");
      return text;
    },
  };
}
