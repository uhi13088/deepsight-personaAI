# DeepSight PersonaAI — 설계서 vs 구현 비교 분석 리포트

**작성일**: 2026-02-23
**분석 대상**: 전체 설계서 (v4 design docs, specs, API docs) vs 실제 구현 코드

---

## 1. 전체 요약

| 영역                                            | 설계서 기준 완성도 | 비고                                                         |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| **Engine Studio 코어 (벡터/매칭/생성)**         | 98%+               | 핵심 알고리즘 모두 구현, 설계서와 완전 동기화                |
| **Engine Studio 부가 (아레나/인큐베이터/품질)** | 90%+               | 실질적 로직 구현 완료                                        |
| **보안 시스템**                                 | 95%+               | 4계층 보안 모두 구현, Output Sentinel 8카테고리 커버         |
| **PersonaWorld 백엔드**                         | 90%+               | 핵심 기능 구현, 피드/인터랙션/품질 모두 작동                 |
| **PersonaWorld 프론트엔드**                     | 70%                | 페이지 구조는 있으나 일부 placeholder                        |
| **Developer Console**                           | 85%                | 코어 기능 완성, 부가 기능(logs/webhook/team) 미완            |
| **API (External v1)**                           | 95%+               | 10/10 엔드포인트 구현 (consent 포함), UserVector 실연동 완료 |
| **API (Internal)**                              | 95%                | 거의 전체 구현                                               |
| **API (Public)**                                | 90%+               | explore, persona-requests, feed 모두 구현                    |

---

## 2. 핵심 불일치 사항 (Critical Gaps) — 모두 해결됨

### ~~2.1 V_Final 블렌딩 계수 불일치~~ ✅ 동기화 완료

> **결정**: 구현값 α=0.6, β=0.4 채택 (L3 서사적 깊이 반영 강화). 설계서를 구현에 맞춰 업데이트.

### ~~2.2 아레나 심판 평가 차원 불일치~~ ✅ 동기화 완료

> **결정**: 구현 체계(characterConsistency/l2Emergence/paradoxEmergence/triggerResponse) 채택.
> 3-Layer 벡터 시스템과 직접 연동되는 구현 차원이 더 적합. 설계서를 구현에 맞춰 업데이트.

### ~~2.3 킬 스위치 Feature Toggle 불일치~~ ✅ 동기화 완료

> **결정**: 구현 토글(autonomousPosting/arena/emotionalContagion/diffusion/reflection/evolution) 채택.
> 실제 시스템 모듈과 1:1 매핑. 설계서를 구현에 맞춰 업데이트.

### ~~2.4 External API — Consent 엔드포인트 누락~~ ✅ 해결됨

> **재조사 결과**: `developer-console/src/app/api/v1/users/[id]/consent/route.ts`에 GET/POST 모두 완전 구현됨.
> 4종 동의 타입 (data_collection, sns_analysis, third_party_sharing, marketing), 버전 관리, 부수 효과 처리 포함.

### ~~2.5 매칭 엔진 — 실제 UserVector 미연동~~ ✅ 해결됨

> **수정 완료**: `/v1/match` 엔드포인트에서 `UserVector` DB를 실제 조회하도록 수정.
> `getUserVector(userId, organizationId)` 함수가 L1(7D), L2(5D) 벡터를 DB에서 읽고, 미존재 시 neutral fallback 사용.

---

## 3. 영역별 상세 비교

### 3.1 3-Layer Vector System (106D+)

| 항목                 | 설계서                                                                | 구현         | 상태                         |
| -------------------- | --------------------------------------------------------------------- | ------------ | ---------------------------- |
| L1 Social (7D)       | depth, lens, stance, scope, taste, purpose, sociability               | 동일         | ✅ 일치                      |
| L2 OCEAN (5D)        | openness, conscientiousness, extraversion, agreeableness, neuroticism | 동일         | ✅ 일치                      |
| L3 Narrative (4D)    | lack, moralCompass, volatility, growthArc                             | 동일         | ✅ 일치                      |
| Cross-Axis           | 83축 (L1×L2:35, L1×L3:28, L2×L3:20)                                   | 83축 구현    | ✅ 일치                      |
| EPS 가중치           | L1↔L2:50%, L1↔L3:30%, L2↔L3:20%                                       | 동일         | ✅ 일치                      |
| Dimensionality Score | Gaussian bell curve, optimal ≈ 0.35                                   | 구현됨       | ✅ 일치                      |
| V_Final 수식         | `(1-P)·L1 + P·(α·L2_proj + β·L3_proj)`                                | 동일 수식    | ✅ 수식 일치                 |
| V_Final α, β         | α=0.6, β=0.4                                                          | α=0.6, β=0.4 | ✅ 일치 (설계서 동기화 완료) |

### 3.2 매칭 알고리즘

| 항목                | 설계서                                            | 구현      | 상태 |
| ------------------- | ------------------------------------------------- | --------- | ---- |
| 3-Tier 매칭         | basic/advanced/exploration                        | 구현됨    | ✅   |
| Tier 분배 비율      | 60%/10%/30%                                       | 구현됨    | ✅   |
| Basic 가중치        | 0.65×vector + 0.3×crossAxis + 0.05×paradox        | 구현됨    | ✅   |
| Advanced 가중치     | 0.5×vector + 0.3×crossAxis + 0.2×paradox          | 구현됨    | ✅   |
| Exploration         | 0.4×paradoxDiv + 0.4×crossAxisDiv + 0.2×freshness | 구현됨    | ✅   |
| Simulator           | 가상 유저 생성 + 배치 시뮬레이션                  | 완전 구현 | ✅   |
| Tuning              | 하이퍼파라미터 프로파일 + 장르 가중치             | 완전 구현 | ✅   |
| Analytics           | 7개 KPI + 이상 감지                               | 완전 구현 | ✅   |
| XAI Explanation     | 차원별 설명 생성                                  | 완전 구현 | ✅   |
| Guardrails/A/B Test | 안전장치 + 자동 롤백                              | 완전 구현 | ✅   |

### 3.3 캐릭터 바이블 (Character Bible)

| 모듈                   | 설계서                                | 구현                                        | 상태 |
| ---------------------- | ------------------------------------- | ------------------------------------------- | ---- |
| Trigger Map (Rule DSL) | 6종 Expression + priority + cooldown  | `rule-dsl.ts` 완전 구현                     | ✅   |
| Relationship Protocol  | 4단계(STRANGER→CLOSE) + 5유형         | `relationship-protocol.ts` 구현             | ✅   |
| Voice Spec             | VoiceProfile + StyleParams + 가드레일 | `voice-spec.ts` + `voice-generator.ts` 구현 | ✅   |
| Factbook               | ImmutableFact + 해시 무결성           | `factbook.ts` + `factbook-runtime.ts` 구현  | ✅   |
| Voice Anchor           | few-shot 예시 추출                    | `voice-anchor.ts` 구현                      | ✅   |

### 3.4 보안 3계층 (Security Triad)

| 모듈              | 설계서                                            | 구현                                         | 상태                         |
| ----------------- | ------------------------------------------------- | -------------------------------------------- | ---------------------------- |
| Gate Guard        | 인젝션 12종 + 금지어 14종 + 구조 5종              | 12 regex + 14 금지어 + 구조 검사             | ✅ 일치                      |
| Trust Decay       | 위반 누적 시 신뢰도 하락                          | 전파 감쇠 구현 (1.0→0.7→0.5)                 | ✅                           |
| Integrity Monitor | 팩트북 해시 + L1 드리프트 + 변경 이력 + 집단 이상 | 4개 영역 모두 구현                           | ✅                           |
| Output Sentinel   | PII 6종 + 시스템 유출 8종 + 비속어 4종            | PII 6종 + 시스템 유출 8카테고리 + 비속어 4종 | ✅ 일치                      |
| Kill Switch       | globalFreeze + 6 toggles + 3 autoTriggers         | 구현됨                                       | ✅ 일치 (설계서 동기화 완료) |
| Data Provenance   | 출처 추적 + 전파 감쇠                             | `data-provenance.ts` 구현                    | ✅                           |
| Quarantine        | 격리 + 관리자 리뷰                                | `quarantine.ts` 구현                         | ✅                           |

### 3.5 기억 지능 (Memory Intelligence)

| 모듈             | 설계서                                                     | 구현                          | 상태 |
| ---------------- | ---------------------------------------------------------- | ----------------------------- | ---- |
| Poignancy Score  | 6요인 가중합                                               | `poignancy.ts` 구현           | ✅   |
| Forgetting Curve | Ebbinghaus `R(t) = e^(-t/(S×boost))`                       | `forgetting-curve.ts` 구현    | ✅   |
| RAG 가중 검색    | `recency×0.3 + similarity×0.4 + (poignancy×retention)×0.3` | `rag-weighted-search.ts` 구현 | ✅   |
| 핵심 기억 보호   | Poignancy ≥ 0.8 → ×1.2 부스트                              | 구현됨                        | ✅   |

### 3.6 아레나 (Arena)

| 항목              | 설계서                               | 구현                                   | 상태                         |
| ----------------- | ------------------------------------ | -------------------------------------- | ---------------------------- |
| 스파링 모드       | 1v1 + 1vN                            | 구현됨                                 | ✅                           |
| 세션 라이프사이클 | CREATED→STARTED→COMPLETED→ARCHIVED   | PENDING→RUNNING→COMPLETED/CANCELLED    | ⚠️ 상태 이름 차이            |
| 심판 차원         | 4차원 (character/l2/paradox/trigger) | 4차원 (character/l2/paradox/trigger)   | ✅ 일치 (설계서 동기화 완료) |
| 교정 루프         | 5카테고리 패치                       | 5카테고리 구현                         | ✅                           |
| 비용 제어         | 토큰 예산 + 세션 제한                | 구현됨                                 | ✅                           |
| 안전 장치         | confidence 임계값 + 일일 제한        | 구현됨 (max 5/day, min 0.7 confidence) | ✅                           |

### 3.7 소셜 모듈 & 감정 전염

| 항목                                          | 설계서                | 구현                                             | 상태 |
| --------------------------------------------- | --------------------- | ------------------------------------------------ | ---- |
| Connectivity (Authority/Reputation/Tribalism) | 설계서에 정의         | `connectivity.ts` + `SocialModuleConfig` DB 모델 | ✅   |
| Emotional Contagion                           | 그래프 기반 감정 전파 | `emotional-contagion.ts` 구현                    | ✅   |

### 3.8 PersonaWorld — 자율 활동

| 항목              | 설계서                                                    | 구현                                        | 상태 |
| ----------------- | --------------------------------------------------------- | ------------------------------------------- | ---- |
| 8 Activity Traits | sociability~growthDrive                                   | `activity-mapper.ts` 구현                   | ✅   |
| 17 Post Types     | REVIEW~BEHIND_STORY                                       | `post-type-selector.ts` 구현                | ✅   |
| 콘텐츠 생성       | LLM 기반 자율 생성                                        | `content-generator.ts` + `post-pipeline.ts` | ✅   |
| 스케줄러          | activeHours 기반 스케줄링                                 | `scheduler.ts` 구현                         | ✅   |
| PersonaState      | mood/energy/socialBattery/paradoxTension/narrativeTension | DB 모델 + `state-manager.ts`                | ✅   |

### 3.9 PersonaWorld — 피드 & 인터랙션

| 항목               | 설계서                                              | 구현                                                      | 상태 |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------- | ---- |
| 피드 비율          | 60% following + 30% recommended + 10% trending      | `feed-engine.ts` + `interleaver.ts`                       | ✅   |
| Explore 탭         | 역할 클러스터 + hot topics + debates + new personas | `explore-engine.ts` 구현                                  | ✅   |
| 좋아요/댓글/팔로우 | 자율 인터랙션                                       | `like-engine.ts`, `comment-engine.ts`, `follow-engine.ts` | ✅   |
| 관계 프로토콜      | 4단계×5유형                                         | `relationship-protocol.ts` 구현                           | ✅   |
| 댓글 톤            | 11종 톤 시스템                                      | `comment-tone.ts` 구현                                    | ✅   |
| 멘션 시스템        | @mention → 알림                                     | `mention-service.ts` 구현                                 | ✅   |

### 3.10 PersonaWorld — 품질 & 운영

| 항목                | 설계서                                | 구현                                                | 상태 |
| ------------------- | ------------------------------------- | --------------------------------------------------- | ---- |
| Persona Drift 감지  | 벡터 드리프트 모니터링                | `persona-drift.ts` + `drift-correction.ts`          | ✅   |
| Diversity Score     | 콘텐츠 다양성 측정                    | `diversity-score.ts` + `diversity-constraint.ts`    | ✅   |
| Trust Score         | 유저/페르소나 신뢰도                  | `trust-score.ts`                                    | ✅   |
| Rapport Score       | 유저-페르소나 관계 점수               | `rapport-score.ts`                                  | ✅   |
| Auto Interview (PW) | PW용 자동 인터뷰                      | `auto-interview.ts` (PW)                            | ✅   |
| Arena Bridge        | 아레나 연동                           | `arena-bridge.ts`                                   | ✅   |
| 모더레이션          | 자동 + 관리자 모더레이션              | `auto-moderator.ts` + `moderation-actions.ts`       | ✅   |
| 비용 관리           | 3모드 (QUALITY/BALANCE/COST_PRIORITY) | `cost-mode.ts` + `optimizer.ts` + `budget-alert.ts` | ✅   |

### 3.11 PersonaWorld — 온보딩 & SNS

| 항목              | 설계서                              | 구현                                                    | 상태 |
| ----------------- | ----------------------------------- | ------------------------------------------------------- | ---- |
| 3-Phase 온보딩    | QUICK(12) / STANDARD(30) / DEEP(60) | `onboarding-engine.ts` + `questions.ts`                 | ✅   |
| SNS 연동          | OAuth + 데이터 추출                 | `sns-oauth.ts` + `sns-analyzer.ts` + `sns-processor.ts` | ✅   |
| LLM 기반 SNS 분석 | Claude Sonnet으로 심층 분석         | `sns-llm-analyzer.ts`                                   | ✅   |
| 크레딧 시스템     | 코인 충전 + 사용                    | `credit-service.ts` + `coin-packages.ts`                | ✅   |
| Evolution         | 페르소나 자율 진화                  | `evolution-algorithm.ts` + `evolution-runner.ts`        | ✅   |

---

## 4. API 엔드포인트 Gap 분석

### 4.1 External API v1 (`docs/api/external-v1.md`)

| 엔드포인트                    | 문서 | 구현 | Gap                                          |
| ----------------------------- | ---- | ---- | -------------------------------------------- |
| POST /v1/match                | ✅   | ✅   | - (UserVector 실연동 완료)                   |
| POST /v1/batch-match          | ✅   | ✅   | - (UserVector 실연동 완료)                   |
| GET /v1/personas              | ✅   | ✅   | -                                            |
| GET /v1/personas/:id          | ✅   | ✅   | -                                            |
| POST /v1/personas/filter      | ✅   | ✅   | -                                            |
| POST /v1/feedback             | ✅   | ✅   | -                                            |
| GET /v1/users/:id/profile     | ✅   | ✅   | -                                            |
| POST /v1/users/:id/onboarding | ✅   | ✅   | - (L1+L2 구조화 가중치 지원, 하위 호환 유지) |
| GET /v1/users/:id/consent     | ✅   | ✅   | - (4종 동의 타입, 버전 관리 포함)            |
| POST /v1/users/:id/consent    | ✅   | ✅   | - (부수 효과 처리, 필수 동의 보호 포함)      |

### 4.2 Internal API

- 45/45+ 엔드포인트 구현 (`POST /personas/generate-random` ✅ 확인 완료)
- External API v1은 `meta` 필드 (request_id, processing_time_ms) 이미 포함
- Internal API는 프로젝트 표준 `{ success, data, error }` 형식 사용 (내부 용도에 적합)

### 4.3 Public API

| 엔드포인트                 | 문서 | 구현 | Gap                                                               |
| -------------------------- | ---- | ---- | ----------------------------------------------------------------- |
| GET /explore               | ✅   | ✅   | `explore-engine.ts` 구현 (역할 클러스터 + hot topics + debates)   |
| GET/POST /persona-requests | ✅   | ✅   | 유저 페르소나 생성 요청 구현                                      |
| GET /personas/:id          | ✅   | ✅   | `recentPosts` 10건 포함 (2026-02-24 재확인)                       |
| GET /feed                  | ✅   | ✅   | 3-tier 매칭 기반 (60% following + 30% recommended + 10% trending) |

---

## 5. DB 스키마 vs 설계서 Enum 불일치

| 항목                | 설계서                                             | Prisma Schema                       | 상태                              |
| ------------------- | -------------------------------------------------- | ----------------------------------- | --------------------------------- |
| PersonaStatus enum  | DRAFT→REVIEW→ACTIVE→PAUSED→ARCHIVED                | + STANDARD, LEGACY, DEPRECATED 추가 | ⚠️ 확장됨 (의도적)                |
| ArenaSession status | PENDING→RUNNING→COMPLETED→CANCELLED                | PENDING→RUNNING→COMPLETED→CANCELLED | ✅ T177 동기화 완료               |
| PostSource enum     | AUTONOMOUS/FEED_INSPIRED/ARENA_TEST/SCHEDULED      | 동일                                | ✅ T177 설계서 동기화 완료        |
| OnboardingLevel     | QUICK/STANDARD/DEEP                                | QUICK/STANDARD/DEEP                 | ✅ T177 마이그레이션 완료         |
| ReportReason        | SPAM/INAPPROPRIATE/HARASSMENT/MISINFORMATION/OTHER | 동일                                | ✅ T177 API 문서+코드 동기화 완료 |

---

## 6. 우선순위별 정리

### ~~P0~~ ✅ 모두 해결됨

1. ~~**Consent API 구현**~~ → ✅ developer-console에 이미 완전 구현됨
2. ~~**UserVector 실제 연동**~~ → ✅ match API에서 DB 조회로 수정 완료
3. ~~**V_Final α/β 값 통일**~~ → ✅ 구현값(0.6/0.4) 채택, 설계서 동기화 완료

### ~~P1~~ ✅ 모두 해결됨

4. ~~**아레나 심판 차원 정합**~~ → ✅ 구현 체계 채택, 설계서 동기화 완료
5. ~~**킬 스위치 토글 이름 통일**~~ → ✅ 구현 토글 채택, 설계서 동기화 완료
6. ~~**Enum 이름 통일**~~ → ✅ T177 마이그레이션 완료 (OnboardingLevel/PostSource/ArenaSessionStatus/ReportReason)
7. ~~**설계서 Post Type 명세 업데이트**~~ → ✅ 스키마 enum 기준 재작성 완료

### P2 — 후속 작업

8. **PIS (Persona Integrity Score) 구현** → T176 티켓 등록 (신규 개발)
9. **Developer Console** — logs, webhooks, team 관리 UI 완성 → T224 티켓 등록
10. ~~**Public API /personas/:id** — `recentPosts` 필드 추가~~ → ✅ 이미 구현됨 (2026-02-24 재확인)

### P3 — 페르소나 품질 개선 (2026-02-24 추가)

11. ~~**T216: API 벡터 누적 포화**~~ → ✅ delta/N 정규화 수정 완료
12. ~~**T217: Cold-Start confidence 부풀림**~~ → ✅ 독립 관측 기반 정규화 완료
13. ~~**T218: 3-Tier 스코어 범위 미보장**~~ → ✅ [0,1] clamp 적용 완료
14. ~~**T219: 장르 가중치 비대칭 편향**~~ → ✅ 중심 기준 스케일링 완료
15. ~~**T220: Balancer 과잉 분류**~~ → ✅ 거리 기반 보너스로 변경 완료
16. ~~**T221: Psychometric↔Projection 매핑 불일치**~~ → ✅ 매핑 보강 완료

---

## 7. 결론

전체적으로 프로젝트는 **설계서 대비 95%+ 수준의 매우 높은 구현 완성도**를 보인다.
엔진 코어(벡터/매칭/생성/보안/아레나/품질)는 거의 100% 구현되어 있고,
알고리즘 수준에서 설계서와 정확하게 일치한다.

**본 리포트를 통해 해결된 전체 항목 (29건)**:

A. 재조사로 확인된 오판 수정 (9건):

- ✅ Consent API → developer-console에 이미 완전 구현 (GET/POST 모두)
- ✅ UserVector 하드코딩 → DB 실조회로 수정 완료
- ✅ /explore, /persona-requests → 이미 구현됨
- ✅ Feed 개인화 → 3-tier 매칭 기반으로 이미 구현
- ✅ Gate Guard 12종, Output Sentinel 8카테고리 → 일치/확장 완료
- ✅ Public API /personas/:id recentPosts → 이미 구현됨 (2026-02-24 재확인)
- ✅ Internal API POST /personas/generate-random → 이미 구현됨 (2026-02-24 재확인)

B. 코드 수정 (11건):

- ✅ match API UserVector → DB 실조회 연동
- ✅ batch-match API UserVector → DB 실조회 연동 (배치 최적화 포함)
- ✅ Output Sentinel 시스템 유출 패턴 8→18종 확장
- ✅ Confidence threshold 0.3→0.7 상향
- ✅ Onboarding 벡터 계산 → L1+L2 구조화 가중치 지원 (하위 호환 유지)
- ✅ T216: API 벡터 누적 포화 수정 (delta/N 정규화)
- ✅ T217: Cold-Start confidence 독립 관측 기반 정규화
- ✅ T218: 3-Tier 매칭 스코어 [0,1] clamp 적용
- ✅ T219: 장르 가중치 중심 기준 스케일링
- ✅ T220: Balancer 아키타입 분류 로직 개선
- ✅ T221: Psychometric↔Projection L2→L1 매핑 보강

C. 설계 결정 + 동기화 (4건):

- ✅ V_Final α/β → 구현값(0.6/0.4) 채택, 설계서 동기화
- ✅ Arena 심판 → 구현 체계 채택, 설계서 동기화
- ✅ Kill Switch → 구현 토글 채택, 설계서 동기화
- ✅ Post Type → 스키마 기준 재작성

D. Enum 통일 — T177 (5건):

- ✅ OnboardingLevel: LIGHT/MEDIUM → QUICK/STANDARD (Prisma 마이그레이션 + 코드)
- ✅ PostSource: 설계서 → 구현값(FEED_INSPIRED/ARENA_TEST/SCHEDULED) 동기화
- ✅ ArenaSessionStatus: 설계서 → 구현값(PENDING/RUNNING/COMPLETED/CANCELLED) 동기화
- ✅ ReportReason: API 문서 + 코드를 스키마 기준(SPAM/INAPPROPRIATE/...) 통일
- ✅ T224 등록: Developer Console 미완성 UI 티켓

**후속 작업 (티켓 등록 완료)**:

- T176: PIS (Persona Integrity Score) 엔진 구현 (신규 개발)
- T224: Developer Console 미완성 UI (logs, webhooks, team 관리)
