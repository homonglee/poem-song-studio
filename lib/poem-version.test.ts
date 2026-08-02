import { describe, expect, it } from "vitest";

import { formatPoemVersion, shouldCreateAdditionalVersion } from "./poem-version";

describe("poem version presentation", () => {
  it("formats numeric versions as v01 labels", () => {
    expect(formatPoemVersion(1)).toBe("v01");
    expect(formatPoemVersion(12)).toBe("v12");
  });

  it("does not duplicate v01 during the first explicit save", () => {
    expect(shouldCreateAdditionalVersion(0, 1)).toBe(false);
    expect(shouldCreateAdditionalVersion(1, 1)).toBe(true);
  });
});
