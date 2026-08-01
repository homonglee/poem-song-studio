import type { Database } from "sql.js";

import type { CreateProjectInput, Project, UpdateProjectInput } from "@/types/project";

type Clock = () => string;

function readProjects(db: Database, sql: string, params: Record<string, string | number | null> = {}): Project[] {
  const statement = db.prepare(sql);
  statement.bind(params);
  const projects: Project[] = [];

  while (statement.step()) {
    const row = statement.getAsObject() as Record<string, string | null>;
    projects.push({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      status: "draft",
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lastOpenedAt: row.last_opened_at as string,
      deletedAt: row.deleted_at,
    });
  }

  statement.free();
  return projects;
}

export function createProjectRepository(db: Database, now: Clock = () => new Date().toISOString()) {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_opened_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);

  function list(options: { search?: string } = {}): Project[] {
    const search = options.search?.trim();
    return readProjects(
      db,
      `SELECT * FROM projects
       WHERE deleted_at IS NULL
         AND ($search = '' OR name LIKE $pattern OR description LIKE $pattern)
       ORDER BY updated_at DESC, created_at DESC`,
      { $search: search ?? "", $pattern: `%${search ?? ""}%` },
    );
  }

  function create(input: CreateProjectInput): Project {
    const timestamp = now();
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
      deletedAt: null,
    };

    db.run(
      `INSERT INTO projects (
        id, name, description, status, created_at, updated_at, last_opened_at, deleted_at
      ) VALUES ($id, $name, $description, $status, $createdAt, $updatedAt, $lastOpenedAt, NULL)`,
      {
        $id: project.id,
        $name: project.name,
        $description: project.description,
        $status: project.status,
        $createdAt: project.createdAt,
        $updatedAt: project.updatedAt,
        $lastOpenedAt: project.lastOpenedAt,
      },
    );

    return project;
  }

  function update(id: string, input: UpdateProjectInput): Project {
    const current = readProjects(db, "SELECT * FROM projects WHERE id = $id", { $id: id })[0];
    if (!current) throw new Error("프로젝트를 찾을 수 없습니다.");

    const updated: Project = {
      ...current,
      name: input.name?.trim() ?? current.name,
      description: input.description?.trim() ?? current.description,
      updatedAt: now(),
    };

    db.run(
      `UPDATE projects
       SET name = $name, description = $description, updated_at = $updatedAt
       WHERE id = $id`,
      {
        $id: id,
        $name: updated.name,
        $description: updated.description,
        $updatedAt: updated.updatedAt,
      },
    );
    return updated;
  }

  function moveToTrash(id: string): void {
    const timestamp = now();
    db.run(
      "UPDATE projects SET deleted_at = $timestamp, updated_at = $timestamp WHERE id = $id",
      { $id: id, $timestamp: timestamp },
    );
  }

  function listTrash(): Project[] {
    return readProjects(
      db,
      "SELECT * FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
    );
  }

  function restore(id: string): void {
    db.run(
      "UPDATE projects SET deleted_at = NULL, updated_at = $timestamp WHERE id = $id",
      { $id: id, $timestamp: now() },
    );
  }

  function deletePermanently(id: string): void {
    db.run("DELETE FROM projects WHERE id = $id AND deleted_at IS NOT NULL", { $id: id });
  }

  function markOpened(id: string): void {
    db.run("UPDATE projects SET last_opened_at = $timestamp WHERE id = $id", {
      $id: id,
      $timestamp: now(),
    });
  }

  function recent(limit = 4): Project[] {
    return readProjects(
      db,
      `SELECT * FROM projects
       WHERE deleted_at IS NULL
       ORDER BY last_opened_at DESC
       LIMIT $limit`,
      { $limit: limit },
    );
  }

  return {
    create,
    deletePermanently,
    list,
    listTrash,
    markOpened,
    moveToTrash,
    recent,
    restore,
    update,
  };
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>;
