"use client";

import initSqlJs, { type Database } from "sql.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadProjectDatabase, saveProjectDatabase } from "@/lib/project-database-storage";
import { createProjectRepository, type ProjectRepository } from "@/lib/project-repository";
import type { CreateProjectInput, Project, UpdateProjectInput } from "@/types/project";

export type SaveStatus = "loading" | "saved" | "saving" | "error";

export function useProjectDatabase() {
  const databaseRef = useRef<Database | null>(null);
  const repositoryRef = useRef<ProjectRepository | null>(null);
  const searchRef = useRef("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [trash, setTrash] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");

  const refresh = useCallback(() => {
    const repository = repositoryRef.current;
    if (!repository) return;
    setProjects(repository.list({ search: searchRef.current }));
    setRecentProjects(repository.recent(4));
    setTrash(repository.listTrash());
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
        refresh();
        setReady(true);
        setSaveStatus("saved");
      } catch (error) {
        console.error("프로젝트 데이터베이스를 불러오지 못했습니다.", error);
        if (active) setSaveStatus("error");
      }
    }

    initialize();
    return () => {
      active = false;
      databaseRef.current?.close();
      databaseRef.current = null;
      repositoryRef.current = null;
    };
  }, [refresh]);

  const persist = useCallback(async () => {
    const database = databaseRef.current;
    if (!database) return;
    setSaveStatus("saving");
    try {
      await saveProjectDatabase(database.export());
      setSaveStatus("saved");
    } catch (error) {
      console.error("프로젝트를 자동 저장하지 못했습니다.", error);
      setSaveStatus("error");
    }
  }, []);

  const setSearch = useCallback((search: string) => {
    searchRef.current = search;
    refresh();
  }, [refresh]);

  const createProject = useCallback(async (input: CreateProjectInput) => {
    const repository = repositoryRef.current;
    if (!repository) throw new Error("프로젝트 저장소를 준비하는 중입니다.");
    const project = repository.create(input);
    refresh();
    await persist();
    return project;
  }, [persist, refresh]);

  const updateProject = useCallback(async (id: string, input: UpdateProjectInput) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    const project = repository.update(id, input);
    refresh();
    await persist();
    return project;
  }, [persist, refresh]);

  const moveToTrash = useCallback(async (id: string) => {
    repositoryRef.current?.moveToTrash(id);
    refresh();
    await persist();
  }, [persist, refresh]);

  const restoreProject = useCallback(async (id: string) => {
    repositoryRef.current?.restore(id);
    refresh();
    await persist();
  }, [persist, refresh]);

  const deletePermanently = useCallback(async (id: string) => {
    repositoryRef.current?.deletePermanently(id);
    refresh();
    await persist();
  }, [persist, refresh]);

  const markOpened = useCallback(async (id: string) => {
    repositoryRef.current?.markOpened(id);
    refresh();
    await persist();
  }, [persist, refresh]);

  return {
    createProject,
    deletePermanently,
    markOpened,
    moveToTrash,
    projects,
    ready,
    recentProjects,
    restoreProject,
    saveStatus,
    setSearch,
    trash,
    updateProject,
  };
}
