"use client";

import initSqlJs, { type Database } from "sql.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { createGuidelineRepository, type GuidelineRepository } from "@/lib/guideline-repository";
import { createPoemRepository, type PoemRepository } from "@/lib/poem-repository";
import { loadProjectDatabase, saveProjectDatabase } from "@/lib/project-database-storage";
import { createProjectRepository, type ProjectRepository } from "@/lib/project-repository";
import { guidelineTypes, type GuidelineType, type GuidelineVersion } from "@/types/guideline";
import type { SavePoemDraftInput } from "@/types/poem";
import type { CreateProjectInput, Project, UpdateProjectInput } from "@/types/project";

export type SaveStatus = "loading" | "saved" | "saving" | "error";

type GuidelineMap = Record<GuidelineType, GuidelineVersion | null>;
type GuidelineHistoryMap = Record<GuidelineType, GuidelineVersion[]>;
type PersistResult = { success: boolean; attempt: number };

const emptyGuidelines = () => Object.fromEntries(guidelineTypes.map((type) => [type, null])) as GuidelineMap;
const emptyHistories = () => Object.fromEntries(
  guidelineTypes.map((type): [GuidelineType, GuidelineVersion[]] => [type, []]),
) as GuidelineHistoryMap;

export function useProjectDatabase() {
  const databaseRef = useRef<Database | null>(null);
  const repositoryRef = useRef<ProjectRepository | null>(null);
  const guidelineRepositoryRef = useRef<GuidelineRepository | null>(null);
  const poemRepositoryRef = useRef<PoemRepository | null>(null);
  const persistQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const persistAttemptRef = useRef(0);
  const lastSuccessfulPersistAttemptRef = useRef(0);
  const pendingPersistRef = useRef(0);
  const searchRef = useRef("");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [trash, setTrash] = useState<Project[]>([]);
  const [guidelines, setGuidelines] = useState<GuidelineMap>(emptyGuidelines);
  const [guidelineHistories, setGuidelineHistories] = useState<GuidelineHistoryMap>(emptyHistories);

  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");

  const refreshProjects = useCallback(() => {
    const repository = repositoryRef.current;
    if (!repository) return;
    setAllProjects(repository.list());
    setProjects(repository.list({ search: searchRef.current }));
    setRecentProjects(repository.recent(4));
    setTrash(repository.listTrash());
  }, []);

  const refreshGuidelines = useCallback(() => {
    const repository = guidelineRepositoryRef.current;
    if (!repository) return;
    setGuidelines(Object.fromEntries(guidelineTypes.map((type) => [type, repository.open(type)])) as GuidelineMap);
    setGuidelineHistories(Object.fromEntries(guidelineTypes.map((type) => [type, repository.history(type)])) as GuidelineHistoryMap);
  }, []);


  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
        const stored = await loadProjectDatabase();
        if (!active) return;
        const database = stored ? new SQL.Database(stored) : new SQL.Database();
        databaseRef.current = database;
        repositoryRef.current = createProjectRepository(database);
        guidelineRepositoryRef.current = createGuidelineRepository(database);
        poemRepositoryRef.current = createPoemRepository(database);
        refreshProjects();
        refreshGuidelines();

        setReady(true);
        setSaveStatus("saved");
      } catch (error) {
        console.error("SQLite 데이터베이스를 불러오지 못했습니다.", error);
        if (active) setSaveStatus("error");
      }
    }

    initialize();
    return () => {
      active = false;
      databaseRef.current?.close();
      databaseRef.current = null;
      repositoryRef.current = null;
      guidelineRepositoryRef.current = null;
      poemRepositoryRef.current = null;
    };
  }, [refreshGuidelines, refreshProjects]);

  const persist = useCallback(async () => {
    const attempt = ++persistAttemptRef.current;
    const database = databaseRef.current;
    if (!database) return { success: false, attempt };
    const snapshot = database.export();
    pendingPersistRef.current += 1;
    setSaveStatus("saving");
    const saveSnapshot = async () => {
      let failed = false;
      try {
        await saveProjectDatabase(snapshot);
        return true;
      } catch (error) {
        failed = true;
        console.error("SQLite 데이터베이스를 저장하지 못했습니다.", error);
        setSaveStatus("error");
        return false;
      } finally {
        pendingPersistRef.current -= 1;
        if (!failed && pendingPersistRef.current === 0) setSaveStatus("saved");
      }
    };
    persistQueueRef.current = persistQueueRef.current.catch(() => false).then(saveSnapshot);
    const success = await persistQueueRef.current;
    if (success) lastSuccessfulPersistAttemptRef.current = Math.max(lastSuccessfulPersistAttemptRef.current, attempt);
    return { success, attempt };
  }, []);

  const settlePersistence = useCallback(async (initial: PersistResult) => {
    let observedAttempt = initial.attempt;
    while (persistAttemptRef.current > observedAttempt) {
      observedAttempt = persistAttemptRef.current;
      await persistQueueRef.current;
    }
    return lastSuccessfulPersistAttemptRef.current >= initial.attempt;
  }, []);

  const setSearch = useCallback((search: string) => {
    searchRef.current = search;
    refreshProjects();
  }, [refreshProjects]);

  const createProject = useCallback(async (input: CreateProjectInput) => {
    const repository = repositoryRef.current;
    if (!repository) throw new Error("프로젝트 저장소를 준비하는 중입니다.");
    const project = repository.create(input);
    refreshProjects();
    await persist();
    return project;
  }, [persist, refreshProjects]);

  const updateProject = useCallback(async (id: string, input: UpdateProjectInput) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    const project = repository.update(id, input);
    refreshProjects();
    await persist();
    return project;
  }, [persist, refreshProjects]);

  const moveToTrash = useCallback(async (id: string) => {
    repositoryRef.current?.moveToTrash(id);
    refreshProjects();
    await persist();
  }, [persist, refreshProjects]);

  const restoreProject = useCallback(async (id: string) => {
    repositoryRef.current?.restore(id);
    refreshProjects();
    await persist();
  }, [persist, refreshProjects]);

  const deletePermanently = useCallback(async (id: string) => {
    repositoryRef.current?.deletePermanently(id);
    refreshProjects();
    await persist();
  }, [persist, refreshProjects]);

  const markOpened = useCallback(async (id: string) => {
    repositoryRef.current?.markOpened(id);
    refreshProjects();
    await persist();
  }, [persist, refreshProjects]);

  const saveGuideline = useCallback(async (type: GuidelineType, content: string) => {
    const repository = guidelineRepositoryRef.current;
    if (!repository) throw new Error("지침 저장소를 준비하는 중입니다.");
    const saved = repository.save(type, content.trim());
    refreshGuidelines();
    await persist();
    return saved;
  }, [persist, refreshGuidelines]);

  const deleteGuideline = useCallback(async (type: GuidelineType) => {
    const repository = guidelineRepositoryRef.current;
    if (!repository) return;
    const deleted = repository.remove(type);
    refreshGuidelines();
    await persist();
    return deleted;
  }, [persist, refreshGuidelines]);

  const restoreGuideline = useCallback(async (type: GuidelineType, version: number) => {
    const repository = guidelineRepositoryRef.current;
    if (!repository) return;
    const restored = repository.restore(type, version);
    refreshGuidelines();
    await persist();
    return restored;
  }, [persist, refreshGuidelines]);

  const openPoemDraft = useCallback((projectId: string) => poemRepositoryRef.current?.openDraft(projectId) ?? null, []);

  const poemHistory = useCallback((projectId: string) => poemRepositoryRef.current?.history(projectId) ?? [], []);

  const savePoemDraft = useCallback(async (projectId: string, input: SavePoemDraftInput) => {
    const repository = poemRepositoryRef.current;
    if (!repository) return;
    const hadVersions = repository.history(projectId).length > 0;
    const saved = repository.saveDraft(projectId, input);
    const persisted = await settlePersistence(await persist());
    if (!persisted) {
      if (!hadVersions) repository.removeVersion(projectId, 1);
      throw new Error("시 초안을 저장하지 못했습니다.");
    }
    return saved;
  }, [persist, settlePersistence]);

  const createPoemVersion = useCallback(async (projectId: string) => {
    const repository = poemRepositoryRef.current;
    if (!repository) return;
    const version = repository.createVersion(projectId);
    const persisted = await settlePersistence(await persist());
    if (!persisted) {
      databaseRef.current?.run("DELETE FROM poem_versions WHERE id = $id", { $id: version.id });
      throw new Error("시 버전을 저장하지 못했습니다.");
    }
    return version;
  }, [persist, settlePersistence]);

  const restorePoemVersion = useCallback(async (projectId: string, version: number) => {
    const repository = poemRepositoryRef.current;
    if (!repository) return;
    const previousDraft = repository.openDraft(projectId);
    const restored = repository.restore(projectId, version);
    if (!restored) return null;
    const persisted = await settlePersistence(await persist());
    if (!persisted) {
      databaseRef.current?.run("DELETE FROM poem_versions WHERE id = $id", { $id: restored.id });
      if (previousDraft) repository.saveDraft(projectId, previousDraft);
      else databaseRef.current?.run("DELETE FROM poem_drafts WHERE project_id = $projectId", { $projectId: projectId });
      throw new Error("복원한 시 버전을 저장하지 못했습니다.");
    }
    return restored;
  }, [persist, settlePersistence]);

  return {
    allProjects,
    createPoemVersion,
    createProject,
    deleteGuideline,
    deletePermanently,
    guidelineHistories,
    guidelines,
    markOpened,
    moveToTrash,
    openPoemDraft,
    poemHistory,
    projects,
    ready,
    recentProjects,
    restoreGuideline,
    restorePoemVersion,
    restoreProject,
    saveGuideline,
    savePoemDraft,
    saveStatus,
    setSearch,
    trash,
    updateProject,
  };
}

export type StudioDatabase = ReturnType<typeof useProjectDatabase>;
