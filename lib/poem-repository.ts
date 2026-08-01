import type { Database } from "sql.js";

import type { PoemDraft, PoemVersion, SavePoemDraftInput } from "@/types/poem";

type Clock = () => string;

export function createPoemRepository(db: Database, now: Clock = () => new Date().toISOString()) {
  db.run("PRAGMA foreign_keys = ON");
  db.run(`
    CREATE TABLE IF NOT EXISTS poem_drafts (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS poem_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      mode TEXT NOT NULL,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, version)
    )
  `);

  function openDraft(projectId: string): PoemDraft | null {
    const statement = db.prepare("SELECT mode, source, content, updated_at FROM poem_drafts WHERE project_id = $projectId");
    statement.bind({ $projectId: projectId });
    if (!statement.step()) {
      statement.free();
      return null;
    }
    const row = statement.getAsObject() as Record<string, string>;
    statement.free();
    return { mode: row.mode as PoemDraft["mode"], source: row.source, content: row.content, updatedAt: row.updated_at };
  }

  function saveDraft(projectId: string, input: SavePoemDraftInput): PoemDraft {
    const draft: PoemDraft = { ...input, updatedAt: now() };
    db.run(
      `INSERT INTO poem_drafts (project_id, mode, source, content, updated_at)
       VALUES ($projectId, $mode, $source, $content, $updatedAt)
       ON CONFLICT(project_id) DO UPDATE SET mode = excluded.mode, source = excluded.source,
         content = excluded.content, updated_at = excluded.updated_at`,
      { $projectId: projectId, $mode: draft.mode, $source: draft.source, $content: draft.content, $updatedAt: draft.updatedAt },
    );
    return draft;
  }

  function history(projectId: string): PoemVersion[] {
    const statement = db.prepare("SELECT * FROM poem_versions WHERE project_id = $projectId ORDER BY version DESC");
    statement.bind({ $projectId: projectId });
    const versions: PoemVersion[] = [];
    while (statement.step()) {
      const row = statement.getAsObject() as Record<string, string | number>;
      versions.push({
        id: row.id as string,
        version: row.version as number,
        mode: row.mode as PoemDraft["mode"],
        source: row.source as string,
        content: row.content as string,
        createdAt: row.created_at as string,
        updatedAt: row.created_at as string,
      });
    }
    statement.free();
    return versions;
  }

  function createVersion(projectId: string): PoemVersion {
    const draft = openDraft(projectId);
    if (!draft || !draft.content.trim()) throw new Error("버전으로 저장할 시가 없습니다.");
    const statement = db.prepare("SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM poem_versions WHERE project_id = $projectId");
    statement.bind({ $projectId: projectId });
    statement.step();
    const version = statement.getAsObject().next_version as number;
    statement.free();
    const createdAt = now();
    const snapshot: PoemVersion = { ...draft, id: crypto.randomUUID(), version, createdAt };
    db.run(
      `INSERT INTO poem_versions (id, project_id, version, mode, source, content, created_at)
       VALUES ($id, $projectId, $version, $mode, $source, $content, $createdAt)`,
      { $id: snapshot.id, $projectId: projectId, $version: version, $mode: snapshot.mode, $source: snapshot.source, $content: snapshot.content, $createdAt: createdAt },
    );
    return snapshot;
  }

  function restore(projectId: string, version: number): PoemVersion {
    const source = history(projectId).find((item) => item.version === version);
    if (!source) throw new Error("복원할 시 버전을 찾을 수 없습니다.");
    saveDraft(projectId, { mode: source.mode, source: source.source, content: source.content });
    return createVersion(projectId);
  }

  return { createVersion, history, openDraft, restore, saveDraft };
}

export type PoemRepository = ReturnType<typeof createPoemRepository>;
