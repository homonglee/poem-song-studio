"use client";

import { useEffect, type ReactNode } from "react";

type IconName =
  | "folder"
  | "pen"
  | "image"
  | "music"
  | "mic"
  | "video"
  | "youtube"
  | "guide"
  | "settings"
  | "sun"
  | "moon"
  | "sparkles"
  | "check";

const iconPaths: Record<IconName, ReactNode> = {
  folder: <><path d="M3 7.5h6l2-2h4.5A2.5 2.5 0 0 1 18 8v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 15.5V8.8A1.3 1.3 0 0 1 3.3 7.5Z" /></>,
  pen: <><path d="m4 16 1-4L14.5 2.5a2.1 2.1 0 0 1 3 3L8 15l-4 1Z" /><path d="m12.5 4.5 3 3" /></>,
  image: <><rect x="2.5" y="3.5" width="15" height="13" rx="2" /><circle cx="7" cy="8" r="1.5" /><path d="m4.5 14 3.5-3 2.5 2 2.5-2.5 4.5 4" /></>,
  music: <><path d="M8 15.5V5l8-1.5V14" /><circle cx="5.5" cy="15.5" r="2.5" /><circle cx="13.5" cy="14" r="2.5" /></>,
  mic: <><rect x="7" y="2" width="6" height="11" rx="3" /><path d="M4.5 10.5a5.5 5.5 0 0 0 11 0M10 16v2M7 18h6" /></>,
  video: <><rect x="2.5" y="4" width="11" height="12" rx="2" /><path d="m13.5 8 4-2v8l-4-2" /></>,
  youtube: <><path d="M18 7.2a3 3 0 0 0-2.1-2.1C14.5 4.7 10 4.7 10 4.7s-4.5 0-5.9.4A3 3 0 0 0 2 7.2a27 27 0 0 0 0 5.6 3 3 0 0 0 2.1 2.1c1.4.4 5.9.4 5.9.4s4.5 0 5.9-.4a3 3 0 0 0 2.1-2.1 27 27 0 0 0 0-5.6Z" /><path d="m8.3 12.6 4.3-2.6-4.3-2.6v5.2Z" /></>,
  guide: <><path d="M4 3h10.5A1.5 1.5 0 0 1 16 4.5V17H5.5A2.5 2.5 0 0 1 3 14.5v-10A1.5 1.5 0 0 1 4.5 3Z" /><path d="M6.5 7h6M6.5 10h5M5.5 17A2.5 2.5 0 0 1 8 14.5V14h8" /></>,
  settings: <><circle cx="10" cy="10" r="2.5" /><path d="M16.5 11.5v-3l-2-.5a6 6 0 0 0-.7-1.6l1.1-1.8-2.1-2.1L11 3.6A6 6 0 0 0 9.4 3L9 1H6l-.5 2a6 6 0 0 0-1.6.7L2.2 2.6.1 4.7l1.1 1.8A6 6 0 0 0 .5 8L-1 8.5v3l2 .5a6 6 0 0 0 .7 1.6L.6 15.4l2.1 2.1 1.8-1.1a6 6 0 0 0 1.6.7l.5 2h3l.5-2a6 6 0 0 0 1.6-.7l1.8 1.1 2.1-2.1-1.1-1.8a6 6 0 0 0 .7-1.6l2-.5Z" transform="translate(2) scale(.8)" /></>,
  sun: <><circle cx="10" cy="10" r="3" /><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.6 3.6 5 5M15 15l1.4 1.4M16.4 3.6 15 5M5 15l-1.4 1.4" /></>,
  moon: <><path d="M17 12.2A7 7 0 1 1 7.8 3 5.5 5.5 0 0 0 17 12.2Z" /></>,
  sparkles: <><path d="m10 2 1.2 3.3L14.5 6.5l-3.3 1.2L10 11 8.8 7.7 5.5 6.5l3.3-1.2L10 2ZM16 11l.7 1.8 1.8.7-1.8.7L16 16l-.7-1.8-1.8-.7 1.8-.7L16 11ZM4.5 12l.6 1.4 1.4.6-1.4.6L4.5 16l-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" /></>,
  check: <path d="m4 10 4 4 8-8" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6">
      {iconPaths[name]}
    </svg>
  );
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

const stages = ["시 작성", "시화", "시노래", "시낭독", "영상", "유튜브"];

export function StudioShell() {
  useEffect(() => {
    const saved = window.localStorage.getItem("poem-song-studio-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", nextDark);
  }, []);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("poem-song-studio-theme", nextDark ? "dark" : "light");
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#202124] transition-colors dark:bg-[#08090a] dark:text-[#f7f8f8] lg:grid lg:grid-cols-[232px_minmax(0,1fr)_288px] lg:grid-rows-[72px_minmax(0,1fr)]">
      <aside className="border-b border-black/8 bg-white px-4 py-4 dark:border-white/8 dark:bg-[#0f1011] lg:row-span-2 lg:border-r lg:border-b-0 lg:px-3 lg:py-5">
        <div className="mb-5 flex items-center gap-3 px-2 lg:mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#5e6ad2] text-white shadow-sm">
            <Icon name="sparkles" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight">Poem Song</p>
            <p className="text-[11px] text-[#747980] dark:text-[#8a8f98]">Studio</p>
          </div>
        </div>

        <nav aria-label="제작 메뉴">
          <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.14em] text-[#92969d] uppercase dark:text-[#62666d]">
            제작 워크플로
          </p>
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
            {navigation.map((item) => (
              <li key={item.label}>
                <div
                  aria-current={item.active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors lg:min-h-10 ${
                    item.active
                      ? "bg-[#eeefff] text-[#4f57bb] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]"
                      : "text-[#5f6368] hover:bg-black/4 dark:text-[#a4a8b0] dark:hover:bg-white/5"
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-5 hidden rounded-xl border border-black/8 bg-[#fafafa] p-3 dark:border-white/8 dark:bg-white/[0.025] lg:block">
          <p className="text-xs font-medium">첫 작품을 준비해 보세요</p>
          <p className="mt-1 text-[11px] leading-5 text-[#7a7f87] dark:text-[#70757d]">
            기능은 다음 단계부터 순차적으로 연결됩니다.
          </p>
        </div>
      </aside>

      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-black/8 bg-white/90 px-5 backdrop-blur dark:border-white/8 dark:bg-[#08090a]/90 sm:px-7 lg:col-span-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#898d94] dark:text-[#62666d]">
            <span>프로젝트</span><span aria-hidden="true">/</span><span>작업공간</span>
          </div>
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">나의 첫 번째 시 프로젝트</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-600/15 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 sm:flex dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            모든 변경사항 저장됨
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="라이트·다크 테마 전환"
            className="grid h-10 w-10 place-items-center rounded-lg border border-black/10 bg-white text-[#5f6368] transition hover:bg-[#f5f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5e6ad2] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#d0d6e0] dark:hover:bg-white/[0.08]"
          >
            <span className="dark:hidden"><Icon name="moon" className="h-[18px] w-[18px]" /></span>
            <span className="hidden dark:block"><Icon name="sun" className="h-[18px] w-[18px]" /></span>
          </button>
        </div>
      </header>

      <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="text-xs font-medium text-[#6f747b] dark:text-[#8a8f98]">작업영역</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">작품 제작을 시작하세요</h2>
            <p className="mt-2 text-sm leading-6 text-[#747980] dark:text-[#8a8f98]">
              시를 작성하면 시화, 음악, 낭독과 영상 제작 단계가 이 공간에 이어집니다.
            </p>
          </div>

          <section className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,.03)] dark:border-white/8 dark:bg-[#0f1011] dark:shadow-none">
            <div className="flex items-center justify-between border-b border-black/7 px-5 py-4 dark:border-white/7 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#eeefff] text-[#5e6ad2] dark:bg-[#5e6ad2]/20 dark:text-[#aeb4ff]">
                  <Icon name="pen" className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">시 작성</h3>
                  <p className="text-[11px] text-[#8b9097] dark:text-[#62666d]">제작의 시작점</p>
                </div>
              </div>
              <span className="rounded-full border border-black/8 px-2.5 py-1 text-[10px] font-medium text-[#777c83] dark:border-white/8 dark:text-[#8a8f98]">준비 중</span>
            </div>

            <div className="grid min-h-[360px] place-items-center px-6 py-14 sm:min-h-[430px]">
              <div className="max-w-sm text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#5e6ad2]/15 bg-[#f1f2ff] text-[#5e6ad2] dark:border-[#7170ff]/20 dark:bg-[#7170ff]/10 dark:text-[#aeb4ff]">
                  <Icon name="sparkles" className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-base font-semibold">작업영역이 준비되었습니다</h3>
                <p className="mt-2 text-sm leading-6 text-[#7a7f87] dark:text-[#8a8f98]">
                  다음 개발 단계에서 시 편집기와 제작 도구가 이곳에 추가됩니다.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['시 입력', 'AI 제작', '미디어 관리'].map((label) => (
                    <span key={label} className="rounded-md bg-[#f3f4f6] px-2.5 py-1.5 text-[11px] font-medium text-[#777c83] dark:bg-white/[0.05] dark:text-[#8a8f98]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <aside className="border-t border-black/8 bg-white p-5 dark:border-white/8 dark:bg-[#0f1011] sm:p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#777c83] dark:text-[#8a8f98]">진행상태</p>
            <h2 className="mt-1 text-base font-semibold">제작 진행률</h2>
          </div>
          <span className="font-mono text-xs font-medium text-[#5e6ad2] dark:text-[#aeb4ff]">0%</span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eceef1] dark:bg-white/[0.07]">
          <div className="h-full w-[2%] rounded-full bg-[#5e6ad2]" />
        </div>

        <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {stages.map((stage, index) => (
            <li key={stage} className="flex items-center gap-3 rounded-xl border border-black/7 p-3 dark:border-white/7">
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${index === 0 ? "bg-[#5e6ad2] text-white" : "bg-[#f1f2f4] text-[#8b9097] dark:bg-white/[0.05] dark:text-[#62666d]"}`}>
                {index === 0 ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium ${index === 0 ? "text-[#4f57bb] dark:text-[#aeb4ff]" : "text-[#6f747b] dark:text-[#8a8f98]"}`}>{stage}</p>
                <p className="mt-0.5 text-[10px] text-[#a0a4aa] dark:text-[#565a61]">{index === 0 ? "시작 대기" : "대기 중"}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-xl bg-[#f7f8fa] p-4 dark:bg-white/[0.035]">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Icon name="check" className="h-4 w-4 text-[#5e6ad2] dark:text-[#aeb4ff]" />
            프로젝트 준비 완료
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#7c8188] dark:text-[#70757d]">
            기본 제작 흐름과 작업공간이 구성되었습니다.
          </p>
        </div>
      </aside>
    </div>
  );
}
