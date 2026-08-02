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

    expect(saved).toEqual({
      mode: "keyword",
      source: "새벽",
      title: "",
      author: "이용호",
      content: "새벽이 창가에 머문다",
      originalTitle: "",
      originalContent: "새벽이 창가에 머문다",
      updatedAt: "2026-08-02T10:00:00.000Z",
    });
    expect(poems.openDraft(projectId)).toEqual(saved);
  });

  it("automatically creates v01 with its saved date for the first poem", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectId] } = setup(db, 1, () => "2026-08-02T10:05:00.000Z");

    poems.saveDraft(projectId, { mode: "existing", source: "원문", content: "첫 완성본" });

    expect(poems.history(projectId)).toMatchObject([
      { version: 1, content: "첫 완성본", createdAt: "2026-08-02T10:05:00.000Z" },
    ]);
  });

  it("can roll back an automatic v01 that was not persisted", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectId] } = setup(db);
    poems.saveDraft(projectId, { mode: "existing", source: "원문", content: "저장 실패 예정" });

    poems.removeVersion(projectId, 1);

    expect(poems.history(projectId)).toEqual([]);
  });

  it("migrates a legacy draft with editor defaults and preserved original text", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const projects = createProjectRepository(db, () => "2026-08-02T09:00:00.000Z");
    const project = projects.create({ name: "기존 프로젝트" });
    db.run(`CREATE TABLE poem_drafts (
      project_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE poem_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      mode TEXT NOT NULL,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, version)
    )`);
    db.run(
      "INSERT INTO poem_drafts (project_id, mode, source, content, updated_at) VALUES ($projectId, 'existing', '원문', '기존 시 본문', '2026-08-02T09:00:00.000Z')",
      { $projectId: project.id },
    );
    db.run(
      "INSERT INTO poem_versions (project_id, version, mode, source, content, created_at) VALUES ($projectId, 1, 'existing', '원문', '기존 버전 본문', '2026-08-02T09:00:00.000Z')",
      { $projectId: project.id },
    );

    const poems = createPoemRepository(db);

    expect(poems.openDraft(project.id)).toMatchObject({
      title: "",
      author: "이용호",
      content: "기존 시 본문",
      originalTitle: "",
      originalContent: "기존 시 본문",
    });
    expect(poems.history(project.id)[0]).toMatchObject({
      title: "",
      author: "이용호",
      content: "기존 버전 본문",
      originalTitle: "",
      originalContent: "기존 버전 본문",
    });
  });

  it("creates numbered snapshots and lists newest versions first", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    let savedAt = "2026-08-02T10:00:00.000Z";
    const { poems, projectIds: [projectId] } = setup(db, 1, () => savedAt);
    poems.saveDraft(projectId, { mode: "existing", source: "원문", content: "첫 편집본" });
    savedAt = "2026-08-02T11:00:00.000Z";
    poems.saveDraft(projectId, { mode: "existing", source: "원문", content: "두 번째 편집본" });
    savedAt = "2026-08-02T12:00:00.000Z";

    const second = poems.createVersion(projectId);

    expect(second).toMatchObject({ version: 2, content: "두 번째 편집본", createdAt: "2026-08-02T12:00:00.000Z" });
    expect(poems.history(projectId).map(({ version, content, createdAt }) => ({ version, content, createdAt }))).toEqual([
      { version: 2, content: "두 번째 편집본", createdAt: "2026-08-02T12:00:00.000Z" },
      { version: 1, content: "첫 편집본", createdAt: "2026-08-02T10:00:00.000Z" },
    ]);
  });

  it("restores an older poem as a new version", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const { poems, projectIds: [projectId] } = setup(db);
    poems.saveDraft(projectId, { mode: "keyword", source: "바다", content: "첫 번째 시" });
    const first = poems.history(projectId)[0];
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
    poems.saveDraft(projectB, { mode: "existing", source: "겨울 원문", content: "겨울의 시" });

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
    projects.moveToTrash(projectId);

    projects.deletePermanently(projectId);

    expect(poems.openDraft(projectId)).toBeNull();
    expect(poems.history(projectId)).toEqual([]);
  });
});
