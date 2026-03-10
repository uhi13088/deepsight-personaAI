# PersonaWorld 아레나 시스템 구현 계획

날짜: 2026-03-10
관련 티켓: TBD (TASK.md 등록 예정)
예상 소요: 15개 태스크

## 목표

유저가 코인으로 토론방을 임대하고 페르소나를 초대하여 토론을 관전/참여하는 **PW 아레나**를 구현하고,
토론 데이터를 엔진 내부 심판 파이프라인에 비동기 전송하여 **페르소나 품질 자동 업그레이드**에 활용한다.

## 아키텍처 결정

### A+C 하이브리드 구조

```
┌─ PW 아레나 (유저 facing) ───────────────────────────┐
│  상점 → 토론방 임대 → 페르소나 초대 → 주제 입력       │
│  토론 진행 (라운드 기반, 심판 없음)                    │
│  유저: 관전 / 참여 / 투표                             │
│  토론 리플레이 저장, 피드 게시                         │
└───────────────────┬──────────────────────────────────┘
                    │ 토론 로그 비동기 전송
                    ▼
┌─ Engine 아레나 (내부, 유저 비노출) ──────────────────┐
│  기존 arena-engine.ts 심판 파이프라인 재활용           │
│  데이터 소스만 "내부 스파링" → "유저 토론" 확장        │
│  필터링 레이어: 평가 유의미 토론만 심판 파이프라인 투입  │
│  교정 패치 → 관리자 승인 → 페르소나 품질 업그레이드    │
└──────────────────────────────────────────────────────┘
```

### 핵심 결정 사항

1. **심판 유저 비노출**: PW에는 심판 기능 없음. 엔진 내부에서만 자동 처리
2. **기존 아레나 엔진 재활용**: `arena-engine.ts`의 판정 로직 그대로 사용, 데이터 소스만 확장
3. **인원 비례 과금**: 라운드 추가 시 토론 인원에 따라 차등 코인 소비
4. **비동기 품질 피드백**: 토론 완료 후 비동기로 엔진에 전송 (유저 경험에 영향 없음)

### 손익 모델 (마진 65%+ 보장)

코인 단가: ₩10/코인 기준

| 상품                   | 코인 | 매출   | LLM 원가 | 마진 |
| ---------------------- | ---- | ------ | -------- | ---- |
| 1:1 토론 (방50+초대30) | 80   | ₩800   | ₩230     | 71%  |
| 패널5 (방120+초대75)   | 195  | ₩1,950 | ₩550     | 72%  |
| 대형8 (방280+초대120)  | 400  | ₩4,000 | ₩1,215   | 70%  |
| 1:1 + 라운드추가       | 105  | ₩1,050 | ₩365     | 65%  |
| 패널5 + 라운드추가     | 245  | ₩2,450 | ₩890     | 64%  |
| 대형8 + 라운드추가     | 480  | ₩4,800 | ₩1,755   | 63%  |
| 리플레이 저장          | 15   | ₩150   | ₩14      | 91%  |

※ 패널/대형 + 라운드 추가 조합(63~64%)은 대량 구매 할인 성격으로 수용.
블렌딩 마진 67~68% 예상.

## 상점 가격표 (최종 확정)

```
┌─ 아레나 상점 ──────────────────────────────────────────┐
│                                                        │
│  🏟️ 토론방 임대 (기본 5라운드 포함)                     │
│  ├── 1:1 토론방 (2인)       —  50코인                  │
│  ├── 패널 토론방 (3~5인)    — 120코인                  │
│  └── 대형 토론방 (6~8인)    — 280코인                  │
│                                                        │
│  🎟️ 초대권                                             │
│  ├── 일반 초대권             —  15코인/장              │
│  └── 프리미엄 초대권         —  40코인/장              │
│      (인기 페르소나 초대 가능)                          │
│                                                        │
│  ⚙️ 토론 옵션                                          │
│  ├── 라운드 추가 +3 (인원 비례)                        │
│  │   ├── 2인:   25코인                                │
│  │   ├── 3~5인: 50코인                                │
│  │   └── 6~8인: 80코인                                │
│  └── 토론 리플레이 저장      —  15코인                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 영향 범위

### 변경/추가 파일

**DB 스키마 (engine-studio)**

- `apps/engine-studio/prisma/schema.prisma` — PWArenaSession, PWArenaTurn, PWArenaInvite 모델 추가
- `apps/engine-studio/prisma/migrations/` — 마이그레이션 SQL

**엔진 (engine-studio)**

- `apps/engine-studio/src/lib/persona-world/arena/` — PW 아레나 서비스 (NEW)
  - `pw-arena-service.ts` — 세션 생성/진행/완료
  - `pw-arena-llm.ts` — 토론 턴 LLM 호출
  - `pw-arena-quality-bridge.ts` — 토론→엔진 심판 파이프라인 브릿지
  - `pw-arena-types.ts` — PW 아레나 전용 타입
- `apps/engine-studio/src/lib/persona-world/arena/filter.ts` — 품질 평가 적합성 필터 (NEW)

**API 라우트 (engine-studio)**

- `apps/engine-studio/src/app/api/persona-world/arena/` — PW 아레나 API (NEW)
  - `route.ts` — 세션 목록/생성
  - `[sessionId]/route.ts` — 세션 상세/진행/완료
  - `[sessionId]/turns/route.ts` — 턴 실행

**PW 프론트 (persona-world)**

- `apps/persona-world/src/lib/shop.ts` — 아레나 카테고리 추가
- `apps/persona-world/src/app/(main)/arena/` — 아레나 페이지 (NEW)
  - `page.tsx` — 아레나 메인 (방 목록 + 관전 가능)
  - `create/page.tsx` — 토론방 생성 플로우
  - `[sessionId]/page.tsx` — 토론 관전/참여
  - `[sessionId]/replay/page.tsx` — 리플레이 페이지
- `apps/persona-world/src/components/arena/` — 아레나 컴포넌트 (NEW)
  - `arena-room-card.tsx` — 방 카드
  - `arena-chat.tsx` — 토론 채팅 뷰
  - `arena-participant-list.tsx` — 참여자 목록
  - `arena-round-indicator.tsx` — 라운드 진행 표시
  - `arena-vote-panel.tsx` — 유저 투표 패널

**상점 (engine-studio admin)**

- `apps/engine-studio/src/lib/persona-world/arena/shop-items.ts` — 아레나 상점 아이템 시드 (NEW)

**공유 패키지**

- `packages/shared-types/` — PW 아레나 관련 타입 추가 (PWArenaSession, PWArenaTurn 등)

### 기존 코드 재활용

| 기존 모듈                            | 재활용 방식                          |
| ------------------------------------ | ------------------------------------ |
| `arena-engine.ts` JudgmentScores     | PW 토론 데이터 평가에 동일 차원 사용 |
| `arena-feedback.ts` CorrectionLoop   | 교정 패치 적용 로직 그대로 사용      |
| `arena-bridge.ts` CorrectionTracking | 트리거 타입에 `USER_ARENA` 추가      |
| `credit-service.ts` spendCredits     | 코인 차감 로직 재활용                |
| `shop.ts` ShopCategory               | `"arena"` 카테고리 추가              |
| `coin-packages.ts`                   | 변경 없음 (기존 패키지 그대로)       |

### 사이드이펙트 위험

- `ShopCategory` 타입에 `"arena"` 추가 시 기존 switch/if 분기 확인 필요
- `TriggerType`에 `USER_ARENA` 추가 시 기존 핸들러에서 누락 없는지 확인
- 대형 토론(8인) 컨텍스트 토큰 폭증 주의 — 턴별 토큰 제한 필수

## 실행 태스크 (2-5분 단위)

각 태스크는: TEST FAIL → IMPLEMENT → TEST PASS → COMMIT

---

### Phase 1: DB + 타입 + 상점 (기반)

#### Task 1: shared-types에 PW 아레나 타입 정의

- 작업: PWArenaSession, PWArenaTurn, PWArenaVote, ArenaRoomType, ArenaRoundOption 타입 추가
- 파일: `packages/shared-types/src/persona-world/arena.ts`, `packages/shared-types/src/index.ts`
- 검증: `pnpm --filter @deepsight/shared-types build` 성공 (또는 typecheck)
- 예상 소요: 3분

#### Task 2: DB 스키마 + 마이그레이션

- 작업: PWArenaSession, PWArenaTurn, PWArenaVote 모델을 Prisma 스키마에 추가 + 마이그레이션 SQL
- 파일: `apps/engine-studio/prisma/schema.prisma`, `apps/engine-studio/prisma/migrations/`
- 검증: `prisma validate` 성공 + SQL 파일 존재
- 예상 소요: 5분

#### Task 3: 아레나 상점 아이템 시드

- 작업: PWShopItem 테이블에 아레나 아이템 INSERT SQL + shop.ts에 arena 카테고리 추가
- 파일: `apps/engine-studio/prisma/migrations/`, `apps/persona-world/src/lib/shop.ts`
- 검증: ShopCategory에 "arena" 추가 후 타입체크 통과 + 폴백 아이템에 아레나 아이템 존재
- 예상 소요: 4분

---

### Phase 2: 엔진 서비스 (PW 아레나 코어)

#### Task 4: PW 아레나 타입 + 설정 상수

- 작업: PW 아레나 전용 타입 정의 (PWArenaConfig, RoomConfig, RoundConfig 등) + 가격/제한 상수
- 파일: `apps/engine-studio/src/lib/persona-world/arena/pw-arena-types.ts`
- 검증: 타입체크 통과
- 예상 소요: 3분

#### Task 5: PW 아레나 LLM 호출

- 작업: 페르소나 프로필 로드 → 주제 기반 토론 발언 생성 LLM 호출 (턴별 토큰 제한 포함)
- 파일: `apps/engine-studio/src/lib/persona-world/arena/pw-arena-llm.ts`
- 검증: 유닛 테스트 (모킹된 LLM 호출, 토큰 제한 검증)
- 예상 소요: 5분

#### Task 6: PW 아레나 세션 서비스

- 작업: 세션 생성 (코인 검증 → 차감 → DB 저장), 턴 실행, 세션 완료 처리
- 파일: `apps/engine-studio/src/lib/persona-world/arena/pw-arena-service.ts`
- 검증: 유닛 테스트 (세션 라이프사이클, 코인 차감 검증)
- 예상 소요: 5분

#### Task 7: 품질 평가 필터 + 엔진 브릿지

- 작업: 토론 데이터를 필터링하여 유의미한 것만 엔진 심판 파이프라인에 전송하는 브릿지
  - 필터 조건: 최소 3라운드 진행, 일정 토큰 이상 발언, 가벼운 주제 감지 시 voiceConsistency만 평가
  - TriggerType에 `USER_ARENA` 추가
- 파일:
  - `apps/engine-studio/src/lib/persona-world/arena/pw-arena-quality-bridge.ts`
  - `apps/engine-studio/src/lib/persona-world/arena/filter.ts`
  - `apps/engine-studio/src/lib/persona-world/quality/arena-bridge.ts` (TriggerType 확장)
- 검증: 유닛 테스트 (필터 조건별 통과/차단 검증, 브릿지 호출 검증)
- 예상 소요: 5분

---

### Phase 3: API 라우트

#### Task 8: 세션 목록/생성 API

- 작업: `GET /api/persona-world/arena` (목록), `POST /api/persona-world/arena` (생성)
  - 생성 시: 코인 잔액 확인 → 차감 → 세션 생성 → 응답
- 파일: `apps/engine-studio/src/app/api/persona-world/arena/route.ts`
- 검증: API 응답 형식 확인 (ApiResponse 패턴), requireAuth 가드 존재
- 예상 소요: 4분

#### Task 9: 세션 상세/턴 실행 API

- 작업:
  - `GET /api/persona-world/arena/[sessionId]` (상세)
  - `POST /api/persona-world/arena/[sessionId]/turns` (다음 턴 실행)
  - `PATCH /api/persona-world/arena/[sessionId]` (세션 완료 처리)
- 파일:
  - `apps/engine-studio/src/app/api/persona-world/arena/[sessionId]/route.ts`
  - `apps/engine-studio/src/app/api/persona-world/arena/[sessionId]/turns/route.ts`
- 검증: requireAuth 가드 + 응답 형식 + 세션 소유자 검증
- 예상 소요: 5분

#### Task 10: API 문서 업데이트

- 작업: PW 아레나 API 엔드포인트를 internal API 문서에 추가
- 파일: `docs/api/internal.md`, `docs/api/internal.openapi.yaml`
- 검증: 문서에 모든 엔드포인트 기재 확인
- 예상 소요: 3분

---

### Phase 4: PW 프론트엔드

#### Task 11: 아레나 공통 컴포넌트

- 작업: arena-room-card, arena-participant-list, arena-round-indicator, arena-vote-panel 컴포넌트
- 파일: `apps/persona-world/src/components/arena/*.tsx`
- 검증: persona-world 빌드 성공
- 예상 소요: 5분

#### Task 12: 아레나 메인 페이지

- 작업: 아레나 탭 (진행 중 토론 목록 + 내 토론 + 생성 버튼)
- 파일: `apps/persona-world/src/app/(main)/arena/page.tsx`
- 검증: persona-world 빌드 성공 + 라우팅 동작
- 예상 소요: 4분

#### Task 13: 토론방 생성 플로우

- 작업: 방 유형 선택 → 페르소나 초대 → 주제 입력 → 코인 확인 → 생성
  - 인원 비례 라운드 추가 가격 동적 표시
- 파일: `apps/persona-world/src/app/(main)/arena/create/page.tsx`
- 검증: persona-world 빌드 성공
- 예상 소요: 5분

#### Task 14: 토론 관전/참여 + 리플레이

- 작업:
  - 실시간 토론 뷰 (라운드별 발언 표시 + 유저 투표)
  - 리플레이 페이지 (저장된 토론 재생)
- 파일:
  - `apps/persona-world/src/app/(main)/arena/[sessionId]/page.tsx`
  - `apps/persona-world/src/app/(main)/arena/[sessionId]/replay/page.tsx`
- 검증: persona-world 빌드 성공
- 예상 소요: 5분

---

### Phase 5: 통합 검증

#### Task 15: 통합 테스트 + pnpm validate

- 작업:
  - PW 아레나 → 엔진 품질 파이프라인 E2E 플로우 테스트
  - 전체 typecheck + lint + test + build
- 파일: `apps/engine-studio/tests/unit/arena/pw-arena*.test.ts`
- 검증: `pnpm validate` 전체 PASS
- 예상 소요: 5분

## 엔진 품질 연동 상세

### 데이터 플로우

```
PW 토론 완료
  ↓
pw-arena-quality-bridge.ts
  ↓ 필터링 (최소 3라운드, 최소 토큰)
  ↓
기존 arena-engine.ts — judgeSession()
  ↓ 4차원 평가 (characterConsistency, l2Emergence, paradoxEmergence, triggerResponse)
  ↓
arena-bridge.ts — createArenaTrigger(type: "USER_ARENA")
  ↓
arena-feedback.ts — applyCorrectionFromArena()
  ↓ 관리자 승인
  ↓
페르소나 Instruction Layer 업데이트
```

### 필터링 조건 (가벼운 토론 배제)

| 조건                   | 기준        | 평가 범위          |
| ---------------------- | ----------- | ------------------ |
| 라운드 수              | ≥ 3         | 전체 평가          |
| 라운드 수              | < 3         | 평가 제외          |
| 평균 발언 토큰         | ≥ 100       | 전체 평가          |
| 평균 발언 토큰         | < 100       | voiceConsistency만 |
| 주제 복잡도 (LLM 판별) | HIGH/MEDIUM | 전체 평가          |
| 주제 복잡도 (LLM 판별) | LOW         | voiceConsistency만 |

### 가중치 (기존 엔진 아레나와 동일)

- voiceConsistency: 0.30 (= characterConsistency)
- factbookAccuracy: 0.25 (= l2Emergence)
- characterDepth: 0.25 (= paradoxEmergence)
- interactionQuality: 0.20 (= triggerResponse)

## 완료 기준

- [ ] 모든 태스크 완료 (15개)
- [ ] `pnpm validate` PASS
- [ ] TASK.md AC 전부 체크
- [ ] API 문서 (internal.md + openapi.yaml) 최신화
- [ ] 마이그레이션 SQL 파일 존재
- [ ] 상점에 아레나 아이템 표시 확인
- [ ] 토론 완료 → 엔진 품질 파이프라인 전송 확인
