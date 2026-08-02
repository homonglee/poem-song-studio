<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Poem Song Studio 개발 지침

## 프로젝트 원칙

- 이 저장소는 시 기반 멀티미디어 제작 과정을 통합 관리하는 웹 앱이다.
- 현재 구현 범위는 프로젝트 관리, 지침 관리, 시 작성, 6단계 시 편집과 Task 07-3 버전 비교이며, 실제 OCR·AI·미디어 제작 기능은 단계별 승인 전까지 구현하지 않는다.
- 기능 구현 전 `APP_SPEC.md`의 범위와 단계별 우선순위를 먼저 확인한다.
- 사용자에게 보이는 문구와 문서는 기본적으로 한국어를 사용한다.

## 기술 기준

- Next.js App Router, React, TypeScript, Tailwind CSS를 사용한다.
- 서버 컴포넌트를 기본으로 하고, 브라우저 상태나 이벤트가 필요할 때만 클라이언트 컴포넌트를 사용한다.
- 공통 타입은 `types/`, 외부 서비스와 공통 로직은 `lib/`, 커스텀 훅은 `hooks/`에 둔다.
- 재사용 가능한 UI만 `components/`로 분리한다.
- 비밀 키와 인증 정보는 환경 변수로 관리하며 저장소에 커밋하지 않는다.

## 품질 기준

- 모바일 우선 반응형 UI와 접근 가능한 시맨틱 마크업을 적용한다.
- 새 기능은 타입 검사, ESLint, 프로덕션 빌드를 통과해야 한다.
- 외부 API 연동은 실패·재시도·처리 상태를 명시적으로 다룬다.
- YouTube 업로드 등 외부 부작용이 있는 작업은 사용자 확인과 결과 검증을 포함한다.

## 완료 전 확인

```bash
npm run lint
npm run build
```
