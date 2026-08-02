import { describe, expect, it } from "vitest";

import { applyEditorChange, createEditorHistory, deleteLineAt, findMatches, getPoemStats, insertAtSelection, redoEditorChange, replaceAllText, undoEditorChange } from "./poem-editor";

describe("poem editor", () => {
  it("counts characters, lines, and stanzas", () => {
    expect(getPoemStats("첫 줄\n둘째 줄\n\n새 연")).toEqual({
      characters: 13,
      lines: 4,
      stanzas: 2,
    });
  });

  it("undoes and redoes title and body edits", () => {
    const initial = createEditorHistory({ title: "처음", content: "첫 줄" });
    const changed = applyEditorChange(initial, { title: "수정", content: "둘째 줄" });

    const undone = undoEditorChange(changed);
    const redone = redoEditorChange(undone);

    expect(undone.present).toEqual({ title: "처음", content: "첫 줄" });
    expect(redone.present).toEqual({ title: "수정", content: "둘째 줄" });
  });

  it("adds line breaks and deletes the current line", () => {
    expect(insertAtSelection("첫 줄둘째 줄", 3, 3, "\n")).toEqual({ content: "첫 줄\n둘째 줄", caret: 4 });
    expect(insertAtSelection("첫 연둘째 연", 3, 3, "\n\n")).toEqual({ content: "첫 연\n\n둘째 연", caret: 5 });
    expect(deleteLineAt("첫 줄\n지울 줄\n마지막", 6)).toEqual({ content: "첫 줄\n마지막", caret: 4 });
  });

  it("finds and replaces every matching phrase", () => {
    expect(findMatches("봄비가 오고 봄비가 간다", "봄비")).toEqual([0, 7]);
    expect(replaceAllText("봄비가 오고 봄비가 간다", "봄비", "가을비")).toEqual({
      content: "가을비가 오고 가을비가 간다",
      count: 2,
    });
  });
});
