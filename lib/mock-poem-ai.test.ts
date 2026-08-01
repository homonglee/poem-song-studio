import { describe, expect, it } from "vitest";

import { generateMockPoem } from "./mock-poem-ai";

describe("mock poem AI", () => {
  it("generates a deterministic poem draft from a keyword", async () => {
    const result = await generateMockPoem({ mode: "keyword", input: "새벽" });

    expect(result).toContain("새벽");
    expect(result.split("\n").length).toBeGreaterThanOrEqual(4);
  });
});
