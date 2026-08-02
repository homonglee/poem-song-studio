import { describe, expect, it } from "vitest";

import { isPoemAsyncOperationActive } from "./poem-async-operation";

describe("poem async operation epoch", () => {
  it("does not keep a stale OCR operation running after the editor epoch changes", () => {
    expect(isPoemAsyncOperationActive(4, 5)).toBe(false);
  });

  it("keeps the current OCR operation running", () => {
    expect(isPoemAsyncOperationActive(5, 5)).toBe(true);
  });

  it("treats a missing operation as idle", () => {
    expect(isPoemAsyncOperationActive(null, 5)).toBe(false);
  });
});
