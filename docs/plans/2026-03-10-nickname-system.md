# 활동명(Nickname) 시스템 구현 계획

날짜: 2026-03-10
관련 티켓: T420~T424
예상 소요: 5개 태스크

## 목표

유저가 온보딩에서 활동명을 설정하고, 댓글·채팅·통화 등 모든 소통에서 활동명으로 식별되도록 한다.

## 아키텍처 결정

- **방식 A 채택**: DB에 `nickname` 컬럼 신규 추가 (`name`=OAuth 실명과 분리)
- 이유: `name`(실명)과 `nickname`(활동명)은 용도가 다름. 결제/본인인증에 실명 필요할 수 있음
- `nickname`은 NULL 허용 — NULL이면 `name` → `"익명"` 순으로 폴백

## 영향 범위

### 변경 파일

**DB/마이그레이션:**

- `apps/engine-studio/prisma/schema.prisma` — PersonaWorldUser에 `nickname` 추가
- `apps/engine-studio/prisma/migrations/059_nickname.sql` — ALTER TABLE

**API (engine-studio):**

- `apps/engine-studio/src/app/api/persona-world/users/profile/route.ts` — 신규: PATCH 프로필 수정
- `apps/engine-studio/src/app/api/public/auth/register/route.ts` — 응답에 nickname 포함
- `apps/engine-studio/src/app/api/persona-world/onboarding/cold-start/route.ts` — nickname 저장
- `apps/engine-studio/src/app/api/persona-world/onboarding/adaptive/start/route.ts` — nickname 저장
- `apps/engine-studio/src/app/api/public/posts/[postId]/comments/route.ts` — nickname 우선 표시
- `apps/engine-studio/src/app/api/persona-world/chat/threads/[threadId]/messages/route.ts` — 시스템 프롬프트에 유저 활동명 전달
- `apps/engine-studio/src/app/api/persona-world/calls/sessions/[sessionId]/turn/route.ts` — 유저 활동명 전달

**Frontend (persona-world):**

- `apps/persona-world/src/app/onboarding/page.tsx` — 온보딩 시작 전 활동명 입력 스텝
- `apps/persona-world/src/app/settings/page.tsx` — 계정 탭에 활동명 수정 UI
- `apps/persona-world/src/lib/user-store.ts` — setNickname 액션 + API 연동
- `apps/persona-world/src/lib/api.ts` — updateNickname API 호출 함수
- `apps/persona-world/src/components/persona-world/pw-comment-list.tsx` — 확인 (이미 profile.nickname 사용)

**공유 패키지:** 없음 (앱 내부 변경만)

### 사이드이펙트 위험

- lessons.md 교훈: 마이그레이션 SQL 누락 시 전체 API 500 에러 → SQL 반드시 동시 작성
- lessons.md 교훈: 테스트 타입 깨짐 주의 → 스키마 변경 후 관련 테스트 동기화

## 실행 태스크 (2-5분 단위)

### Task 1: DB 스키마 + 마이그레이션 + 프로필 수정 API (T420)

- 작업:
  1. `schema.prisma`의 PersonaWorldUser에 `nickname String?` 추가
  2. `059_nickname.sql` 마이그레이션 작성
  3. `api/persona-world/users/profile/route.ts` 신규 — PATCH { nickname } → PersonaWorldUser 업데이트
  4. `api/public/auth/register/route.ts` 응답에 nickname 필드 추가
- 파일: schema.prisma, 059_nickname.sql, users/profile/route.ts, register/route.ts
- 검증: pnpm --filter engine-studio build 성공

### Task 2: 온보딩 활동명 입력 스텝 (T421)

- 작업:
  1. 온보딩 페이지에 FlowStep 추가: `"nickname"` (intro 직후, questions 직전)
  2. 활동명 입력 UI: 텍스트 인풋 + 유효성 검사 (2~20자, 특수문자 제한)
  3. 입력된 닉네임을 cold-start/adaptive 온보딩 API에 함께 전달
  4. 온보딩 API에서 nickname을 PersonaWorldUser.upsert에 포함
- 파일: onboarding/page.tsx, cold-start/route.ts, adaptive/start/route.ts
- 검증: pnpm --filter persona-world build 성공

### Task 3: 설정 페이지 활동명 변경 (T422)

- 작업:
  1. 설정 > 계정 탭에 활동명 수정 인라인 폼 추가
  2. api.ts에 updateNickname(nickname) 함수 추가
  3. user-store.ts에 setNickname(nickname) 액션 추가 (API 호출 + 로컬 상태 동기화)
  4. 프로필 수정 API (Task 1) 연동
- 파일: settings/page.tsx, api.ts, user-store.ts
- 검증: pnpm --filter persona-world build 성공

### Task 4: 댓글 시스템 활동명 적용 (T423)

- 작업:
  1. 댓글 GET API — user select에 nickname 추가, personaName 우선순위: nickname → name → "익명"
  2. pw-comment-list.tsx — 이미 profile.nickname 사용 중이므로 확인만
  3. 댓글 POST 시 유저 이름이 올바르게 표시되는지 확인
- 파일: posts/[postId]/comments/route.ts, (pw-comment-list.tsx 확인)
- 검증: pnpm --filter engine-studio build 성공

### Task 5: 채팅/통화 활동명 적용 (T424)

- 작업:
  1. 채팅 메시지 API — 유저 nickname 조회 → LLM 시스템 프롬프트에 `유저 활동명: {nickname}` 주입
  2. 통화 턴 API — 동일하게 유저 nickname 조회 → 시스템 프롬프트에 주입
  3. 페르소나가 유저를 활동명으로 호칭하도록 프롬프트 지시
- 파일: chat/threads/[threadId]/messages/route.ts, calls/sessions/[sessionId]/turn/route.ts
- 검증: pnpm --filter engine-studio build + pnpm validate 전체 통과

## 완료 기준

- [ ] 모든 태스크 완료
- [ ] `pnpm validate` PASS
- [ ] TASK.md AC 전부 체크
- [ ] 온보딩 → 활동명 입력 → DB 저장 흐름 확인
- [ ] 설정에서 활동명 변경 → DB 반영 확인
- [ ] 댓글에 활동명 표시 확인
- [ ] 채팅/통화에서 페르소나가 유저 활동명으로 호칭 확인
