"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { StudioDatabase } from "@/hooks/use-project-database";
import { aiEditActions, editPoemWithAi, type PoemEditAction } from "@/lib/poem-edit-service";
import {
  applyEditorChange,
  createEditorHistory,
  deleteLineAt,
  findMatches,
  getPoemStats,
  insertAtSelection,
  redoEditorChange,
  replaceAllText,
  undoEditorChange,
  type EditorDocument,
  type EditorHistory,
} from "@/lib/poem-editor";
import { generateMockPoem } from "@/lib/mock-poem-ai";
import type { PoemInputMode, PoemVersion, SavePoemDraftInput } from "@/types/poem";

const modeMeta: Record<PoemInputMode, { number: string; title: string }> = {
  keyword: { number: "①", title: "주제어" },
  existing: { number: "②", title: "기존 시" },
  ocr: { number: "③", title: "OCR" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const toolButton = "h-9 rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold text-[#5f646b] hover:bg-[#f3f4f6] disabled:opacity-35 dark:border-white/10 dark:bg-white/[0.035] dark:text-[#b7bbc2] dark:hover:bg-white/[0.07]";

export function PoemProjectRequired({ onCreate }: { onCreate: () => void }) {
  return <>
    <main className="grid min-w-0 place-items-center p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
      <section className="w-full max-w-xl rounded-2xl border border-black/8 bg-white p-7 text-center dark:border-white/8 dark:bg-[#0f1011] sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eeefff] text-lg font-bold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">시</div>
        <p className="mt-5 text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">시 작성 준비</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">먼저 프로젝트를 만들어 주세요</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7a7f87] dark:text-[#8a8f98]">시 초안과 편집 내용은 프로젝트별로 안전하게 분리해 저장합니다.</p>
        <button type="button" onClick={onCreate} className="mt-6 h-11 rounded-lg bg-[#5e6ad2] px-5 text-sm font-semibold text-white hover:bg-[#515cc4]">새 프로젝트 만들기</button>
      </section>
    </main>
    <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:border-t-0 lg:border-l"><p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">시 편집기</p><h2 className="mt-1 text-base font-semibold">프로젝트가 필요합니다</h2></aside>
  </>;
}

interface PoemWriterProps {
  database: StudioDatabase;
  projectId: string;
  projectName: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function PoemWriter({ database, projectId, projectName, onDirtyChange }: PoemWriterProps) {
  const initialDraft = database.openPoemDraft(projectId);
  const [mode, setMode] = useState<PoemInputMode>(() => initialDraft?.mode ?? "keyword");
  const [source, setSource] = useState(() => initialDraft?.source ?? "");
  const [author] = useState(() => initialDraft?.author ?? "이용호");
  const [original, setOriginal] = useState<EditorDocument>(() => ({ title: initialDraft?.originalTitle ?? initialDraft?.title ?? "", content: initialDraft?.originalContent ?? initialDraft?.content ?? "" }));
  const [history, setHistory] = useState<EditorHistory>(() => createEditorHistory({ title: initialDraft?.title ?? "", content: initialDraft?.content ?? "" }));
  const [versions, setVersions] = useState(() => database.poemHistory(projectId));
  const [generating, setGenerating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState<PoemEditAction | null>(null);
  const [dirty, setDirty] = useState(false);
  const [ocrFileName, setOcrFileName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findCursor, setFindCursor] = useState(0);
  const [clipboardMessage, setClipboardMessage] = useState("");
  const [versionBusy, setVersionBusy] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const pendingDraft = useRef<SavePoemDraftInput | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const versionOperation = useRef(false);
  const editorEpoch = useRef(0);
  const mounted = useRef(true);
  const savePoemDraft = database.savePoemDraft;
  const document = history.present;
  const stats = useMemo(() => getPoemStats(document.content), [document.content]);
  const matches = useMemo(() => findMatches(document.content, searchQuery), [document.content, searchQuery]);

  function draftFor(nextDocument = document, nextOriginal = original, nextMode = mode, nextSource = source): SavePoemDraftInput {
    return {
      mode: nextMode,
      source: nextSource,
      title: nextDocument.title,
      author,
      content: nextDocument.content,
      originalTitle: nextOriginal.title,
      originalContent: nextOriginal.content,
    };
  }

  async function persistDraft(next: SavePoemDraftInput) {
    try {
      await savePoemDraft(projectId, next);
      if (!mounted.current) return false;
      if (pendingDraft.current === next) {
        pendingDraft.current = null;
        setDirty(false);
        onDirtyChange?.(false);
      }
      return true;
    } catch {
      if (!mounted.current) return false;
      setDirty(true);
      onDirtyChange?.(true);
      return false;
    }
  }

  function scheduleAutosave(next: SavePoemDraftInput) {
    pendingDraft.current = next;
    setDirty(true);
    onDirtyChange?.(true);
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      autosaveTimer.current = null;
      await persistDraft(next);
    }, 700);
  }

  function updateDocument(next: EditorDocument, nextOriginal = original) {
    if (versionOperation.current) return;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    setHistory((current) => applyEditorChange(current, next));
    scheduleAutosave(draftFor(next, nextOriginal));
  }

  function setHistoryAndSave(nextHistory: EditorHistory) {
    if (versionOperation.current || nextHistory === history) return;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    setHistory(nextHistory);
    scheduleAutosave(draftFor(nextHistory.present));
  }

  function focusAt(caret: number, end = caret) {
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(caret, end);
    });
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      editorEpoch.current += 1;
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      if (pendingDraft.current) void savePoemDraft(projectId, pendingDraft.current).catch(() => undefined);
    };
  }, [projectId, savePoemDraft]);

  function changeMode(nextMode: PoemInputMode) {
    if (versionOperation.current) return;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    setMode(nextMode);
    setSource("");
    scheduleAutosave(draftFor(document, original, nextMode, ""));
  }

  function changeSource(nextSource: string) {
    if (versionOperation.current) return;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    setSource(nextSource);
    scheduleAutosave(draftFor(document, original, mode, nextSource));
  }

  async function generateFromKeyword() {
    if (!source.trim() || versionOperation.current) return;
    const epoch = ++editorEpoch.current;
    setAiRunning(null);
    setGenerating(true);
    const generated = await generateMockPoem({ mode: "keyword", input: source });
    if (epoch !== editorEpoch.current || versionOperation.current) return;
    const next = { title: source.trim(), content: generated };
    editorEpoch.current += 1;
    setOriginal(next);
    setHistory((current) => applyEditorChange(current, next));
    scheduleAutosave(draftFor(next, next));
    setGenerating(false);
  }

  function importExistingPoem() {
    if (!source.trim() || versionOperation.current) return;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    const next = { title: document.title, content: source };
    setOriginal(next);
    setHistory((current) => applyEditorChange(current, next));
    scheduleAutosave(draftFor(next, next));
  }

  async function persistCurrentDocument() {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    const next = draftFor();
    pendingDraft.current = next;
    return await persistDraft(next);
  }

  async function manualSave() {
    if (versionOperation.current) return false;
    return await persistCurrentDocument();
  }

  async function createVersion() {
    if (!document.content.trim() || versionOperation.current) return;
    versionOperation.current = true;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    setVersionBusy(true);
    try {
      const saved = await persistCurrentDocument();
      if (!saved || pendingDraft.current) return;
      try {
        await database.createPoemVersion(projectId);
        setVersions(database.poemHistory(projectId));
      } catch {
        // The shared database save status already exposes the failure.
      }
    } finally {
      versionOperation.current = false;
      setVersionBusy(false);
    }
  }

  async function restoreVersion(version: number) {
    if (versionOperation.current) return;
    versionOperation.current = true;
    editorEpoch.current += 1;
    setGenerating(false);
    setAiRunning(null);
    setVersionBusy(true);
    try {
      const saved = await persistCurrentDocument();
      if (!saved || pendingDraft.current) return;
      let restored: PoemVersion | null | undefined;
      try {
        restored = await database.restorePoemVersion(projectId, version);
      } catch {
        return;
      }
      if (!restored) return;
      const next = { title: restored.title, content: restored.content };
      const nextOriginal = { title: restored.originalTitle, content: restored.originalContent };
      setMode(restored.mode);
      setSource(restored.source);
      setOriginal(nextOriginal);
      setHistory(createEditorHistory(next));
      setVersions(database.poemHistory(projectId));
      setDirty(false);
      onDirtyChange?.(false);
    } finally {
      versionOperation.current = false;
      setVersionBusy(false);
    }
  }

  function insertBreak(insertion: "\n" | "\n\n") {
    const textarea = editorRef.current;
    const start = textarea?.selectionStart ?? document.content.length;
    const end = textarea?.selectionEnd ?? start;
    const result = insertAtSelection(document.content, start, end, insertion);
    updateDocument({ ...document, content: result.content });
    focusAt(result.caret);
  }

  function deleteCurrentLine() {
    const result = deleteLineAt(document.content, editorRef.current?.selectionStart ?? 0);
    updateDocument({ ...document, content: result.content });
    focusAt(result.caret);
  }

  function findNext() {
    if (!matches.length) return;
    const match = matches[findCursor % matches.length];
    setFindCursor((findCursor + 1) % matches.length);
    focusAt(match, match + searchQuery.length);
  }

  function replaceEveryMatch() {
    const result = replaceAllText(document.content, searchQuery, replaceQuery);
    if (!result.count) return;
    updateDocument({ ...document, content: result.content });
    setFindCursor(0);
  }

  function selectAll() {
    editorRef.current?.focus();
    editorRef.current?.select();
  }

  async function copyText() {
    const textarea = editorRef.current;
    const selected = textarea ? document.content.slice(textarea.selectionStart, textarea.selectionEnd) : "";
    try {
      await navigator.clipboard.writeText(selected || document.content);
      setClipboardMessage("복사 완료");
    } catch {
      setClipboardMessage("복사 실패");
    }
  }

  async function pasteText() {
    if (versionOperation.current) return;
    const epoch = ++editorEpoch.current;
    setGenerating(false);
    setAiRunning(null);
    try {
      const text = await navigator.clipboard.readText();
      if (epoch !== editorEpoch.current || versionOperation.current) return;
      const textarea = editorRef.current;
      const start = textarea?.selectionStart ?? document.content.length;
      const end = textarea?.selectionEnd ?? start;
      const result = insertAtSelection(document.content, start, end, text);
      updateDocument({ ...document, content: result.content });
      focusAt(result.caret);
      setClipboardMessage("붙여넣기 완료");
    } catch {
      if (epoch !== editorEpoch.current) return;
      setClipboardMessage("붙여넣기 권한이 필요합니다");
    }
  }

  async function runAiEdit(action: PoemEditAction) {
    if (versionOperation.current) return;
    const textarea = editorRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    if (action === "selection" && start === end) {
      setClipboardMessage("수정할 영역을 먼저 선택하세요");
      return;
    }
    const epoch = ++editorEpoch.current;
    setGenerating(false);
    setAiRunning(action);
    const target = action === "selection" ? document.content.slice(start, end) : document.content;
    const edited = await editPoemWithAi({ action, text: target });
    if (epoch !== editorEpoch.current || versionOperation.current) return;
    if (action === "selection") {
      const result = insertAtSelection(document.content, start, end, edited);
      updateDocument({ ...document, content: result.content });
      focusAt(start, result.caret);
    } else {
      updateDocument({ ...document, content: edited });
    }
    setAiRunning(null);
    setAiOpen(false);
  }

  function revertToOriginal() {
    updateDocument(original);
  }

  function downloadTxt() {
    const safeTitle = (document.title.trim() || "제목 없는 시").replace(/[\\/:*?"<>|]/g, "-");
    const text = `${document.title.trim() || "제목 없는 시"}\n${author}\n\n${document.content}`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeTitle}.txt`;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const saveLabel = database.saveStatus === "saving" ? "자동 저장 중" : database.saveStatus === "error" ? "저장 실패" : dirty ? "자동 저장 대기" : "저장 완료";

  return (
    <>
      <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-[#6f747b] dark:text-[#8a8f98]">6단계 · 시 편집</p><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">AI MOCK</span><span className="rounded-full bg-[#f2f3f5] px-2 py-1 text-[9px] font-medium text-[#6f747b] dark:bg-white/[0.05] dark:text-[#a0a5ad]">{projectName}</span></div><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">시를 직접 다듬어 보세요</h2></div>
            <div className="flex items-center gap-2"><span aria-live="polite" className={`rounded-full px-3 py-2 text-[10px] font-semibold ${database.saveStatus === "error" ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300" : database.saveStatus === "saving" ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"}`}>{saveLabel}</span><button type="button" onClick={manualSave} disabled={versionBusy} className="h-10 rounded-lg bg-[#5e6ad2] px-4 text-xs font-semibold text-white hover:bg-[#515cc4] disabled:opacity-40">수동 저장</button></div>
          </div>

          <details className="mt-6 rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-[#0f1011] sm:p-5">
            <summary className="cursor-pointer text-sm font-semibold">시 입력 방식 열기</summary>
            <div className="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="시 입력 방식">
              {(Object.keys(modeMeta) as PoemInputMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => changeMode(item)} className={`min-h-11 whitespace-nowrap rounded-lg px-1 text-[11px] font-semibold sm:px-2 sm:text-xs ${mode === item ? "bg-[#5e6ad2] text-white" : "bg-[#f2f3f5] text-[#666b72] dark:bg-white/[0.05] dark:text-[#a0a5ad]"}`}><span className="mr-1">{modeMeta[item].number}</span>{modeMeta[item].title}</button>)}
            </div>
            <div className="mt-4">
              {mode === "keyword" && <div><label className="block"><span className="text-xs font-medium">주제어</span><input value={source} onChange={(event) => changeSource(event.target.value)} maxLength={100} placeholder="예: 새벽, 그리움, 봄비" className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#fafafa] px-3 text-sm outline-none dark:border-white/10 dark:bg-white/[0.035]" /></label><button type="button" onClick={generateFromKeyword} disabled={!source.trim() || generating} className="mt-3 h-10 rounded-lg bg-[#5e6ad2] px-4 text-xs font-semibold text-white disabled:opacity-40">{generating ? "Mock 생성 중" : "Mock AI로 초안 만들기"}</button></div>}
              {mode === "existing" && <div><label className="block"><span className="text-xs font-medium">기존 시 원문</span><textarea value={source} onChange={(event) => changeSource(event.target.value)} rows={6} maxLength={12000} placeholder="기존 시를 붙여 넣으세요." className="mt-2 w-full rounded-lg border border-black/10 bg-[#fafafa] p-3 text-sm leading-6 outline-none dark:border-white/10 dark:bg-white/[0.035]" /></label><button type="button" onClick={importExistingPoem} disabled={!source.trim()} className="mt-3 h-10 rounded-lg bg-[#5e6ad2] px-4 text-xs font-semibold text-white disabled:opacity-40">편집기로 가져오기</button></div>}
              {mode === "ocr" && <div className="rounded-xl border-2 border-dashed border-black/10 bg-[#fafafa] px-5 py-8 text-center dark:border-white/10 dark:bg-white/[0.025]"><p className="text-sm font-semibold">시 이미지 선택</p><p className="mt-1 text-xs text-[#858a91]">OCR 화면만 제공하며 실제 인식은 실행하지 않습니다.</p><label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-lg border border-black/10 bg-white px-4 text-xs font-semibold dark:border-white/10 dark:bg-white/[0.04]"><input type="file" accept="image/*" className="sr-only" onChange={(event) => setOcrFileName(event.target.files?.[0]?.name ?? "")} />이미지 선택</label>{ocrFileName && <p className="mt-3 text-[11px] text-[#6f747b]">선택됨: {ocrFileName}</p>}</div>}
            </div>
          </details>

          <section className="mt-5 rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-[#0f1011] sm:p-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
              <label><span className="text-xs font-medium">시 제목</span><input aria-label="시 제목" value={document.title} onChange={(event) => updateDocument({ ...document, title: event.target.value })} maxLength={120} placeholder="제목을 입력하세요" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-lg font-semibold outline-none focus:border-[#5e6ad2] dark:border-white/10 dark:bg-white/[0.025]" /></label>
              <div className="rounded-xl bg-[#f6f7f9] px-4 py-3 dark:bg-white/[0.035]"><p className="text-[10px] text-[#8a8f98]">시인명</p><p className="mt-1 text-sm font-semibold">{author}</p></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="편집 도구">
              <button type="button" onClick={() => setHistoryAndSave(undoEditorChange(history))} disabled={!history.past.length} className={toolButton}>실행 취소</button>
              <button type="button" onClick={() => setHistoryAndSave(redoEditorChange(history))} disabled={!history.future.length} className={toolButton}>다시 실행</button>
              <button type="button" onClick={selectAll} className={toolButton}>전체 선택</button>
              <button type="button" onClick={copyText} className={toolButton}>복사</button>
              <button type="button" onClick={pasteText} className={toolButton}>붙여넣기</button>
              <button type="button" onClick={() => insertBreak("\n")} className={toolButton}>행 추가</button>
              <button type="button" onClick={deleteCurrentLine} className={toolButton}>행 삭제</button>
              <button type="button" onClick={() => insertBreak("\n\n")} className={toolButton}>연 구분</button>
              <button type="button" onClick={revertToOriginal} className={toolButton}>원문으로 되돌리기</button>
              <button type="button" onClick={downloadTxt} className={toolButton}>TXT 내려받기</button>
              <button type="button" onClick={() => setAiOpen((open) => !open)} className="h-9 rounded-lg bg-[#5e6ad2] px-3 text-[11px] font-semibold text-white">AI 편집</button>
            </div>

            {aiOpen && <div className="mt-3 rounded-xl border border-[#5e6ad2]/20 bg-[#f8f8ff] p-3 dark:bg-[#5e6ad2]/10"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">AI 편집 메뉴 <span className="text-[9px] font-medium text-amber-600">Mock 응답</span></p><button type="button" onClick={() => setAiOpen(false)} aria-label="AI 편집 메뉴 닫기" className="text-xs">닫기</button></div><div className="grid gap-2 sm:grid-cols-2">{aiEditActions.map((action) => <button key={action.id} type="button" onClick={() => runAiEdit(action.id)} disabled={aiRunning !== null || !document.content.trim()} className="rounded-lg border border-black/8 bg-white px-3 py-2 text-left text-[11px] font-medium hover:border-[#5e6ad2]/50 disabled:opacity-40 dark:border-white/8 dark:bg-[#111214]">{aiRunning === action.id ? "Mock 처리 중…" : action.label}</button>)}</div></div>}

            <div className="mt-4 grid gap-2 rounded-xl bg-[#f6f7f9] p-3 dark:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <label><span className="sr-only">검색어</span><input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setFindCursor(0); }} placeholder="시 본문 검색" className="h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none dark:border-white/10 dark:bg-[#111214]" /></label>
              <label><span className="sr-only">바꿀 내용</span><input value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} placeholder="바꿀 내용" className="h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none dark:border-white/10 dark:bg-[#111214]" /></label>
              <button type="button" onClick={findNext} disabled={!matches.length} className={toolButton}>찾기 {matches.length ? `${matches.length}개` : ""}</button>
              <button type="button" onClick={replaceEveryMatch} disabled={!matches.length} className={toolButton}>모두 바꾸기</button>
            </div>

            <textarea ref={editorRef} aria-label="시 본문 편집기" value={document.content} onChange={(event) => updateDocument({ ...document, content: event.target.value })} rows={18} maxLength={30000} placeholder="시 본문을 입력하거나 생성된 초안을 편집하세요." className="mt-4 w-full resize-y rounded-xl border border-black/10 bg-[#fafafa] p-4 text-[15px] leading-8 outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.025]" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#858a91]"><div className="flex flex-wrap gap-3"><span>글자 수 {stats.characters.toLocaleString()}</span><span>행 {stats.lines.toLocaleString()}</span><span>연 {stats.stanzas.toLocaleString()}</span><span className={dirty ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>{dirty ? "수정됨" : "저장됨"}</span>{clipboardMessage && <span aria-live="polite">{clipboardMessage}</span>}</div><span>{document.content.length.toLocaleString()} / 30,000</span></div>
          </section>
        </div>
      </main>

      <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">기존 버전관리</p><h2 className="mt-1 text-base font-semibold">저장된 버전</h2></div><button type="button" onClick={createVersion} disabled={!document.content.trim() || versionBusy} className="h-9 rounded-lg border border-[#5e6ad2]/30 px-3 text-[10px] font-semibold text-[#5e6ad2] disabled:opacity-40">{versionBusy ? "처리 중" : "버전 저장"}</button></div>
        <p className="mt-2 text-[10px] leading-5 text-[#858a91]">이번 단계에서는 버전 비교를 추가하지 않고 기존 저장·복원 기능만 유지합니다.</p>
        {versions.length === 0 ? <div className="mt-7 rounded-xl border border-dashed border-black/12 p-6 text-center dark:border-white/12"><p className="text-xs font-medium">저장된 버전이 없습니다</p></div> : <ol className="mt-5 space-y-2">{versions.map((version) => <li key={version.id} className="rounded-xl border border-black/8 p-3 dark:border-white/8"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">v{version.version}</span><span className="text-[9px] text-[#92969d]">{dateFormatter.format(new Date(version.createdAt))}</span></div><p className="mt-2 truncate text-[11px] font-medium">{version.title || "제목 없는 시"}</p><p className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] leading-5 text-[#777c83] dark:text-[#8a8f98]">{version.content}</p><button type="button" onClick={() => restoreVersion(version.version)} disabled={versionBusy} className="mt-2 text-[10px] font-semibold text-[#5e6ad2] hover:underline disabled:opacity-40">이 버전 복원</button></li>)}</ol>}
      </aside>
    </>
  );
}
