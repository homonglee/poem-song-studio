import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

import { createProjectRepository } from "./project-repository";

describe("project repository", () => {
  it("creates a project and lists it from SQLite", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const repository = createProjectRepository(db, () => "2026-08-02T00:00:00.000Z");

    const created = repository.create({
      name: "가을 시 프로젝트",
      description: "첫 번째 작품",
    });

    expect(created.name).toBe("가을 시 프로젝트");
    expect(created.description).toBe("첫 번째 작품");
    expect(repository.list()).toEqual([created]);
  });

  it("updates project details and finds the project by search text", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    let timestamp = "2026-08-02T00:00:00.000Z";
    const repository = createProjectRepository(db, () => timestamp);
    const project = repository.create({ name: "봄 프로젝트", description: "초안" });

    timestamp = "2026-08-02T01:00:00.000Z";
    repository.update(project.id, { name: "여름 프로젝트", description: "수정본" });

    expect(repository.list({ search: "여름" })[0]).toMatchObject({
      id: project.id,
      name: "여름 프로젝트",
      description: "수정본",
      updatedAt: timestamp,
    });
    expect(repository.list({ search: "봄" })).toEqual([]);
  });

  it("moves a project to trash, restores it, and permanently deletes it", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    let timestamp = "2026-08-02T00:00:00.000Z";
    const repository = createProjectRepository(db, () => timestamp);
    const project = repository.create({ name: "삭제 테스트" });

    timestamp = "2026-08-02T02:00:00.000Z";
    repository.moveToTrash(project.id);
    expect(repository.list()).toEqual([]);
    expect(repository.listTrash()[0]).toMatchObject({ id: project.id, deletedAt: timestamp });

    repository.restore(project.id);
    expect(repository.list()[0].id).toBe(project.id);
    expect(repository.listTrash()).toEqual([]);

    repository.moveToTrash(project.id);
    repository.deletePermanently(project.id);
    expect(repository.listTrash()).toEqual([]);
  });

  it("returns recently opened projects in most-recent order", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    let timestamp = "2026-08-02T00:00:00.000Z";
    const repository = createProjectRepository(db, () => timestamp);
    const first = repository.create({ name: "첫 프로젝트" });

    timestamp = "2026-08-02T01:00:00.000Z";
    const second = repository.create({ name: "두 번째 프로젝트" });
    timestamp = "2026-08-02T02:00:00.000Z";
    repository.markOpened(first.id);

    expect(repository.recent(2).map((project) => project.id)).toEqual([first.id, second.id]);
    expect(repository.recent(1)).toHaveLength(1);
  });
});
