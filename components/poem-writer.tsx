"use client";

import { useEffect, useRef, useState } from "react";

import type { StudioDatabase } from "@/hooks/use-project-database";
import { generateMockPoem } from "@/lib/mock-poem-ai";
import type { PoemInputMode, SavePoemDraftInput } from "@/types/poem";

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

export function PoemProjectRequired({ onCreate }: { onCreate: () => void }) {
  return <>
    <main className="grid min-w-0 place-items-center p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
      <section className="w-full max-w-xl rounded-2xl border border-black/8 bg-white p-7 text-center dark:border-white/8 dark:bg-[#0f1011] sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eeefff] text-lg font-bold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">시</div>
        <p className="mt-5 text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">시 작성 준비</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">먼저 프로젝트를 만들어 주세요</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7a7f87] dark:text-[#8a8f98]">시 초안과 버전은 프로젝트별로 안전하게 분리해 저장합니다. 프로젝트를 만든 뒤 주제어, 기존 시, OCR 입력 화면을 사용할 수 있습니다.</p>
        <button type="button" onClick={onCreate} className="mt-6 h-11 rounded-lg bg-[#5e6ad2] px-5 text-sm font-semibold text-white hover:bg-[#515cc4]">새 프로젝트 만들기</button>
      </section>
    </main>
    <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:border-t-0 lg:border-l"><p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">시 버전관리</p><h2 className="mt-1 text-base font-semibold">프로젝트가 필요합니다</h2><p className="mt-4 text-[11px] leading-5 text-[#858a91]">프로젝트를 생성하면 해당 프로젝트 전용 시 초안과 버전 이력이 여기에 표시됩니다.</p></aside>
  </>;
}

export function PoemWriter({ database, projectId, projectName }: { database: StudioDatabase; projectId: string; projectName: string }) {
  const initialDraft = database.openPoemDraft(projectId);
  const [mode, setMode] = useState<PoemInputMode>(() => initialDraft?.mode ?? "keyword");
  const [source, setSource] = useState(() => initialDraft?.source ?? "");
  const [content, setContent] = useState(() => initialDraft?.content ?? "");
  const [versions, setVersions] = useState(() => database.poemHistory(projectId));
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [ocrFileName, setOcrFileName] = useState("");
  const autosaveTimer = useRef<number | null>(null);
  const pendingDraft = useRef<SavePoemDraftInput | null>(null);
  const savePoemDraft = database.savePoemDraft;

  useEffect(() => () => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    if (pendingDraft.current) void savePoemDraft(projectId, pendingDraft.current);
  }, [projectId, savePoemDraft]);

  function scheduleAutosave(next: { mode: PoemInputMode; source: string; content: string }) {
    pendingDraft.current = next;
    setDirty(true);
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      autosaveTimer.current = null;
      await savePoemDraft(projectId, next);
      if (pendingDraft.current === next) {
        pendingDraft.current = null;
        setDirty(false);
      }
    }, 700);
  }

  function changeMode(nextMode: PoemInputMode) {
    setMode(nextMode);
    setSource("");
    scheduleAutosave({ mode: nextMode, source: "", content });
  }

  function changeSource(nextSource: string) {
    setSource(nextSource);
    scheduleAutosave({ mode, source: nextSource, content });
  }

  function changeContent(nextContent: string) {
    setContent(nextContent);
    scheduleAutosave({ mode, source, content: nextContent });
  }

  async function generateFromKeyword() {
    if (!source.trim()) return;
    setGenerating(true);
    const generated = await generateMockPoem({ mode: "keyword", input: source });
    setContent(generated);
    scheduleAutosave({ mode, source, content: generated });
    setGenerating(false);
  }

  function importExistingPoem() {
    if (!source.trim()) return;
    setContent(source);
    scheduleAutosave({ mode, source, content: source });
  }

  async function createVersion() {
    if (!content.trim()) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    pendingDraft.current = null;
    await savePoemDraft(projectId, { mode, source, content });
    await database.createPoemVersion(projectId);
    setVersions(database.poemHistory(projectId));
    setDirty(false);
  }

  async function restoreVersion(version: number) {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    pendingDraft.current = null;
    const restored = await database.restorePoemVersion(projectId, version);
    if (!restored) return;
    setMode(restored.mode);
    setSource(restored.source);
    setContent(restored.content);
    setVersions(database.poemHistory(projectId));
    setDirty(false);
  }

  const saveLabel = dirty ? "자동 저장 대기" : database.saveStatus === "saving" ? "자동 저장 중" : database.saveStatus === "error" ? "저장 오류" : "자동 저장됨";

  return (
    <>
      <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
        <div className="mx-auto max-w-5xl">
          <div>
            <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium text-[#6f747b] dark:text-[#8a8f98]">시 작성</p><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">AI MOCK</span><span className="rounded-full bg-[#f2f3f5] px-2 py-1 text-[9px] font-medium text-[#6f747b] dark:bg-white/[0.05] dark:text-[#a0a5ad]">{projectName}</span></div>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">시의 시작점을 선택하세요</h2>
            <p className="mt-2 text-sm leading-6 text-[#747980] dark:text-[#8a8f98]">주제어 또는 기존 시로 편집을 시작할 수 있습니다. OCR은 이번 단계에서 화면만 제공합니다.</p>
          </div>

          <section className="mt-6 rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-[#0f1011] sm:p-5">
            <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="시 입력 방식">
              {(Object.keys(modeMeta) as PoemInputMode[]).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => changeMode(item)} className={`min-h-12 rounded-lg px-2 text-xs font-semibold transition sm:text-sm ${mode === item ? "bg-[#5e6ad2] text-white" : "bg-[#f2f3f5] text-[#666b72] hover:bg-[#e9eaed] dark:bg-white/[0.05] dark:text-[#a0a5ad] dark:hover:bg-white/[0.08]"}`}><span className="mr-1">{modeMeta[item].number}</span>{modeMeta[item].title}</button>)}
            </div>

            <div className="mt-5">
              {mode === "keyword" && <div><label className="block"><span className="text-xs font-medium">주제어</span><input value={source} onChange={(event) => changeSource(event.target.value)} maxLength={100} placeholder="예: 새벽, 그리움, 봄비" className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-[#fafafa] px-3 text-sm outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" /></label><button type="button" onClick={generateFromKeyword} disabled={!source.trim() || generating} className="mt-3 h-10 rounded-lg bg-[#5e6ad2] px-4 text-xs font-semibold text-white hover:bg-[#515cc4] disabled:opacity-40">{generating ? "Mock 생성 중" : "Mock AI로 초안 만들기"}</button></div>}
              {mode === "existing" && <div><label className="block"><span className="text-xs font-medium">기존 시 원문</span><textarea value={source} onChange={(event) => changeSource(event.target.value)} rows={7} maxLength={12000} placeholder="기존 시를 붙여 넣으세요." className="mt-2 w-full resize-y rounded-lg border border-black/10 bg-[#fafafa] p-3 text-sm leading-6 outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" /></label><button type="button" onClick={importExistingPoem} disabled={!source.trim()} className="mt-3 h-10 rounded-lg bg-[#5e6ad2] px-4 text-xs font-semibold text-white hover:bg-[#515cc4] disabled:opacity-40">편집창으로 가져오기</button></div>}
              {mode === "ocr" && <div><div className="rounded-xl border-2 border-dashed border-black/10 bg-[#fafafa] px-5 py-10 text-center dark:border-white/10 dark:bg-white/[0.025]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#eeefff] text-lg font-bold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">OCR</div><p className="mt-4 text-sm font-semibold">시 이미지 선택</p><p className="mt-1 text-xs leading-5 text-[#858a91]">이미지 업로드 화면만 제공하며 문자 인식은 아직 실행하지 않습니다.</p><label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-lg border border-black/10 bg-white px-4 text-xs font-semibold hover:bg-[#f5f6f7] dark:border-white/10 dark:bg-white/[0.04]"><input type="file" accept="image/*" className="sr-only" onChange={(event) => setOcrFileName(event.target.files?.[0]?.name ?? "")} />이미지 선택</label>{ocrFileName && <p className="mt-3 text-[11px] text-[#6f747b] dark:text-[#8a8f98]">선택됨: {ocrFileName}</p>}</div><button type="button" disabled className="mt-3 h-10 rounded-lg bg-[#5e6ad2] px-4 text-xs font-semibold text-white opacity-40">OCR 인식 시작 · 준비 중</button></div>}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-[#0f1011] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">시 편집창</h3><p className="mt-1 text-[11px] text-[#858a91]">수정 내용은 0.7초 후 SQLite에 자동 저장됩니다.</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${database.saveStatus === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"}`}>{saveLabel}</span><button type="button" onClick={createVersion} disabled={!content.trim()} className="h-9 rounded-lg border border-[#5e6ad2]/30 px-3 text-[11px] font-semibold text-[#5e6ad2] hover:bg-[#eeefff] disabled:opacity-40 dark:text-[#aeb4ff] dark:hover:bg-[#5e6ad2]/15">버전 저장</button></div></div>
            <textarea aria-label="시 편집창" value={content} onChange={(event) => changeContent(event.target.value)} rows={16} maxLength={30000} placeholder="시를 작성하거나 생성된 초안을 편집하세요." className="mt-4 w-full resize-y rounded-xl border border-black/10 bg-[#fafafa] p-4 text-[15px] leading-8 outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.025]" />
            <p className="mt-1 text-right text-[10px] text-[#969aa0]">{content.length.toLocaleString()} / 30,000</p>
          </section>
        </div>
      </main>

      <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">시 버전관리</p><h2 className="mt-1 text-base font-semibold">저장된 버전</h2></div><span className="rounded-full bg-[#eeefff] px-2.5 py-1 text-[10px] font-semibold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">{versions.length}개</span></div>
        {versions.length === 0 ? <div className="mt-7 rounded-xl border border-dashed border-black/12 p-6 text-center dark:border-white/12"><p className="text-xs font-medium">저장된 버전이 없습니다</p><p className="mt-2 text-[11px] leading-5 text-[#858a91]">편집창의 ‘버전 저장’을 누르면 현재 시를 기록합니다.</p></div> : <ol className="mt-5 space-y-2">{versions.map((version) => <li key={version.id} className="rounded-xl border border-black/8 p-3 dark:border-white/8"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-xs font-semibold">v{version.version}</span><span className="rounded bg-[#f2f3f5] px-1.5 py-0.5 text-[9px] text-[#73777e] dark:bg-white/[0.05] dark:text-[#8a8f98]">{modeMeta[version.mode].title}</span></div><span className="text-[9px] text-[#92969d]">{dateFormatter.format(new Date(version.createdAt))}</span></div><p className="mt-2 line-clamp-3 whitespace-pre-line text-[11px] leading-5 text-[#777c83] dark:text-[#8a8f98]">{version.content}</p><button type="button" onClick={() => restoreVersion(version.version)} className="mt-2 text-[10px] font-semibold text-[#5e6ad2] hover:underline dark:text-[#aeb4ff]">이 버전 복원</button></li>)}</ol>}
      </aside>
    </>
  );
}
