import initSqlJs, { type Database } from "sql.js";
import { describe, expect, it } from "vitest";

import { createPoemRepository } from "./poem-repository";
import { createProjectRepository } from "./project-repository";

type Clock = () => string;

function setup(db: Database, projectCount = 1, now?: Clock) {
  const projects = createProjectRepository(db, now);
  const projectIds = Array.from({ length: projectCount }, (_, index) => projects.create({ name: `프로젝트 ${index + 1}` }).id);
  const poems = createPoemRepository(db, now);
  return { poems, projectIds, projects };
}

describe("poem repository", () => {
  it("autosaves and opens the current poem draft", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const now = () => "2026-08-02T10:00:00.000Z";
    const { poems, projectIds: [projectId] } = setup(db, 1, now);

    const saved = poems.saveDraft(projectId, { mode: "keyword", source: "새벽", content: "새벽이 창가에 머문다" });

    expect(saved).toEqual({ mode: "keyword", source: "새벽", content: "새벽이 창가에 머문다", updatedAt: "2026-08-02T10:00:00.000Z" });
    expect(poems.openDraft(projectId)).toEqual(saved);
  });

  it("creates numbered snapshots and lists newest versions first", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectId] } = setup(db, 1, () => "2026-08-02T10:00:00.000Z");
    poems.saveDraft(projectId, { mode: "existing", source: "원문", content: "첫 편집본" });
    poems.createVersion(projectId);
    poems.saveDraft(projectId, { mode: "existing", source: "원문", content: "두 번째 편집본" });

    const second = poems.createVersion(projectId);

    expect(second).toMatchObject({ version: 2, content: "두 번째 편집본" });
    expect(poems.history(projectId).map(({ version, content }) => ({ version, content }))).toEqual([
      { version: 2, content: "두 번째 편집본" },
      { version: 1, content: "첫 편집본" },
    ]);
  });

  it("restores an older poem as a new version", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectId] } = setup(db);
    poems.saveDraft(projectId, { mode: "keyword", source: "바다", content: "첫 번째 시" });
    const first = poems.createVersion(projectId);
    poems.saveDraft(projectId, { mode: "keyword", source: "바다", content: "두 번째 시" });
    poems.createVersion(projectId);

    const restored = poems.restore(projectId, first.version);

    expect(restored).toMatchObject({ version: 3, content: "첫 번째 시" });
    expect(poems.openDraft(projectId)).toMatchObject({ content: "첫 번째 시" });
  });

  it("keeps drafts and versions isolated by project", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectA, projectB] } = setup(db, 2);
    poems.saveDraft(projectA, { mode: "keyword", source: "봄", content: "봄의 시" });
    poems.createVersion(projectA);
    poems.saveDraft(projectB, { mode: "existing", source: "겨울 원문", content: "겨울의 시" });
    poems.createVersion(projectB);

    expect(poems.openDraft(projectA)).toMatchObject({ content: "봄의 시" });
    expect(poems.openDraft(projectB)).toMatchObject({ content: "겨울의 시" });
    expect(poems.history(projectA).map((item) => item.content)).toEqual(["봄의 시"]);
    expect(poems.history(projectB).map((item) => item.content)).toEqual(["겨울의 시"]);
  });

  it("removes poem drafts and versions when a project is permanently deleted", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectId], projects } = setup(db);
    poems.saveDraft(projectId, { mode: "keyword", source: "비", content: "비의 시" });
    poems.createVersion(projectId);
    projects.moveToTrash(projectId);

    projects.deletePermanently(projectId);

    expect(poems.openDraft(projectId)).toBeNull();
    expect(poems.history(projectId)).toEqual([]);
  });
});
