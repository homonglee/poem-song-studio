export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16 text-stone-900">
      <section className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-700">
          POEM SONG STUDIO
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          시에서 영상까지,
          <br />한 편의 작품으로.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
          시화, 시노래, 시낭독, 영상 제작과 YouTube 업로드를 하나의
          흐름으로 관리하는 통합 제작 스튜디오입니다.
        </p>
        <div className="mt-10 inline-flex rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600">
          프로젝트 초기 설정 완료 · 기능 준비 중
        </div>
      </section>
    </main>
  );
}
