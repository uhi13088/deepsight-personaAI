# DeepSight - CLAUDE.md

## 목적

- AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼 (6D 벡터 매칭)

## 기술 스택

- Frontend: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- Backend: Next.js API Routes, Prisma, PostgreSQL
- 테스트: Vitest
- 패키지: pnpm (monorepo)

## 작업 규칙 (최우선)

1. **TASK.md 기준으로 작업** - 한 번에 1개 티켓만 진행
2. **Plan → 구현 → 검증** 순서 준수
3. **완료 기준** = AC(Acceptance Criteria) 충족 + 테스트 PASS
4. **작업 완료 시** TASK.md 업데이트 필수

## 코드 규칙

- TypeScript strict 모드, `any` 금지
- API 응답: `{ success: boolean, data?: T, error?: { code, message } }`
- 커밋: `type(scope): message` (feat/fix/docs/refactor/test)

## 금지 사항

- `.env.local`, `secrets/` 읽기/수정 금지
- 대규모 리팩토링 금지 (필요시 티켓 분리)
- 테스트 없이 완료 처리 금지

## 검증 명령

```bash
pnpm validate          # 전체 (typecheck + lint + test + build)
pnpm test              # 테스트만
pnpm --filter engine-studio build  # 앱별 빌드
```

## 슬래시 명령어

| 명령어      | 설명                                        |
| ----------- | ------------------------------------------- |
| `/next`     | 다음 작업 진행 (QUEUE → IN_PROGRESS → DONE) |
| `/status`   | 현재 프로젝트 상태 요약                     |
| `/validate` | 전체 검증 (typecheck + lint + test + build) |
| `/pr`       | PR 설명 자동 생성                           |

## 참조 문서

- 상세 개발 가이드: `docs/DEVELOPMENT_GUIDE.md`
- 기능정의서 (엔진스튜디오): `docs/deepsight_engine_studio.md`
- 기능정의서 (개발자콘솔): `docs/deepsight_developer_console.md`
- 기술 설계: `docs/deepsight_technical_design.md`
- DB 스키마: `apps/engine-studio/prisma/schema.prisma`
