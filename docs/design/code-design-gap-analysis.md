# DeepSight PersonaAI — 설계서 vs 구현 비교 분석 리포트

**작성일**: 2026-02-23
**분석 대상**: 전체 설계서 (v4 design docs, specs, API docs) vs 실제 구현 코드

---

## 1. 전체 요약

| 영역 | 설계서 기준 완성도 | 비고 |
|------|-------------------|------|
| **Engine Studio 코어 (벡터/매칭/생성)** | 95%+ | 핵심 알고리즘 모두 구현, 일부 상수값 차이 |
| **Engine Studio 부가 (아레나/인큐베이터/품질)** | 90%+ | 실질적 로직 구현 완료 |
| **보안 시스템** | 90%+ | 4계층 보안 모두 구현 |
| **PersonaWorld 백엔드** | 85%+ | 핵심 기능 구현, 일부 고급 기능 미구현 |
| **PersonaWorld 프론트엔드** | 70% | 페이지 구조는 있으나 일부 placeholder |
| **Developer Console** | 85% | 코어 기능 완성, 부가 기능(logs/webhook/team) 미완 |
| **API (External v1)** | 80% | 8/10 엔드포인트 구현, consent API 누락 |
| **API (Internal)** | 95% | 거의 전체 구현 |
| **API (Public)** | 80% | 주요 엔드포인트 구현, explore/persona-requests 누락 |

---

## 2. 핵심 불일치 사항 (Critical Gaps)

### 2.1 V_Final 블렌딩 계수 불일치

| 항목 | 설계서 (`persona-engine-v4.md:155`) | 구현 (`dynamics-defaults.ts`) |
|------|------|------|
| α (L2 weight) | **0.7** | **0.6** |
| β (L3 weight) | **0.3** | **0.4** |

설계서는 `α=0.7, β=0.3`으로 L2(기질)에 더 높은 가중치를, 구현은 `α=0.6, β=0.4`로 L3(내러티브)에 더 높은 가중치를 적용. V_Final 계산 결과에 직접 영향을 미치는 값.

### 2.2 아레나 심판 평가 차원 불일치

| 설계서 (`persona-engine-v4.md:460-467`) | 구현 (`arena-engine.ts`) |
|------|------|
| voiceConsistency (0.30) | characterConsistency |
| factbookAccuracy (0.25) | l2Emergence |
| characterDepth (0.25) | paradoxEmergence |
| interactionQuality (0.20) | triggerResponse |

설계서는 보이스/팩트북/캐릭터/인터랙션 4차원, 구현은 캐릭터일관성/L2발현/패러독스발현/트리거반응 4차원. 완전히 다른 평가 체계.

### 2.3 킬 스위치 Feature Toggle 불일치

| 설계서 (`persona-engine-v4.md:336-343`) | 구현 (`kill-switch.ts`) |
|------|------|
| postGeneration | autonomousPosting |
| commentGeneration | _(없음)_ |
| matchingEngine | _(없음)_ |
| arenaSystem | arena |
| emotionalContagion | emotionalContagion ✅ |
| socialModule | _(없음)_ |
| _(없음)_ | diffusion |
| _(없음)_ | reflection |
| _(없음)_ | evolution |

6개 중 1개만 일치. 나머지는 이름이 다르거나 아예 다른 토글 구성.

### 2.4 External API — Consent 엔드포인트 누락

설계서 (`docs/api/external-v1.md`)에 명시된 2개 엔드포인트가 구현되지 않음:
- `GET /v1/users/:id/consent` — 동의 상태 조회
- `POST /v1/users/:id/consent` — 동의 상태 변경

GDPR 관련 필수 기능으로 비즈니스적으로 Critical.

### 2.5 매칭 엔진 — 실제 UserVector 미연동

External API의 `/v1/match` 엔드포인트에서:
- **설계서**: 실제 UserVector DB에서 조회하여 매칭
- **구현**: 하드코딩된 기본 벡터 `[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]` 사용
- 코드 주석에 `"in production, fetched from UserVector"` 존재

---

## 3. 영역별 상세 비교

### 3.1 3-Layer Vector System (106D+)

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| L1 Social (7D) | depth, lens, stance, scope, taste, purpose, sociability | 동일 | ✅ 일치 |
| L2 OCEAN (5D) | openness, conscientiousness, extraversion, agreeableness, neuroticism | 동일 | ✅ 일치 |
| L3 Narrative (4D) | lack, moralCompass, volatility, growthArc | 동일 | ✅ 일치 |
| Cross-Axis | 83축 (L1×L2:35, L1×L3:28, L2×L3:20) | 83축 구현 | ✅ 일치 |
| EPS 가중치 | L1↔L2:50%, L1↔L3:30%, L2↔L3:20% | 동일 | ✅ 일치 |
| Dimensionality Score | Gaussian bell curve, optimal ≈ 0.35 | 구현됨 | ✅ 일치 |
| V_Final 수식 | `(1-P)·L1 + P·(α·L2_proj + β·L3_proj)` | 동일 수식 | ✅ 수식 일치 |
| V_Final α, β | α=0.7, β=0.3 | α=0.6, β=0.4 | ⚠️ **불일치** |

### 3.2 매칭 알고리즘

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| 3-Tier 매칭 | basic/advanced/exploration | 구현됨 | ✅ |
| Tier 분배 비율 | 60%/10%/30% | 구현됨 | ✅ |
| Basic 가중치 | 0.65×vector + 0.3×crossAxis + 0.05×paradox | 구현됨 | ✅ |
| Advanced 가중치 | 0.5×vector + 0.3×crossAxis + 0.2×paradox | 구현됨 | ✅ |
| Exploration | 0.4×paradoxDiv + 0.4×crossAxisDiv + 0.2×freshness | 구현됨 | ✅ |
| Simulator | 가상 유저 생성 + 배치 시뮬레이션 | 완전 구현 | ✅ |
| Tuning | 하이퍼파라미터 프로파일 + 장르 가중치 | 완전 구현 | ✅ |
| Analytics | 7개 KPI + 이상 감지 | 완전 구현 | ✅ |
| XAI Explanation | 차원별 설명 생성 | 완전 구현 | ✅ |
| Guardrails/A/B Test | 안전장치 + 자동 롤백 | 완전 구현 | ✅ |

### 3.3 캐릭터 바이블 (Character Bible)

| 모듈 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| Trigger Map (Rule DSL) | 6종 Expression + priority + cooldown | `rule-dsl.ts` 완전 구현 | ✅ |
| Relationship Protocol | 4단계(STRANGER→CLOSE) + 5유형 | `relationship-protocol.ts` 구현 | ✅ |
| Voice Spec | VoiceProfile + StyleParams + 가드레일 | `voice-spec.ts` + `voice-generator.ts` 구현 | ✅ |
| Factbook | ImmutableFact + 해시 무결성 | `factbook.ts` + `factbook-runtime.ts` 구현 | ✅ |
| Voice Anchor | few-shot 예시 추출 | `voice-anchor.ts` 구현 | ✅ |

### 3.4 보안 3계층 (Security Triad)

| 모듈 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| Gate Guard | 인젝션 12종 + 금지어 14종 + 구조 5종 | 11 regex + 13 금지어 + 구조 검사 | ⚠️ 패턴 수 소폭 차이 |
| Trust Decay | 위반 누적 시 신뢰도 하락 | 전파 감쇠 구현 (1.0→0.7→0.5) | ✅ |
| Integrity Monitor | 팩트북 해시 + L1 드리프트 + 변경 이력 + 집단 이상 | 4개 영역 모두 구현 | ✅ |
| Output Sentinel | PII 6종 + 시스템 유출 8종 + 비속어 4종 | PII 6종 + 시스템 5종 + 비속어 구현 | ⚠️ 시스템 유출 패턴 수 차이 |
| Kill Switch | globalFreeze + 6 toggles + 3 autoTriggers | 구현됨, **토글 이름 불일치** | ⚠️ **불일치** |
| Data Provenance | 출처 추적 + 전파 감쇠 | `data-provenance.ts` 구현 | ✅ |
| Quarantine | 격리 + 관리자 리뷰 | `quarantine.ts` 구현 | ✅ |

### 3.5 기억 지능 (Memory Intelligence)

| 모듈 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| Poignancy Score | 6요인 가중합 | `poignancy.ts` 구현 | ✅ |
| Forgetting Curve | Ebbinghaus `R(t) = e^(-t/(S×boost))` | `forgetting-curve.ts` 구현 | ✅ |
| RAG 가중 검색 | `recency×0.3 + similarity×0.4 + (poignancy×retention)×0.3` | `rag-weighted-search.ts` 구현 | ✅ |
| 핵심 기억 보호 | Poignancy ≥ 0.8 → ×1.2 부스트 | 구현됨 | ✅ |

### 3.6 아레나 (Arena)

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| 스파링 모드 | 1v1 + 1vN | 구현됨 | ✅ |
| 세션 라이프사이클 | CREATED→STARTED→COMPLETED→ARCHIVED | PENDING→RUNNING→COMPLETED/CANCELLED | ⚠️ 상태 이름 차이 |
| 심판 차원 | 4차원 (voice/factbook/character/interaction) | 4차원 (character/l2/paradox/trigger) | ⚠️ **차원 불일치** |
| 교정 루프 | 5카테고리 패치 | 5카테고리 구현 | ✅ |
| 비용 제어 | 토큰 예산 + 세션 제한 | 구현됨 | ✅ |
| 안전 장치 | confidence 임계값 + 일일 제한 | 구현됨 (max 5/day, min 0.3 confidence) | ✅ |

### 3.7 소셜 모듈 & 감정 전염

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| Connectivity (Authority/Reputation/Tribalism) | 설계서에 정의 | `connectivity.ts` + `SocialModuleConfig` DB 모델 | ✅ |
| Emotional Contagion | 그래프 기반 감정 전파 | `emotional-contagion.ts` 구현 | ✅ |

### 3.8 PersonaWorld — 자율 활동

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| 8 Activity Traits | sociability~growthDrive | `activity-mapper.ts` 구현 | ✅ |
| 17 Post Types | REVIEW~BEHIND_STORY | `post-type-selector.ts` 구현 | ✅ |
| 콘텐츠 생성 | LLM 기반 자율 생성 | `content-generator.ts` + `post-pipeline.ts` | ✅ |
| 스케줄러 | activeHours 기반 스케줄링 | `scheduler.ts` 구현 | ✅ |
| PersonaState | mood/energy/socialBattery/paradoxTension/narrativeTension | DB 모델 + `state-manager.ts` | ✅ |

### 3.9 PersonaWorld — 피드 & 인터랙션

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| 피드 비율 | 60% following + 30% recommended + 10% trending | `feed-engine.ts` + `interleaver.ts` | ✅ |
| Explore 탭 | 역할 클러스터 + hot topics + debates + new personas | `explore-engine.ts` 구현 | ✅ |
| 좋아요/댓글/팔로우 | 자율 인터랙션 | `like-engine.ts`, `comment-engine.ts`, `follow-engine.ts` | ✅ |
| 관계 프로토콜 | 4단계×5유형 | `relationship-protocol.ts` 구현 | ✅ |
| 댓글 톤 | 11종 톤 시스템 | `comment-tone.ts` 구현 | ✅ |
| 멘션 시스템 | @mention → 알림 | `mention-service.ts` 구현 | ✅ |

### 3.10 PersonaWorld — 품질 & 운영

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| Persona Drift 감지 | 벡터 드리프트 모니터링 | `persona-drift.ts` + `drift-correction.ts` | ✅ |
| Diversity Score | 콘텐츠 다양성 측정 | `diversity-score.ts` + `diversity-constraint.ts` | ✅ |
| Trust Score | 유저/페르소나 신뢰도 | `trust-score.ts` | ✅ |
| Rapport Score | 유저-페르소나 관계 점수 | `rapport-score.ts` | ✅ |
| Auto Interview (PW) | PW용 자동 인터뷰 | `auto-interview.ts` (PW) | ✅ |
| Arena Bridge | 아레나 연동 | `arena-bridge.ts` | ✅ |
| 모더레이션 | 자동 + 관리자 모더레이션 | `auto-moderator.ts` + `moderation-actions.ts` | ✅ |
| 비용 관리 | 3모드 (QUALITY/BALANCE/COST_PRIORITY) | `cost-mode.ts` + `optimizer.ts` + `budget-alert.ts` | ✅ |

### 3.11 PersonaWorld — 온보딩 & SNS

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| 3-Phase 온보딩 | QUICK(12) / STANDARD(30) / DEEP(60) | `onboarding-engine.ts` + `questions.ts` | ✅ |
| SNS 연동 | OAuth + 데이터 추출 | `sns-oauth.ts` + `sns-analyzer.ts` + `sns-processor.ts` | ✅ |
| LLM 기반 SNS 분석 | Claude Sonnet으로 심층 분석 | `sns-llm-analyzer.ts` | ✅ |
| 크레딧 시스템 | 코인 충전 + 사용 | `credit-service.ts` + `coin-packages.ts` | ✅ |
| Evolution | 페르소나 자율 진화 | `evolution-algorithm.ts` + `evolution-runner.ts` | ✅ |

---

## 4. API 엔드포인트 Gap 분석

### 4.1 External API v1 (`docs/api/external-v1.md`)

| 엔드포인트 | 문서 | 구현 | Gap |
|-----------|------|------|-----|
| POST /v1/match | ✅ | ✅ | UserVector 하드코딩 |
| POST /v1/batch-match | ✅ | ✅ | - |
| GET /v1/personas | ✅ | ✅ | - |
| GET /v1/personas/:id | ✅ | ✅ | - |
| POST /v1/personas/filter | ✅ | ✅ | - |
| POST /v1/feedback | ✅ | ✅ | - |
| GET /v1/users/:id/profile | ✅ | ✅ | - |
| POST /v1/users/:id/onboarding | ✅ | ✅ | 벡터 계산이 휴리스틱(LLM 아님) |
| **GET /v1/users/:id/consent** | ✅ | **❌ 미구현** | **GDPR Critical** |
| **POST /v1/users/:id/consent** | ✅ | **❌ 미구현** | **GDPR Critical** |

### 4.2 Internal API

- 44/45+ 엔드포인트 구현 (`POST /personas/generate-random` 미확인)
- Response format에서 `meta` 필드 (request_id, processing_time_ms) 누락

### 4.3 Public API

| 엔드포인트 | 문서 | 구현 | Gap |
|-----------|------|------|-----|
| **GET /explore** | ✅ | **❌ 미구현** | 복합 aggregation 엔드포인트 |
| **GET/POST /persona-requests** | ✅ | **❌ 미구현** | 유저 페르소나 생성 요청 |
| GET /personas/:id | ✅ | ⚠️ | `recentPosts` 필드 누락 |
| GET /feed | ✅ | ⚠️ | 벡터 기반 매칭 대신 인기도 기반 |

---

## 5. DB 스키마 vs 설계서 Enum 불일치

| 항목 | 설계서 | Prisma Schema | 상태 |
|------|--------|---------------|------|
| PersonaStatus enum | DRAFT→REVIEW→ACTIVE→PAUSED→ARCHIVED | + STANDARD, LEGACY, DEPRECATED 추가 | ⚠️ 확장됨 |
| ArenaSession status | CREATED→STARTED→COMPLETED→ARCHIVED→EXPIRED | PENDING→RUNNING→COMPLETED→CANCELLED | ⚠️ 불일치 |
| PostSource enum | AUTONOMOUS/TRIGGERED/ARENA/SEEDED/EXTERNAL | AUTONOMOUS/FEED_INSPIRED/ARENA_TEST/SCHEDULED | ⚠️ 불일치 |
| OnboardingLevel | LIGHT/MEDIUM/DEEP (engine-studio) vs QUICK/STANDARD/DEEP (dev-console) | 두 스키마 간 이름 불일치 | ⚠️ 불일치 |
| ReportReason | INAPPROPRIATE_CONTENT 등 6종 (public.md) | SPAM/INAPPROPRIATE/HARASSMENT/MISINFORMATION/OTHER (schema) | ⚠️ 불일치 |

---

## 6. 우선순위별 정리

### P0 — 즉시 해결 필요

1. **Consent API 구현** (`GET/POST /v1/users/:id/consent`) — GDPR 필수
2. **UserVector 실제 연동** (match API에서 하드코딩 제거)
3. **V_Final α/β 값 통일** (설계서 0.7/0.3 vs 구현 0.6/0.4 중 어느 쪽이 정확한지 결정)

### P1 — 조속한 해결 권장

4. **아레나 심판 차원 정합** — 설계서와 구현의 4차원 평가 기준 통일
5. **킬 스위치 토글 이름 통일** — 설계서 6개 vs 구현 6개, 이름 불일치
6. **Public API /explore 구현** — 문서에 명시된 엔드포인트
7. **Public API /persona-requests 구현** — 문서에 명시된 엔드포인트
8. **API Response meta 필드 추가** — Internal/Public API에 request_id, processing_time_ms 누락

### P2 — 개선 사항

9. **온보딩 벡터 계산** — 휴리스틱 평균 → LLM 기반 cold-start로 업그레이드
10. **피드 개인화 강화** — 인기도 기반 → 3-Layer 벡터 매칭 기반으로 업그레이드
11. **Enum 이름 통일** — OnboardingLevel(LIGHT vs QUICK), PostSource, ReportReason 등
12. **Gate Guard 패턴 수** — 설계서 12종 vs 구현 11종 (1종 추가)
13. **Output Sentinel 패턴 수** — 설계서 8종 vs 구현 5종 (3종 추가)
14. **Developer Console** — logs, webhooks, team 관리 UI 완성

---

## 7. 결론

전체적으로 프로젝트는 **설계서 대비 85~90% 수준의 높은 구현 완성도**를 보인다.
엔진 코어(벡터/매칭/생성/보안/아레나/품질)는 거의 100% 구현되어 있고,
알고리즘 수준에서 설계서와 정확하게 일치한다.

주요 문제는:
1. **설계서와 구현 간 상수값/이름 불일치** (α/β, 아레나 차원, 킬 스위치 토글)가 3건 존재하며, 설계서 또는 구현 중 하나를 기준으로 동기화 필요
2. **누락된 API 엔드포인트** 4건 (consent ×2, explore, persona-requests)
3. **하드코딩된 값** (UserVector default)이 프로덕션에서 실제 데이터로 대체 필요

이들을 해결하면 설계서와 구현이 완전히 일치하는 수준에 도달할 수 있다.
