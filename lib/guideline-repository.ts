import type { Database } from "sql.js";

import type { GuidelineType, GuidelineVersion } from "@/types/guideline";

type Clock = () => string;

function readVersions(db: Database, sql: string, params: Record<string, string | number> = {}): GuidelineVersion[] {
  const statement = db.prepare(sql);
  statement.bind(params);
  const versions: GuidelineVersion[] = [];

  while (statement.step()) {
    const row = statement.getAsObject() as Record<string, string | number>;
    versions.push({
      id: row.id as string,
      type: row.type as GuidelineType,
      version: row.version as number,
      content: row.content as string,
      createdAt: row.created_at as string,
      deleted: Boolean(row.is_deleted),
    });
  }

  statement.free();
  return versions;
}

export function createGuidelineRepository(db: Database, now: Clock = () => new Date().toISOString()) {
  db.run(`
    CREATE TABLE IF NOT EXISTS guideline_versions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      UNIQUE(type, version)
    )
  `);

  function open(type: GuidelineType): GuidelineVersion | null {
    const latest = readVersions(
      db,
      "SELECT * FROM guideline_versions WHERE type = $type ORDER BY version DESC LIMIT 1",
      { $type: type },
    )[0];
    return latest && !latest.deleted ? latest : null;
  }

  function save(type: GuidelineType, content: string): GuidelineVersion {
    const result = db.exec("SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM guideline_versions WHERE type = $type", { $type: type });
    const version = (result[0]?.values[0]?.[0] as number | undefined) ?? 1;
    const saved: GuidelineVersion = {
      id: crypto.randomUUID(),
      type,
      version,
      content,
      createdAt: now(),
      deleted: false,
    };
    db.run(
      `INSERT INTO guideline_versions (id, type, version, content, created_at, is_deleted)
       VALUES ($id, $type, $version, $content, $createdAt, 0)`,
      { $id: saved.id, $type: type, $version: version, $content: content, $createdAt: saved.createdAt },
    );
    return saved;
  }

  function history(type: GuidelineType): GuidelineVersion[] {
    return readVersions(
      db,
      "SELECT * FROM guideline_versions WHERE type = $type ORDER BY version DESC",
      { $type: type },
    );
  }

  function remove(type: GuidelineType): GuidelineVersion {
    const current = open(type);
    if (!current) throw new Error("삭제할 지침이 없습니다.");
    const deleted: GuidelineVersion = {
      id: crypto.randomUUID(),
      type,
      version: current.version + 1,
      content: current.content,
      createdAt: now(),
      deleted: true,
    };
    db.run(
      `INSERT INTO guideline_versions (id, type, version, content, created_at, is_deleted)
       VALUES ($id, $type, $version, $content, $createdAt, 1)`,
      {
        $id: deleted.id,
        $type: type,
        $version: deleted.version,
        $content: deleted.content,
        $createdAt: deleted.createdAt,
      },
    );
    return deleted;
  }

  function restore(type: GuidelineType, version: number): GuidelineVersion {
    const source = history(type).find((item) => item.version === version);
    if (!source) throw new Error("복원할 지침 버전을 찾을 수 없습니다.");
    return save(type, source.content);
  }

  return { history, open, remove, restore, save };
}

export type GuidelineRepository = ReturnType<typeof createGuidelineRepository>;
