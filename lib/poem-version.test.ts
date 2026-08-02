import { describe, expect, it } from "vitest";

import { currentPoemVersionNumber, findPoemVersionById, formatPoemVersion, memoAfterVersionSave, shouldCreateAdditionalVersion } from "./poem-version";

describe("poem version presentation", () => {
  it("formats numeric versions as v01 labels", () => {
    expect(formatPoemVersion(1)).toBe("v01");
    expect(formatPoemVersion(12)).toBe("v12");
  });

  it("identifies the newest saved version as current", () => {
    expect(currentPoemVersionNumber([{ version: 1 }, { version: 3 }, { version: 2 }])).toBe(3);
    expect(currentPoemVersionNumber([])).toBeNull();
  });

  it("opens the selected saved version by id", () => {
    const versions = [{ id: "v1", content: "첫 시" }, { id: "v2", content: "둘째 시" }];

    expect(findPoemVersionById(versions, "v1")).toEqual({ id: "v1", content: "첫 시" });
    expect(findPoemVersionById(versions, "missing")).toBeNull();
  });

  it("clears only the memo that completed saving", () => {
    expect(memoAfterVersionSave("저장한 메모", "저장한 메모")).toBe("");
    expect(memoAfterVersionSave("다음 버전 메모", "저장한 메모")).toBe("다음 버전 메모");
  });

  it("does not duplicate v01 during the first explicit save", () => {
    expect(shouldCreateAdditionalVersion(0, 1)).toBe(false);
    expect(shouldCreateAdditionalVersion(1, 1)).toBe(true);
  });
});
