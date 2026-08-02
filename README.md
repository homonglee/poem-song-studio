# Poem Song Studio

시 한 편을 입력해 시화, 시노래, 시낭독, 영상 제작과 YouTube 업로드까지 한곳에서 관리하기 위한 통합 제작 앱입니다.

> 현재 단계는 프로젝트 관리, 지침 관리, 시 작성·편집, Task 07-3 버전 비교, 한글 OCR과 Gemini AI 시 생성·수정까지 구현되어 있습니다. 시 검수·시화·Suno·영상·YouTube 기능은 아직 구현하지 않습니다.

## 현재 기능

- 프로젝트 생성, 목록, 검색, 최근 프로젝트
- 프로젝트명과 설명 수정 및 자동저장
- 휴지통 이동, 복원, 영구 삭제
- 시 작성·시화·시노래·시낭독·영상·유튜브 지침 관리
- 지침 열기, 저장, 복사, 삭제 및 버전 복원
- 주제어·기존 시·OCR 3종 입력 화면
- 이미지 업로드, 브라우저 한글·영문 OCR, 결과 편집과 편집기 가져오기
- Gemini 주제어 시 생성, 전체 시 정제와 선택 영역 수정
- 프로젝트별 시 편집창 SQLite 자동저장, `v01` 자동 생성, 새 버전 저장·저장일 기록 및 복원
- 버전 메모·현재 버전 표시와 선택한 버전 읽기 전용 열기
- 두 버전 선택과 동일·변경·추가·삭제 행 강조 비교
- 제목·본문 편집, 시인명, 행·연 편집, 검색·바꾸기, 실행 취소·다시 실행
- 수동·자동 저장, 수정·저장 상태, 원문 복원, TXT 내려받기와 이탈 경고
- Gemini 서버 API와 8종 결정론적 로컬 편집 도구
- 브라우저 SQLite 데이터베이스 저장

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- sql.js (SQLite WebAssembly)
- Tesseract.js (`kor+eng` 브라우저 OCR)
- Google Gemini API (서버 전용)
- IndexedDB (SQLite 파일 영속화)
- ESLint 9
- Vitest
- npm
- Vercel

## 시작하기

```bash
npm install
npm run dev
```

실제 AI 기능을 사용하려면 서버 환경에 `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 모두 설정합니다. 승인된 모델은 서버에서 `gemini-2.5-flash`로 고정하며, 키와 토큰은 `NEXT_PUBLIC_` 변수나 클라이언트 코드에 넣지 않습니다. Google Cloud에서 Generative Language API로 키 사용처와 일일 할당량을 제한하고, 앱 API는 Vercel이 전달한 신뢰 가능한 클라이언트 IP를 해시한 뒤 공유 Redis 카운터로 IP별 분당 10회를 제한합니다. 보호 저장소가 없거나 응답하지 않으면 AI 호출은 fail-closed됩니다.

OCR은 이미지를 외부 서버로 업로드하지 않고 브라우저에서 처리합니다. 최초 인식 시 Tesseract worker와 `kor+eng` 학습 데이터를 CDN에서 내려받습니다.

브라우저에서 `http://localhost:3000`을 엽니다.

## 명령어

```bash
npm run dev    # 개발 서버
npm run build  # 프로덕션 빌드
npm run start  # 프로덕션 서버
npm run lint   # 정적 검사
npm test       # 자동 테스트
```

## 프로젝트 구조

```text
app/         Next.js App Router 및 전역 스타일
components/  재사용 UI 컴포넌트
data/        정적 데이터와 초기 데이터 정의
docs/        제품·개발 문서
hooks/       React 커스텀 훅
lib/         공통 유틸리티와 외부 서비스 연동 코드
types/       공통 TypeScript 타입
public/      정적 자산
```

상세 제품 범위는 [APP_SPEC.md](./APP_SPEC.md), 개발 규칙은 [AGENTS.md](./AGENTS.md)를 참고합니다.
