import { describe, expect, it } from "vitest";

import { isPoemSelectionSnapshotCurrent } from "./poem-ai-selection";

describe("poem AI selection snapshot", () => {
  const snapshot = { content: "첫 행\n밝은 달빛\n마지막 행", start: 4, end: 9 };

  it("accepts only the unchanged original selection", () => {
    expect(isPoemSelectionSnapshotCurrent(snapshot, snapshot)).toBe(true);
  });

  it("rejects a moved selection even when the poem text is unchanged", () => {
    expect(isPoemSelectionSnapshotCurrent(snapshot, { ...snapshot, start: 0, end: 3 })).toBe(false);
  });

  it("rejects content changes at the original selection", () => {
    expect(isPoemSelectionSnapshotCurrent(snapshot, { ...snapshot, content: "첫 행\n다른 달빛\n마지막 행" })).toBe(false);
  });
});
