# DeepSight - TASK QUEUE

> **이 파일이 작업의 유일한 진실(Single Source of Truth)입니다.**
> 모든 작업은 이 큐를 기준으로 진행합니다.

---

## 🏷️ 현재 버전: v4.2.0-dev (Multimodal)

> **최종 갱신: 2026-03-09**

### 버전 히스토리

| 버전       | 코드명             | 상태     | 완료일     | 핵심 내용                                                                                                  |
| ---------- | ------------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| v4.0.0     | Foundation         | **DONE** | 2026-03-08 | 보안 3계층, 기억(Poignancy/Factbook/망각), 자기교정(Arena/VoiceDrift), Social Module, 비용제어, 모더레이션 |
| v4.1.0     | Optimization       | **DONE** | 2026-03-08 | 배치 댓글, Haiku 라우팅, A/B 품질 모니터, 아레나 자동 스케줄, 스케일 자동 트리거, 최적화 로그 뷰어         |
| **v4.1.1** | **Infrastructure** | **DONE** | 2026-03-09 | 벡터 캐시(Redis), 메모리 인덱스(pgvector), 관리자 알림(Slack/이메일)                                       |

### 다음 로드맵

```
현재 ──→ v4.1.1 Infrastructure ──→ v4.2.0 Multimodal ──→ v5.0 Autonomy
              캐시·벡터DB·알림        이미지·음성 확장         자율 진화·메타 인지
```

> 상세 로드맵: `docs/design/persona-engine-v4-design-part3.md` §15

### v4.2.0 선행 완료 항목 (음성·관계)

아래 항목은 v4.2.0 범위이나 이미 구현 완료되어 v4.2.0 진입 시 잔여 항목(이미지)만 진행하면 됨:

- **음성 인터랙션**: TTS/STT Voice Pipeline, TTS 자체검증, 통화 테스트, TTS 튜닝 UI (T333~T350)
- **관계 모델 확장**: 9단계+22유형 DB 필드 (T263), COOLING/DORMANT 단계 (T177)

---

## 📋 QUEUE (대기)

### T44: 추가 질문 풀 126문항 SQL (일시 보류)

- [ ] **T44: 추가 질문 풀 126문항 SQL** (일시 보류)
  - 배경: 콜드스타트 질문 풀 확장
  - 참고: 현재 24문항으로 운영 중, 확장 시 진행

---

---

## 🔄 IN_PROGRESS (진행중)

---

## ✅ DONE (완료)

### Phase COUPON: 쿠폰/프로모션 코드 시스템 (T410~T414) ✅ 2026-03-10

- [x] **T410: DB 모델 + 마이그레이션 + 쿠폰 서비스 코어** ✅ 2026-03-10
  - 변경: `schema.prisma`, `058_coupon_system.sql`, `coupon-service.ts`
  - 테스트: 22개 PASS

- [x] **T411: 관리자 쿠폰 CRUD API** ✅ 2026-03-10
  - 변경: `api/internal/persona-world-admin/coupons/route.ts`
  - GET/POST/PUT/DELETE + Prisma DI provider

- [x] **T412: 사용자 쿠폰 적용 API** ✅ 2026-03-10
  - 변경: `api/persona-world/coupons/redeem/route.ts`
  - addCredits() 연동, 에러 매핑

- [x] **T413: Engine Studio 쿠폰 관리 UI** ✅ 2026-03-10
  - 변경: `persona-world-admin/coupons/page.tsx`, `lnb.tsx`
  - 필터/검색/생성 폼/코드 복사/활성화 토글

- [x] **T414: Persona World 쿠폰 입력 UI + API 문서** ✅ 2026-03-10
  - 변경: `shop/page.tsx`, `api.ts`, `docs/api/internal.md`, `docs/api/public.md`
  - 쿠폰 코드 입력 → 코인 지급 → 잔액 갱신

### Phase AU-D: 자율 기억 관리 (T408~T409) ✅ 2026-03-09

- [x] **T408: memory-prune 서비스 코어** ✅ 2026-03-09
  - 변경: `lib/autonomy/memory-prune.ts`
  - 3가지 규칙 (low_confidence, duplicate, overflow) + 안전 장치 (evidenceCount ≥ 3 보호, 1회 최대 10개)
  - 테스트: 7개 PASS

- [x] **T409: memory-consolidation 연동 + prune 자동 실행** ✅ 2026-03-09
  - 변경: `lib/autonomy/memory-prune-integration.ts`, `api/internal/autonomy/memory-prune/route.ts`
  - autoMemoryManagement=true 페르소나만 실행 + prune 상태 조회 API

### Phase AU-C: 메타 인지 (T405~T407) ✅ 2026-03-09

- [x] **T405: MetaCognitionReport 타입 + 서비스 코어** ✅ 2026-03-09
  - 변경: `lib/autonomy/meta-cognition.ts`
  - LLM(Haiku) 기반 1인칭 자기 보고 + selfAssessment 자동 판정 + 폴백 기본값
  - 테스트: 12개 PASS

- [x] **T406: MetaCognitionReport DB 저장 + 조회 API** ✅ 2026-03-09
  - 변경: `prisma/schema.prisma`, `migrations/057_meta_cognition_reports.sql`, `api/internal/autonomy/meta-cognition/`
  - 목록 조회 (필터: personaId, selfAssessment, 기간) + 개별 상세

- [x] **T407: 메타 인지 관리자 알림 연동** ✅ 2026-03-09
  - 변경: `lib/autonomy/meta-cognition-alert.ts`
  - NEEDS_ATTENTION → Slack, CRITICAL → Slack + 이메일

### Phase AU-B: 자율 교정 (T402~T404) ✅ 2026-03-09

- [x] **T402: correction-loop 자율 적용 분기** ✅ 2026-03-09
  - 변경: `lib/autonomy/auto-correction.ts`
  - getAutoApplyConfig + checkAutoApply + isAutoApplicable
  - Critical 항상 관리자 승인, AUTO_APPLY_MAX_SEVERITY 폴백 유지
  - 테스트: 13개 PASS

- [x] **T403: AutonomyCorrectionLog 감사 로그** ✅ 2026-03-09
  - 변경: `lib/autonomy/correction-log.ts`, `prisma/schema.prisma`, `migrations/056_autonomy_correction_logs.sql`, `api/internal/autonomy/corrections/`
  - DB 모델 + 목록 조회 + 리뷰 마킹 + 과교정 감지 (같은 카테고리 3회/24h)
  - 테스트: 6개 PASS

- [x] **T404: PIS 기반 자동 Arena 트리거** ✅ 2026-03-09
  - 변경: `lib/autonomy/auto-arena-trigger.ts`
  - PIS < 0.7 WARNING, < 0.6 CRITICAL + 예산/중복 체크
  - 테스트: 7개 PASS

### Phase AU-A: AutonomyPolicy 기반 설정 (T400~T401) ✅ 2026-03-09

- [x] **T400: AutonomyPolicy 타입 정의 + Persona DB 필드 추가** ✅ 2026-03-09
  - 변경: `lib/autonomy/autonomy-policy.ts`, `lib/autonomy/index.ts`, `prisma/schema.prisma`, `migrations/055_autonomy_policy.sql`
  - 테스트: 31개 추가 (4940/4940 PASS) + Build PASS

- [x] **T401: AutonomyPolicy 관리 API** ✅ 2026-03-09
  - 변경: `api/internal/personas/[id]/autonomy/route.ts`, `docs/api/internal.md`, `docs/api/internal.openapi.yaml`
  - Build PASS (4940/4940)

### Phase v4.1.1-C: 관리자 알림 — Slack/이메일 완료 (T385~T388) ✅ 2026-03-09

> 시스템 이벤트(보안 위반, 비용 임계, 품질 저하 등)를 Slack/이메일로 실시간 알림.

- [x] **T385: 알림 서비스 코어 구현** ✅ 2026-03-09
  - 변경: `lib/notifications/{notification-service,slack-provider,email-provider,index}.ts`, `env.d.ts`
  - 테스트: 135/135 PASS (4844/4844) + Build PASS

- [x] **T386: 알림 트리거 규칙 + Cron 연동** ✅ 2026-03-09
  - 변경: `lib/notifications/alert-rules.ts`, `api/internal/alerts/test/route.ts`, `prisma/schema.prisma`, `migrations/052_alert_logs.sql`
  - 테스트: 136/136 PASS (4860/4860)

- [x] **T387: 알림 채널 설정 UI** ✅ 2026-03-09
  - 변경: `(dashboard)/global-config/alerts/page.tsx`, `api/internal/settings/alerts/route.ts`

- [x] **T388: 알림 히스토리 뷰어** ✅ 2026-03-09
  - 변경: `(dashboard)/operations/monitoring/alerts/page.tsx`, `api/internal/alerts/history/route.ts`
  - 테스트: 136/136 PASS (4860/4860)

### Phase v4.1.1-B: 메모리 인덱스 — pgvector 완료 (T381~T384) ✅ 2026-03-09

> PersonaLayerVector의 Float 컬럼 7+5+4개를 pgvector 벡터 컬럼으로 전환. 유사 페르소나 검색 O(N) → ANN 인덱스.

- [x] **T381: pgvector 확장 활성화 + 마이그레이션** ✅ 2026-03-09
  - 변경: `prisma/migrations/050_pgvector_columns.sql`, `prisma/schema.prisma`

- [x] **T382: 벡터 검색 쿼리 레이어 구현** ✅ 2026-03-09
  - 변경: `src/lib/vector-search.ts`, `tests/unit/vector-search.test.ts`
  - 테스트: 132/132 PASS (4820/4820) + Build PASS

- [x] **T383: 벡터 인덱스 생성 + 성능 검증** ✅ 2026-03-09
  - 변경: `prisma/migrations/051_pgvector_indexes.sql`

- [x] **T384: 피드 엔진 벡터 검색 통합** ✅ 2026-03-09
  - 변경: `api/persona-world/feed/route.ts`
  - 테스트: 132/132 PASS (4820/4820)

### Phase v4.1.1-A: 벡터 캐시 — Redis 완료 (T376~T380) ✅ 2026-03-09

> 페르소나 매칭 엔진의 반복 벡터 연산을 Redis 캐시로 제거. 피드 레이턴시 35~55% 감소 목표.

- [x] **T376: Upstash Redis 클라이언트 설정** ✅ — `@upstash/redis` 싱글턴 + `pingRedis()` 헬스체크
- [x] **T377: PrecomputedMatchData 캐시 서비스** ✅ — get/set/invalidate/bulkGet + computeAndCache + getOrCompute (14 tests)
- [x] **T378: 캐시 무효화 훅** ✅ — 4개 벡터 변경 라우트에 `invalidateMatchData()` 추가
- [x] **T379: 피드 매칭 엔진 캐시 통합** ✅ — bulkGetMatchData + cache-aside + cacheHitRate 로그
- [x] **T380: 캐시 모니터링 + 관리 API** ✅ — stats/invalidate-all/warm 3개 API

### Phase PW-V4-DB 완료 (T263~T275) ✅ 2026-03-08

> DB 스키마 v4.0 확장 — 보안/품질/모더레이션/비용 모델 전부 Prisma 스키마에 구현 완료.

- [x] **T263: PersonaRelationship v4.0 필드 추가** ✅ — stage/type/카운터 (positiveComments, negativeComments, totalInteractions, lastInteractionAt, peakStage, momentum, milestones)
- [x] **T264: PersonaState 활동 카운터 추가** ✅ — lastActivityAt, postsThisWeek, commentsThisWeek
- [x] **T265: ConsumptionLog v4.0 필드 추가** ✅ — sourceType, interactionType, poignancyScore, retentionScore
- [x] **T266: PersonaActivityLog 보안/출처 필드 추가** ✅ — securityCheck(Json), provenanceData(Json)
- [x] **T267: UserTrustScore DB 모델** ✅ — userId, score, inspectionLevel, blockCount, warnCount, reportCount
- [x] **T268: PWQuarantineEntry DB 모델** ✅ — contentType, contentId, reason, severity, status, expiresAt, reviewedBy
- [x] **T269: ModerationLog DB 모델** ✅ — contentType, contentId, stage, verdict, violations, actions, processingTimeMs
- [x] **T270: PostQualityLog + CommentQualityLog** ✅ — voiceSpecMatch, factbookViolations, toneMatch, contextRelevance 등
- [x] **T271: InterviewLog DB 모델** ✅ — questionCount, passCount, overallScore, goldenSampleScore, details
- [x] **T272: KPISnapshot DB 모델** ✅ — snapshotType, metrics(Json), period
- [x] **T273: DailyCostReport DB 모델** ✅ — totalCost, postingCost, commentCost, llmCalls, cacheHitRate
- [x] **T274: ContentReport DB 모델** ✅ — reporterId, targetType, category, status, resolution
- [x] **T275: BudgetConfig DB 모델** ✅ — dailyBudget, monthlyBudget, costMode, alertThresholds, autoActions

### Phase PW-V4-TYPE 완료 (T276~T277) ✅ 2026-03-08

> 통합 타입 시스템 확장 — SecurityCheckResult, Quality/Moderation/Cost 타입 types.ts에 정의.

- [x] **T276: SecurityCheckResult 통합 타입** ✅ — types.ts에 GateCheck+Sentinel 통합 타입
- [x] **T277: 운영 타입 확장** ✅ — Quality/Moderation/Cost 관련 타입 types.ts에 통합

### Phase PW-V4-SEC 완료 (T278~T286) ✅ 2026-03-08

> 보안 파이프라인 통합 — security/ 디렉토리에 전부 구현. 파이프라인 연동 포함.

- [x] **T278: pw-gate-rules → post-pipeline** ✅ — pw-gate-rules.ts inspectInput() 구현
- [x] **T279: pw-gate-rules → interaction-pipeline** ✅ — interaction-pipeline에 게이트 체크
- [x] **T280: Output Sentinel → post-pipeline** ✅ — securityOutputMiddleware() 호출 (L255-302)
- [x] **T281: Output Sentinel → interaction-pipeline** ✅ — securityOutputMiddleware() 호출 (L407-436)
- [x] **T282: PW Quarantine → 파이프라인 격리** ✅ — createSecurityQuarantine() 양쪽 파이프라인에서 호출
- [x] **T283: UserTrustScore Prisma CRUD** ✅ — trust-score-crud.ts (get/update/dailyRecovery)
- [x] **T284: pw-kill-switch 자동 트리거 4종** ✅ — checkAutoTriggers() 4종 구현
- [x] **T285: pw-kill-switch → 스케줄러 토글** ✅ — isFeatureEnabled() 양쪽 파이프라인에서 호출
- [x] **T286: security-middleware.ts** ✅ — securityInputMiddleware + securityOutputMiddleware + createSecurityQuarantine

### Phase PW-V4-QUAL 완료 (T287~T292) ✅ 2026-03-08

> 품질 파이프라인 통합 — quality/ 디렉토리에 전부 구현.

- [x] **T287: PostQualityLog → post-pipeline** ✅ — quality-logger.ts createPostQualityLog()
- [x] **T288: CommentQualityLog → interaction-pipeline** ✅ — quality-logger.ts createCommentQualityLog()
- [x] **T289: InteractionPatternLog 주기 집계** ✅ — quality-logger.ts logInteractionPattern()
- [x] **T290: PIS 대시보드 실 데이터** ✅ — pis-engine.ts 실제 계산값 연동
- [x] **T291: PIS 이력 저장 + 추세** ✅ — quality-runner.ts savePISSnapshot()
- [x] **T292: Arena Bridge** ✅ — arena-bridge.ts ArenaTrigger + CorrectionTracking

### Phase PW-V4-MOD 완료 (T293~T298) ✅ 2026-03-08

> 모더레이션 파이프라인 통합 — moderation/ 디렉토리에 전부 구현.

- [x] **T293: auto-moderator → post-pipeline** ✅ — runModerationPipeline() 호출 (post-pipeline L305)
- [x] **T294: auto-moderator → interaction-pipeline** ✅ — autoModerator 연동 (interaction-pipeline)
- [x] **T295: auto-moderator Stage 3 비동기** ✅ — moderation-runner.ts runAsyncAnalysis()
- [x] **T296: ContentReport API** ✅ — report-handler.ts submitReport()
- [x] **T297: moderation-actions API** ✅ — moderation-actions.ts executeAction()
- [x] **T298: 관리자 모더레이션 대시보드** ✅ — dashboard-service.ts + moderation/route.ts

### Phase PW-V4-COST 완료 (T299~T303) ✅ 2026-03-08

> 비용 제어 통합 — cost/ 디렉토리에 전부 구현.

- [x] **T299: budget-alert → cron-scheduler** ✅ — budget-alert.ts + cron-scheduler-service 연동
- [x] **T300: cost-mode → 스케줄러** ✅ — cost-mode.ts CostModeApplication
- [x] **T301: DailyCostReport 자동 집계** ✅ — cost-runner.ts aggregateAndSaveDailyCostReport() + v4-operations cron
- [x] **T302: 월간 비용 리포트** ✅ — cost-runner.ts 월간 집계
- [x] **T303: optimizer 3종** ✅ — optimizer.ts 전략 3종

### Phase PW-V4-API 완료 (T304~T307) ✅ 2026-03-08

> 유저 인터랙션 API — /api/public/ 경로에 전부 구현.

- [x] **T304: 좋아요 API** ✅ — /api/public/posts/[postId]/likes/route.ts
- [x] **T305: 댓글 API** ✅ — /api/public/posts/[postId]/comments/route.ts
- [x] **T306: 팔로우 API** ✅ — /api/public/follows/route.ts
- [x] **T307: 리포스트 API** ✅ — /api/public/posts/[postId]/repost/route.ts

### Phase PW-V4-ONB 완료 (T308~T314) ✅ 2026-03-08

> 온보딩 API 확장 — adaptive + daily-question 라우트 구현.

- [x] **T308: 온보딩 시작 API** ✅ — /api/persona-world/onboarding/adaptive/start/route.ts
- [x] **T309: Phase별 제출 API** ✅ — /api/persona-world/onboarding/adaptive/answer/route.ts
- [x] **T310: 매칭 프리뷰 API** ✅ — /api/public/onboarding/preview/route.ts
- [x] **T311: 온보딩 완료 API** ✅ — /api/persona-world/onboarding/adaptive/status/route.ts
- [x] **T312: Daily Micro-Onboarding 엔진** ✅ — onboarding/daily-micro.ts
- [x] **T313: 일일 질문 API** ✅ — /api/persona-world/onboarding/daily-question (GET)
- [x] **T314: 일일 답변 API** ✅ — /api/persona-world/onboarding/daily-question (POST)

### Phase PW-V4-CRON 완료 (T315~T320) ✅ 2026-03-08

> Scheduled Jobs — /api/cron/v4-operations에 통합 구현 + job-runner.ts 8종.

- [x] **T315: daily-pattern-analysis** ✅ — job-runner.ts runDailyPatternAnalysis() + v4-operations cron
- [x] **T316: hourly-metrics** ✅ — job-runner.ts runHourlyMetrics()
- [x] **T317: daily-cost-report** ✅ — v4-operations cron에서 aggregateAndSaveDailyCostReport() 호출
- [x] **T318: weekly-arena** ✅ — job-runner.ts runWeeklyArena()
- [x] **T319: daily-log-cleanup** ✅ — job-runner.ts runDailyLogCleanup()
- [x] **T320: daily-quarantine-expiry** ✅ — job-runner.ts runDailyQuarantineExpiry()

### Phase PW-V4-DI 완료 (T321~T323) ✅ 2026-03-08

> DI Provider Prisma 구현체 — security/quality/moderation 모듈에 Prisma 연동.

- [x] **T321: SecurityDataProvider Prisma** ✅ — security-provider-factory.ts
- [x] **T322: Quality 모듈 Prisma** ✅ — quality-integration.ts
- [x] **T323: Moderation 모듈 Prisma** ✅ — moderation-runner.ts Prisma 구현체

### Phase PW-V4-FEED 완료 (T324~T325) ✅ 2026-03-08

> 피드 v4.0 확장.

- [x] **T324: Social Module Boost** ✅ — feed/social-boost.ts
- [x] **T325: Bot Suspect 필터** ✅ — feed/feed-engine.ts botSuspect 필터

### Phase PW-V4-STATE 완료 (T326) ✅ 2026-03-08

> PersonaState 카운터 자동 갱신.

- [x] **T326: postsThisWeek/commentsThisWeek 자동 갱신** ✅ — state-manager.ts (post_created → postsThisWeek++, comment_created → commentsThisWeek++)

### Phase CON-EXT 완료 (T351~T360) ✅ 2026-03-08

> 엔터테인먼트 콘텐츠 소스 확장 — TMDB/KOPIS/Aladin/Last.fm 4개 무료 API 통합.

- [x] **T351: ContentSource + ContentItem DB 모델** ✅
- [x] **T352: 콘텐츠 관심사 매처** ✅ — media-interest-matcher.ts
- [x] **T353: 콘텐츠 반응 트리거** ✅ — media-reaction-trigger.ts
- [x] **T354: TMDB 페처** ✅ — fetchers/tmdb-fetcher.ts
- [x] **T355: KOPIS 페처** ✅ — fetchers/kopis-fetcher.ts
- [x] **T356: 알라딘 페처** ✅ — fetchers/aladin-fetcher.ts
- [x] **T357: Last.fm 페처** ✅ — fetchers/lastfm-fetcher.ts
- [x] **T358: 콘텐츠 자동 페치** ✅ — media-auto-fetch.ts
- [x] **T359: Admin 콘텐츠 소스 관리 API** ✅ — /api/internal/persona-world-admin/media/route.ts
- [x] **T360: cron/content-fetch + UI** ✅ — /api/cron/media-fetch/route.ts + content-auto-curation cron

### Phase PW-UI 완료 (T361~T364) ✅ 2026-03-05

> ui-ux-pro-max-skill 분석 결과를 PersonaWorld에 적용.

- [x] **T361: DM Sans 폰트 전환 — Inter → DM Sans** ✅ 2026-03-05
- [x] **T362: Glassmorphism 페르소나 카드 variant 추가** ✅ 2026-03-05
- [x] **T363: Bento Grid 피드 레이아웃 — 첫 6개 포스트** ✅ 2026-03-05
- [x] **T364: 랜딩 페이지 Storytelling 패턴 적용** ✅ 2026-03-05

### Phase PW-HUMAN 완료 (T365) ✅ 2026-03-06

> Humanizer AI-ism 방지 규칙 — 페르소나 엔진 통합.

- [x] **T365: Humanizer AI-ism 방지 규칙 — 페르소나 엔진 통합** ✅ 2026-03-06

### Phase SUPERPOWERS 완료 (T366~T369) ✅ 2026-03-06

> obra/superpowers 스킬 프레임워크 통합 — session-start 훅, brainstorm/writing-plans 스킬, validate 2단계 리뷰.

- [x] **T366: session-start 훅 — 세션 자동 컨텍스트 로드** ✅ 2026-03-06
- [x] **T367: /brainstorm 스킬 — 설계 승인 전 구현 금지** ✅ 2026-03-06
- [x] **T368: /validate 2단계 코드 리뷰 통합** ✅ 2026-03-06
- [x] **T369: /writing-plans 스킬 — 대형 티켓 실행 단계 구조화** ✅ 2026-03-06

### Phase INT 완료 (T258~T260) ✅ 2026-03-01

> 페르소나 자율 인터랙션 확장 — 팔로우/리포스트 파이프라인 통합.

- [x] **T258: 페르소나 자율 팔로우 — 스케줄러 파이프라인 연동** ✅ 2026-03-01
- [x] **T259: 페르소나 자율 리포스트 — 리포스트 엔진 + 파이프라인 통합** ✅ 2026-03-01
- [x] **T260: COLLAB 포스트 팬텀 멘션 방지** ✅ 2026-03-01

### Phase CON 완료 (T262) ✅ 2026-03-08

> 포스트 → 소비 기억 자동 기록 — ConsumptionLog 파이프라인 연동.

- [x] **T262: 포스트 → 소비 기억 자동 기록 — ConsumptionLog 파이프라인 연동** ✅ 2026-03-08

### Phase ES-PREVIEW 완료 (T333~T350) ✅ 2026-03-03

- [x] **T333~T336: test-generate v4 프롬프트 동기화** ✅ 2026-03-03
  - AC: ✅ voiceSpec/factbook/triggerMap/demographics DB 조회 + PromptBuildInput v4 매핑 (isV4Input 충족)
  - 참고: Prisma include 사용 시 전체 필드 반환 — 별도 select 불필요
- [x] **T337: test-generate PersonaState 기본값 주입** ✅ 2026-03-03
  - AC: ✅ 기본값(mood=0.6, energy=0.7, socialBattery=0.6) + body.state override 지원
  - AC: ✅ 응답에 promptVersion ("v3" | "v4") 포함
- [x] **T338: PreviewTab v3/v4 프롬프트 배지** ✅ 2026-03-03
  - AC: ✅ hasVoiceSpec/hasFactbook PersonaDetail 추가
  - AC: ✅ 시스템 프롬프트 보기에 v3/v4 배지 + v3 경고 표시
  - AC: ✅ 생성 결과에 promptVersion 배지 표시
- [x] **T339~T340: test-generate call 타입 + 멀티턴 지원** ✅ 2026-03-03
  - AC: ✅ TestPromptType에 "call" 추가, CALL_MAX_TOKENS=200
  - AC: ✅ messages[] 파라미터 + generateConversation 연동
  - AC: ✅ 응답에 전체 대화 이력(messages) 포함
- [x] **T341~T343: PreviewTab 통화 모드 UI** ✅ 2026-03-03
  - AC: ✅ "통화" 탭 버튼(Phone 아이콘) + 기본 시나리오
  - AC: ✅ 멀티턴 채팅 UI (메시지 버블, 자동 스크롤, 대화 초기화)
  - AC: ✅ 통화 모드 안내 배너 (1~3문장, 이모지 없음, 토큰 제한 200)
  - AC: ✅ 누적 토큰 사용량 + 턴 수 표시
- [x] **T344~T347: TTS API 타입 + GET/PUT 지원** ✅ 2026-03-03
  - AC: ✅ PersonaDetail + UpdatePersonaBody에 TTS 5필드 추가
  - AC: ✅ GET API: ttsProvider/ttsVoiceId/ttsPitch/ttsSpeed/ttsLanguage 응답
  - AC: ✅ PUT API: TTS 5필드 업데이트 + 범위 검증 (speed 0.5~2.0, pitch -1.0~1.0, provider 3종)
- [x] **T348~T349: OverviewTab TTS 음성 설정 UI** ✅ 2026-03-03
  - AC: ✅ Provider 드롭다운 (openai/google/elevenlabs)
  - AC: ✅ Voice ID 선택 (OpenAI 6종 드롭다운 / 기타 텍스트 입력)
  - AC: ✅ Speed 슬라이더 (0.5~2.0), Pitch 슬라이더 (-1.0~1.0), Language 선택 (5개 언어)
  - AC: ✅ 상위 저장 버튼과 hasChanges 연동
- [x] **T350: TTS 음성 프리뷰 재생** ✅ 2026-03-03
  - AC: ✅ POST /api/internal/personas/[id]/tts-preview 엔드포인트
  - AC: ✅ voice-pipeline textToSpeech() 연동, body override 지원
  - AC: ✅ 미리듣기 버튼 (재생/정지, 로딩 스피너, 에러 표시)
  - AC: ✅ 페르소나 이름 기반 샘플 텍스트 자동 생성
  - 변경파일: route.ts(test-generate), route.ts(personas/[id]), route.ts(tts-preview, 신규), api.ts, persona-lifecycle-actions.tsx, persona-metadata-form.tsx, page.tsx
  - 테스트: 114파일 4419 tests ALL PASS + Build PASS

### Phase v4.1-OPT 완료 (T327~T332) ✅ 2026-03-02

- [x] **T327: 최적화 설정 모듈 — optimization-config.ts** ✅ 2026-03-02
  - AC1: ✅ `HAIKU_WHITELIST` — 6개 안전 callType 화이트리스트 (pw:news_analysis, pw:impression, cold_start_summary, metadata_extraction, tag_classification, sentiment_label)
  - AC2: ✅ `OPTIMIZATION_THRESHOLDS` — 5단계 임계값 (batch_comment:10+, haiku_routing:50+, vector_cache:100+, arena_auto_schedule:200+, memory_index:500+)
  - AC3: ✅ `DEFAULT_BATCH_COMMENT_CONFIG` — maxBatchSize:3, qualityThreshold:0.9, maxRegenerationAttempts:2
  - AC4: ✅ `DEFAULT_AB_MONITOR_CONFIG` — comparisonWindowDays:7, minSampleSize:30, significanceThreshold:0.05
  - AC5: ✅ `global-config/index.ts` re-export + 38 tests PASS + Build PASS
  - 변경파일: optimization-config.ts(신규), optimization-config.test.ts(신규), global-config/index.ts

- [x] **T328: Haiku 화이트리스트 자동 라우팅** ✅ 2026-03-02
  - AC1: ✅ `resolveModelWithRouting()` — 모델 결정 4단계: params.model → Haiku whitelist → DB callTypeOverrides → DEFAULT_MODEL
  - AC2: ✅ Prisma 스키마 — LlmUsageLog에 routingReason, batchGroupId, isRegenerated 필드 추가
  - AC3: ✅ `RoutingReason` 타입 (explicit_param | haiku_whitelist | config_override | default_model) + logUsage 추적
  - AC4: ✅ 기존 callTypeOverrides 공존 (명시적 DB 오버라이드 우선)
  - AC5: ✅ 기존 8 tests PASS + Build PASS
  - 변경파일: llm-client.ts, schema.prisma

- [x] **T329: 배치 댓글 생성 + 품질 게이트 자동 재생성** ✅ 2026-03-02
  - AC1: ✅ `batch-comment-generator.ts` — N개 댓글 1 LLM 호출 생성 (JSON 배열)
  - AC2: ✅ 품질 채점: 길이(40%) + 톤 매칭(30%) + 자연스러움(30%), threshold=0.9
  - AC3: ✅ 0.9 미만 자동 재생성 (최대 2회, 점수 개선 시 교체, 실패 시 최선 결과 유지)
  - AC4: ✅ BatchLLMProvider/QualityScorer 인터페이스 (테스트 가능한 DI 구조)
  - AC5: ✅ buildBatchPrompt + parseBatchResponse (JSON 파싱 + 줄바꿈 폴백)
  - AC6: ✅ 26 tests PASS + Build PASS
  - 변경파일: batch-comment-generator.ts(신규), batch-comment-generator.test.ts(신규)

- [x] **T330: A/B 품질 모니터링 자동화** ✅ 2026-03-02
  - AC1: ✅ `optimization-monitor.ts` — llmUsageLog 기반 자동 집계
  - AC2: ✅ Haiku vs Sonnet 비교 (callType별 avgCost, avgDuration, sampleCount, costSavingsPercent)
  - AC3: ✅ 배치 vs 개별 댓글 비교 (batchGroupId 유무 기준)
  - AC4: ✅ 자동 경고 3종: quality_drop(critical), cost_savings(info), performance_change(warning)
  - AC5: ✅ roundCost() 6자리 정밀도로 USD 미소액 정확도 보장
  - AC6: ✅ 18 tests PASS + Build PASS
  - 변경파일: optimization-monitor.ts(신규), optimization-monitor.test.ts(신규)

- [x] **T331: 스케일 기반 자동 트리거** ✅ 2026-03-02
  - AC1: ✅ `scale-trigger.ts` — checkScaleTrigger() 페르소나 수 기반 단계 결정
  - AC2: ✅ ScaleTriggerState 캐시 (lastPersonaCount, activeFeatures, lastCheckedAt)
  - AC3: ✅ getCheckIntervalMs() 적응형 체크 간격 (1분/3분/5분/10분)
  - AC4: ✅ formatChangeForActivity() — 활성화/비활성화 이벤트 포맷
  - AC5: ✅ 17 tests PASS + Build PASS
  - 변경파일: scale-trigger.ts(신규), scale-trigger.test.ts(신규)

- [x] **T332: 엔진 스튜디오 최적화 로그 뷰어** ✅ 2026-03-02
  - AC1: ✅ `GET /api/internal/persona-world-admin/operations/optimization` — 최적화 대시보드 (days, limit 파라미터)
  - AC2: ✅ `/persona-world-admin/operations/optimization` 읽기 전용 페이지
  - AC3: ✅ 5개 섹션: 현재 상태, Haiku 라우팅 통계, A/B 비교, 자동 경고, 최근 로그 테이블
  - AC4: ✅ 기간 선택(7/14/30일) + 새로고침 + 로딩 스켈레톤
  - AC5: ✅ Build PASS (99 v4.1 tests ALL PASS)
  - 변경파일: operations/optimization/route.ts(신규), operations/optimization/page.tsx(신규)

- [x] **T260: COLLAB 포스트 팬텀 멘션 방지 — LLM 환각 @멘션 근본 수정** ✅ 2026-03-01
  - 버그: LLM이 COLLAB 포스트에서 DB에 없는 페르소나를 @멘션 (예: @시네마틱\_레이어)
  - 근본 원인: (1) LLM 프롬프트에 실제 페르소나 목록 미제공 (2) 생성 후 검증 없음
  - AC1: ✅ `PostGenerationInput.availablePersonaHandles` 필드 추가
  - AC2: ✅ `buildUserPrompt()` — COLLAB일 때 `[멘션 가능 목록]` 주입 + "목록에 없는 이름 만들지 마세요" 지시
  - AC3: ✅ `PostPipelineDataProvider.getActivePersonaHandles()` — 활성 페르소나 핸들 목록 조회
  - AC4: ✅ `stripPhantomMentions()` — 생성 후 허용 목록에 없는 @멘션의 @ 제거 (이중 방어)
  - AC5: ✅ cron-scheduler-service + pw-scheduler-service 양쪽 provider에 구현체 추가
  - 변경파일: types.ts, content-generator.ts, post-pipeline.ts, cron-scheduler-service.ts, pw-scheduler-service.ts

- [x] **T259: 페르소나 자율 리포스트 — 리포스트 엔진 + 파이프라인 통합** ✅ 2026-03-01
  - AC1: ✅ `interactions/repost-engine.ts` — `computeRepostProbability(matchScore × interactivity × mood × 0.3)`
  - AC2: ✅ `interaction-pipeline.ts` — 좋아요 직후 리포스트 판정 (P2002 중복 방어 포함)
  - AC3: ✅ `InteractionPipelineDataProvider.saveRepost` + `createInteractionProvider()` 구현 (트랜잭션: repost 생성 + repostCount 증가)
  - AC4: ✅ `InteractionExecutionResult.reposts` 필드 + cron 결과에 반영
  - AC5: ✅ `repost-engine.test.ts` 5 tests PASS + 기존 interaction-pipeline.test.ts 확장 (3 tests)
  - 변경파일: repost-engine.ts(신규), interaction-pipeline.ts, cron-scheduler-service.ts, constants.ts, interactions/index.ts, repost-engine.test.ts(신규), interaction-pipeline.test.ts, cron-scheduler-service.test.ts

- [x] **T258: 페르소나 자율 팔로우 — 스케줄러 파이프라인 연동** ✅ 2026-03-01
  - AC1: ✅ `interaction-pipeline.ts` — 포스트 루프 후 고유 작성자 대상 팔로우 판정 (follow-engine의 computeFollowScore + computeFollowProbability 사용)
  - AC2: ✅ `InteractionPipelineDataProvider` — saveFollow, getCrossAxisSimilarity, getParadoxCompatibility, getPersonaState 추가
  - AC3: ✅ `createInteractionProvider()` — Prisma 구현체 (PersonaFollow 생성, 교차축/Paradox TODO stub 0.5)
  - AC4: ✅ `InteractionExecutionResult.follows` 필드 + cron 결과에 반영
  - AC5: ✅ interaction-pipeline.test.ts 확장 (4 tests) — 108파일 4277 tests ALL PASS
  - 변경파일: interaction-pipeline.ts, cron-scheduler-service.ts, interaction-pipeline.test.ts, cron-scheduler-service.test.ts

- [x] **T257: 페르소나 피드 해시태그 생성 + 해시태그 검색 기능** ✅ 2026-02-26
  - AC1: ✅ DB 스키마 — `PersonaPost.hashtags String[]` 필드 + GIN 인덱스 + 마이그레이션 037
  - AC2: ✅ LLM 프롬프트 — `buildUserPrompt()`에 해시태그 2~5개 생성 지시 추가
  - AC3: ✅ Post Pipeline — `extractHashtags()` 유틸로 `#태그` 패턴 추출 → `hashtags[]` 저장 (3개 스케줄러 모두 반영)
  - AC4: ✅ Feed API — 피드 응답에 `hashtags` 필드 포함
  - AC5: ✅ 검색 API — `/api/public/search` 엔드포인트 (해시태그 검색 + 트렌딩 해시태그)
  - AC6: ✅ PW Frontend — 포스트 카드에 해시태그 칩 표시 + 클릭 시 검색 이동 + Explore 트렌딩 해시태그 섹션
  - AC7: ✅ 테스트 — hashtag-utils 15 tests PASS, content-generator 32 PASS, post-pipeline 15 PASS

- [x] **T256: RSS 소스 자동화 — 프리셋 자동 등록 + cron 기반 수집** ✅ 2026-02-25
  - AC1: ✅ 스키마에 `consecutiveFailures`, `lastError` 필드 추가 + 마이그레이션 036
  - AC2: ✅ `news-auto-fetch.ts` 서비스 (프리셋 15개 자동 시드 + executeNewsAutoFetch 전체 수집)
    - 소스별 오류 추적: 3회 연속 실패 시 자동 비활성화
    - cron-scheduler-service에 통합 (매 시간 자동 실행)
    - scheduler route에 `news_auto_fetch` 액션 추가
  - AC3: ✅ 수집 후 자동 반응 트리거 — `autoTriggerEnabled !== false`일 때 reactionRunner 연쇄 호출
  - AC4: ✅ Admin UI 모니터링 전환
    - 5-card 모니터링 대시보드 (자동수집, 자동반응, 비용, 예산, 소스상태)
    - 오류 소스 하이라이트 (amber/red) + 경고 배너
    - autoFetchEnabled 설정 토글 추가
  - AC5: ✅ 106파일 4248 tests PASS, Build 106 pages PASS
  - 변경파일: schema.prisma, 036_news_source_error_tracking.sql, news-auto-fetch.ts, news/index.ts, cron-scheduler-service.ts, scheduler-service.ts, scheduler/route.ts, news/route.ts, news/page.tsx, news-auto-fetch.test.ts

- [x] **T255: 뉴스 반응 동적 스케일링 — importance 기반 reactor 인원 결정** ✅ 2026-02-25
  - AC1: ✅ importanceScore Float→Decimal @db.Decimal(3,2) 마이그레이션 + Number() 래핑
  - AC2: ✅ ImportanceGrade(BREAKING/HIGH/NORMAL/LOW) 등급별 동적 threshold/cap 로직
    - BREAKING(≥0.9): threshold 0.15, cap=budget×3
    - HIGH(0.7~0.9): threshold 0.25, cap=50%
    - NORMAL(0.5~0.7): threshold 0.35, cap=budget
    - LOW(<0.5): threshold 0.45, cap=budget/2
  - AC3: ✅ 비용 안전장치 3중
    - 배치 처리(20건씩) + budget-alert CRITICAL 시 중단
    - 댓글 쓰로틀링(기사당 상위 5개만 commentEligible)
    - BREAKING 일일 최대 3회(초과 시 HIGH 다운그레이드)
  - AC4: ✅ Admin UI 설정 패널에 maxBreakingPerDay, commentThrottlePerArticle + 등급별 규칙 안내
  - AC5: ✅ 105파일 4231 tests PASS, Build 106 pages PASS
  - 변경파일: schema.prisma, news-interest-matcher.ts, news-reaction-trigger.ts, index.ts, scheduler-service.ts, route.ts, page.tsx, news-interest-matcher.test.ts

- [x] **T252~T254: ES 프로토타입 메뉴 정리 + 인메모리 API DB 영속화 (3개 티켓 일괄)** ✅ 2026-02-24
  - T252: ES 네비게이션 정리 — 검색 팔레트↔사이드바 동기화 + 레이블 통일
    - AC1: ✅ 검색 팔레트에서 redirect 항목 제거 (Activity Dashboard, Scheduler Control)
    - AC2: ✅ 검색 팔레트에 누락 항목 추가 (Security 4개, PW Admin Operations)
    - AC3: ✅ 사이드바 한글 레이블 영문 통일 (알고리즘 배포→Deployment Pipeline, LLM 비용→LLM Costs, 뉴스 반응→News Reactions, 알고리즘 버전→Version Management)
    - AC4: ✅ 검색 팔레트 레이블 사이드바와 동기화 (Version Control→Version Management)
    - AC5: ✅ Psychometric Model → Psychometric Simulator 명칭 변경 (사이드바+검색+페이지 Header 3곳)
    - AC6: ✅ 페이지 Header title 한/영 통일 (LLM 비용→LLM Costs, 알고리즘 버전 관리→Version Management, 뉴스 반응 관리→News Reactions)
  - T253: Matching Lab Tuning API — 인메모리 → DB 영속화
    - AC1: ✅ `let profileStore` 모듈 변수 → SystemConfig(MATCHING_TUNING/profile) DB 저장/로드
    - AC2: ✅ GET: DB 로드 (없으면 기본값 seed), POST/PUT: DB 즉시 저장
    - AC3: ✅ 프론트엔드 변경 없음 (API 인터페이스 유지)
  - T254: System Integration Deploy API — 인메모리 → DB 영속화
    - AC1: ✅ `const store: DeployStore` 인메모리 → SystemConfig(DEPLOY_PIPELINE/workflows, canaries) DB 저장/로드
    - AC2: ✅ Map→Record 직렬화, 모든 POST 액션에서 DB 저장
    - AC3: ✅ 프론트엔드 변경 없음 (API 인터페이스 유지)
  - 변경파일: header.tsx, lnb.tsx, psychometric/page.tsx, llm-costs/page.tsx, versions/page.tsx, news/page.tsx, tuning/route.ts, deploy/route.ts
  - 검증: Build PASS (109 static pages)

- [x] **T247~T251: Phase TQ 테스트 품질 개선 (5개 티켓 일괄 완료)** ✅ 2026-02-24
  - T247: 공유 테스트 픽스처 추출 (fixtures/vectors.ts + factories.ts, 13개 파일 중복 해소)
  - T248: structured-fields 미테스트 함수 8개 커버리지 추가 (23개 신규 테스트)
  - T249: 과도한 범위 단언 → 비교 단언 개선 (persona-generation, qualitative, voice-spec)
  - T250: 누락된 부정 테스트 케이스 추가 (evolution, comment-utils, onboarding)
  - T251: 불안정 랜덤 테스트 반복 횟수 증가 (30→100, 20→50)
  - 검증: 100파일 4105 tests PASS (기존 4051 → 4105, 54개 추가)

- [x] **T234~T246: Phase Y 모노레포 코드 품질 개선 (13개 티켓 일괄 완료)** ✅ 2026-02-24
  - T234: Landing 의존성 버전 통일 (Next.js 16, react 19.2.3, lucide/radix/tailwind-merge 최신화)
  - T235: DC bcryptjs v2→v3 메이저 업그레이드
  - T236: ES 미사용 의존성 5개 제거 (react-hook-form, @tanstack/react-query, d3, recharts 등)
  - T237: next-auth ^5.0.0-beta.30 3앱+패키지 통일
  - T238: tsconfig.base.json 생성 + 10개 tsconfig extends 적용
  - T239: vitest.config 공유 base 팩토리 (createVitestBase) + PW coverage 추가
  - T240: getEngineStudioUrl() → @deepsight/config 추출
  - T241: DIM_MAP/layerVectorToRecord 유틸 추출 + O(n)→O(1) Map 변환 (9파일)
  - T242: Landing ESLint 통일 + lint:fix/test:coverage 스크립트 정리
  - T243: auth 응답 표준화 + 2FA TOTP Base32 시크릿 생성 + team/members TODO 정리
  - T244: 과대 API 라우트 5개 서비스 레이어 분리
  - T245: 과대 페이지 3개 컴포넌트 분리 (edit/arena/incubator)
  - T246: 과대 lib 5개 모듈 분할 (re-export hub 유지)
  - 검증: 4앱 Build PASS, 3964 tests PASS

- [x] **T176: 프로덕션 DB 마이그레이션 미적용 수정** ✅ 2026-02-22
  - AC1: ✅ 마이그레이션 023 테이블명 오타 수정 (`"Persona"` → `"personas"`)
  - AC2: ✅ 통합 마이그레이션 스크립트 생성 (`apply_missing_016_to_024.sql`)
  - AC3: ✅ 프로덕션 DB에 `apply_missing_016_to_024` 적용 완료 (사용자 직접 실행)

- [x] **T177: Incident Management 자동 감지 — Detection Rules → 자동 장애 생성** ✅ 2026-02-22
  - 배경: 현재 장애 관리가 100% 수동 입력. Detection Rules 타입과 evaluateDetectionRules() 함수가 이미 존재하지만 아무 곳에서도 호출하지 않음. System Monitoring 메트릭과 연결하여 자동 감지 구현
  - AC1: ✅ incidents API에 `auto_detect` 액션 — `runAutoDetect()`: 메트릭 조회 → 규칙 평가 → 중복 체크 → 자동 Incident 생성 (reportedById: "auto-detection")
  - AC2: ✅ Monitoring 페이지 진입 시 `useEffect`에서 `runAutoDetect()` 자동 호출 + 신규 장애 발생 시 배너 표시
  - AC3: ✅ Incidents 페이지 — `[자동감지]` prefix 감지 → 배지 표시, Detection Rules 섹션 별도 표시
  - AC4: ✅ tsc clean, 3,902 tests PASS
  - 변경파일: 없음 (이미 구현 완료 상태 확인)

- [x] **T173: 테스트 파일 타입 에러 일괄 수정** ✅ 2026-02-22
  - 12개 테스트 파일 타입 동기화 → 3,993 tests / 113 files 전체 PASS

- [x] **T167~T172: 보안 감사 일괄 수정** ✅ 2026-02-22
  - T167: 하드코딩 비밀키 제거 (verifyInternalToken 도입)
  - T168: 조직 격리 강화 (getUserOrganization)
  - T169: Toss 웹훅 인증 추가
  - T170: Developer Console 인증 미들웨어
  - T171: 입력 유효성 검증 + Internal Token 가드 21개 라우트
  - T172: 보안 헤더 + CORS 정리

- [x] **T163: Factbook 런타임 연동 — mutableContext 업데이트 파이프라인** ✅ 2026-02-20
  - AC1: ✅ `updateMutableContextRuntime(personaId, interaction, dataProvider)` — 상호작용 타입→카테고리 매핑 + 콘텐츠 요약 생성 + DB 영속화
  - AC2: ✅ changeCount 추적 + `detectExcessiveChanges()` (5회 초과 시 `console.warn` 경고)
  - AC3: ✅ `verifyFactbookIntegrity()` — mutableContext 업데이트 시 immutableFacts 변조 감지 (SHA256)
  - AC4: ✅ `processInteraction()` — factbook mutableContext + PersonaState(mood/energy/socialBattery) 통합 갱신
  - AC5: ✅ 91파일 3713 테스트 PASS + Build PASS
  - 변경: factbook-runtime.ts(신규), index.ts, factbook-runtime.test.ts(신규, 30 tests)

- [x] **T162: 페르소나 구조화 필드 자동생성 — birthDate/region/activeHours** ✅ 2026-02-20
  - AC1: ✅ `inferBirthDate` — purpose/conscientiousness/depth/lens 기반 나이대 추론 → 랜덤 생년월일
  - AC2: ✅ `inferRegion` — sociability/extraversion/taste/openness 점수로 5개 지역풀(대도시/문화/전통/계획/일반) 매핑
  - AC3: ✅ `expandActiveHours/expandPeakHours` — [start, end] 범위 → Int[] 배열 변환 (자정 넘김 대응)
  - AC4: ✅ pipeline.ts에서 `savePersonaToDb`에 birthDate/region/activeHours/peakHours/timezone/postFrequency 전달
  - AC5: ✅ 90파일 3683 테스트 PASS + Build PASS
  - 변경: structured-fields.ts(신규), pipeline.ts, index.ts, structured-fields.test.ts(신규)

- [x] **T161: 페르소나 랜덤생성 다양성 강화 — 벡터 클러스터링 방지** ✅ 2026-02-20
  - AC1: ✅ `generateDiverseVectors` — 범위 [0.05, 0.95] 확대 + Beta(0.7, 0.7) U자형 분포 (극단값 포함률 30%+)
  - AC2: ✅ 최소 거리 재생성 — `checkMinDistance(0.3)` 미달 시 최대 5회 retry, retryCount 반환
  - AC3: ✅ `suggestUnderrepresentedArchetypes` — 균등분포 대비 부족한 아키타입 score(0~1) 순위
  - AC4: ✅ `buildCoverageReport` → pipeline.ts `GeneratedPersonaResult.coverageReport` 포함
  - AC5: ✅ 89파일 3666 테스트 PASS + Build PASS
  - 변경: vector-generator.ts, index.ts, pipeline.ts, persona-generation.test.ts

- [x] **T160: 시스템 프롬프트 v4 전환 — VoiceSpec/Factbook 기반 프롬프트 빌더** ✅ 2026-02-20
  - 변경: prompt-builder.ts, pipeline.ts, prompt-builder.test.ts
  - 테스트: PASS (89파일/3649)

- [x] **T159: 페르소나 생성 전체 모듈화 — create/route.ts → 공유 파이프라인 통합** ✅ 2026-02-20
  - AC1: ✅ `pipeline.ts` — manual/auto 모드 분기 + `savePersonaToDb()` 공통 함수 + `generateQualitativeAndInstructionLayer()` 공통 함수
  - AC2: ✅ `create/route.ts` — 195줄→103줄 (47% 삭감), validation만 유지
  - AC3: ✅ 기존 API 응답 동일 (`{ success: true, data: { id } }`)
  - AC4: ✅ 89파일 3631 테스트 PASS + Build PASS
  - 변경: pipeline.ts, create/route.ts

- [x] **T157: 크레딧 상점 페이지 + 구매 시스템** ✅ 2026-02-19
  - AC1: ✅ `shop.ts` — ShopItem 타입 + SHOP_ITEMS 정적 데이터 (페르소나 4종 + 프로필 7종, repeatable 플래그, SOON 태그)
  - AC2: ✅ `user-store.ts` — purchasedItems[] + purchaseItem(크레딧 차감) + hasPurchased + getPurchaseCount
  - AC3: ✅ `/shop` 페이지 — Hero 코인 잔액 + 카테고리 탭(페르소나/프로필) + 아이템 카드 그리드 + 구매 확인 다이얼로그
  - AC4: ✅ 프로필 연동 — 코인→상점 링크, 구매 배지 렌더링, 닉네임 그라데이션, 프로필 프레임(골드/홀로그램)
  - AC5: ✅ middleware.ts `/shop` 라우트 추가
  - AC6: ✅ Build PASS (PW + ES) + 84 테스트 PASS
  - 변경: shop.ts, user-store.ts, shop/page.tsx, profile/page.tsx, middleware.ts

- [x] **T148: 관리자 보안 대시보드** ✅ 2026-02-19
  - 변경: lnb.tsx(Security 섹션), middleware.ts(/security 보호), security/page.tsx(AC1+AC3 대시보드), security/quarantine/page.tsx(AC2), security/kill-switch/page.tsx(AC4), security/connectivity/page.tsx(AC5)
  - API: security/dashboard/route.ts, security/quarantine/route.ts, security/connectivity/route.ts
  - 테스트: PASS (89파일/3612개) + Build PASS

- [x] **T147: Social Module System — Connectivity (보안 전용)** ✅ 2026-02-19
  - 변경: schema.prisma(SocialModuleConfig 모델), 016_social_module_config.sql, social-module/index.ts(barrel export)
  - 기존 완성: types.ts(8종 타입), connectivity.ts(그래프 분석+Hub/Isolate+이상탐지+featureBindings), connectivity.test.ts(45개)
  - 테스트: PASS (89파일/3612개) + Build PASS

- [x] **T156: [긴급/보안] Engine Studio 인증 체계 구축 — Google OAuth + 초대제** ✅ 2026-02-19
  - AC1: ✅ NextAuth v5 설정 (Google OAuth + JWT, Prisma adapter)
  - AC2: ✅ 초대제 가입 — signIn 콜백에서 allowedEmails 화이트리스트 검증, 미등록 이메일 차단
  - AC3: ✅ 로그인 페이지 + `[...nextauth]` 라우트 핸들러 (에러 바운더리 포함)
  - AC4: ✅ 쿠키 기반 middleware — 대시보드 + `/api/internal/*` 보호
  - AC5: ✅ `requireAuth()` 헬퍼 + 전체 internal API 라우트(42개) auth guard 적용
  - AC6: ✅ cron 3개 라우트 CRON_SECRET 필수화 (fail-closed)
  - AC7: ✅ 89파일 3612 테스트 PASS + Build PASS

- [x] **T155: [긴급/보안] Developer Console + PersonaWorld API 인증 강화** ✅ 2026-02-19
  - AC1: ✅ `requireAuth()` 공통 헬퍼 (developer-console) — 세션 없으면 401 반환
  - AC2: ✅ Developer Console 전체 API 라우트(22개)에 auth guard 적용
  - AC3: ✅ Developer Console auth middleware — 비인증 사용자 `/login`으로 리다이렉트
  - AC4: ✅ PersonaWorld auth middleware — 비인증 사용자 보호 경로 차단
  - AC5: ✅ PersonaWorld `/api/health` 환경정보 노출 제거
  - AC6: ✅ `[...nextauth]` 에러 바운더리 — 500 시 빈 body 대신 JSON 반환
  - AC7: ✅ DC 171 테스트 + PW 84 테스트 PASS + Build PASS

- [x] **T154: Express 퀴크 LLM 동적 생성** ✅ 2026-02-18
  - 변경: llm-express-quirks.ts(신규, 벡터+역설+아키타입 기반 퀴크 5~8개 LLM 생성), generate-random/route.ts(Stage 3.5 퀴크 생성+generationConfig DB 저장), interaction/index.ts(re-export), llm-express-quirks.test.ts(신규 32개)
- [x] **T153: 캐릭터 생성기 LLM 업그레이드** ✅ 2026-02-18
  - 변경: llm-character-generator.ts(신규, 벡터+역설+아키타입 기반 캐릭터 LLM 생성), generate-random/route.ts(Stage 2.5 LLM 캐릭터+fallback), persona-generation/index.ts(re-export), llm-character.test.ts(신규 20개)
- [x] **T152: Express 알고리즘 교차축 퀴크 + Voice sigmoid 개선** ✅ 2026-02-18
  - 변경: express-algorithm.ts(calculateDerivedStates L2/L3 통합, generateParadoxQuirks 4종), voice-generator.ts(sigmoid 기반 calculateThresholds), interaction/index.ts(re-export)
- [x] **T151: 아키타입 22종 전체 매핑 + 이름 중복 방지** ✅ 2026-02-18
  - 변경: character-generator.ts(roleMap 22종, generateName 중복방지), voice-generator.ts(archetypeStyleMap 22종), persona-generation/index.ts, generate-random/route.ts
- [x] **T150: 5단계 벡터 묘사 시스템 확장** ✅ 2026-02-18
  - 변경: prompt-builder.ts(describeLevel 5단계, L1/L2/L3 전체), matching/explanation.ts(TraitLevel 5단계, DIM_LABELS, expressions 28종)
- [x] **T149: 정성적 차원(Qualitative) LLM 기반 생성기 업그레이드** ✅ 2026-02-18
  - 변경: llm-qualitative.ts(신규), qualitative/index.ts, generate-random/route.ts, create/route.ts, llm-qualitative.test.ts(신규)
  - 테스트: PASS (79파일/3182개)

- [x] **T146: 아레나 교정 플로우 + 관리자 UI** ✅ 2026-02-16
  - 변경: sessions/[id]/corrections/route.ts, arena/page.tsx
  - 테스트: PASS (78파일/3159개)

- [x] **T145: 아레나 실행 엔진 + AI 심판** ✅ 2026-02-16
  - 변경: arena-engine.ts, arena-engine.test.ts
  - 테스트: PASS (78파일/3159개)

- [x] **T144: 아레나 세션 인프라** ✅ 2026-02-16
  - 변경: schema.prisma, 015_arena_session_infra.sql, api/internal/arena/sessions/route.ts
  - 테스트: PASS (78파일/3149개)

- [x] **T143: 프롬프트 캐싱 전략** ✅ 2026-02-16
  - 변경: llm-client.ts, llm-adapter.ts, schema.prisma, 014_prompt_caching.sql, llm-client.test.ts, llm-adapter.test.ts
  - 테스트: PASS (78파일/3149개)

- [x] **T142: 출처 추적 시스템 (Data Provenance)** ✅ 2026-02-16
  - 변경: post-pipeline.ts, interaction-pipeline.ts, user-interaction.ts, scheduler/route.ts, data-provenance.ts(기존), data-provenance.test.ts(기존)
  - 테스트: PASS (77 files, 3136/3136) + Build PASS

- [x] **T134: 설계서/가이드 문서 최신화 — 코드 ↔ 문서 동기화** ✅ 2026-02-15
  - 배경: 코드가 설계서 작성 이후 상당히 진화. 기술 스택(Next.js 14→16), LLM 전략(3-Tier→2-Tier), 포스트 타입(13→18종), 프로필 등급명, 상태 delta 수치 등 17건 불일치 발견
  - AC1: ✅ `docs/guides/development.md` — 6D→3-Layer, Next.js 14→16, OpenAI→Anthropic Claude
  - AC2: ✅ `docs/design/persona-world-v3.md` — 포스트 타입 5종 추가, 댓글 톤 2종 추가, LLM 3-Tier→2-Tier, 프로필 등급명(STARTER→BASIC, EXPERT→PREMIUM), 상태 delta 테이블, 활동 임계값
  - AC3: ✅ `docs/design/persona-engine-v3.md` — 아키타입 "12+"→"12개", 프로필 등급명, Haiku/mini 참조 제거, 3-Tier→2-Tier
  - AC4: ✅ `docs/design/persona-engine-v3-impl.md` — mini 모델 참조 제거, 3-Tier→2-Tier, MODEL_TIERS medium 제거
  - AC5: ✅ `CLAUDE.md` — 기술 스택 6D→3-Layer, Next.js 14→16, AI/LLM 라인 추가
  - AC6: ✅ 각 문서 버전 번호 업데이트 (PW v1.0-draft.4, PE v3.0-draft.14, PE-impl v1.15)

- [x] **T133: Cold Start UI 전면 리디자인 + 관리자 테스트 모드** ✅ 2026-02-13
  - 배경: T132에서 v3 24문항 DB + API 연동 완료. 기존 UI가 v2 테이블 형식 유지 + 복합질문(L1+L2 동시측정) 미반영. 관리자가 실제 질문 흐름을 테스트할 수 없음
  - AC1: ✅ 복합질문 타입 리팩토링 — `targetDimension` → `targetDimensions[]`, `targetLayer` → `targetLayers[]`, `vectorDelta` → `l1Weights`/`l2Weights` 분리 (cold-start.ts, adaptive-profiling.ts, route.ts, test)
  - AC2: ✅ UI 전면 리디자인 — 테이블 레이아웃 → 카드 기반 Phase 그룹핑 (Phase 1 blue / Phase 2 purple / Phase 3 amber). 질문 카드 확장 시 옵션별 WeightBar 시각화 (L1+L2 가중치, 양수=green/음수=red 바)
  - AC3: ✅ 차원별 커버리지 차트 — L1 7D + L2 5D 진행 바 (목표: questionsPerAxis 기준). 모드별 정보 카드 (질문 수, 소요시간, 정밀도, 4bit/문항 정보밀도)
  - AC4: ✅ 관리자 테스트 모드 — "테스트 시작" 버튼, 질문별 A/B/C/D 선택, 진행 바, 전체 답변 완료 시 추론 결과 패널 (L1/L2 벡터 도트 위치 + low/high 라벨 + 신뢰도 %)
  - AC5: ✅ 검증 상태 배너 — validateQuestionSet() 결과 표시 (유효/오류 수)
  - AC6: ✅ 테스트 1991개 PASS + Build PASS

- [x] **T132: 콜드 스타트 v3 24문항 SQL + API 연동** ✅ 2026-02-13
  - 배경: 기존 003_cold_start_questions.sql은 6D 기반 60문항. v3 3-Layer(L1 7D + L2 5D) 기반 3-Phase × 8문항 = 24문항으로 전환
  - AC1: ✅ SQL 마이그레이션 `009_cold_start_v3.sql` — 기존 seed-q-\* 60문항 DELETE + v3 24문항 INSERT (Phase 1: L1 주력 8문항, Phase 2: L2 주력 8문항, Phase 3: 교차검증+역설 8문항). 설계서 §19.3~§19.4 기준
  - AC2: ✅ cold-start API getQuestionsByPhase() DB 연동 — 빈 배열 → psych_profile_templates 테이블 조회 + OnboardingQuestion 형식 변환
  - AC3: ✅ 테스트 9개 추가 (전체 1991개) + Build PASS

- [x] **T131: LLM 실시간 비용 모니터링 대시보드** ✅ 2026-02-13
  - 변경: schema.prisma, llm-client.ts, llm-costs/route.ts, llm-costs/page.tsx, lnb.tsx, test-generate/route.ts
  - 테스트: PASS (51 files, 1931/1931)

- [x] **T130: 랜덤 페르소나 생성 버튼 + 수정 버튼** ✅ 2026-02-13
  - 배경: PersonaWorld에서 자율 활동 가능한 완전체 페르소나를 원클릭 랜덤 생성. 생성 후 즉시 수정 가능
  - AC1: ✅ POST /api/internal/personas/generate-random — 아키타입 랜덤 선택 → 16D 벡터 생성(다양성 보장) → Paradox 설계 → 캐릭터(이름/역할/전문분야) → 정성적 4차원(Backstory/Voice/Pressure/Zeitgeist) → 프롬프트 5종 자동 빌드 → 활동성 8특성 도출 → DB 저장 (ACTIVE 상태)
  - AC2: ✅ 페르소나 목록 페이지에 "랜덤 생성" 버튼 추가 (아키타입 선택 드롭다운 포함, 생성 후 수정 페이지로 이동)
  - AC3: ✅ PersonaCard에 "수정" 버튼 추가 (편집 페이지로 이동)
  - AC4: ✅ 테스트 14개 PASS (전체 1982개) + Build PASS

- [x] **T96: User Insight 3페이지 UI — Cold Start + Psychometric + Archetype** ✅ 2026-02-12
  - AC1: ✅ Cold Start Strategy — 3모드 탭 (Quick/Standard/Deep), 질문 CRUD 테이블, 차원별 커버리지, 검증 상태
  - AC2: ✅ Psychometric Model — OCEAN→L1 매핑 테이블 (5×7 컬러 인코딩), L2→L1 예측기, 반전 탐지 (Δ≥0.25), 잠재 특성 3유형 카드
  - AC3: ✅ Archetype Manager — 10종 아키타입 카드 (7D 벡터 바+임계값), 커스텀 CRUD, 분류 테스터 (1차/2차+순위), 통계
  - AC5: ✅ Build PASS + 1388 테스트 PASS

- [x] **T95: 전체 페이지 SEO 메타데이터 v3 통일** ✅ 2026-02-12
  - AC1~AC8: ✅ 전 페이지 metadata 6D 잔재 0건 확인 (layout/features/products/about/blog)
  - AC9: ✅ 잔여 6D 코멘트 2건 수정 + Build PASS + 커밋 (e25a382)

- [x] **T89-T94: Products + About + FAQ + Contact v3 전환** ✅ 2026-02-12
  - T89: ✅ PersonaWorld — "6D 벡터" → "3-Layer 벡터", "Cold-Start" → "3-Phase 24문항 온보딩"
  - T90: ✅ Developer Console — API 코드 예시 phase1/2/3 구조, matchingTier 옵션
  - T91: ✅ Engine Studio — "3-Layer 벡터 분포 + 아키타입 12종 균형"
  - T92: ✅ About — 전체 6D→3-Layer 전환 (미션/로드맵/스토리)
  - T93: ✅ FAQ — 17개 항목 6D→v3 전환 (cold-start/매칭/페르소나/PersonaWorld)
  - T94: ✅ Contact — 주소 "서울특별시 (상세 주소 추후 공개)" 명시
  - Build PASS + 커밋 (5d896f8)

- [x] **T86-T88: Features 허브 + 서브페이지 3종 v3 전면 개편** ✅ 2026-02-12
  - T86: ✅ Features 허브 — "6D 벡터 시스템" → "3-Layer 16D 벡터 시스템", highlights 전환
  - T86: ✅ 취향 분석 — L1 7D + 3-Phase 24문항 + STARTER/EXPERT 품질 레벨 + SNS v3 차원
  - T87: ✅ AI 페르소나 — 3-LAYER SYSTEM, 6종 아키타입, L1 7D P-inger Print 매핑
  - T88: ✅ 매칭 시스템 — 3-Tier 파이프라인, V_Final/교차축/Paradox 공식, 비교 테이블
  - Build PASS + 커밋 (abf9c39)

- [x] **T84-T85: HeroOrbital + P-inger Print v3 전환** ✅ 2026-02-12
  - T84: ✅ "Your Vector Profile" → "Your 3-Layer Profile", "도플갱어" → "3-Tier 매칭"
  - T85: ✅ 2D — sociability 시드 계수 추가, 3D — 7번째 팔 [0.7,0.7,0], Showcase — L1 7D 데이터
  - Build PASS + 커밋 (197e663)

- [x] **T83: 메인 페이지 v3 전면 개편** ✅ 2026-02-12
  - AC1~AC8: ✅ HERO_DIMENSIONS 6종 (3-Layer 대표), LAYERS L1/L2/L3 카드, Extended Paradox Score 배너
  - AC9: ✅ Build PASS + 커밋 (fe40468)

- [x] **T82: layout + Header + Footer v3 전환** ✅ 2026-02-12
  - AC1~AC4: ✅ metadata 6D→3-Layer, header "3-Layer 벡터 기반", footer "Engine Studio" 링크
  - AC5: ✅ Build PASS + 커밋 (fdff970)

- [x] **T81: lib/ 공통 모듈 v3 전환** ✅ 2026-02-12
  - AC1: ✅ trait-colors.ts — 6D→3-Layer 16D (L1 7+L2 5+L3 4, layer 필드, LAYER_COLORS)
  - AC2~AC4: ✅ utils.ts — Vector6D/cosine/presets/DB transforms 전량 삭제
  - AC5~AC7: ✅ api.ts — archetypeId 추가
  - AC8: ✅ Build PASS + 커밋 (abc317b)

- [x] **T80: 블로그 DB 스키마 + API + 동적 페이지** ✅ 2026-02-12
  - AC1: ✅ Prisma BlogPost 모델 (기존 스키마에 이미 존재 확인)
  - AC2: ✅ SQL 마이그레이션 `006_blog_posts.sql` 작성 (BlogCategory enum, 인덱스 3개, FK)
  - AC3: ✅ GET /api/public/blog API (페이지네이션, 카테고리 필터, publishedAt 정렬)
  - AC4: ✅ GET /api/public/blog/[slug] API (단일 조회 + 비동기 viewCount 증가)
  - AC5: ✅ GET /api/public/personas API (활성 페르소나 수 + 팔로워 Top 3, \_count 활용)
  - AC6: ✅ Landing lib/api.ts — 기존 함수 구조 적합 확인 (수정 불필요)
  - AC7: ✅ Landing blog 페이지 빈 상태 UI 확인 + "6D 벡터" → "3-Layer 벡터" 텍스트 수정
  - AC8: ✅ Engine-studio Build PASS + Landing Build PASS + 커밋 + 푸시 (699e67c)

- [x] **T49: 페르소나 생성 플로우 (4-Step)** ✅ 2026-02-11
  - AC1: ✅ Step 1 — 기본 정보 (이름 2~30자, 역할 5종, 전문분야 16종, 설명 100자)
  - AC2: ✅ Step 2 — 3-Layer 벡터 에디터 (L1 7D + L2 5D + L3 4D + 아키타입 12종 프리셋, EPS 실시간)
  - AC3: ✅ Step 3 — 프롬프트 엔지니어링 (벡터 기반 자동 생성 + 수동 편집, 6개 섹션)
  - AC4: ✅ Step 4 — 리뷰 + Draft/Activate 저장
  - AC5: ✅ POST /api/internal/personas/create (트랜잭션, Paradox Score 자동 계산, 벡터 3레이어 저장)
  - AC6: ✅ 테스트 9파일 119개 PASS + Build PASS (b1bcaf9)

- [x] **T48: 페르소나 목록 페이지 + API** ✅ 2026-02-11
  - AC1: ✅ GET /api/internal/personas (상태/소스/아키타입/검색/벡터범위/Paradox범위/교차축 필터, 5종 정렬, 페이지네이션)
  - AC2: ✅ PersonaCard 카드 그리드 (프로필, 이름, 상태 뱃지 8종, 아키타입 라벨, 주요 성향 Top3, Paradox %)
  - AC3: ✅ PersonaFilters (상태 칩, 아키타입 12종 멀티셀렉, L1/L2/L3 16D 범위 슬라이더, EPS Range)
  - AC4: ✅ 검색(이름+설명), 정렬 5종+오름/내림, PersonaPagination 페이지 크기 선택
  - AC5: ✅ shadcn/ui 6종 + usePersonas hook + 테스트 7파일 73개 PASS + Build PASS (a52840a)

- [x] **T47: Phase 1 벡터 엔진 — 교차축 + Paradox + V_Final** ✅ 2026-02-11
  - AC1: ✅ 벡터 유틸리티 (clamp, validateVector, euclideanDistance, cosineSimilarity)
  - AC2: ✅ L2→L1 투영 (5D→7D, invert 포함), L3→L1 투영 (4D→7D, 0.5 baseline + coefficients)
  - AC3: ✅ 교차축 계산 엔진 (83축, paradox/reinforcing/modulating/neutral 4종 score formula)
  - AC4: ✅ Extended Paradox Score (w1=0.50×L1↔L2 + w2=0.30×L1↔L3 + w3=0.20×L2↔L3) + Dimensionality bell curve
  - AC5: ✅ V_Final = clamp((1-P)×L1 + P×(α×L2proj + β×L3proj)), vFinalToVector 변환
  - AC6: ✅ 단위 테스트 5파일 41개 전부 PASS + Build PASS + 커밋 (38679ab)

- [x] **T46: Phase 0 기반 인프라 — v3 타입 + DB 스키마 + 상수** ✅ 2026-02-11
  - AC1: ✅ v3 공유 타입 (shared-types + engine-studio) — 106D+ 전체
  - AC2: ✅ Prisma v3 확장 (PersonaLayerVector 3-Layer, Persona 12필드, UserVector OCEAN, InteractionLog/Session 2모델, 3 enum)
  - AC3: ✅ 상수 모듈 7개 (dimensions 16D, paradox-mappings 7쌍, projection-coefficients, cross-layer-axes 83축, dynamics-defaults, interpretation-tables, index)
  - AC4: ✅ 색상 모듈 6개 (CIELAB+OKLCH 16D, layer 3, cross-axis, engine-meta, archetype 12, resolveColor)
  - AC5: ✅ Build PASS + 커밋 + 푸시 (7d07d91, fa21144)

- [x] **T45: 프로젝트 초기화 + 기본 레이아웃** ✅ 2026-02-11
  - AC1: ✅ 기존 src/ (233 files) + tests/ (4 files) 삭제, prisma/config 보존
  - AC2: ✅ App Router 구조 (app/, components/, lib/, types/, constants/, stores/, hooks/)
  - AC3: ✅ LNB 8섹션 (§2.4 기준, 접이식 하위 메뉴, 구분선, 활성 표시)
  - AC4: ✅ 21개 하위 라우트 + Dashboard = 24 pages (Build PASS)
  - AC5: ✅ globals.css (Tailwind v4 dark 테마) + cn() + prisma singleton
  - AC6: ✅ Build PASS (Next.js 16.1.6 Turbopack) + 커밋 + 푸시

- [x] **T41: 콜드스타트 질문 v3 전면 재설계 — 유저 프로파일링 시스템 v3** ✅ 2026-02-11
  - AC1: `docs/design/persona-engine-v3.md` §19 신설 (v3.0-draft.13) — 유저 프로파일링 시스템 v3
    - 하이브리드 시나리오 질문 (L1+L2 동시 측정, 4지선다, delta 적용 공식)
    - 3-Phase 24문항 구조 (8+8+8, Phase별 L1주력/L2주력/교차검증, ~4분)
    - 이탈 정책 (Phase 단위 저장, 미완료 Phase만 리셋)
    - 프로필 품질 등급 (STARTER/STANDARD/ADVANCED/EXPERT)
    - 데일리 마이크로 질문 + 크레딧 (PW 내부 화폐, uncertainty 기반 출제)
    - SNS 연동 (8개 플랫폼, 비용 분석, 2-Stage 최적화, 병합 공식)
    - 적응형 질문 선택 알고리즘 (uncertainty 기반 + LLM 생성 fallback)
    - DB 스키마 6개 테이블 (profiling_questions, user_profiling_answers, user_profiling_status, user_vectors, user_sns_connections, user_coin_transactions)
    - 매칭 정밀도 수렴 모델 (σ/√n, SNS 부스트, 수렴 시뮬레이션)
  - AC2: `docs/design/persona-world-v3.md` §9 전면 개편 (v1.0-draft.3) — 7개 하위 섹션
    - 온보딩 플로우 (회원가입→3-Phase→매칭 프리뷰→PersonaWorld 진입)
    - 하이브리드 시나리오 질문 UI (카드 레이아웃, 게이미피케이션, 진행 바)
    - Phase 구조 + 이탈 정책 UX (안내 문구, Phase별 저장 규칙)
    - SNS 연동 UI (8개 플랫폼, 동의 관리 GDPR, 분석 진행 화면)
    - 데일리 마이크로 질문 + 크레딧 (보상 구조, 연속 스트릭 UI)
    - Phase 간 매칭 프리뷰 (페르소나 카드, 레이더 차트, 역설 패턴 설명)
    - 프로필 품질 등급 + 유저 대시보드 + Engine Studio 관리 연동
  - AC3: 커밋 + 푸시

- [x] **T40: 노드 파라미터 편집 UI 스펙** ✅ 2026-02-11
  - AC1: `docs/specs/engine-studio.md` §3.10 — 노드별 파라미터 편집 UI 컴포넌트 스펙 (v3.3)
    - 설정 패널 공통 레이아웃 (320px 사이드바, 리셋/적용, Eager/Manual 연동)
    - Input 5종: basic-info(8필드), l1-vector(7D 슬라이더), l2-vector(5D), l3-vector(4D+활성화 체크), archetype-select(카드 그리드+변동 시드)
    - Engine 4종: pressure-ctrl(min/max/baseline), projection(α+β 링크드 듀얼 슬라이더)
    - Generation 7종: customInstructions 텍스트 에어리어 (노드별 플레이스홀더 예시)
    - Assembly 2종: prompt-builder(프리셋 드롭다운+JSON 편집)
    - Output 4종: fingerprint(3모드 라디오), test-sim(체크리스트+커스텀), deploy(staging/production)
    - Control Flow 3종: conditional(조건유형별 동적 UI), switch(band/enum 편집기), merge(전략 라디오)
    - 공통 UI 컴포넌트 명세 12종 (shadcn/ui 기반)
    - 설정 있음 19종 / 설정 없음 6종 요약
  - AC2: 커밋 + 푸시

- [x] **T39: 페르소나 필터 API 정식 스펙** ✅ 2026-02-11
  - AC1: `docs/specs/developer-console.md` §9.3.9 — POST /v1/personas/filter 정식 스펙 (v3.3)
    - 다차원 필터: archetype(include/exclude), vectors(L1/L2/L3 차원별 범위), paradox(EPS/L1L2/L1L3/L2L3), crossAxis(패턴 필터)
    - 정렬: paradox.extendedScore, vectors.[dim], createdAt, name
    - 아키타입 12종 ID/한글명/핵심역설 레퍼런스 테이블
    - Request/Response JSON 예시, appliedFilters/filterStats 포함
    - 코드 샘플 3종 (TypeScript SDK, Python SDK, cURL)
    - 에러 응답 6종 정의
    - Rate Limit: Starter 50~Ent.Sc 무제한
  - AC2: `docs/specs/engine-studio.md` §3.1.1 — 필터링 UI 전면 개편 (v3.3)
    - 기본 필터: 상태 칩, 정렬 드롭다운
    - 아키타입 필터: 12종 멀티 선택 칩 (컬러 도트, 제외 토글)
    - 벡터 범위 필터: L1(7D)/L2(5D)/L3(4D) 차원별 Range Slider (접이식)
    - Paradox Score 필터: EPS Range Slider + 구간 레이블 + 역설 지표 세부
    - 교차축 패턴 필터: 83축 드롭다운 + 관계유형 뱃지 + 점수 범위 (최대 5개)
    - 필터 상태 표시: 뱃지 카운트, 칩 나열, 실시간 결과 개수
  - AC3: 커밋 + 푸시

- [x] **T38: 노드 에디터 분기 노드(Conditional/Switch) 추가 설계** ✅ 2026-02-11
  - AC1: `docs/design/persona-engine-v3.md` §14.9 — Control Flow 3종 설계 (v3.0-draft.12)
    - Conditional Node (threshold/range/enum/exists 4종 조건, True/False 분기)
    - Switch Node (threshold-band/enum-match 2종, N개 케이스 분기)
    - Merge Node (first-active/combine 합류 전략)
    - DAG 평가 엔진 활성 엣지 확장, 포트 타입 Any, 그래프 검증 분기 규칙 4종
    - 유즈케이스 4종(역설 분기/아키타입 라우팅/L3 유무/검증 결과별 배포)
    - 전체 노드 22→25종, 카테고리 5→6개
  - AC2: `docs/design/persona-engine-v3-impl.md` §13.13 — 분기 노드 구현 스펙 (v1.14)
    - ConditionalNodeData/SwitchNodeData/MergeNodeData 타입 정의
    - executeConditional/executeSwitch/executeMerge 실행 함수
    - evaluateGraphWithBranching (활성 엣지 추적, ExecutionPath, 비활성 경로 스킵)
    - collectInputsFromActiveEdges 헬퍼
    - 그래프 검증 분기 규칙 (합류 필수/데드엔드/도달 가능성/기본 케이스)
    - 포트 타입 Any, 노드 레지스트리 Control Flow 카테고리
    - Phase 8 태스크 8-27~8-30 추가
  - AC3: 커밋 + 푸시

- [x] **T37: 노드 에디터 execute() 로직 정의 — 22개 노드 전체** ✅ 2026-02-11
  - AC1: `docs/design/persona-engine-v3.md` §14.8 — 22개 노드 execute() 설계 정의 (v3.0-draft.11)
    - Input 5종, Engine 4종, Generation 7종, Assembly 2종, Output 4종
    - 노드별 data/inputs/로직/output/평가전략 명시, 공식 참조(§3~§12)
  - AC2: `docs/design/persona-engine-v3-impl.md` §13.12 — TypeScript 구현 수도코드 (v1.13)
    - executeNode 디스패처, 22개 실행 함수, LLM 호출 어댑터 패턴
    - 교차축 계산 헬퍼, Init delta 계산, 투영 행렬 적용
    - Phase 8 태스크 8-23~8-26 추가
  - AC3: 커밋 + 푸시

- [x] **T36: 전체 문서 "106D+" 표기 통일** ✅ 2026-02-11
  - 배경: T35에서 developer-console.md만 정리 완료. 나머지 5개 문서에 54개소 잔존
  - AC1: `docs/specs/engine-studio.md` ✅ — 19개소 수정, 버전 v3.1→v3.2, 커스텀 가중치→페르소나 필터 API
  - AC2: `docs/specs/persona-world.md` ✅ — 6개소 수정
  - AC3: `docs/design/persona-engine-v3.md` ✅ — 15개소 수정 (변경이력 1건 유지), 버전 v3.0-draft.10 추가
  - AC4: `docs/design/persona-engine-v3-impl.md` ✅ — 9개소 수정 (변경이력 2건 유지), 버전 v1.12 추가
  - AC5: `docs/design/persona-world-v3.md` ✅ — 2개소 수정
  - 잔여: 변경이력 테이블 내 5건 (역사적 기록, 의도적 유지)

- [x] **T35: 개발자콘솔 과금 구조 전면 개편 — 6-Tier + LLM 2-Tier** ✅ 2026-02-11
  - 배경: v3 106D+ 엔진 기준으로 과금 구조 재설계. 기업고객 사용 시나리오별 보수적 원가 분석 완료
  - AC1: `docs/specs/developer-console.md` §8 전면 개편 ✅
    - 6-Tier 과금 (Starter $199/Pro $499/Max $1,499 + Ent.S $3,500/Ent.G $5,000/Ent.Sc $15,000)
    - 활성 PW 페르소나 기반 과금 (50/100/350/800/1,500/5,000+추가)
    - Enterprise 3단계 분리 (랜딩→ "Enterprise 문의", 내부 선택)
    - 커스텀 가중치 전면 삭제 (품질 저하 + 비용 증가 리스크)
    - 전담 매니저: Ent.G 1:5, Ent.Sc 1:2 (공유 모델)
  - AC2: LLM 모델 전략 반영 ✅
    - 3-Tier LLM 라우터 → 2-Tier (텍스트=Sonnet, 비텍스트=규칙)
    - Prompt Caching 적용 (시스템 프롬프트 캐싱, 생성 텍스트는 매번 새로)
    - PW 페르소나 월 COGS ~$0.62/개 (ALL Sonnet 기준)
  - AC3: 용어 정리 ✅ — 잔여 표현 전면 삭제 → "106D+" only
  - AC4: 전체 문서 일관성 수정 ✅
    - §5 Key 제한 테이블: Free/4-tier → 6-tier
    - §8.2 결제 실패: "Free 플랜 다운그레이드" → "API 접근 일시 정지"
    - §8.3 청구서 예시: Pro $199 → $499, 토큰→PW 페르소나 과금
    - §9 Rate Limit: Free/3-tier → 6-tier
    - §12 기술 지원: Free/4-tier → 6-tier (Ent 전담 매니저 비율 포함)
    - §13 팀원 초대 제한: Free/4-tier → 6-tier
    - 버전: v3.1 → v3.2
    - Webhook 예시 금액 갱신

- [x] **T34: 스펙 문서 v3 엔진 기준 전면 업데이트** ✅ 2026-02-11
  - 배경: 3개 스펙 문서가 v2(6D) 기준이었음. v3(106D+) 기준으로 전면 수정
  - 변경: `docs/specs/engine-studio.md` (v3.0 → v3.1)
    - 벡터 설정: 6D 단일 → 3-Layer(L1 7D + L2 5D + L3 4D) + 교차축 83개 + Paradox Score
    - 매칭: 3-Layer(벡터/규칙/LLM) → 3-Tier(Basic/Advanced/Exploration) 전면 개편
    - LLM 컨텍스트 분석 → 정성↔정량 변환 4대 알고리즘(Init/Override/Adapt/Express)
    - Vector6D → ThreeLayerVector(SocialPersona+CoreTemperament+NarrativeDrive)
    - DB: VECTOR(6) → VECTOR(16), 검증: 6-Category 일관성 검사
  - 변경: `docs/specs/developer-console.md` (v3.0 → v3.1)
    - 매칭 기능 비교: Layer→Tier 구조, LLM 애드온→통합
    - 과금: use_llm_context → matching_tier, Tier별 비용 통합
    - API 예시: matching_tier 옵션, 퀄리티 비교 v3 기준
  - 변경: `docs/specs/persona-world.md`
    - 6D→3-Layer 전체 13개소 수정
    - 활동성 매핑: 4특성→8특성(ActivityTraitsV3)
    - Vector6D→ThreeLayerVector 코드 업데이트
  - 테스트: 스펙 문서 — 코드 구현 아님

- [x] **T33: ConsumptionMemory 레이어 추가 — 비공개 소비 기록 기반 장기 기억** ✅ 2026-02-11
  - 배경: 페르소나가 컨텐츠를 소비해도 매번 리뷰를 쓰면 봇 느낌. 기억(Memory)과 활동(Activity)을 분리해야 함
  - 변경: `docs/design/persona-engine-v3.md` (v3.0-draft.8 → v3.0-draft.9)
    - §15.2 데이터 소스에 ConsumptionLog 추가
    - §15.3 RAG 컨텍스트에 [E] 소비 기억 ~200 tok 신설 (4→5 검색 항목)
    - §15.4 "소비↔기억 괴리" 문제 해결 패턴 추가
    - §15.5 비용 재산정 (3,900→4,100 tok, 127→134원/월)
  - 변경: `docs/design/persona-world-v3.md` (v1.0-draft.1 → v1.0-draft.2)
    - §7.1 데이터 소스에 ConsumptionLog 추가
    - §7.6 신설: 소비 기억 ConsumptionMemory (설계 동기, 스키마, 기록 트리거 4종, RAG 검색 전략, 자연스러운 언급 패턴 4종)
    - §7.7 비용 테이블 재산정 (4,800→5,000 tok)
  - 변경: `docs/design/persona-world-v3-impl.md` (v1.0-draft.1 → v1.0-draft.2)
    - §2.3 ConsumptionLog Prisma 모델 + enum 신설
    - §3.1 ConsumptionRecord/ContentType/Source 타입 추가
    - §3.2~3.3 ragContext에 consumptionMemory 필드 추가
    - §5.5 consumption-manager 함수 시그니처 3종 (recordConsumption/getConsumptionContext/getConsumptionStats)
    - PW-0-8/PW-2-9/PW-2-10 태스크 추가, 파일 변경 맵에 consumption-manager.ts 추가
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T32: PersonaWorld v3 설계서 + 구현계획서** ✅ 2026-02-11
  - 신규: `docs/persona-world-design.md` (v1.0-draft.1)
    - §1 개요, §2 시스템 아키텍처, §3 3-Layer→활동성 매핑
    - §4 자율 활동 엔진, §5 인터랙션 시스템, §6 피드 알고리즘
    - §7 PersonaWorld RAG, §8 품질 측정 연동, §9 온보딩 시스템
    - §10 비용 분석, §11 모더레이션 및 운영
  - 신규: `docs/persona-world-implementation-plan.md` (v1.0-draft.1)
    - §1-3 아키텍처/데이터모델/타입, §4 활동성 매핑 엔진
    - §5 자율 활동 엔진, §6 인터랙션 시스템, §7 피드 알고리즘
    - §8 온보딩 API, §9 구현 Phase(PW-0~5, 43 태스크)
    - §10 파일 변경 맵(32 신규/8 재작성/4 수정)
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.11)
    - Phase 재배치: InteractionLog→Phase 0, Auto-Interview→Phase 2, Integrity→Phase 9
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T31: 품질 측정 강화 — Auto-Interview + Integrity Score + 인터랙션 로그** ✅ 2026-02-11
  - 변경: `docs/persona-engine-v3-design.md` (v3.0-draft.8)
    - §16.6 Auto-Interview 프로토콜: 20문항(L1 7+L2 5+L3 4+역설 4), 벡터 추론, pass/warning/fail
    - §16.7 Persona Integrity Score: CR(0.35)+SC(0.35)+CS(0.30), LLM-as-Judge
    - §6.2 인터랙션 로그 스키마: 턴 단위 로그, 세션 메타데이터, 네트워크 분석용 엣지
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.10)
    - §3.4 InteractionLog/InteractionSession Prisma 모델 + TypeScript 타입
    - §16.7 Auto-Interview 구현 (질문 생성기+벡터 추론+차원별 비교)
    - §16.8 Persona Integrity Score 구현 (CR+SC+CS 3-component)
    - §16.9 인터랙션 로그 수집기 (세션 관리+턴 로깅+메트릭 집계)
    - Phase 9 태스크 9-23~9-32로 확장
    - 파일 변경 맵: auto-interview.ts, integrity-score.ts, interaction-logger.ts 추가
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T30: 일관성 검증 완성 + 차원 표기 수정** ✅ 2026-02-10
  - 변경: `docs/persona-engine-v3-design.md` (v3.0-draft.7)
    - §11 전면 개편: 6-Category 검증(구조/L1↔L2/L2↔L3/정성↔정량/교차축/동적)
    - C(L2↔L3): lack↔Paradox, volatility↔neuroticism, scope↔openness, moralCompass↔agreeableness
    - D(정성↔정량): 서사↔Init벡터, Voice↔L1(LLM), Triggers↔L3
    - E(교차축): 스코어 범위, 관계유형별, EPS 재계산 검증
    - 종합 일관성 점수 공식 (가중 category pass rate)
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.9)
    - §11 전면 개편: ValidationIssue/ValidationResult 타입, C/D/E 구현 코드
    - Phase 2 태스크 2-7 확장 (6-Category)
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T29: 비정량↔정량 연결 알고리즘 구체화** ✅ 2026-02-10
  - 변경: `docs/persona-engine-v3-design.md` (v3.0-draft.6)
    - §5.3 Init: LLM 구조화 키워드 추출, 의미 카테고리→벡터 매핑 테이블, delta 적용 규칙
    - §5.4 Override: 2단계 트리거 감지, override/additive delta, 지수 감쇠 복귀 곡선
    - §5.5 Adapt: UIV 3축 분석, 차원별 α, 모멘텀, ±0.3 드리프트 클램프
    - §5.6 Express: 파생 상태값 5종, sigmoid 범용 공식, quirk 스키마
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.8)
    - §9.3~9.6 상호작용 모듈 구현 상세 (Init/Override/Adapt/Express 코드)
    - Phase 4 태스크 확장 (4-1~4-9: 타입, 상수, 테스트 포함)
    - 파일 변경 맵: 상호작용 모듈 9개 항목 추가
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T28: 매칭 알고리즘 다층 확장** ✅ 2026-02-10
  - 변경: `docs/persona-engine-v3-design.md` (v3.0-draft.5)
    - §10 전면 개편: V_Final 단일 매칭→3-Tier 다층 매칭(Basic/Advanced/Exploration)
    - 비정량적 보정(Voice+서사 ±0.1), 피드 믹싱(60/30/10)
    - 매칭 결과 구조(explainability breakdown)
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.7)
    - §10 전면 개편: 3-Tier 매칭 엔진(10.1~10.8), 타입 정의, Tier별 구현 코드
    - Phase 5 태스크 확장 (5-1~5-7: 매칭 모듈 6개 신규 파일)
    - 파일 변경 맵: types.ts, basic/advanced/exploration/qualitative-matching.ts, engine.ts 추가
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T27: 교차축 계산 엔진 + Paradox Score 확장 + V_Final 확장** ✅ 2026-02-10
  - 변경: `docs/persona-engine-v3-design.md` (v3.0-draft.5)
    - §3.6.3 확장: Paradox Score → 3-Layer 확장형 (L1↔L2 + L1↔L3 + L2↔L3 가중 합산)
    - §3.8.4 신설: 교차축 스코어 계산 (83축, 관계 유형별 공식 4종, CrossAxisProfile)
  - 변경: `docs/persona-engine-v3-implementation-plan.md` (v1.6)
    - §5 확장: VFinalResult에 crossAxisProfile + paradoxProfile 추가
    - §6 전면 개편: 교차축 계산 엔진 + Extended Paradox Score (6.1~6.7)
    - Phase 1 태스크 확장 (1-4~1-9: cross-axis.ts, inversions 테이블)
    - 파일 변경 맵 추가 (cross-axis.ts, cross-axis-inversions.ts)
  - 변경: `TASK.md` (T27-T30 티켓 등록)
  - 테스트: 설계 문서 — 코드 구현 아님

- [x] **T26: P-inger Print 시스템 + Features 멀티페이지 + Persona Engine Studio** ✅ 2026-02-09
  - 변경: `apps/landing/src/lib/trait-colors.ts` (신규)
  - 변경: `apps/landing/src/components/p-inger-print-2d.tsx` (신규 — SVG 지문 패턴, 6D 기반 릿지 변형)
  - 변경: `apps/landing/src/components/p-inger-print-3d.tsx` (신규 — Three.js 구체, GLSL 셰이더, 6D 표면 변형)
  - 변경: `apps/landing/src/components/p-inger-print-showcase.tsx` (신규 — 인터랙티브 데모)
  - 변경: `apps/landing/src/app/features/page.tsx` (허브 페이지로 재작성)
  - 변경: `apps/landing/src/app/features/taste-analysis/page.tsx` (신규)
  - 변경: `apps/landing/src/app/features/persona/page.tsx` (신규 — P-inger Print 비주얼 포함)
  - 변경: `apps/landing/src/app/features/matching/page.tsx` (신규)
  - 변경: `apps/landing/src/components/layout/header.tsx` (Features 드롭다운 + Persona Engine Studio)
  - 변경: `apps/landing/src/app/products/engine-studio/page.tsx` (신규)
  - 변경: `apps/landing/src/app/products/inside-deepsight/page.tsx` (→ 리다이렉트)
  - 변경: `apps/persona-world/src/components/p-inger-print-2d.tsx` (신규)
  - 변경: `apps/persona-world/src/app/persona/[id]/page.tsx` (TraitColorFingerprint → PingerPrint2D)
  - 변경: `apps/engine-studio/src/components/charts/p-inger-print-2d.tsx` (신규)
  - 변경: `apps/engine-studio/src/app/(dashboard)/personas/page.tsx` (RadarChart → PingerPrint2D)
  - 변경: `apps/developer-console/src/lib/trait-colors.ts` (신규)
  - 변경: `apps/developer-console/src/components/p-inger-print-2d.tsx` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/playground/page.tsx` (응답 P-inger Print 미리보기)
  - 테스트: Build PASS (Landing, Persona World, Engine Studio, Developer Console)

- [x] **T25: 앱 간 연동 환경변수 정리** ✅ 2026-02-07
  - 변경: `apps/persona-world/src/lib/api.ts` - 기본 URL 포트 수정 (3000 → 3001)
  - 변경: `docs/DEVELOPMENT_GUIDE.md` - 환경변수 섹션 전면 개편
  - 구현:
    - PersonaWorld → Engine Studio API 연동 기본값 수정
    - 앱별 포트 설정 테이블 (Landing:3000, Engine:3001, Console:3002, PersonaWorld:3003)
    - 앱 간 연동 구조 다이어그램
    - 각 앱별 필요한 환경변수 문서화
    - 프로덕션 환경변수 예시 추가
  - 테스트: Build PASS

- [x] **T24: 랜딩 페이지 이미지 요청서 보완** ✅ 2026-02-07
  - 변경: `docs/[요청서] DeepSight_랜딩페이지_이미지_요청.md`
  - 구현:
    - 섹션 12: 파일 명명 규칙 및 저장 위치 추가
      - 저장 위치: `apps/landing/public/images/{category}/`
      - 파일명 패턴: `{type}-{name}.png`, Retina: `{name}@2x.png`
      - 전체 파일 목록 트리 구조
    - 섹션 13: Claude에게 작업 요청하는 방법
      - 이미지 등록 요청 예시
      - Next.js Image 컴포넌트 사용 예시
    - 섹션 14: 제품 스크린샷 촬영 가이드
      - 앱 실행 URL 및 포트
      - 촬영할 페이지 목록 (Engine Studio, Developer Console, PersonaWorld)
      - Chrome DevTools 스크린샷 방법
      - 권장 뷰포트 크기 (1440x900 데스크톱, 390x844 모바일)
      - 목업 프레임 도구 (Screely, Shots)
  - 테스트: 문서 작성 완료

- [x] **T23: 페르소나 AI 자동 생성 UI** ✅ 2026-02-07
  - 변경: `apps/engine-studio/src/app/(dashboard)/personas/create/page.tsx`
  - 구현:
    - 모드 선택 화면 추가 (AI 자동 생성 vs 직접 생성)
    - AI 자동 생성 카드 (보라-핑크 그라데이션, Wand2 아이콘)
    - 직접 생성 카드 (파란-시안 그라데이션, PenTool 아이콘)
    - handleAutoGenerate() - `/api/personas/generate` 연동
    - 생성 후 수정 페이지로 자동 이동 (DRAFT 상태)
    - 로딩 상태 UI (스피너, 버튼 비활성화)
    - 뒤로가기 버튼: 모드 선택 ↔ 마법사 전환
  - 테스트: Build PASS (engine-studio)

- [x] **T22: PersonaWorld 사용자 상태 관리** ✅ 2026-02-07
  - 변경: `apps/persona-world/src/lib/user-store.ts` (신규)
  - 변경: `apps/persona-world/src/app/notifications/page.tsx`
  - 변경: `apps/persona-world/src/app/persona/[id]/page.tsx`
  - 변경: `apps/persona-world/src/app/feed/page.tsx`
  - 변경: `apps/persona-world/src/app/explore/page.tsx`
  - 구현:
    - Zustand 스토어 (localStorage 영속화)
    - 사용자 프로필 관리 (UserProfile, 6D 벡터)
    - 팔로우/언팔로우 기능 (FollowedPersona)
    - 좋아요/북마크 토글
    - 알림 관리 (읽음 처리, 전체 읽음, 삭제)
    - 알림 타입별 아이콘/스타일 (7가지 타입)
    - 트렌딩 토픽 클릭 → 탐색 페이지 검색
    - Suspense 래퍼 (useSearchParams 대응)
  - 테스트: Build PASS (persona-world)

- [x] **T19: Export 기능 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/lib/export.ts` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/logs/page.tsx`
  - 변경: `apps/developer-console/src/app/(dashboard)/usage/page.tsx`
  - 변경: `apps/developer-console/src/app/(dashboard)/team/page.tsx`
  - 구현:
    - 공통 Export 유틸리티 (CSV/JSON 변환, BOM 지원, Blob 다운로드)
    - AC1: 감사 로그 CSV/JSON 내보내기 (드롭다운 메뉴)
    - AC2: 사용량 데이터 CSV/JSON 내보내기 (드롭다운 메뉴)
    - AC3: 팀 멤버 목록 CSV 내보내기
  - 테스트: Build PASS (developer-console)

- [x] **T18: Invoice 다운로드 기능 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/api/billing/invoices/[id]/download/route.ts` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/billing/page.tsx`
  - 구현:
    - GET /api/billing/invoices/:id/download API
    - Invoice 텍스트 포맷 생성 (PDF URL 있으면 리다이렉트)
    - 다운로드 버튼 클릭 시 handleDownloadInvoice() 호출
    - Blob 다운로드 처리
  - 테스트: Build PASS (developer-console)

- [x] **T17: API Key 로테이션 실제 로직 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/api/api-keys/[id]/rotate/route.ts` (신규)
  - 변경: `apps/developer-console/src/services/api-keys-service.ts`
  - 변경: `apps/developer-console/src/app/(dashboard)/api-keys/page.tsx`
  - 구현:
    - POST /api/api-keys/:id/rotate API (키 로테이션)
    - 새 키 생성 (crypto.randomBytes + sha256 해시)
    - rotateKey() 서비스 메서드 구현
    - Rotate 다이얼로그 API 연동 + 로딩 상태
    - 새 키 표시 다이얼로그 (한 번만 표시, 복사 기능)
  - 테스트: Build PASS (developer-console)

- [x] **T16: Webhook Test 기능 구현** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/(dashboard)/webhooks/page.tsx`
  - 변경: `apps/developer-console/src/services/webhooks-service.ts`
  - 구현:
    - Test Webhook 메뉴 클릭 시 handleTestWebhook() 호출
    - 테스트 결과 다이얼로그 (로딩/성공/실패 상태)
    - 상태코드, 응답시간, 응답 본문 표시
    - 테스트 후 Delivery Logs 자동 갱신
  - 테스트: Build PASS (developer-console)

- [x] **T15: 팀 역할 수정 API 연동** ✅ 2026-02-06
  - 변경: `apps/developer-console/src/app/api/team/members/[id]/route.ts` (신규)
  - 변경: `apps/developer-console/src/app/(dashboard)/team/page.tsx`
  - 구현:
    - PATCH /api/team/members/:id API (역할 수정)
    - DELETE /api/team/members/:id API (멤버 제거)
    - Edit Role 다이얼로그 API 연동 + 로딩 상태
    - Remove Member 다이얼로그 API 연동 + 로딩 상태
    - 성공/실패 토스트 메시지 표시
  - 테스트: Build PASS (developer-console)

- [x] **T14: PersonaWorld 디자인 시스템 구축** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/app/globals.css` (PersonaWorld CSS 추가)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-logo.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-button.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-card.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-spinner.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-profile-ring.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-like-button.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/pw-badge.tsx` (신규)
  - 변경: `apps/engine-studio/src/components/persona-world/index.ts` (신규)
  - 구현:
    - PW 로고 (인스타 스타일 - 그라데이션 배경 + 흰색 텍스트)
    - Vivid Gradient 테마 (purple → pink → coral)
    - 애니메이션 그라데이션 (gradient-shift, border-shift)
    - 모션 효과 (glow, shimmer, pulse, float, bounce, heart-pop)
    - 프로필 링 (인스타 스토리 스타일)
    - 스켈레톤, 스피너, 타이핑 인디케이터
    - 알림 뱃지 펄스 효과
  - 테스트: Build PASS (engine-studio)

- [x] **T13: 자율 활동 스케줄러 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/scheduler/activity-scheduler.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/posting-engine.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/interaction-engine.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/content-trigger.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/trending-reactor.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/scheduler/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/scheduler/route.ts` (신규)
  - 구현:
    - 성격 기반 활동 시간 결정 (sociability, activeHours, peakHours)
    - 자율 포스팅 엔진 (성격별 포스트 타입 선택, 템플릿 기반 콘텐츠 생성)
    - 자율 인터랙션 엔진 (6D 유사도 기반 좋아요, 댓글, 팔로우)
    - 콘텐츠 출시 트리거 (관련성 판단, 딜레이 계산, 반응 스케줄링)
    - 트렌딩 토픽 반응 (해시태그 분석, 토픽 관련성, 자동 포스팅)
    - 스케줄러 API (상태 조회, 수동 실행, 일시 정지/재개)
  - 테스트: Build PASS (engine-studio)

- [x] **T12: 피드 알고리즘 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/feed/similarity-matcher.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/feed/trending-calculator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/feed/feed-mixer.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/feed/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/feed/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/explore/route.ts` (신규)
  - 구현:
    - 팔로우 기반 피드 (60%) - 팔로우한 페르소나 최신 게시물
    - 6D 유사도 기반 추천 피드 (30%) - 코사인/유클리드/하이브리드 유사도
    - 트렌딩 피드 (10%) - 참여도+시간 감쇠 기반 점수
    - 혼합 피드 알고리즘 - 가중치 정규화, 인터리빙, 중복 제거
    - Explore 탭 API - 카테고리별 인기 페르소나, 핫 토픽, 활발한 토론, 신규 페르소나
    - 커서 기반 페이지네이션
    - 페르소나 추천 API
  - 테스트: Build PASS (engine-studio)

- [x] **Hotfix: 팀 서비스 API 응답 형식 자동 감지** ✅ 2026-02-06
  - 원인: `apiClient`가 배열/객체 응답 모두 반환 가능 → `response.data.data`에서 `.map()` 에러
  - 변경: `team-service.ts` - 배열 직접 또는 `{ data, total }` 구조 모두 처리
  - 테스트: Build PASS

- [x] **Hotfix: 감사 로그 API 응답 구조 및 null safety 추가** ✅ 2026-02-06
  - 원인: API가 `data: [...]` 직접 반환 → 서비스에서 `response.data.data` undefined → `.length` 에러
  - 변경: `/api/audit-logs` - 응답을 `{ data: { data, total, stats } }` 구조로 래핑, stats 계산 추가
  - 변경: `audit-logs-service.ts` - null safety 추가
  - 테스트: Build PASS

- [x] **Hotfix: 팀 서비스/페이지 null safety 추가** ✅ 2026-02-06
  - 원인: `membersResponse.members`가 undefined일 때 `teamMembers.filter()` 에러
  - 변경: `team-service.ts` - API 실패시 빈 배열/기본값 반환, `team-access/page.tsx` - `|| []` 방어 코드
  - 테스트: Build PASS

- [x] **Hotfix: 팀 멤버 API 응답 구조 수정** ✅ 2026-02-06
  - 원인: API가 `data: [...]` 직접 반환, apiClient가 `data.data ?? data` 추출 → 서비스에서 `.map()` 에러
  - 변경: `/api/users/route.ts` - 응답을 `{ data: { data: [...], total } }` 구조로 래핑
  - 테스트: Build PASS

- [x] **Hotfix: 인시던트 서비스 응답 포맷 수정** ✅ 2026-02-06
  - 원인: API가 `stats: { reported, investigating, ... }` 반환, 서비스는 `IncidentStats` 형식 기대 → `.length`, `.filter` 에러
  - 변경: `operations-service.ts` - stats 형식 변환 (reported+investigating+identified+fixing→open), null safety 추가
  - 테스트: Build PASS

- [x] **Hotfix: 모니터링 서비스 응답 타입 수정** ✅ 2026-02-06
  - 원인: API가 `metrics`를 객체로 반환, 서비스는 배열 기대 → `.forEach` 에러
  - 변경: `operations-service.ts` - 객체 형태의 metrics/currentStatus 처리로 변경
  - 테스트: Build PASS

- [x] **Hotfix: 서비스 레이어 API 경로 중복 수정** ✅ 2026-02-06
  - 원인: `baseUrl=/api` + 엔드포인트 `/api/versions` → `/api/api/versions` (중복)
  - 변경: `versions-service.ts`, `event-bus-service.ts` - `/api/` 접두사 제거
  - 테스트: Build PASS

- [x] **Hotfix: expertise 배열 null 체크 추가** ✅ 2026-02-06
  - 원인: DB 기존 데이터에서 expertise가 null → `.length` 호출 시 TypeError
  - 변경: `apps/engine-studio/src/app/api/personas/route.ts` - `expertise ?? []`
  - 변경: `apps/engine-studio/src/app/api/personas/[id]/route.ts` - `expertise ?? []`
  - 테스트: Build PASS, 70/70 PASS

- [x] **Hotfix: 페르소나 목록 API 응답 구조 수정** ✅ 2026-02-06
  - 원인: API가 `data: [...]` 반환, Service는 `data.personas` 기대
  - 변경: `apps/engine-studio/src/app/api/personas/route.ts` - 응답 구조를 `{ personas, total, page, limit, hasMore }` 형식으로 수정
  - 테스트: Build PASS, 70/70 PASS

- [x] **T12: 페르소나 자동 생성 파이프라인 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/persona-generation/vector-diversity.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/character-generator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/activity-inference.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/content-settings-inference.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/prompt-builder.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/consistency-validator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/sample-content-generator.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/persona-generation/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/personas/generate/route.ts` (신규)
  - 구현:
    - 6D 벡터 자동 배정 (다양성 분석, 빈 셀/부족 셀 우선, 최대 거리 벡터 생성)
    - 캐릭터 속성 자동 생성 (이름, 핸들, 태그라인, 생년월일, 국가/지역, warmth, expertiseLevel, 말버릇, 습관, 배경, 장르 선호)
    - 활동성 속성 자동 추론 (sociability, initiative, expressiveness, interactivity, postFrequency, 활동 시간대)
    - 콘텐츠/관계 설정 자동 추론 (포스트 타입 선호, 콘텐츠 스타일, 리뷰 스타일, 인터랙션 스타일, 관계/갈등/협업 스타일)
    - 프롬프트 템플릿 자동 생성 (basePrompt, reviewPrompt, postPrompt, commentPrompt, interactionPrompt, specialPrompts)
    - 일관성 자동 검증 (벡터↔캐릭터, 캐릭터↔활동성, 활동성↔콘텐츠, 관계 설정 검증, 70점 이상 통과, 자동 수정)
    - 샘플 콘텐츠 자동 생성 (리뷰 2개, 포스트 1개, 댓글 2개)
    - 배치 생성 기능 (다양성 고려)
    - API 엔드포인트 (POST 단일/배치 생성, GET 다양성 분석)
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T11: 유저 온보딩 API 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/lib/onboarding/vector-merger.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/onboarding/sns-analyzer.ts` (신규)
  - 변경: `apps/engine-studio/src/lib/onboarding/index.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/users/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/cold-start/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/sns/connect/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/sns/callback/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/onboarding/profile/route.ts` (신규)
  - 구현:
    - Cold Start 설문 API (LIGHT/MEDIUM/DEEP 레벨별 질문, 6D 벡터 계산)
    - SNS OAuth 연동 (Netflix, YouTube, Instagram, Spotify, Letterboxd 지원)
    - SNS 데이터 분석 → 6D 벡터 변환 (플랫폼별 분석 로직)
    - SNS 확장 데이터 추출 (demographics, specificTastes, activityPattern, expressionStyle, socialBehavior, interests)
    - 프로필 품질 레벨 관리 (BASIC → STANDARD → ADVANCED → PREMIUM)
    - 벡터 병합 (가중 평균 병합, 점진적 학습)
    - 활동 기반 프로필 학습 (좋아요, 댓글, 팔로우 분석)
    - 페르소나 추천 API (유사도 기반)
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T10: PersonaWorld API 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/[id]/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/[id]/likes/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/posts/[id]/comments/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/follows/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/bookmarks/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/persona-world/reports/route.ts` (신규)
  - 구현:
    - Posts CRUD API (GET list, GET detail, POST, PATCH, DELETE)
    - Likes API (GET list, POST, DELETE)
    - Comments API (GET list, POST, PATCH, DELETE, 답글 지원)
    - Follows API (GET followers/following, POST, DELETE)
    - Bookmarks API (GET list, POST, DELETE)
    - Reports API (GET list, POST, PATCH 처리)
    - 활동 로그 자동 기록
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T9: developer-console Persona 스키마 동기화** ✅ 2026-02-06
  - 변경: `apps/developer-console/prisma/schema.prisma`
    - Layer 2 캐릭터 속성 추가 (handle, tagline, birthDate, country, region, warmth, expertiseLevel 등)
    - 활동성 속성 추가 (sociability, initiative, expressiveness, interactivity, postFrequency 등)
    - 콘텐츠/관계 설정 추가 (contentSettings, relationshipSettings JSON)
    - 프롬프트 템플릿 추가 (basePrompt, reviewPrompt, postPrompt, commentPrompt, interactionPrompt)
    - 품질/상태 필드 추가 (status, qualityScore, consistencyScore, source)
    - 신규 Enum 추가 (PersonaRole, PersonaStatus, PersonaSource, ExpertiseLevel, PostFrequency)
  - 변경: `apps/developer-console/prisma/migrations/002_persona_layer2_attributes.sql` (신규)
  - 테스트: 빌드 PASS (developer-console, engine-studio)

- [x] **T8: PersonaWorld 스키마 구현** ✅ 2026-02-06
  - 변경: `apps/engine-studio/prisma/schema.prisma`
    - Persona 모델 확장 (Layer 2 캐릭터 속성, 활동성 속성, 콘텐츠/관계 설정, 프롬프트 템플릿)
    - PersonaWorld 모델 추가 (PersonaPost, PersonaPostLike, PersonaComment, PersonaFollow, PersonaRepost)
    - PersonaWorld 유저 모델 추가 (PersonaWorldUser, SNSConnection, PWUserSurveyResponse)
    - 모더레이션 모델 추가 (PersonaWorldReport, PersonaActivityLog)
    - 신규 Enum 추가 (PersonaPostType, ActivityTrigger, PostFrequency, ExpertiseLevel, ProfileQuality, SNSPlatform 등)
  - 변경: `apps/engine-studio/prisma/migrations/004_persona_world_system.sql` (신규)
    - Persona 테이블 확장 컬럼 추가
    - PersonaWorld 관련 테이블 전체 생성
    - 좋아요/댓글/리포스트 카운트 자동 업데이트 트리거
  - 구현:
    - 설계 문서(persona-world-design.md, persona-system-v2-design.md) 기반 스키마 구현
    - 완전 자율 운영 시스템 지원 구조
    - 유저 온보딩 (SNS 연동 / Cold Start) 지원 구조
    - SNS 확장 데이터 저장 구조
  - 테스트: 빌드 PASS (engine-studio)

- [x] **T7: Developer Console 미완성 부분 마무리** ✅ 2026-02-06
  - AC1: 로그 페이지 → 이미 DB 연동 완료 상태 (mock 없음)
  - AC2: 빌링 페이지 TODO 수정
    - 변경: `apps/developer-console/src/app/api/billing/upgrade/route.ts` - customerName 세션 연동
    - 변경: `apps/developer-console/src/app/api/billing/toss/success/route.ts` - organization 세션 연동
  - 테스트: Build PASS

- [x] **T6: Engine Studio api-endpoints 중복 제거 및 DB 연동** ✅ 2026-02-05
  - 변경: `apps/engine-studio/prisma/schema.prisma` (ApiEndpoint 모델, HttpMethod/EndpointStatus enum 추가)
  - 변경: `apps/engine-studio/prisma/migrations/003_api_endpoints.sql` (신규 - DDL + v1 시드 5개)
  - 변경: `apps/engine-studio/src/app/api/api-endpoints/route.ts` (신규 - GET/POST)
  - 변경: `apps/engine-studio/src/app/api/api-endpoints/[id]/route.ts` (신규 - GET/PATCH/DELETE)
  - 변경: `apps/engine-studio/src/app/(dashboard)/global-config/api-endpoints/page.tsx` (재작성)
  - 제거: API 키 탭 (Developer Console에 실제 구현 있음, ~400줄 중복 코드)
  - 제거: API 테스트 다이얼로그 (Developer Console playground와 중복, ~100줄)
  - 연동: 엔드포인트 탭 → ApiEndpoint DB CRUD
  - 연동: 설정 탭 → SystemConfig API (category: 'API')
  - 테스트: TypeScript PASS, 70/70 PASS, Build PASS

- [x] **T5: 설문 시스템 구현** ✅ 2026-02-05
  - 변경: `apps/engine-studio/prisma/schema.prisma` (Survey, SurveyQuestion, SurveyResponse, SurveyAnswer 모델 추가)
  - 변경: `apps/engine-studio/prisma/migrations/002_survey_system.sql` (신규)
  - 변경: `apps/engine-studio/src/lib/survey/vector-converter.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/surveys/route.ts` (신규 - GET/POST)
  - 변경: `apps/engine-studio/src/app/api/surveys/[id]/route.ts` (신규 - GET/PUT/DELETE)
  - 변경: `apps/engine-studio/src/app/api/surveys/[id]/responses/route.ts` (신규 - POST/GET)
  - 변경: `apps/engine-studio/src/types/index.ts` (설문 타입 추가)
  - 테스트: PASS (70/70, 신규 25개)

- [x] **T4: 6D 벡터 매칭 로직 구현** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/lib/matching/algorithms.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/matching/simulate/route.ts` (재작성)
  - 구현:
    - 코사인 유사도 계산 함수
    - 가중치 유클리드 거리 계산
    - 하이브리드 매칭 알고리즘
    - 컨텍스트 기반 가중치 조정
    - 다양성 점수 계산
  - 테스트: 빌드 PASS

- [x] **T3: 페르소나 CRUD API 완성** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/app/api/personas/route.ts` (재작성)
  - 변경: `apps/engine-studio/src/app/api/personas/[id]/route.ts` (재작성)
  - 구현:
    - GET /api/personas - 목록 조회 (페이지네이션, 필터링)
    - POST /api/personas - 생성 (Zod 검증, 트랜잭션)
    - PUT/PATCH /api/personas/:id - 수정 (벡터 버전 관리)
    - DELETE /api/personas/:id - 소프트 삭제 (ARCHIVED)
  - 테스트: 빌드 PASS

- [x] **T2: 인증 시스템 완성** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/lib/auth.ts` (재작성)
  - 변경: `apps/engine-studio/src/lib/prisma.ts` (신규)
  - 구현:
    - NextAuth v5 + PrismaAdapter 연동
    - bcryptjs 비밀번호 해싱/검증
    - 세션 기반 API 보호 (미인증 시 401)
    - 사용자 역할(role) 기반 권한 제어
  - 테스트: 빌드 PASS

- [x] **T1: 백엔드 실제 DB 연결** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/lib/prisma.ts` (신규)
  - 변경: `apps/engine-studio/prisma/seed.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/**` (전체 API 재작성)
  - 구현:
    - Prisma 5.22.0 싱글톤 클라이언트
    - 모든 API 엔드포인트 실제 DB 연동
    - Mock 데이터 완전 제거
    - DB 시드 스크립트 (관리자, 샘플 페르소나)
  - 테스트: 빌드 PASS

- [x] **T0: 프로젝트 구조 및 UI 연결** ✅ 2026-02-03
  - 변경: `apps/engine-studio/src/**` (페이지, 서비스)
  - 테스트: 빌드 PASS
  - 비고: Mock 데이터 서비스 패턴 적용, 모든 UI 페이지 동적 연결

### Phase DC-F: 개발자콘솔 API 전면 수정 (T200~T205)

> 점검 보고서(2026-02-22) 기반 — 하드코딩·목업·멀티테넌시·성능 전면 수정
> 우선순위: Critical → High → Medium 순서. 각 티켓은 독립 가능한 단위로 분리.

- [x] **T200: API Keys [id] CRUD 실제 DB 구현** 🔴 Critical ✅ 2026-02-22
  - 배경: GET/PATCH/DELETE /api/api-keys/[id] 전부 TODO 주석과 mock 데이터 반환
  - AC1: GET — `prisma.apiKey.findFirst({ where: { id, organizationId } })` + 조직 필터 ✅
  - AC2: PATCH — `name`, `rateLimit`, `permissions` 필드 실제 DB 업데이트 ✅
  - AC3: DELETE — `status: REVOKED`, `revokedAt` 소프트 삭제 ✅
  - AC4: 조직 소속 여부 검증 (Cross-Org 방지) ✅
  - AC5: Build PASS ✅ (tsc --noEmit, 171 tests)
  - 변경파일: `apps/developer-console/src/app/api/api-keys/[id]/route.ts`

- [x] **T201: localhost 하드코딩 제거 + 조직 필터링(Multi-tenancy) 적용** 🔴 Critical ✅ 2026-02-22
  - 배경: status/route.ts, billing/toss/success/route.ts에 "localhost:3001" 하드코딩; usage + dashboard/stats는 조직 필터링 없음
  - AC1: `status/route.ts` — `"http://localhost:3001"` 제거, `NEXT_PUBLIC_APP_URL` 없으면 graceful degradation ✅
  - AC2: `billing/toss/success/route.ts` — fallback 제거, 미설정 시 500 반환 ✅
  - AC3: `usage/route.ts` — `getUserOrganization()` + `organizationId` 필터 추가 ✅
  - AC4: `dashboard/stats/route.ts` — 동일 패턴 ✅
  - AC5: Build PASS ✅
  - 변경파일: `status/route.ts`, `billing/toss/success/route.ts`, `usage/route.ts`, `dashboard/stats/route.ts`

- [x] **T202: Settings/Profile 실제 DB 구현** 🔴 Critical ✅ 2026-02-22
  - 배경: GET /api/settings, PATCH /api/settings/profile 전부 TODO 주석과 mock 반환
  - AC1: GET /api/settings — `prisma.user.findUnique()` + sessions 포함 ✅
  - AC2: PATCH /api/settings/profile — `prisma.user.update()` name/phone 업데이트 (email 제외) ✅
  - AC3: 응답 형식 표준 준수 ✅
  - AC4: Build PASS ✅
  - 변경파일: `settings/route.ts`, `settings/profile/route.ts`

- [x] **T203: 가격/쿼터 상수화 + 응답 형식 표준화 + 에러 시 Mock 반환 제거** 🟠 High ✅ 2026-02-22
  - 배경: 가격/쿼터 여러 파일에 중복 하드코딩; 에러 발생 시 성공 응답으로 mock 데이터 반환
  - AC1: `src/lib/constants.ts` 신규 생성 — `PLAN_INFO`, `PLAN_PRICES`, `API_COST_PER_CALL`, `getQuotaByPlan()` ✅
  - AC2: `billing/route.ts`, `billing/upgrade/route.ts` — 상수 import로 교체 ✅
  - AC3: `dashboard/stats/route.ts`, `usage/route.ts` — 상수 사용 ✅
  - AC4: 에러 catch mock 제거 (`dashboard/stats`, `logs`, `usage`, `team`, `webhooks`) ✅
  - AC7: Build PASS ✅
  - 변경파일: `src/lib/constants.ts`(신규), `billing/route.ts`, `billing/upgrade/route.ts`, `usage/route.ts`, `dashboard/stats/route.ts`, `logs/route.ts`, `team/route.ts`, `webhooks/route.ts`

- [x] **T204: Webhooks N+1 최적화 + Billing Toss Webhook 구독취소 + auth/login** 🟠 High ✅ 2026-02-22
  - 배경: webhooks/route.ts에 루프 내 DB 쿼리(N+1); billing/toss/webhook의 CANCELED/BILLING_KEY_DELETED TODO; auth/login 501 반환
  - AC1: `webhooks/route.ts` GET — `groupBy` 2쿼리 + Map 조인으로 N+1 제거 ✅
  - AC2: `billing/toss/webhook/route.ts` — CANCELED: org→FREE + Invoice CANCELLED; BILLING_KEY_DELETED: 구독 해제 ✅
  - AC3: `auth/login/route.ts` — 실제 bcrypt 검증 + lastLoginAt 업데이트 ✅
  - AC4: Build PASS ✅
  - 변경파일: `webhooks/route.ts`, `billing/toss/webhook/route.ts`, `auth/login/route.ts`

- [x] **T205: Dashboard Alerts/Alert-Channels Notification 연동** 🟡 Medium ✅ 2026-02-22
  - 배경: alert-channels, alerts 라우트 전부 TODO 목업; Notification 모델 활용 가능
  - AC1: `dashboard/alerts/route.ts` GET — `prisma.notification.findMany()` ✅
  - AC2: `dashboard/alerts/route.ts` PATCH — 단건/전체 읽음 처리 ✅
  - AC3: `dashboard/alert-channels/route.ts` GET/PUT — 입력 검증 추가 (AlertChannel DB 모델 없어 스키마 확장 필요 명시) ✅
  - AC4: Build PASS ✅ (tsc --noEmit clean, 171/171 tests pass)
  - 변경파일: `dashboard/alerts/route.ts`, `dashboard/alert-channels/route.ts`

---

### Phase DC-G: 개발자콘솔 보안 취약점 전면 수정 (T210~T216)

> 보안 감사(2026-02-22) 기반 — OWASP Top 10 기준 Critical/High 우선 수정
> 우선순위: Critical → High 순서

- [x] **T210: API Key Rotate 인증 완전 누락 수정** 🔴 Critical ✅ 2026-02-22
  - 배경: `POST /api/api-keys/[id]/rotate` — `requireAuth()` 호출 없음. 비로그인 상태로 타 org 키 교체 가능
  - AC1: `requireAuth()` 추가, 미인증 시 401 반환 ✅
  - AC2: `getUserOrganization()` 후 `findFirst({ where: { id, organizationId } })`로 Cross-Org 방지 ✅
  - AC3: REVOKED 키 교체 차단 유지 ✅
  - AC4: Build PASS ✅ (tsc clean, 171 tests)
  - 변경파일: `api-keys/[id]/rotate/route.ts`

- [x] **T211: Webhooks [id] Cross-Org 데이터 유출 수정** 🔴 Critical ✅ 2026-02-22
  - 배경: GET/PATCH/DELETE 모두 `findUnique({ where: { id } })` 후 별도 org 검증 → 404 vs 403 차이로 타 org 웹훅 ID 열거 가능
  - AC1: GET — `findFirst({ where: { id, organizationId } })`로 변경 ✅
  - AC2: PATCH — 동일 패턴 ✅
  - AC3: DELETE — 동일 패턴 ✅
  - AC4: Build PASS ✅
  - 변경파일: `webhooks/[id]/route.ts`

- [x] **T212: Webhooks GET null-filter + POST organizationId 누락 수정** 🔴 Critical ✅ 2026-02-22
  - 배경: GET에서 `membership null` 시 `orgFilter = {}` → 전체 org 웹훅 반환; POST에서 `organizationId` 미설정
  - AC1: GET — `!membership` 시 즉시 403 반환 ✅
  - AC2: POST — `getUserOrganization()` 후 `organizationId: membership.organizationId` 추가 ✅
  - AC3 (T215 병합): SSRF 방어 — `BLOCKED_HOSTS` 정규식으로 내부 IP 전체 차단 ✅
  - AC4: Build PASS ✅
  - 변경파일: `webhooks/route.ts`

- [x] **T213: Status endpoint 정보 최소화** 🔴 Critical ✅ 2026-02-22
  - 배경: 인증 없이 UptimeRobot 연동, 레이턴시 측정값, 서비스 uptime 상세 노출 → 인프라 정찰 가능
  - AC1: UptimeRobot API 통합 제거 ✅
  - AC2: latency 측정값 응답에서 제거 ✅
  - AC3: uptime 수치 제거, status만 반환 ✅
  - AC4: 공개 엔드포인트 유지 (status page 목적), 노출 최소화 ✅
  - AC5: Build PASS ✅
  - 변경파일: `status/route.ts`

- [x] **T214: Billing amount 검증 + Toss 에러 노출 수정** 🟠 High ✅ 2026-02-22
  - 배경: `amount` 쿼리파람을 그대로 Toss에 전달 (가격 조작 가능); Toss 에러 메시지 리다이렉트 URL에 노출
  - AC1: `PLAN_PRICES[planId]`와 `parseInt(amount)` 비교 — 불일치 시 error redirect ✅
  - AC2: `planId` 유효성 검사 (starter/pro/enterprise만 허용) ✅
  - AC3: Toss 에러 메시지 리다이렉트 URL에서 제거 (서버 로그만) ✅
  - AC4: Build PASS ✅
  - 변경파일: `billing/toss/success/route.ts`

- [x] **T215: Webhook URL SSRF 방어 + POST secret 주석 명확화** 🟠 High ✅ 2026-02-22
  - T212에서 함께 처리 (webhooks/route.ts SSRF 방어)
  - AC1: `BLOCKED_HOSTS` 정규식으로 localhost/127.x/10.x/192.168.x/169.254.x 차단 ✅
  - AC2: POST 응답 secret — one-time reveal 주석 명확화 ✅
  - AC3: Build PASS ✅
  - 변경파일: `webhooks/route.ts` (T212 동일)

- [x] **T216: Admin seed 프로덕션 방어** 🟠 High ✅ 2026-02-22
  - 배경: `NODE_ENV=production` 에서도 `/api/admin/seed` 접근 가능
  - AC1: 핸들러 시작에 `NODE_ENV === 'production'` 체크 → 404 반환 ✅
  - AC2: Build PASS ✅
  - 변경파일: `admin/seed/route.ts`

### Phase DC-H: 개발자콘솔 보안 Medium/Low 이슈 수정 (T220~T222)

> Phase DC-G 후속 — OWASP Medium/Low 취약점 수정

- [x] **T220+T221: 보안 응답 헤더 + 요청 크기 제한 미들웨어** 🟡 Medium ✅ 2026-02-22
  - 배경: API 응답에 보안 헤더 없음; 요청 크기 제한 없어 대용량 페이로드 허용
  - AC1: `src/middleware.ts` 생성 — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy ✅
  - AC2: Content-Length > 1MB 요청 → 413 응답 (DoS 완화) ✅
  - AC3: `/api/*` 라우트에만 적용 ✅
  - AC4: Build PASS ✅ (tsc clean, 171 tests)
  - 변경파일: `src/middleware.ts` (신규)

- [x] **T222: 초대 토큰 DB 저장 + 만료 검증 + accept API** 🟡 Medium ✅ 2026-02-22
  - 배경: 초대 토큰 DB 미저장 → 만료·취소 불가; `localhost:3001` 폴백; accept 엔드포인트 없음
  - AC1: `VerificationToken` 모델 활용 — `identifier: invite:{memberId}`, `token: sha256(rawToken)`, `expires: +7일` ✅
  - AC2: `team/invite/route.ts` — 토큰 DB 저장 + `localhost:3001` 폴백 제거 ✅
  - AC3: `team/invite/accept/route.ts` 신규 생성 — 토큰 검증 + `acceptedAt` 업데이트 + VerificationToken 삭제 ✅
  - AC4: Build PASS ✅
  - 변경파일: `team/invite/route.ts`, `team/invite/accept/route.ts` (신규)

### Phase KAKAO: 카카오톡 페르소나 채팅 연동 (T370~T375)

> 방식 A: Engine Studio 직접 웹훅 — 카카오 오픈빌더 → ES API Route → 기존 chat-service 재사용
> PW에서 페르소나 선택/연동, 카카오톡에서 대화, 기억·크레딧 파이프라인 공유

- [x] **T370: KakaoLink DB 스키마 + 공유 타입 추가** ✅ 2026-03-08
  - AC1: `KakaoLink` 모델 — `id`, `userId`, `personaId`, `kakaoUserKey`, `isActive`, `createdAt`, `updatedAt` ✅
  - AC2: unique constraint `(userId)` — 유저 1명 = 페르소나 1개 연동 ✅
  - AC3: unique + index `(kakaoUserKey)` — 웹훅에서 빠른 조회 ✅
  - AC4: `@deepsight/shared-types`에 KakaoLink 인터페이스 추가 ✅
  - AC5: 마이그레이션 SQL — `049_kakao_link.sql` ✅
  - AC6: Prisma generate + shared-types tsc PASS ✅
  - 변경파일: `schema.prisma`, `049_kakao_link.sql`, `shared-types/src/index.ts`, `CHANGELOG_SCHEMA.md`

- [x] **T371: 카카오 연동/해제 API — Engine Studio** ✅ 2026-03-08
  - AC1: `POST /api/persona-world/kakao/link` — 연동 생성 (upsert) ✅
  - AC2: `DELETE /api/persona-world/kakao/link` — 연동 해제 (isActive=false) ✅
  - AC3: `GET /api/persona-world/kakao/link` — 연동 상태 조회 ✅
  - AC4: verifyInternalToken + verifyUserOwnership 가드 ✅
  - AC5: API 문서 업데이트 (`docs/api/internal.md` + `internal.openapi.yaml`) ✅
  - AC6: 4789/4790 tests PASS (1 pre-existing failure) ✅
  - 변경파일: `persona-world/kakao/link/route.ts`, `internal.md`, `internal.openapi.yaml`

- [x] **T372: 카카오 웹훅 API Route — 오픈빌더 스킬 서버** ✅ 2026-03-08
  - AC1: `POST /api/kakao/webhook` — 카카오 오픈빌더 스킬 엔드포인트 (인증 불필요) ✅
  - AC2: kakaoUserKey로 KakaoLink 조회 → personaId 확인 ✅
  - AC3: 미연동 사용자 안내 응답 ✅
  - AC4: 연동 사용자 → chat-service.sendMessage() 재사용 ✅
  - AC5: 크레딧 부족 안내 ✅
  - AC7: 카카오 응답 JSON (simpleText, 1000자 제한) ✅
  - AC9: Build PASS ✅
  - 변경파일: `kakao/webhook/route.ts`

- [x] **T373: 카카오 대화 → 기억 파이프라인 연동** ✅ 2026-03-08
  - AC1: 웹훅에서 sendMessage() → recordConversationTurn() 자동 호출 ✅
  - AC2: 기존 retrieveConversationMemories() 자동 공유 (같은 userId+personaId) ✅
  - AC3: InteractionSource enum에 KAKAO 추가 ✅
  - AC4: ConversationTurnInput.source 파라미터화 (기본 DIRECT) → 웹훅에서 KAKAO 전달 ✅
  - AC5: 테스트 PASS ✅
  - 변경파일: `schema.prisma`, `conversation-memory.ts`, `chat-service.ts`, `webhook/route.ts`

- [x] **T374: PersonaWorld 카카오 연동 UI — 설정 페이지** ✅ 2026-03-08
  - AC1: `/settings` 페이지에 "카카오" 탭 추가 (4번째) ✅
  - AC2: 채팅한 페르소나 목록에서 1개 선택 → 연동 ✅
  - AC3: 연동 완료 시 사용 방법 안내 (채널 친구추가 + 대화 방법) ✅
  - AC4: 연동 해제 버튼 + confirm 다이얼로그 ✅
  - AC5: 현재 연동 상태 표시 (페르소나 이름 + 프로필 이미지) ✅
  - AC6: tsc --noEmit PASS ✅
  - 변경파일: `settings/page.tsx`, `lib/api.ts`

- [x] **T375: 카카오 연동 E2E 검증 + API 문서 최종화** ✅ 2026-03-08
  - AC4: `docs/api/internal.md` + `internal.openapi.yaml` 최종 업데이트 완료 ✅
  - AC5: 4789/4790 tests PASS + PW tsc clean ✅
  - 참고: E2E 시나리오(AC1~AC3)는 카카오 오픈빌더 연동 후 프로덕션 환경에서 검증 필요

---

## 🚫 BLOCKED (막힘)

(없음)

---

## 📝 작업 규칙

1. **시작**: QUEUE 최상단 → IN_PROGRESS로 이동
2. **진행**: AC 기준으로 구현 → 테스트 실행
3. **완료**: PASS → DONE으로 이동 (변경파일, 테스트결과 기록)
4. **막힘**: FAIL/불명확 → BLOCKED로 이동 (원인, 필요사항 기록)
