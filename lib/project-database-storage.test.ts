import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";

import { loadProjectDatabase, saveProjectDatabase } from "./project-database-storage";

describe("project database storage", () => {
  it("persists exported SQLite bytes in IndexedDB", async () => {
    const bytes = new Uint8Array([83, 81, 76, 105, 116, 101]);

    await saveProjectDatabase(bytes);

    expect(await loadProjectDatabase()).toEqual(bytes);
  });
});
