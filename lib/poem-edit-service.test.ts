import { describe, expect, it } from "vitest";

import { aiEditActions, editPoemWithAi } from "./poem-edit-service";

describe("poem edit service", () => {
  it("provides all ten AI editing actions through deterministic Mock responses", async () => {
    expect(aiEditActions).toHaveLength(10);

    for (const action of aiEditActions) {
      const first = await editPoemWithAi({ action: action.id, text: "빛  빛\n빛\n빛" });
      const second = await editPoemWithAi({ action: action.id, text: "빛  빛\n빛\n빛" });
      expect(first).toBe(second);
      expect(first.length).toBeGreaterThan(0);
    }
  });
});
