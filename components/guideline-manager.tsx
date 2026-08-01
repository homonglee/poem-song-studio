"use client";

import { useState } from "react";

import type { StudioDatabase } from "@/hooks/use-project-database";
import { guidelineTypes, type GuidelineType } from "@/types/guideline";

const guidelineMeta: Record<GuidelineType, { title: string; description: string }> = {
  poem: { title: "시 작성 지침", description: "시의 언어, 구조, 표현 원칙" },
  artwork: { title: "시화 지침", description: "시화의 분위기와 시각 표현 원칙" },
  song: { title: "시노래 지침", description: "가사 구성과 음악적 표현 원칙" },
  narration: { title: "시낭독 지침", description: "낭독 속도, 호흡, 감정 표현 원칙" },
  video: { title: "영상 지침", description: "장면 구성과 영상 연출 원칙" },
  youtube: { title: "유튜브 지침", description: "제목, 설명, 공개 운영 원칙" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function GuidelineManager({ database }: { database: StudioDatabase }) {
  const [selectedType, setSelectedType] = useState<GuidelineType | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const current = selectedType ? database.guidelines[selectedType] : null;
  const history = selectedType ? database.guidelineHistories[selectedType] : [];

  function openGuideline(type: GuidelineType) {
    setSelectedType(type);
    setDraft(database.guidelines[type]?.content ?? "");
    setCopied(false);
  }

  async function saveGuideline() {
    if (!selectedType || !draft.trim()) return;
    await database.saveGuideline(selectedType, draft);
  }

  async function copyGuideline() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function deleteGuideline() {
    if (!selectedType || !current) return;
    if (!window.confirm(`“${guidelineMeta[selectedType].title}”의 현재 지침을 삭제할까요? 버전 기록은 유지됩니다.`)) return;
    await database.deleteGuideline(selectedType);
    setDraft("");
  }

  async function restoreVersion(version: number) {
    if (!selectedType) return;
    const restored = await database.restoreGuideline(selectedType, version);
    if (restored) setDraft(restored.content);
  }

  return (
    <>
      <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
        <div className="mx-auto max-w-5xl">
          <div>
            <p className="text-xs font-medium text-[#6f747b] dark:text-[#8a8f98]">지침 관리</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">제작 지침을 한곳에서 관리하세요</h2>
            <p className="mt-2 text-sm leading-6 text-[#747980] dark:text-[#8a8f98]">지침을 열어 편집하고 저장할 때마다 SQLite에 새 버전이 기록됩니다.</p>
          </div>

          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold">지침 목록</h3>
              <span className="text-[11px] text-[#93979d]">6개</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {guidelineTypes.map((type) => {
                const guideline = database.guidelines[type];
                const selected = selectedType === type;
                return (
                  <article key={type} className={`rounded-xl border bg-white p-4 transition dark:bg-[#0f1011] ${selected ? "border-[#5e6ad2] ring-2 ring-[#5e6ad2]/10 dark:border-[#7170ff]" : "border-black/8 hover:border-black/15 dark:border-white/8 dark:hover:border-white/15"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#eeefff] text-sm font-bold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">{guidelineMeta[type].title.slice(0, 1)}</div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${guideline ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-[#f3f4f6] text-[#73777e] dark:bg-white/[0.05] dark:text-[#8a8f98]"}`}>{guideline ? `v${guideline.version}` : "미작성"}</span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{guidelineMeta[type].title}</h3>
                    <p className="mt-1 min-h-10 text-xs leading-5 text-[#7a7f87] dark:text-[#8a8f98]">{guidelineMeta[type].description}</p>
                    <button type="button" onClick={() => openGuideline(type)} disabled={!database.ready} className="mt-4 h-9 w-full rounded-lg border border-black/10 text-xs font-semibold transition hover:bg-[#f7f8fa] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[0.04]">열기</button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        {!selectedType ? (
          <div className="grid min-h-64 place-items-center text-center lg:min-h-full">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#eeefff] text-lg font-bold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">지</div>
              <h2 className="mt-4 text-sm font-semibold">지침을 선택하세요</h2>
              <p className="mt-2 text-xs leading-5 text-[#858a91]">목록에서 지침을 열면 편집과 버전관리를 시작할 수 있습니다.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">지침 편집</p>
                <h2 className="mt-1 text-base font-semibold">{guidelineMeta[selectedType].title}</h2>
              </div>
              <span className="rounded-full bg-[#eeefff] px-2.5 py-1 text-[10px] font-semibold text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">{current ? `현재 v${current.version}` : "현재 지침 없음"}</span>
            </div>

            <label className="mt-6 block">
              <span className="text-xs font-medium">지침 내용</span>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={12} maxLength={12000} placeholder={`${guidelineMeta[selectedType].title} 내용을 입력하세요.`} className="mt-2 w-full resize-y rounded-lg border border-black/10 bg-[#fafafa] p-3 text-sm leading-6 outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/10 dark:border-white/10 dark:bg-white/[0.035]" />
              <span className="mt-1 block text-right text-[10px] text-[#969aa0]">{draft.length.toLocaleString()} / 12,000</span>
            </label>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={saveGuideline} disabled={!draft.trim() || !database.ready} className="h-10 rounded-lg bg-[#5e6ad2] text-xs font-semibold text-white hover:bg-[#515cc4] disabled:opacity-40">저장</button>
              <button type="button" onClick={copyGuideline} disabled={!draft} className="h-10 rounded-lg border border-black/10 text-xs font-semibold hover:bg-[#f7f8fa] disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/[0.04]">{copied ? "복사됨" : "복사"}</button>
              <button type="button" onClick={deleteGuideline} disabled={!current} className="h-10 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-400/20 dark:text-red-300 dark:hover:bg-red-400/10">삭제</button>
            </div>

            <section className="mt-7 border-t border-black/7 pt-6 dark:border-white/7">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">버전관리</h3>
                <span className="text-[10px] text-[#92969d]">{history.length}개 버전</span>
              </div>
              {history.length === 0 ? (
                <p className="mt-4 rounded-lg bg-[#f7f8fa] px-3 py-4 text-center text-[11px] text-[#858a91] dark:bg-white/[0.035]">저장된 버전이 없습니다.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {history.map((version) => (
                    <li key={version.id} className="rounded-lg border border-black/8 p-3 dark:border-white/8">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2"><span className="text-xs font-semibold">v{version.version}</span>{version.deleted && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-400/10 dark:text-red-300">삭제 기록</span>}</div>
                        <span className="text-[9px] text-[#92969d]">{dateFormatter.format(new Date(version.createdAt))}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#777c83] dark:text-[#8a8f98]">{version.content}</p>
                      {(!current || version.version !== current.version) && !version.deleted && <button type="button" onClick={() => restoreVersion(version.version)} className="mt-2 text-[10px] font-semibold text-[#5e6ad2] hover:underline dark:text-[#aeb4ff]">이 버전 복원</button>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
