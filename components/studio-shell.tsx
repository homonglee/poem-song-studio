"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { useProjectDatabase } from "@/hooks/use-project-database";
import type { Project } from "@/types/project";

type IconName = "folder" | "pen" | "image" | "music" | "mic" | "video" | "youtube" | "guide" | "settings" | "sun" | "moon" | "search" | "plus" | "trash" | "edit" | "clock" | "restore" | "x";

const iconPaths: Record<IconName, ReactNode> = {
  folder: <path d="M3 7.5h6l2-2h4.5A2.5 2.5 0 0 1 18 8v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 15.5V8.8A1.3 1.3 0 0 1 3.3 7.5Z" />,
  pen: <><path d="m4 16 1-4L14.5 2.5a2.1 2.1 0 0 1 3 3L8 15l-4 1Z" /><path d="m12.5 4.5 3 3" /></>,
  image: <><rect x="2.5" y="3.5" width="15" height="13" rx="2" /><path d="m4.5 14 3.5-3 2.5 2 2.5-2.5 4.5 4" /></>,
  music: <><path d="M8 15.5V5l8-1.5V14" /><circle cx="5.5" cy="15.5" r="2.5" /><circle cx="13.5" cy="14" r="2.5" /></>,
  mic: <><rect x="7" y="2" width="6" height="11" rx="3" /><path d="M4.5 10.5a5.5 5.5 0 0 0 11 0M10 16v2M7 18h6" /></>,
  video: <><rect x="2.5" y="4" width="11" height="12" rx="2" /><path d="m13.5 8 4-2v8l-4-2" /></>,
  youtube: <><rect x="2" y="5" width="16" height="10" rx="3" /><path d="m8.5 12.5 4-2.5-4-2.5v5Z" /></>,
  guide: <><path d="M4 3h11a1 1 0 0 1 1 1v13H6a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Z" /><path d="M6.5 7h6M6.5 10h5M6 17a3 3 0 0 1 3-3h7" /></>,
  settings: <><circle cx="10" cy="10" r="2.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4" /></>,
  sun: <><circle cx="10" cy="10" r="3" /><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.6 3.6 5 5M15 15l1.4 1.4M16.4 3.6 15 5M5 15l-1.4 1.4" /></>,
  moon: <path d="M17 12.2A7 7 0 1 1 7.8 3 5.5 5.5 0 0 0 17 12.2Z" />,
  search: <><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></>,
  plus: <path d="M10 3v14M3 10h14" />,
  trash: <><path d="M3 5h14M8 2h4l1 3M5 5l1 12h8l1-12M8 8v6M12 8v6" /></>,
  edit: <><path d="m4 16 1-4 8.8-8.8a2 2 0 0 1 2.8 2.8L8 14.5 4 16Z" /><path d="m12.5 4.5 3 3" /></>,
  clock: <><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 2" /></>,
  restore: <><path d="M4 7V3m0 0h4M4 3a7 7 0 1 1-1 9" /></>,
  x: <path d="m5 5 10 10M15 5 5 15" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6">{iconPaths[name]}</svg>;
}

const navigation: { label: string; icon: IconName; active?: boolean }[] = [
  { label: "프로젝트", icon: "folder", active: true },
  { label: "시 작성", icon: "pen" },
  { label: "시화", icon: "image" },
  { label: "시노래", icon: "music" },
  { label: "시낭독", icon: "mic" },
  { label: "영상", icon: "video" },
  { label: "유튜브", icon: "youtube" },
  { label: "지침관리", icon: "guide" },
  { label: "환경설정", icon: "settings" },
];

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function ProjectCard({ project, selected, onOpen, onTrash }: { project: Project; selected: boolean; onOpen: () => void; onTrash: () => void }) {
  return (
    <article className={`group rounded-xl border bg-white p-4 transition dark:bg-[#0f1011] ${selected ? "border-[#5e6ad2] ring-2 ring-[#5e6ad2]/10 dark:border-[#7170ff]" : "border-black/8 hover:border-black/15 dark:border-white/8 dark:hover:border-white/15"}`}>
      <button type="button" onClick={onOpen} className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5e6ad2]">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#eeefff] text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]"><Icon name="folder" className="h-[18px] w-[18px]" /></div>
          <span className="rounded-full bg-[#f3f4f6] px-2 py-1 text-[10px] font-medium text-[#73777e] dark:bg-white/[0.05] dark:text-[#8a8f98]">초안</span>
        </div>
        <h3 className="mt-4 truncate text-sm font-semibold">{project.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#7a7f87] dark:text-[#8a8f98]">{project.description || "프로젝트 설명이 없습니다."}</p>
      </button>
      <div className="mt-4 flex items-center justify-between border-t border-black/6 pt-3 dark:border-white/6">
        <span className="flex items-center gap-1.5 text-[10px] text-[#999da3] dark:text-[#62666d]"><Icon name="clock" className="h-3.5 w-3.5" />{dateFormatter.format(new Date(project.updatedAt))}</span>
        <button type="button" onClick={onTrash} aria-label={`${project.name} 휴지통으로 이동`} className="grid h-8 w-8 place-items-center rounded-md text-[#94989e] transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 dark:hover:bg-red-400/10 dark:hover:text-red-300"><Icon name="trash" className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

export function StudioShell() {
  const database = useProjectDatabase();
  const setDatabaseSearch = database.setSearch;
  const updateProject = database.updateProject;
  const [view, setView] = useState<"projects" | "trash">("projects");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const skipAutoSave = useRef(true);

  const selectedProject = database.projects.find((project) => project.id === selectedId) ?? null;
  const filteredTrash = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return database.trash;
    return database.trash.filter((project) => `${project.name} ${project.description}`.toLocaleLowerCase("ko-KR").includes(normalized));
  }, [database.trash, query]);

  useEffect(() => {
    setDatabaseSearch(query);
  }, [query, setDatabaseSearch]);

  useEffect(() => {
    if (!selectedId || !draftName.trim()) return;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      updateProject(selectedId, { name: draftName, description: draftDescription });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draftDescription, draftName, selectedId, updateProject]);

  useEffect(() => {
    const saved = window.localStorage.getItem("poem-song-studio-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("poem-song-studio-theme", dark ? "dark" : "light");
  }

  async function openProject(project: Project) {
    skipAutoSave.current = true;
    setDraftName(project.name);
    setDraftDescription(project.description);
    setSelectedId(project.id);
    await database.markOpened(project.id);
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    const project = await database.createProject({ name: newName, description: newDescription });
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
    setView("projects");
    skipAutoSave.current = true;
    setDraftName(project.name);
    setDraftDescription(project.description);
    setSelectedId(project.id);
  }

  async function moveToTrash(project: Project) {
    if (!window.confirm(`“${project.name}” 프로젝트를 휴지통으로 이동할까요?`)) return;
    await database.moveToTrash(project.id);
    if (selectedId === project.id) setSelectedId(null);
  }

  const saveLabel = database.saveStatus === "saving" ? "자동 저장 중" : database.saveStatus === "error" ? "저장 오류" : database.saveStatus === "loading" ? "SQLite 준비 중" : "자동 저장됨";
  const visibleProjects = view === "projects" ? database.projects : filteredTrash;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#202124] transition-colors dark:bg-[#08090a] dark:text-[#f7f8f8] lg:grid lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:grid-rows-[72px_minmax(0,1fr)]">
      <aside className="border-b border-black/8 bg-white px-4 py-4 dark:border-white/8 dark:bg-[#0f1011] lg:row-span-2 lg:border-r lg:border-b-0 lg:px-3 lg:py-5">
        <div className="mb-5 flex items-center gap-3 px-2 lg:mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#5e6ad2] text-white"><Icon name="folder" className="h-5 w-5" /></div>
          <div><p className="text-[13px] font-semibold tracking-tight">Poem Song</p><p className="text-[11px] text-[#747980] dark:text-[#8a8f98]">Studio</p></div>
        </div>
        <nav aria-label="주 메뉴">
          <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.14em] text-[#92969d] uppercase dark:text-[#62666d]">워크스페이스</p>
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
            {navigation.map((item) => <li key={item.label}><div aria-current={item.active ? "page" : undefined} aria-disabled={!item.active} className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium lg:min-h-10 ${item.active ? "bg-[#eeefff] text-[#4f57bb] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]" : "cursor-not-allowed text-[#a3a7ad] dark:text-[#555960]"}`}><Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" /><span>{item.label}</span>{!item.active && <span className="ml-auto hidden text-[9px] lg:inline">준비중</span>}</div></li>)}
          </ul>
        </nav>
        <div className="mt-5 hidden rounded-xl border border-black/8 bg-[#fafafa] p-3 dark:border-white/8 dark:bg-white/[0.025] lg:block"><p className="text-xs font-medium">프로젝트 관리 단계</p><p className="mt-1 text-[11px] leading-5 text-[#7a7f87] dark:text-[#70757d]">현재는 프로젝트 정보만 관리합니다.</p></div>
      </aside>

      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-black/8 bg-white/90 px-5 backdrop-blur dark:border-white/8 dark:bg-[#08090a]/90 sm:px-7 lg:col-span-2">
        <div className="min-w-0"><p className="text-[11px] font-medium text-[#898d94] dark:text-[#62666d]">프로젝트 관리</p><h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{selectedProject?.name ?? "내 프로젝트"}</h1></div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3"><div className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium sm:flex ${database.saveStatus === "error" ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${database.saveStatus === "saving" ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />{saveLabel}</div><button type="button" onClick={toggleTheme} aria-label="라이트·다크 테마 전환" className="grid h-10 w-10 place-items-center rounded-lg border border-black/10 bg-white text-[#5f6368] hover:bg-[#f5f6f7] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#d0d6e0]"><span className="dark:hidden"><Icon name="moon" className="h-[18px] w-[18px]" /></span><span className="hidden dark:block"><Icon name="sun" className="h-[18px] w-[18px]" /></span></button></div>
      </header>

      <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium text-[#6f747b] dark:text-[#8a8f98]">프로젝트</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">작품 프로젝트를 관리하세요</h2><p className="mt-2 text-sm text-[#747980] dark:text-[#8a8f98]">프로젝트 정보는 브라우저의 SQLite 데이터베이스에 자동 저장됩니다.</p></div><button type="button" onClick={() => setCreateOpen(true)} disabled={!database.ready} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5e6ad2] px-4 text-sm font-semibold text-white transition hover:bg-[#515cc4] disabled:opacity-50"><Icon name="plus" className="h-4 w-4" />새 프로젝트</button></div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex rounded-lg bg-[#eceef1] p-1 dark:bg-white/[0.06]"><button type="button" onClick={() => setView("projects")} className={`rounded-md px-3 py-2 text-xs font-medium ${view === "projects" ? "bg-white text-[#34373b] shadow-sm dark:bg-[#25262a] dark:text-white" : "text-[#777c83] dark:text-[#8a8f98]"}`}>프로젝트 목록 <span className="ml-1 opacity-60">{database.projects.length}</span></button><button type="button" onClick={() => setView("trash")} className={`rounded-md px-3 py-2 text-xs font-medium ${view === "trash" ? "bg-white text-[#34373b] shadow-sm dark:bg-[#25262a] dark:text-white" : "text-[#777c83] dark:text-[#8a8f98]"}`}>휴지통 <span className="ml-1 opacity-60">{database.trash.length}</span></button></div><label className="relative block sm:w-72"><span className="sr-only">프로젝트 검색</span><Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#989ca2]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="프로젝트 검색" className="h-10 w-full rounded-lg border border-black/10 bg-white pr-3 pl-9 text-sm outline-none transition placeholder:text-[#a0a4aa] focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-[#0f1011]" /></label></div>

          {view === "projects" && !query && database.recentProjects.length > 0 && <section className="mt-7"><div className="mb-3 flex items-center gap-2"><Icon name="clock" className="h-4 w-4 text-[#7b8087]" /><h3 className="text-xs font-semibold">최근 프로젝트</h3></div><div className="flex gap-2 overflow-x-auto pb-1">{database.recentProjects.map((project) => <button key={project.id} type="button" onClick={() => openProject(project)} className="min-w-44 rounded-lg border border-black/8 bg-white px-3 py-2.5 text-left dark:border-white/8 dark:bg-[#0f1011]"><p className="truncate text-xs font-medium">{project.name}</p><p className="mt-1 text-[10px] text-[#92969d]">{dateFormatter.format(new Date(project.lastOpenedAt))}</p></button>)}</div></section>}

          <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold">{view === "projects" ? (query ? "검색 결과" : "모든 프로젝트") : "휴지통"}</h3><span className="text-[11px] text-[#93979d]">{visibleProjects.length}개</span></div>{!database.ready ? <div className="grid min-h-64 place-items-center rounded-2xl border border-black/8 bg-white dark:border-white/8 dark:bg-[#0f1011]"><p className="text-sm text-[#7d8289]">SQLite 데이터베이스를 준비하고 있습니다.</p></div> : visibleProjects.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-black/12 bg-white/60 px-6 text-center dark:border-white/12 dark:bg-white/[0.02]"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#eeefff] text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]"><Icon name={view === "trash" ? "trash" : "folder"} className="h-5 w-5" /></div><p className="mt-4 text-sm font-semibold">{query ? "검색 결과가 없습니다" : view === "trash" ? "휴지통이 비어 있습니다" : "아직 프로젝트가 없습니다"}</p><p className="mt-1 text-xs text-[#878b92]">{view === "projects" && !query ? "새 프로젝트를 만들어 시작하세요." : "다른 검색어를 입력하거나 목록을 확인하세요."}</p></div></div> : view === "projects" ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{database.projects.map((project) => <ProjectCard key={project.id} project={project} selected={selectedId === project.id} onOpen={() => openProject(project)} onTrash={() => moveToTrash(project)} />)}</div> : <div className="space-y-2">{filteredTrash.map((project) => <article key={project.id} className="flex flex-col gap-3 rounded-xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-[#0f1011] sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-semibold">{project.name}</h4><p className="mt-1 text-[11px] text-[#8a8f98]">삭제: {project.deletedAt ? dateFormatter.format(new Date(project.deletedAt)) : "-"}</p></div><div className="flex gap-2"><button type="button" onClick={() => database.restoreProject(project.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-xs font-medium dark:border-white/10"><Icon name="restore" className="h-4 w-4" />복원</button><button type="button" onClick={() => window.confirm("이 프로젝트를 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.") && database.deletePermanently(project.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-medium text-red-700 dark:bg-red-400/10 dark:text-red-300"><Icon name="trash" className="h-4 w-4" />영구 삭제</button></div></article>)}</div>}</section>
        </div>
      </main>

      <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">프로젝트 정보</p><h2 className="mt-1 text-base font-semibold">{selectedProject ? "프로젝트 수정" : "선택된 프로젝트 없음"}</h2></div>{selectedProject && <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#eeefff] text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]"><Icon name="edit" className="h-4 w-4" /></div>}</div>{selectedProject ? <div className="mt-6 space-y-5"><label className="block"><span className="text-xs font-medium">프로젝트명</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={80} className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-[#fafafa] px-3 text-sm outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" /></label><label className="block"><span className="text-xs font-medium">설명</span><textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} maxLength={300} rows={6} placeholder="프로젝트에 대한 간단한 설명" className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#fafafa] p-3 text-sm leading-6 outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" /></label><div className="rounded-xl bg-[#f7f8fa] p-4 dark:bg-white/[0.035]"><p className="flex items-center gap-2 text-xs font-medium"><span className={`h-1.5 w-1.5 rounded-full ${database.saveStatus === "saving" ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />{saveLabel}</p><p className="mt-1.5 text-[11px] leading-5 text-[#7d8289] dark:text-[#70757d]">입력한 프로젝트 정보는 0.7초 후 SQLite에 자동 저장됩니다.</p></div><dl className="space-y-3 border-t border-black/7 pt-5 text-[11px] dark:border-white/7"><div className="flex justify-between gap-3"><dt className="text-[#8c9097]">생성일</dt><dd>{dateFormatter.format(new Date(selectedProject.createdAt))}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8c9097]">마지막 수정</dt><dd>{dateFormatter.format(new Date(selectedProject.updatedAt))}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8c9097]">저장 방식</dt><dd>SQLite · 자동저장</dd></div></dl></div> : <div className="mt-8 rounded-xl border border-dashed border-black/12 p-6 text-center dark:border-white/12"><Icon name="edit" className="mx-auto h-5 w-5 text-[#999da3]" /><p className="mt-3 text-xs font-medium">프로젝트를 선택하세요</p><p className="mt-1 text-[11px] leading-5 text-[#888d94]">목록에서 프로젝트를 선택하면 이름과 설명을 수정할 수 있습니다.</p></div>}</aside>

      {createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setCreateOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#151619] sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-[#7b8087]">새 작업공간</p><h2 id="new-project-title" className="mt-1 text-lg font-semibold">새 프로젝트</h2></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="닫기" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Icon name="x" className="h-4 w-4" /></button></div><form onSubmit={createProject} className="mt-6 space-y-4"><label className="block"><span className="text-xs font-medium">프로젝트명</span><input autoFocus required value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="예: 가을의 노래" className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#fafafa] px-3 text-sm outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" /></label><label className="block"><span className="text-xs font-medium">설명 <span className="font-normal text-[#92969d]">(선택)</span></span><textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={300} rows={4} placeholder="프로젝트에 대한 간단한 설명" className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-[#fafafa] p-3 text-sm outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" /></label><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-black/10 px-4 text-sm font-medium dark:border-white/10">취소</button><button type="submit" className="h-10 rounded-lg bg-[#5e6ad2] px-4 text-sm font-semibold text-white">프로젝트 만들기</button></div></form></section></div>}
    </div>
  );
}
