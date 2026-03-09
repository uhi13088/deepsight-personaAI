# DeepSight - CLAUDE.md

## 현재 버전

- **엔진 버전: v4.2.0-dev (Multimodal)** — v4.0~v4.1.1 완료, 이미지·음성 멀티모달 확장 단계
- v4.0.0 (보안·기억·자기교정) → v4.1.0 (비용최적화·품질보호) → v4.1.1 (캐시·벡터DB·알림) → **v4.2.0 (멀티모달)** → v5.0 (자율진화)
- 상세 로드맵: `docs/design/persona-engine-v4-design-part3.md` §15

## 목적

- AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼 (3-Layer 106D+ 벡터 매칭)

## 기술 스택

- Frontend: Next.js 16, TypeScript, TailwindCSS, shadcn/ui
- Backend: Next.js API Routes, Prisma, PostgreSQL
- AI/LLM: Anthropic Claude (Sonnet) — @anthropic-ai/sdk
- 테스트: Vitest
- 패키지: pnpm (monorepo)

## 작업 규칙 (최우선)

1. **TASK.md 기준으로 작업** - 한 번에 1개 티켓만 진행
2. **Plan → 구현 → 검증** 순서 준수
3. **완료 기준** = AC(Acceptance Criteria) 충족 + 테스트 PASS
4. **작업 완료 시** TASK.md 업데이트 필수

## 행동 원칙

### Plan Mode

- **3단계 이상** 또는 아키텍처 결정이 필요한 작업 → 반드시 Plan 먼저
- 진행 중 막히면 → **즉시 멈추고 재계획** (밀어붙이지 않기)
- Plan에 검증 단계도 포함할 것

### 검증 기준

- "Staff Engineer가 승인할 코드인가?" 자문 후 완료 처리
- main 브랜치와 diff 확인, 테스트/로그로 동작 증명
- 증명 없이 완료 처리 금지

### 자기 개선

- 사용자로부터 수정 지시를 받으면 → **즉시 `tasks/lessons.md`에 기록**
- 세션 시작 시 `tasks/lessons.md` 확인 필수

### 핵심 원칙

- **Simplicity First**: 최소한의 변경으로 해결. 과도한 추상화 금지
- **No Laziness**: 임시 fix 금지. 근본 원인 해결
- **Minimal Impact**: 필요한 곳만 수정. 부수 버그 방지
- **자율적 버그 수정**: 버그 리포트 → 로그/에러 확인 → 직접 해결 (질문 최소화)

## 코드 규칙

- TypeScript strict 모드, `any` 금지
- API 응답: `{ success: boolean, data?: T, error?: { code, message } }`
- 커밋: `type(scope): message` (feat/fix/docs/refactor/test)

## 금지 사항

- `.env`, `.env.*`, `secrets/` 읽기/수정 금지
- 대규모 리팩토링 금지 (필요시 티켓 분리)
- 테스트 없이 완료 처리 금지
- **API 작업 시 `docs/api/` 문서 확인 없이 진행 금지**
- **API 변경 후 `docs/api/*.md` 및 `*.openapi.yaml` 최신화 없이 완료 처리 금지**

## 검증 명령

```bash
pnpm validate          # 전체 (typecheck + lint + test + build)
pnpm test              # 테스트만
pnpm --filter engine-studio build  # 앱별 빌드
```

## 스킬 (Skills)

반복적인 워크플로우는 `skills/` 디렉터리에 독립 스킬로 분리되어 있습니다.
각 스킬은 `references/` 폴더에 체크리스트 등 참조 자료를 포함할 수 있습니다.

| 스킬             | 경로                            | 설명                                                                 |
| ---------------- | ------------------------------- | -------------------------------------------------------------------- |
| `/next`          | `skills/next/SKILL.md`          | 다음 작업 진행 (lessons.md 자동 참조 + 티켓 품질 검증)               |
| `/validate`      | `skills/validate/SKILL.md`      | 전체 검증 + 2단계 코드 리뷰 + 품질 체크리스트 + lessons.md 교차 확인 |
| `/status`        | `skills/status/SKILL.md`        | 프로젝트 상태 요약                                                   |
| `/pr`            | `skills/pr/SKILL.md`            | PR 설명 자동 생성                                                    |
| `/debug`         | `skills/debug/SKILL.md`         | 구조적 디버깅 (가설 수립 → 검증 → 근본 해결)                         |
| `/sync-check`    | `skills/sync-check/SKILL.md`    | API 문서 / DB 스키마 불일치 감지                                     |
| `/session-wrap`  | `skills/session-wrap/SKILL.md`  | 세션 마무리 (TASK.md 동기화 + lessons.md 확인 + 핸드오프)            |
| `/brainstorm`    | `skills/brainstorm/SKILL.md`    | 설계 승인 전 구현 금지 — 소크라테스식 질문 → 방식 제안 → 승인 → 계획 |
| `/writing-plans` | `skills/writing-plans/SKILL.md` | 대형 티켓 실행 계획 (2-5분 단위 태스크 분해 → `docs/plans/` 문서화)  |

## 보안 훅 (Hooks)

자동으로 실행되는 보안 가드입니다 (`.claude/settings.json`에 등록됨).

| 훅                     | 경로                            | 타이밍       | 역할                                                              |
| ---------------------- | ------------------------------- | ------------ | ----------------------------------------------------------------- |
| `session-start`        | `hooks/session-start.sh`        | SessionStart | 세션 시작 시 lessons.md 교훈 + TASK.md IN_PROGRESS 티켓 자동 표시 |
| `output-secret-filter` | `hooks/output-secret-filter.sh` | PostToolUse  | 도구 출력에서 API 키/토큰/DB URL 등 시크릿 감지 시 경고           |
| `db-guard`             | `hooks/db-guard.sh`             | PreToolUse   | DROP/TRUNCATE/DELETE(WHERE 없음) 등 파괴적 SQL 차단               |

- 훅 로그: `~/.claude/logs/security.log`
- 훅 수정 시 `.claude/settings.json`의 hooks 섹션도 함께 확인

## 공유 패키지 (packages/) — 작업 전 필수 확인

> **새 유틸/컴포넌트/타입 추가 시 아래 목록을 먼저 확인하고, 이미 존재하면 재구현하지 말 것.**
> **앱 간 동일 코드를 발견하면 공유 패키지로 추출하는 티켓을 등록할 것.**

### 기존 패키지

| 패키지                    | 경로                     | 용도                                                                  | 사용처                                                            |
| ------------------------- | ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@deepsight/shared-types` | `packages/shared-types/` | 3-Layer 벡터 타입, API 응답 타입, 에러 코드, 빌링 타입                | engine-studio, developer-console, persona-world, sdk, vector-core |
| `@deepsight/vector-core`  | `packages/vector-core/`  | L1/L2/L3 벡터 계산, 온보딩 질문 타입, clamp 함수                      | engine-studio, persona-world                                      |
| `@deepsight/sdk`          | `packages/sdk/`          | 외부 고객용 JavaScript SDK (DeepSight API 클라이언트)                 | 퍼블리시 전용 (앱 내부 미사용)                                    |
| `@deepsight/ui`           | `packages/ui/`           | 공통 shadcn/ui 컴포넌트 (Button, Input, Select, Tooltip, Badge, cn()) | engine-studio, developer-console, landing, persona-world          |
| `@deepsight/auth`         | `packages/auth/`         | createRequireAuth, createAuthMiddleware, createPrismaSingleton 팩토리 | engine-studio, developer-console                                  |
| `@deepsight/config`       | `packages/config/`       | Next.js 공통 보안 헤더 (securityHeaders())                            | engine-studio, developer-console, landing, persona-world          |

### 패키지 컨벤션

- **내부 패키지**: `private: true`, 빌드 없이 `main: "./src/index.ts"` 직접 참조
- **퍼블리시 패키지**: `tsup`으로 CJS+ESM 듀얼 빌드, `dist/` 출력
- **워크스페이스 참조**: `"@deepsight/shared-types": "workspace:*"` 프로토콜 사용
- **tsconfig**: `target: ES2020`, `moduleResolution: bundler`, `strict: true`

### 앱 간 중복 현황 (추출 대상)

> 아래 항목들은 현재 앱마다 복사되어 있음. 공유 패키지 추출 작업 시 참고.

| 중복 항목                                                         | 위치                                                             | 상태                                                                      | 우선순위   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| **shadcn/ui 컴포넌트** (button, badge, input, select, tooltip 등) | `apps/*/src/components/ui/`                                      | **DONE** → `@deepsight/ui` (앱 UI 파일은 re-export, DC badge는 로컬 유지) | ~~HIGH~~   |
| **`cn()` 유틸**                                                   | `apps/*/src/lib/utils.ts`                                        | **DONE** → `@deepsight/ui`에서 re-export                                  | ~~HIGH~~   |
| **`requireAuth()`**                                               | `apps/{developer-console,engine-studio}/src/lib/require-auth.ts` | **DONE** → `@deepsight/auth` createRequireAuth 팩토리                     | ~~HIGH~~   |
| **Prisma 싱글턴**                                                 | `apps/{developer-console,engine-studio}/src/lib/prisma.ts`       | **DONE** → `@deepsight/auth` createPrismaSingleton 팩토리                 | ~~MEDIUM~~ |
| **Next.js 보안 헤더**                                             | `apps/*/next.config.ts`                                          | **DONE** → `@deepsight/config` securityHeaders()                          | ~~MEDIUM~~ |
| **Auth 미들웨어** (쿠키 체크)                                     | `apps/{developer-console,engine-studio}/middleware.ts`           | **DONE** → `@deepsight/auth` createAuthMiddleware 팩토리                  | ~~MEDIUM~~ |
| **API 응답 타입** (`ApiResponse<T>`, `ApiError`)                  | `apps/developer-console/src/services/api-client.ts`              | DC에만 존재, 다른 앱은 인라인 정의                                        | LOW        |
| **Theme Provider**                                                | `apps/{developer-console,engine-studio}/src/components/`         | 구현 방식 다름 (Zustand vs next-themes) — 통일 필요                       | LOW        |

### 앱별 고유 항목 (공유 불필요)

- **persona-world**: `pw-*` 커스텀 디자인 시스템 (pw-badge, pw-button 등) — PW 전용 브랜딩
- **developer-console**: API 키 마스킹, HTTP 상태 색상 등 콘솔 전용 유틸
- **engine-studio**: 페르소나 관련 hooks (use-personas, use-archetypes 등)
- **landing**: 로딩 스피너 button, 브랜드 그래디언트 CSS — 랜딩 전용

## 참조 문서

### v4 설계/구현 (Active)

- 엔진 설계서: `docs/design/persona-engine-v4-design.md` (인덱스 + Part 1~3)
- 엔진 구현계획서: `docs/design/persona-engine-v4-impl.md`
- PersonaWorld 설계서: `docs/design/persona-world-v4-design.md` (인덱스 + Part 1~3)
- PersonaWorld 구현계획서: `docs/design/persona-world-v4-impl.md`

### 기능정의서 (Reference)

- 엔진스튜디오: `docs/specs/engine-studio.md`
- 개발자콘솔: `docs/specs/developer-console.md`
- 페르소나월드: `docs/specs/persona-world.md`
- PW UI 디자인시스템: `docs/specs/persona-world-ui.md`

### API 문서 (API 작업 전 필독)

- External API v1: `docs/api/external-v1.md` + `docs/api/external-v1.openapi.yaml`
- Internal Admin API: `docs/api/internal.md` + `docs/api/internal.openapi.yaml`
- Public API: `docs/api/public.md` + `docs/api/public.openapi.yaml`
- **API 추가/변경/삭제 시 → 해당 md + openapi.yaml 동시 최신화 필수**

### 기타

- 개발 가이드: `docs/guides/development.md`
- DB 스키마 (SSoT): `apps/engine-studio/prisma/schema.prisma`
- 스키마 변경 이력: `docs/CHANGELOG_SCHEMA.md`
- 교훈 기록: `tasks/lessons.md`
