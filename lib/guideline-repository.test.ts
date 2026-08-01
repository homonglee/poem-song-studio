import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

import { createGuidelineRepository } from "./guideline-repository";

describe("guideline repository", () => {
  it("saves and opens the latest guideline", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const repository = createGuidelineRepository(db, () => "2026-08-02T08:00:00.000Z");

    const saved = repository.save("poem", "시어를 선명하게 다듬는다.");

    expect(saved).toMatchObject({ type: "poem", version: 1, content: "시어를 선명하게 다듬는다." });
    expect(repository.open("poem")).toEqual(saved);
  });

  it("keeps every saved version in newest-first order", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    let timestamp = "2026-08-02T08:00:00.000Z";
    const repository = createGuidelineRepository(db, () => timestamp);

    repository.save("video", "첫 번째 지침");
    timestamp = "2026-08-02T09:00:00.000Z";
    repository.save("video", "두 번째 지침");

    expect(repository.history("video").map(({ version, content }) => ({ version, content }))).toEqual([
      { version: 2, content: "두 번째 지침" },
      { version: 1, content: "첫 번째 지침" },
    ]);
  });

  it("deletes the active guideline while preserving its history", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const repository = createGuidelineRepository(db);
    repository.save("youtube", "제목은 핵심 시어를 포함한다.");

    const deleted = repository.remove("youtube");

    expect(deleted).toMatchObject({ version: 2, deleted: true });
    expect(repository.open("youtube")).toBeNull();
    expect(repository.history("youtube")).toHaveLength(2);
  });

  it("restores an older version as a new current version", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const repository = createGuidelineRepository(db);
    const original = repository.save("song", "후렴은 반복 가능한 문장으로 쓴다.");
    repository.save("song", "후렴은 한 문장으로 제한한다.");

    const restored = repository.restore("song", original.version);

    expect(restored).toMatchObject({ version: 3, content: original.content, deleted: false });
    expect(repository.open("song")).toEqual(restored);
  });
});
