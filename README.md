# Poem Song Studio

시 한 편을 입력해 시화, 시노래, 시낭독, 영상 제작과 YouTube 업로드까지 한곳에서 관리하기 위한 통합 제작 앱입니다.

> 현재 단계는 프로젝트 초기 설정만 완료된 상태입니다. 제작 기능은 아직 구현하지 않습니다.

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- ESLint 9
- npm
- Vercel

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 명령어

```bash
npm run dev    # 개발 서버
npm run build  # 프로덕션 빌드
npm run start  # 프로덕션 서버
npm run lint   # 정적 검사
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
