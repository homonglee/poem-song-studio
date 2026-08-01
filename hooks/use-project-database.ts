"use client";

import initSqlJs, { type Database } from "sql.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { createGuidelineRepository, type GuidelineRepository } from "@/lib/guideline-repository";
import { loadProjectDatabase, saveProjectDatabase } from "@/lib/project-database-storage";
import { createProjectRepository, type ProjectRepository } from "@/lib/project-repository";
import { guidelineTypes, type GuidelineType, type GuidelineVersion } from "@/types/guideline";
import type { CreateProjectInput, Project, UpdateProjectInput } from "@/types/project";

export type SaveStatus = "loading" | "saved" | "saving" | "error";

type GuidelineMap = Record<GuidelineType, GuidelineVersion | null>;
type GuidelineHistoryMap = Record<GuidelineType, GuidelineVersion[]>;

const emptyGuidelines = () => Object.fromEntries(guidelineTypes.map((type) => [type, null])) as GuidelineMap;
const emptyHistories = () => Object.fromEntries(
  guidelineTypes.map((type): [GuidelineType, GuidelineVersion[]] => [type, []]),
) as GuidelineHistoryMap;

export function useProjectDatabase() {
  const databaseRef = useRef<Database | null>(null);
  const repositoryRef = useRef<ProjectRepository | null>(null);
  const guidelineRepositoryRef = useRef<GuidelineRepository | null>(null);
  const searchRef = useRef("");
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
    };
  }, [refreshGuidelines, refreshProjects]);

  const persist = useCallback(async () => {
    const database = databaseRef.current;
    if (!database) return;
    setSaveStatus("saving");
    try {
      await saveProjectDatabase(database.export());
      setSaveStatus("saved");
    } catch (error) {
      console.error("SQLite 데이터베이스를 저장하지 못했습니다.", error);
      setSaveStatus("error");
    }
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

  return {
    createProject,
    deleteGuideline,
    deletePermanently,
    guidelineHistories,
    guidelines,
    markOpened,
    moveToTrash,
    projects,
    ready,
    recentProjects,
    restoreGuideline,
    restoreProject,
    saveGuideline,
    saveStatus,
    setSearch,
    trash,
    updateProject,
  };
}

export type StudioDatabase = ReturnType<typeof useProjectDatabase>;
