import type { Database } from "sql.js";

import type { PoemDraft, PoemVersion, SavePoemDraftInput } from "@/types/poem";

type Clock = () => string;

function tableColumns(db: Database, table: string): Set<string> {
  const result = db.exec(`PRAGMA table_info(${table})`)[0];
  if (!result) return new Set();
  const nameIndex = result.columns.indexOf("name");
  return new Set(result.values.map((row) => String(row[nameIndex])));
}

function addColumn(db: Database, table: string, columns: Set<string>, name: string, definition: string): boolean {
  if (columns.has(name)) return false;
  db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  columns.add(name);
  return true;
}

function migrateEditorColumns(db: Database, table: "poem_drafts" | "poem_versions") {
  const columns = tableColumns(db, table);
  addColumn(db, table, columns, "title", "TEXT NOT NULL DEFAULT ''");
  addColumn(db, table, columns, "author", "TEXT NOT NULL DEFAULT '이용호'");
  addColumn(db, table, columns, "original_title", "TEXT NOT NULL DEFAULT ''");
  const originalContentAdded = addColumn(db, table, columns, "original_content", "TEXT NOT NULL DEFAULT ''");
  if (originalContentAdded) db.run(`UPDATE ${table} SET original_content = content`);
}

export function createPoemRepository(db: Database, now: Clock = () => new Date().toISOString()) {
  db.run("PRAGMA foreign_keys = ON");
  db.run(`
    CREATE TABLE IF NOT EXISTS poem_drafts (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '이용호',
      content TEXT NOT NULL,
      original_title TEXT NOT NULL DEFAULT '',
      original_content TEXT NOT NULL DEFAULT '',
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
      title TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '이용호',
      content TEXT NOT NULL,
      original_title TEXT NOT NULL DEFAULT '',
      original_content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(project_id, version)
    )
  `);
  db.run("BEGIN");
  try {
    migrateEditorColumns(db, "poem_drafts");
    migrateEditorColumns(db, "poem_versions");
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  function toDraft(row: Record<string, string>): PoemDraft {
    return {
      mode: row.mode as PoemDraft["mode"],
      source: row.source,
      title: row.title,
      author: row.author || "이용호",
      content: row.content,
      originalTitle: row.original_title,
      originalContent: row.original_content,
      updatedAt: row.updated_at,
    };
  }

  function openDraft(projectId: string): PoemDraft | null {
    const statement = db.prepare("SELECT mode, source, title, author, content, original_title, original_content, updated_at FROM poem_drafts WHERE project_id = $projectId");
    statement.bind({ $projectId: projectId });
    if (!statement.step()) {
      statement.free();
      return null;
    }
    const draft = toDraft(statement.getAsObject() as Record<string, string>);
    statement.free();
    return draft;
  }

  function saveDraft(projectId: string, input: SavePoemDraftInput): PoemDraft {
    const draft: PoemDraft = {
      mode: input.mode,
      source: input.source,
      title: input.title ?? "",
      author: input.author?.trim() || "이용호",
      content: input.content,
      originalTitle: input.originalTitle ?? input.title ?? "",
      originalContent: input.originalContent ?? input.content,
      updatedAt: now(),
    };
    db.run(
      `INSERT INTO poem_drafts (project_id, mode, source, title, author, content, original_title, original_content, updated_at)
       VALUES ($projectId, $mode, $source, $title, $author, $content, $originalTitle, $originalContent, $updatedAt)
       ON CONFLICT(project_id) DO UPDATE SET mode = excluded.mode, source = excluded.source,
         title = excluded.title, author = excluded.author, content = excluded.content,
         original_title = excluded.original_title, original_content = excluded.original_content,
         updated_at = excluded.updated_at`,
      {
        $projectId: projectId,
        $mode: draft.mode,
        $source: draft.source,
        $title: draft.title,
        $author: draft.author,
        $content: draft.content,
        $originalTitle: draft.originalTitle,
        $originalContent: draft.originalContent,
        $updatedAt: draft.updatedAt,
      },
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
        title: row.title as string,
        author: (row.author as string) || "이용호",
        content: row.content as string,
        originalTitle: row.original_title as string,
        originalContent: row.original_content as string,
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
      `INSERT INTO poem_versions (id, project_id, version, mode, source, title, author, content, original_title, original_content, created_at)
       VALUES ($id, $projectId, $version, $mode, $source, $title, $author, $content, $originalTitle, $originalContent, $createdAt)`,
      {
        $id: snapshot.id,
        $projectId: projectId,
        $version: version,
        $mode: snapshot.mode,
        $source: snapshot.source,
        $title: snapshot.title,
        $author: snapshot.author,
        $content: snapshot.content,
        $originalTitle: snapshot.originalTitle,
        $originalContent: snapshot.originalContent,
        $createdAt: createdAt,
      },
    );
    return snapshot;
  }

  function restore(projectId: string, version: number): PoemVersion {
    const source = history(projectId).find((item) => item.version === version);
    if (!source) throw new Error("복원할 시 버전을 찾을 수 없습니다.");
    saveDraft(projectId, source);
    return createVersion(projectId);
  }

  return { createVersion, history, openDraft, restore, saveDraft };
}

export type PoemRepository = ReturnType<typeof createPoemRepository>;
