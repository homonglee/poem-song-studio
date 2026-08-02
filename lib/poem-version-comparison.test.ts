import { describe, expect, it } from "vitest";

import { comparePoemLines, togglePoemVersionSelection } from "./poem-version-comparison";

describe("poem version line comparison", () => {
  it("keeps matching lines unchanged", () => {
    expect(comparePoemLines("첫 행\n둘째 행", "첫 행\n둘째 행")).toEqual([
      { left: "첫 행", right: "첫 행", status: "unchanged" },
      { left: "둘째 행", right: "둘째 행", status: "unchanged" },
    ]);
  });

  it("marks a replaced line as changed", () => {
    expect(comparePoemLines("첫 행\n이전 표현\n마지막 행", "첫 행\n새 표현\n마지막 행")).toEqual([
      { left: "첫 행", right: "첫 행", status: "unchanged" },
      { left: "이전 표현", right: "새 표현", status: "changed" },
      { left: "마지막 행", right: "마지막 행", status: "unchanged" },
    ]);
  });

  it("aligns an added line without shifting following matches", () => {
    expect(comparePoemLines("첫 행\n마지막 행", "첫 행\n추가 행\n마지막 행")).toEqual([
      { left: "첫 행", right: "첫 행", status: "unchanged" },
      { left: null, right: "추가 행", status: "added" },
      { left: "마지막 행", right: "마지막 행", status: "unchanged" },
    ]);
  });

  it("aligns a removed line without shifting following matches", () => {
    expect(comparePoemLines("첫 행\n삭제 행\n마지막 행", "첫 행\n마지막 행")).toEqual([
      { left: "첫 행", right: "첫 행", status: "unchanged" },
      { left: "삭제 행", right: null, status: "removed" },
      { left: "마지막 행", right: "마지막 행", status: "unchanged" },
    ]);
  });

  it.each([
    ["A\nA", "B\nA", "A", "B"],
    ["\n", "B\n", "", "B"],
  ])("aligns a replacement before duplicate anchors", (left, right, replaced, replacement) => {
    expect(comparePoemLines(left, right)).toEqual([
      { left: replaced, right: replacement, status: "changed" },
      { left: replaced, right: replaced, status: "unchanged" },
    ]);
  });

  it("realigns a matching line after a long inserted block", () => {
    const inserted = Array.from({ length: 201 }, (_, index) => `추가 ${index + 1}`);
    const comparison = comparePoemLines("첫 행\n마지막 행", ["첫 행", ...inserted, "마지막 행"].join("\n"));

    expect(comparison.at(-1)).toEqual({ left: "마지막 행", right: "마지막 행", status: "unchanged" });
    expect(comparison.filter((line) => line.status === "added")).toHaveLength(201);
  });

  it("keeps a minimal alignment across long crossed repeats", () => {
    const leftBase = Array.from({ length: 65 }, (_, index) => ["A", "A", "B"][index % 3]);
    const rightBase = Array.from({ length: 65 }, (_, index) => ["A", "C", "B"][index % 3]);
    const left = [...leftBase.slice(1), "X"].join("\n");
    const right = ["Y", ...rightBase.slice(0, -1)].join("\n");

    expect(comparePoemLines(left, right).filter((line) => line.status !== "unchanged")).toHaveLength(24);
  });

  it("limits comparison selection to two versions", () => {
    const first = togglePoemVersionSelection([], "v01");
    const second = togglePoemVersionSelection(first, "v02");

    expect(second).toEqual(["v01", "v02"]);
    expect(togglePoemVersionSelection(second, "v03")).toEqual(["v01", "v02"]);
  });

  it("deselects an already selected version", () => {
    expect(togglePoemVersionSelection(["v01", "v02"], "v01")).toEqual(["v02"]);
  });
});
