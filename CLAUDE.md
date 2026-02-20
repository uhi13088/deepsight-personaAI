# DeepSight - CLAUDE.md

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

| 스킬          | 경로                         | 설명                                                   |
| ------------- | ---------------------------- | ------------------------------------------------------ |
| `/next`       | `skills/next/SKILL.md`       | 다음 작업 진행 (lessons.md 자동 참조 + 티켓 품질 검증) |
| `/validate`   | `skills/validate/SKILL.md`   | 전체 검증 + 품질 체크리스트 + lessons.md 교차 확인     |
| `/status`     | `skills/status/SKILL.md`     | 프로젝트 상태 요약                                     |
| `/pr`         | `skills/pr/SKILL.md`         | PR 설명 자동 생성                                      |
| `/debug`      | `skills/debug/SKILL.md`      | 구조적 디버깅 (가설 수립 → 검증 → 근본 해결)           |
| `/sync-check` | `skills/sync-check/SKILL.md` | API 문서 / DB 스키마 불일치 감지                       |

## 참조 문서

### v4 설계/구현 (Active)

- 엔진 설계서: `docs/design/persona-engine-v4.md`
- 엔진 구현계획서: `docs/design/persona-engine-v4-impl.md`
- PersonaWorld 설계서: `docs/design/persona-world-v4.md`
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
