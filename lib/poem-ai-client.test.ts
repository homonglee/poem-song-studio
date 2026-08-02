import { describe, expect, it } from "vitest";

import { requestPoemAi } from "./poem-ai-client";

describe("poem AI client", () => {
  it("posts an AI operation to the server route and returns its text", async () => {
    let url = "";
    let init: RequestInit | undefined;
    const result = await requestPoemAi(
      { operation: "generate", input: "새벽" },
      async (input, requestInit) => {
        url = String(input);
        init = requestInit;
        return new Response(JSON.stringify({ text: "새벽의 시" }), { status: 200 });
      },
    );

    expect(result).toBe("새벽의 시");
    expect(url).toBe("/api/ai/poem");
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("새벽");
  });
});
