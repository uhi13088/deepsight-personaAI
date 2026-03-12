# DeepSight v4.0 — TASK 관리

> 마지막 업데이트: 2026-03-05

---

## DONE (v3.0)

- [x] **T0~T135**: v3.0 전체 구현 완료 ✅ 2026-02-15
  - 3-Layer 106D+ 벡터 엔진, PersonaWorld SNS, 매칭, 생성 파이프라인, 피드, 스케줄러
  - Voice 콜드스타트, L3 장기 행동 진화, 골든 샘플, LLM 비용 모니터링
  - 온보딩 v3 24문항, 콜드 스타트 UI, 자율 활동 시스템, 관리자 대시보드

---

## DONE (v4.0 — 기억 지능)

- [x] **T148: Poignancy Score 구현** ✅ 2026-02-16
  - computePoignancy (6개 요인), decayPoignancy, 단위 테스트 PASS
- [x] **T141: 팩트북 (Fact Book) 구현** ✅ 2026-02-16
  - ImmutableFact CRUD, computeFactbookHash, mergeFactbooks, 단위 테스트 PASS
- [x] **T149: Forgetting Curve 구현** ✅ 2026-02-16
  - Ebbinghaus 망각 곡선, 복습 스케줄링, 적응형 난이도, 단위 테스트 PASS

## DONE (v4.0 — 보안 3계층)

- [x] **T137: 보안 3계층 구현 — Gate Guard** ✅ 2026-02-16
  - 12 인젝션 패턴, 14 금지어, 5 구조 검사, Trust Decay, 79 테스트 PASS
- [x] **T138: 보안 3계층 구현 — Integrity Monitor** ✅ 2026-02-16
  - 팩트북 해시 검증, L1 드리프트 감지, 변경 이력 제한, 집단 이상 감지, 42 테스트 PASS
- [x] **T139: 보안 3계층 구현 — Output Sentinel** ✅ 2026-02-16
  - PII 6종, 시스템 유출 8종, 비속어 4종, 팩트북 위반 감지, 격리 시스템, 45 테스트 PASS
- [x] **T140: 킬 스위치 + 격리 시스템** ✅ 2026-02-16
  - SystemSafetyConfig, 긴급 동결, 기능별 토글 6종, 자동 트리거 3종, API, 35 테스트 PASS
- [x] **T140-ext: 출처 추적 시스템 (Data Provenance)** ✅ 2026-02-16
  - InteractionSource/PostSource 추적, 신뢰도 자동 계산, 전파 감쇠, 27 테스트 PASS

---

## DONE (v4.0 — 구현계획서/설계서)

- [x] **T136: v4.0 설계서 작성** ✅ 2026-02-17
  - v3 아카이브, 엔진 설계서/구현계획서, PW 설계서(3파트)/구현계획서
  - PW 설계서 3분할: Core(§1-4), Social(§5-8), Operations(§9-12)
- [x] **T157: PersonaWorld 구현계획서 최신화 (Part 3 Operations)** ✅ 2026-02-17
  - 보안 확장(§9): PW 특화 규칙 6종, Trust Decay, Kill Switch 8토글, Quarantine
  - 품질 측정(§10): Auto-Interview PW확장, PIS 3요소, 품질 로깅, Arena 피드백 루프
  - 모더레이션(§11): 자동 모더레이션 3단계, 대시보드, 관리자 액션, 신고 6종, KPI
  - 비용 제어(§12): 예산 알림 4단계, 비용 모드 3종, 최적화 3전략
  - Phase 6-8 추가 (Task #31~#50), 파일 맵 확장
- [x] **T158: 엔진 구현계획서 최신화 (매칭 + 품질 + LLM)** ✅ 2026-02-17
  - 매칭(§12): 3-Tier 전략, V_Final, 정성적 보너스, 소셜 부스트
  - 품질(§13): Auto-Interview 코어, PIS, 골든 샘플, 피드백 오케스트레이터
  - LLM(§14): 2-Tier 라우팅, 토큰 예산 관리
  - Phase 6 추가 (Task T-A~T-J), 파일 맵 확장

## DONE (v4.0 — PW 유저 기능)

- [x] **T159: 유저 댓글 작성 API** ✅ 2026-02-17
  - POST /api/public/posts/[postId]/comments 엔드포인트 (GET+POST)
  - userId로 PersonaComment 저장 + commentCount 트랜잭션 업데이트
  - 입력 검증: 빈 댓글, 최대 1000자, postId/userId 존재, parentId 유효성
  - comment-utils.ts 추출 (classifyTone 11종, validateCommentContent)
  - 변경: comment-utils.ts (신규), comments/route.ts (리팩토링), comment-utils.test.ts (신규)
  - 테스트: 3373 PASS (85 파일), Build PASS
- [x] **T160: 리포스트 API** ✅ 2026-02-17
  - POST /api/public/posts/[postId]/repost 토글 엔드포인트 (기존 구현)
  - PersonaRepost CRUD + repostCount 트랜잭션 업데이트
  - PWRepostButton 컴포넌트, user-store repost 상태, clientApi.toggleRepost
  - feed/page.tsx 공유 플레이스홀더 → PWRepostButton 교체
  - 변경: pw-repost-button.tsx (신규), user-store.ts, api.ts, feed/page.tsx
  - 테스트: 3373 PASS (85 파일), Build PASS (engine-studio + persona-world)
- [x] **T161: 알림 서버 API** ✅ 2026-02-17
  - GET/POST /api/persona-world/notifications (기존 구현 확인)
  - 알림 트리거: like, comment, follow 연결 확인 + repost 알림 신규 추가
  - notifyPostReposted: notification-service.ts 함수 + repost/route.ts 연결
  - clientApi: getNotifications, markNotificationRead, markAllNotificationsRead
  - useUserStore: fetchNotifications (서버 동기화), markAsRead/markAllAsRead (Optimistic + Server Sync)
  - notifications/page.tsx: 30초 폴링 + "repost" 타입 스타일 추가
  - feed/page.tsx: 60초 폴링으로 배지 서버 동기화
  - 변경: notification-service.ts, repost/route.ts, api.ts, types.ts, user-store.ts, notifications/page.tsx, feed/page.tsx, notification-types.test.ts (신규)
  - 테스트: 3373+84 PASS (94 파일), Build PASS (engine-studio + persona-world)
- [x] **T162: 댓글 톤 시스템 업그레이드 (키워드 → 11종 벡터 기반)** ✅ 2026-02-17
  - comment-utils.ts: classifyToneWithVectors (유저 벡터 기반), buildUserThreeLayerVector, hasUserVectors
  - comments/route.ts POST: 유저 벡터 조회 → classifyToneWithVectors (벡터 우선, 키워드 fallback)
  - 설계서 11종 톤 매트릭스: comment-tone.ts + COMMENT_TONE_MATRIX (기존 구현 확인)
  - 프론트엔드 11종: CommentTone 타입 + COMMENT_TONE_CONFIG 11종 (기존 구현 확인)
  - 테스트: softThreshold, decideCommentTone (8종 톤 시나리오), hasUserVectors, buildUserThreeLayerVector, classifyToneWithVectors (+26 신규)
  - 변경: comment-utils.ts, comments/route.ts, comment-utils.test.ts
  - 테스트: 3399+84 PASS (94 파일), Build PASS

---

## DONE (v4.0 — SNS 연동)

- [x] **T169: SNS 연동 파이프라인 (OAuth + 데이터 수집 + UI)** ✅ 2026-02-17
  - AC1: SNS OAuth 인증 — sns-oauth.ts (5 OAuth 플랫폼 + 2 업로드 플랫폼), 인증 URL 빌드, 토큰 교환, state 인코딩/검증
  - AC2: SNS 데이터 수집 — sns-analyzer.ts (YouTube/Spotify/Instagram/Twitter/TikTok API 호출, 6종 ExtendedData 추출)
  - AC3: 데이터 업로드 — Netflix/Letterboxd CSV/JSON 파싱 → SNSExtendedData 변환
  - AC4: API 라우트 3개 — /sns/auth (OAuth 시작), /sns/callback (콜백 + DB 저장), /sns/upload (데이터 업로드)
  - AC5: 프론트엔드 UI — PWSnsConnect 컴포넌트 (OAuth/업로드 분기), 온보딩 페이지 SNS 선택 섹션 통합
  - AC6: 전체 파이프라인 연결 — OAuth → 분석기 → sns-processor → 벡터 생성/보정 → DB 저장
  - 신규: sns-oauth.ts, sns-analyzer.ts, auth/route.ts, callback/route.ts, upload/route.ts, pw-sns-connect.tsx
  - 변경: onboarding/index.ts, api.ts, onboarding/page.tsx, components/index.ts
  - 테스트: 3537+23 PASS (86 파일), Build PASS (engine-studio + persona-world)

---

## DONE (v4.0 — PW 품질 측정)

- [x] **T165: PW 품질 측정 (Phase 6-B)** ✅ 2026-02-17
  - AC1: Auto-Interview PW 확장 — 20문항 Golden Sample (L1:7, L2:5, L3:4, Cross:4), 동적 문항, 적응적 스케줄링
  - AC2: PIS 계산 — 3요소 가중합 (CR×0.35 + SC×0.35 + CS×0.30), 5등급 판정, 자동 조치 5종
  - AC3: 품질 로깅 — PostQualityLog, CommentQualityLog, InteractionPatternLog, 4종 이상 감지, 집계
  - AC4: Arena 피드백 루프 브릿지 — 6종 트리거 조건, 교정 추적, 결과 평가 (EFFECTIVE/PARTIAL/INEFFECTIVE/REGRESSED)
  - 신규: quality-integration.ts (Auto-Interview → PIS → Logger → Arena 통합 파이프라인)
  - 변경: quality-integration.ts (신규), quality-pw.test.ts (+66 테스트)
  - 테스트: 3514+84 PASS (85 파일), Build PASS (engine-studio + persona-world)

---

## DONE (v4.0 — PW 유저 기능 계속)

- [x] **T163: 멘션 시스템** ✅ 2026-02-17
  - AC1: 멘션 감지 (@handle 파싱) — extractMentionHandles, resolveMentions (기존 구현 확인)
  - AC2: 멘션 시 알림 생성 — scheduler/route.ts에 포스트 생성 후 resolveMentions+notifyMentions 연결
  - AC3: 멘션된 포스트/댓글 하이라이트 — pw-post-type-card.tsx에 parseMentions 적용 (댓글은 기존 구현 확인)
  - AC4: 단위 테스트 PASS — mention-service.test.ts +12 테스트 (엣지 케이스, 구조 검증)
  - 변경: scheduler/route.ts, pw-post-type-card.tsx, mention-service.test.ts
  - 테스트: 3411+84 PASS (94 파일), Build PASS (engine-studio + persona-world)

---

## DONE (v4.0 — PW 보안 확장)

- [x] **T164: PW 보안 확장 (Phase 6-A)** ✅ 2026-02-17
  - AC1: PW 특화 Gate Guard 규칙 6종 — pw-gate-rules.ts (패턴 4종 + 구조 4종 + Rate Limit 4종)
  - AC2: 유저 Trust Score 관리 — user-trust.ts (5이벤트 Decay/Recovery, 4수준 Inspection)
  - AC3: PW Kill Switch 8종 토글 + 4종 자동 트리거 — pw-kill-switch.ts (글로벌 프리즈, 기능별 토글)
  - AC4: Quarantine 시스템 — quarantine.ts (CRUD, 심각도별 만료 72h/48h/24h/수동, 활동 제한)
  - 신규: security-integration.ts (Gate Guard → Trust → Kill Switch → Quarantine 통합 파이프라인)
  - 변경: security-integration.ts (신규), security.test.ts (+37 테스트)
  - 테스트: 3448+84 PASS (94 파일), Build PASS

## DONE (v4.0 — PW 상점/결제/설정)

- [x] **T170: 알림 환경설정 (PW-F1)** ✅ 2026-02-21
  - AC1: PWNotificationPreference 모델 + 021 마이그레이션
  - AC2: notification-preference.ts 서비스 (getPreferences, updatePreferences, shouldDeliver)
  - AC3: API GET/PUT /api/persona-world/notification-preferences
  - AC4: /settings/notifications 페이지 (8종 토글 + 방해금지 시간대)
  - 테스트: 3713+84 PASS, Build PASS

- [x] **T171: 크레딧 실결제 — Toss Payments 연동 (PW-F2)** ✅ 2026-02-21
  - AC1: CoinTransaction 모델 + 022 마이그레이션
  - AC2: coin-packages.ts (4종 패키지: 100/500/1000/3000 코인)
  - AC3: credit-service.ts (getBalance, addCredits, spendCredits, purchaseCredits, getTransactionHistory)
  - AC4: API GET/POST /credits + POST /credits/toss-confirm
  - AC5: Shop 페이지 코인 충전 섹션 (Toss 위젯 연동)
  - 테스트: 3713+84 PASS, Build PASS

- [x] **T172: 프로필 설정 페이지 (PW-F3)** ✅ 2026-02-21
  - AC1: /settings 메인 페이지 (계정/알림/결제 3탭)
  - AC2: 계정 설정 탭 (프로필 카드 + 취향 분석 링크 + 데이터 초기화/로그아웃)
  - AC3: 알림 탭 (/settings/notifications 연결)
  - AC4: 결제 탭 (코인 잔액 카드 + 거래 내역 리스트 + 충전 링크)
  - AC5: 프로필 페이지 Settings 아이콘 → /settings 링크로 교체
  - ENV 통일: NEXT_PUBLIC_ENGINE_API_URL → NEXT_PUBLIC_ENGINE_STUDIO_URL
  - 테스트: 3713+84 PASS, Build PASS

---

## DONE (v4.0 — PW 모더레이션)

- [x] **T166: 자동 모더레이션 (Phase 7-A)** ✅ 2026-02-21
  - AC1: 3단계 파이프라인 — auto-moderator.ts (기존 구현 확인: Stage1 규칙 ~5ms, Stage2 PII/시스템누출 ~50ms, Stage3 비동기 24h)
  - AC2: 신고 처리 6종 — report-handler.ts (DI 패턴, Rate limit 10/hr 30/day, 자동 해결, Trust Decay)
  - AC3: 관리자 액션 — moderation-actions.ts (9종 액션, 감사 로그)
  - AC4: 대시보드 서비스 — dashboard-service.ts (활동/품질/보안/신고 4섹션, KPI 알림)
  - AC5: API — POST /persona-world/reports, GET /persona-world-admin/dashboard, GET/POST /persona-world-admin/moderation
  - AC6: 배럴 익스포트 — moderation/index.ts + persona-world/index.ts
  - AC7: API 문서 최신화 — internal.md/openapi, public.md/openapi
  - 신규: report-handler.ts, moderation-actions.ts, dashboard-service.ts, moderation/index.ts, reports/route.ts, dashboard/route.ts
  - 변경: persona-world/index.ts, moderation/route.ts, internal.md, public.md, internal.openapi.yaml, public.openapi.yaml
  - 테스트: 3713 PASS (91 파일), Build PASS

---

## DONE (v4.0 — PW 운영)

- [x] **T167: 운영 스케줄 + KPI (Phase 7-B)** ✅ 2026-02-21
  - AC1: 8종 예약 작업 실행 — job-runner.ts (DI 기반, 8종 Job 함수 + executeJob/executeDueJobs)
  - AC2: KPI 데이터 수집 — kpi-aggregator.ts (KPIDataProvider DI, 서비스 13필드 + UX 10필드 집계)
  - AC3: API — GET/POST /operations/jobs (목록+수동실행), GET /operations/kpis (14종 KPI 대시보드)
  - AC4: API 문서 — internal.md/openapi 최신화
  - 기존: scheduled-jobs.ts (8종 스케줄 정의, cron 파싱), kpi-tracker.ts (8+6종 KPI 계산, 트렌드 분석)
  - 신규: job-runner.ts, kpi-aggregator.ts, operations/jobs/route.ts, operations/kpis/route.ts
  - 변경: operations.test.ts (+17 테스트), internal.md, internal.openapi.yaml
  - 테스트: 3730 PASS (91 파일), Build PASS

---

## DONE (v4.0 — PW 비용 관리)

- [x] **T168: 비용 모니터링 & 제어 (Phase 8)** ✅ 2026-02-21
  - AC1: 비용 추적 확장 — usage-tracker.ts (6종 LLMCallType, 비용 정수 기반 로깅, 일간/월간 리포트)
  - AC2: 예산 알림 체계 — budget-alert.ts (4단계 일일/월간 임계값, 4종 CostOverrunAction 자동 조치)
  - AC3: 비용 모드 3종 — cost-mode.ts (QUALITY/BALANCE/COST_PRIORITY, 활동 빈도 + 예산 + PIS 목표)
  - AC4: 비용 최적화 — optimizer.ts (PIS 적응적 인터뷰, 댓글 배치, 캐시 적중률, 호출 순서 최적화)
  - AC5: 통합 서비스 — cost-integration.ts (DI 기반 CostDataProvider, 대시보드 빌드 + 모드 변경)
  - AC6: API — GET/POST /operations/cost (비용 대시보드 + 모드 변경)
  - AC7: API 문서 — internal.md/openapi 최신화
  - 기존: usage-tracker.ts, budget-alert.ts, cost-mode.ts, optimizer.ts (4개 모듈 구현 완료)
  - 신규: cost-integration.ts, cost/index.ts, operations/cost/route.ts
  - 변경: persona-world/index.ts, cost.test.ts (+8 테스트), internal.md, internal.openapi.yaml
  - 테스트: 3738 PASS (91 파일), Build PASS

---

## QUEUE

- [x] **T142: 트리거 맵 Rule DSL 확장** ✅ 2026-02-16
  - 구조화된 표현식 (Compare/Range/Contains/AND/OR/NOT)
  - 필드 경로 해석 (L1/L2/L3/state/context)
  - 우선순위 기반 규칙 평가 + 효과 병합 + 쿨다운
  - 규칙/세트 검증 + 컴파일 + 기존 TriggerRule 호환 변환
  - 67 테스트 PASS, Build PASS
- [x] **T143: 관계 프로토콜 (Relationship Protocol)** ✅ 2026-02-16
  - 4단계 관계 발전: STRANGER→ACQUAINTANCE→FAMILIAR→CLOSE
  - 5종 관계 유형: NEUTRAL/ALLY/RIVAL/MENTOR/FAN
  - 단계+유형 기반 행동 프로토콜 (톤 허용/자기노출/논쟁 의지)
  - 단계 전환 감지, 진행률 추적, 관계 요약
  - 41 테스트 PASS, Build PASS
- [x] **T144: 보이스 스펙 (Voice Spec) 정의** ✅ 2026-02-16
  - VoiceSpec: VoiceProfile + VoiceStyleParams + 가드레일 + 적응 규칙
  - 가드레일: 금지 패턴/행동, 톤 경계 (격식도/공격성)
  - 상태 기반 적응: mood/energy/socialBattery/paradoxTension
  - 일관성 설정, 요약 생성, 경계 검사
  - 34 테스트 PASS, Build PASS
- [x] **T145: 아레나 — 1:1 스파링 + 심판관** ✅ 2026-02-16
  - ArenaSession 라이프사이클: create/start/addTurn/cancel
  - 턴 관리: getNextSpeaker (교대), getRemainingBudget, 자동 종료 (maxTurns/budget)
  - 비동기 세션 실행기: runSession (LLM DI, 에러 핸들링)
  - 룰 기반 심판: judgeSessionRuleBased (4차원 평가)
  - LLM 심판 프롬프트: buildJudgmentPrompt
  - 가중 평균 종합 점수: computeOverallScore (JUDGMENT_WEIGHTS)
  - 61 테스트 PASS, Build PASS
- [x] **T146: 아레나 — 관리자 UI + 비용 제어** ✅ 2026-02-16
  - 예산 정책: ArenaBudgetPolicy (월간/일일/세션별 한도, 경고/차단 임계)
  - 비용 추정: estimateSessionCost (프로필+턴+판정 토큰)
  - 승인 검사: checkSessionApproval (일일 한도, 토큰 한도, 월간 예산)
  - 지출 현황: computeMonthlySpending (일별 분류, 상태 판정)
  - 교정 플로우: create/approve/reject + buildCorrectionApplyResult
  - 관리자 통계: computeAdminStats (세션/판정/이슈/교정)
  - 예산 검증: validateBudgetPolicy, getBudgetAlertLevel
  - 59 테스트 PASS, Build PASS
- [x] **T147: 아레나 — 교정 루프 (스타일북 반영)** ✅ 2026-02-16
  - 교정 제안 추출: extractCorrectionSuggestions (판정 이슈 → 제안)
  - 패치 생성: buildStyleBookPatch (5카테고리별 패치 오퍼레이션)
  - 패치 검증: validatePatch (confidence, 일일 한도, 오퍼레이션 수)
  - 패치 적용: applyVoiceProfilePatch, applyStyleParamsPatch, applyFactbookPatch
  - 전체 파이프라인: executeCorrectionLoop (생성→검증→적용)
  - 과교정 감지: detectOverCorrection (일일 한도, 동일 카테고리 연속)
  - 스냅샷 diff: summarizeSnapshotDiff (전후 비교)
  - 60 테스트 PASS, Build PASS
- [x] **T150: RAG 가중 검색 통합 (Poignancy + Forgetting)** ✅ 2026-02-16
  - 가중 검색: searchMemories (recency×0.3 + similarity×0.4 + poignancy×retention×0.3)
  - 최신성: computeRecency (지수 감쇠, 윈도우 설정)
  - 항목 점수: scoreMemoryItem (retention, recency, effectivePoignancy, ragScore)
  - 핵심 기억 부스트: CORE_POIGNANCY_THRESHOLD (0.8) × 1.2
  - 컨텍스트 빌더: buildRAGContextText (토큰 한도, 태그)
  - 타입별 검색: searchInteractionMemories, searchPostMemories, searchConsumptionMemories
  - 통계: computeMemoryRetentionStats (retention 분포, 활성/망각/핵심 카운트)
  - 43 테스트 PASS, Build PASS
- [x] **T151: 소셜 모듈 B — Connectivity (보안용)** ✅ 2026-02-16
  - 타입: SocialModuleConfig, FeatureBindings, RelationshipEdge, NodeMetrics
  - 그래프 분석: buildAdjacencyMap, extractNodeIds, computeNodeDegree
  - 클러스터링: computeClusteringCoefficient, computeNodeMetrics
  - Hub/Isolate 탐지: classifyNode (HUB/NORMAL/PERIPHERAL/ISOLATE)
  - 보안 이상 탐지: detectAnomalies (연결 급증/긴장 클러스터/봇 패턴/고립 위험)
  - 기능 바인딩: FEATURE_BINDINGS (matching/feed/arena/security)
  - 설정 검증: validateSocialModuleConfig
  - 52 테스트 PASS, Build PASS
- [x] **T152: 프롬프트 캐싱 적용** ✅ 2026-02-16
  - Anthropic API cache_control 블록 레벨 캐싱
  - 프롬프트 분리 (static/dynamic), 블록 병합, cache_control 빌드
  - 비용 계산 (write 1.25x, read 0.1x), 절감 추정 (82%)
  - 캐시 통계, 히스토리 집계, 페르소나별 효율 분석, 최적화 권고
  - 71 테스트 PASS, Build PASS
- [x] **T153: 데이터 아키텍처 — Memory vs Instruction 분리** ✅ 2026-02-16
  - Instruction Layer (정체성): 벡터/보이스/팩트북불변/프롬프트/규칙
  - Memory Layer (기억): 상태/인터랙션/포스트/소비/관계/진화
  - 투영/추출: extractInstruction, extractMemory, composePersonaView
  - 접근 정책: 12 컴포넌트별 read/write 경계, instruction_write는 admin/arena만
  - 변경 감지, 무결성 검증, 성장 통계, 프롬프트 섹션 분리
  - 62 테스트 PASS, Build PASS
- [x] **T154: ArenaSession 테이블 + 물리적 격리** ✅ 2026-02-16
  - DB 레코드 타입: Session/Turn/Judgment/Correction/TokenUsage 5종
  - 물리적 격리: 네임스페이스, 쓰기 검증 (Persona 직접 변경 금지)
  - 영속성: sessionToRecord, sessionToRecordSet (트랜잭션 단위)
  - 라이프사이클: active→completed→archived→expired 5단계
  - 토큰 추적: 페이즈별 비용 집계, 아카이브 정리 워크플로우
  - 46 테스트 PASS, Build PASS
- [x] **T155: 관리자 보안 대시보드** ✅ 2026-02-16
  - 4계층 통합 모니터링: GateGuard/IntegrityMonitor/OutputSentinel/KillSwitch
  - 계층별 메트릭 집계: 판정 분포, 위반 카테고리, 차단률, 격리 통계
  - 출처 추적 메트릭: 신뢰도 분포 (high/medium/low/minimal), 격리 카운트
  - 보안 알림 생성: 계층별 알림 (인젝션/PII/드리프트/팩트북/동결/트리거)
  - 전체 상태 판정: healthy/warning/critical/frozen
  - 스냅샷 비교: 상태 변화 감지, 새 알림/해결 알림 추적
  - 68 테스트 PASS, Build PASS
- [x] **T156: 감정 전염 (Emotional Contagion)** ✅ 2026-02-16
  - 분위기(atmosphere) 전파 모델: 정보 아닌 감정만 전달
  - 관계 가중치: warmth(0.5) + frequency(0.3) + inverseTension(0.2)
  - 수신 저항: paradoxTension + agreeableness + socialOpenness 기반
  - 위상 증폭: 허브(1.3×), 클러스터(1.2×), 고립 감쇠(0.3×)
  - 전파 라운드: 단일 효과 계산 → 집계 → maxDelta 제한 → 상태 적용
  - 안전 검사: checkMoodSafety (warning/critical 임계), 수렴 판정
  - 통계: 양/음 효과 분류, topInfluencer, mostAffected, 분산 추적
  - 53 테스트 PASS, Build PASS

- [x] **T157: 하드코딩/더미데이터 전수 삭제** ✅ 2026-02-16
  - `src/lib/demo-fixtures/` 모듈 생성 (4개 fixture 파일 + index)
  - 7개 API 라우트에서 인라인 더미데이터 제거 → fixtures 참조로 교체
  - 하드코딩 연락처(전화번호, 이메일) → example.com/000-0000-0000으로 교체
  - 하드코딩 ID(u1, p_001, INC-1001) → demo- 접두사 ID로 교체
  - 하드코딩 URL(deepsight.ai/webhooks) → example.com으로 교체
  - 하드코딩 IP(192.168.1.1, 10.0.0.5) → 0.0.0.0으로 교체
  - 골든 샘플은 인큐베이터 스펙 기능이므로 유지 (의도된 데이터)
  - 3159 테스트 PASS, Build PASS

- [x] **T158: 운영/설정 API 전면 DB 동적 연결 + 마이그레이션** ✅ 2026-02-17
  - 11개 API 라우트 인메모리→Prisma DB 전환 (graceful degradation 유지)
  - Prisma 스키마 보강: ApiEndpoint/Archetype 컬럼 추가, SystemLog/PostMortem/DRDrill 모델 신규
  - 마이그레이션 SQL: `016_ops_config_db_connect.sql`
  - 3159 테스트 PASS, Build PASS

---

## DONE (v4.0 — 생성 다양성)

- [x] **T173: 페르소나 생성 다양성 확장 + 풀네임** ✅ 2026-02-21
  - AC1: 이름 풀 국제화 — NAME_POOLS 92개 다국적 풀네임 (한국 60% + 글로벌 40%)
  - AC2: LLM 프롬프트 다양성 — "한국어 이름 2~4글자" 제약 제거, 다국적 풀네임 지시
  - AC3: 지역/타임존 국제화 — REGION_POOLS 55개 글로벌 도시, inferTimezone() 동적 타임존
  - AC4: 아키타입 균등 분배 — suggestUnderrepresentedArchetypes 연동, 저사용 우선 배정
  - 변경: character-generator.ts, llm-character-generator.ts, structured-fields.ts, index.ts, structured-fields.test.ts
  - 테스트: 3738 PASS (91 파일), Build PASS

- [x] **T174: 페르소나 기본 프로필 확장 (인구통계)** ✅ 2026-02-21
  - AC1: 스키마 확장 — gender, nationality, educationLevel, languages, knowledgeAreas 5필드 + 023 마이그레이션
  - AC2: 인구통계 추론 — inferGender, inferNationality, inferEducationLevel, inferLanguages, inferKnowledgeAreas
  - AC3: 파이프라인 연동 — generateDemographicFields → savePersonaToDb (auto/manual 양 경로)
  - AC4: UI 표시 — 페르소나 상세 Overview 탭 "프로필" 섹션 (성별/출생년도/국적/지역/교육/언어/지식)
  - 변경: schema.prisma, 023_persona_demographics.sql, structured-fields.ts, pipeline.ts, api.ts, [id]/route.ts, [id]/page.tsx
  - 테스트: 3738 PASS (91 파일), Build PASS

- [x] **T175: 페르소나 기억 뷰어 (관리자)** ✅ 2026-02-21
  - AC1: API — GET /personas/[id]/memories (tab=activity/consumption/interaction/relationship)
  - AC2: 기억 탭 — 활동/소비/대화/관계 4서브탭 + 리스트 렌더링
  - AC3: 상태 게이지 — mood/energy/socialBattery/paradoxTension/narrativeTension 5게이지
  - AC4: 기억 통계 — 활동/소비/대화/관계 카운트 + 총 기억 수
  - 변경: memories/route.ts (신규), [id]/page.tsx (MemoryTab 추가)
  - 테스트: 3738 PASS (91 파일), Build PASS

---

## DONE (v4.0 — 매칭 고도화)

- [x] **T178: Trust-Weighted Matching — 기존 TrustScore를 매칭 파이프라인에 통합** ✅ 2026-02-24
  - AC1: SocialSignal 인터페이스 + MatchingContext — trust-score.ts 결과를 매칭에 주입하는 타입 정의
  - AC2: Basic/Advanced Tier Trust 블렌딩 — `finalScore = (1 - trustWeight) × rawScore + trustWeight × trustScore`, TRUST_MAX_WEIGHT=0.2
  - AC3: Exploration Tier 제외 — 세렌디피티 보존, trustBoost=0 고정
  - AC4: computeTrustWeight 함수 — `min(TRUST_MAX_WEIGHT, trustLambda × TRUST_MAX_WEIGHT)`, Cold-Start 자동 처리 (λ sigmoid)
  - AC5: matchPersona/matchAll 확장 — optional SocialSignal/MatchingContext 파라미터, 하위 호환 유지
  - AC6: MatchBreakdown.trustBoost 필드 + generateExplanation 신뢰 보정 표시
  - AC7: 설계서 §12.3 최신화 — Trust-Weighted Matching 공식/활성화 곡선/적용 범위 문서화
  - 변경: three-tier-engine.ts, persona-engine-v4.md
  - 테스트: matching.test.ts (+17 Trust 통합 테스트), consumer-journey.test.ts (breakdown 동기화), 145 PASS

## DONE (v4.0 — 매칭 Enrichment Layer)

- [x] **T215: MatchingContext Enrichment Layer — 매칭 시스템 고도화** ✅ 2026-02-24
  - AC1: EnrichedMatchingContext 타입 시스템 — 12종 시그널 타입 (Relationship, Negative, Engagement, Consumption, Topology, Emotional, Session, Quality, Exposure, Experiment)
  - AC2: 시그널 → 점수 변환 함수 12종 — computeVoiceSimilarity, computeRelationshipDepthScore, computeNegativePenalty, computeEngagementBoost, computeColdStartFactor, computeFatigueDecay, computeRediscoveryBoost, computeQualityWeight, computeConsumptionMatch, computeTopologyModifier, computeEmotionalModifier, computeDynamicPressure
  - AC3: applyEnrichmentSignals — 모든 시그널을 종합하여 최종 점수 계산, A/B 기능 토글 지원
  - AC4: computeDynamicTierWeights — 유저 세그먼트별(신규/이탈/숙련/일반) 동적 Tier 비율 조정
  - AC5: three-tier-engine.ts 통합 — matchPersona/matchAll에 enrichment 파이프라인 주입, 블록/봇 사전 필터링
  - AC6: XAI 확장 — EnrichmentExplanation 타입, generateEnrichmentExplanation 함수
  - AC7: Analytics 확장 — ExperimentResult 타입, calculateExperimentUplift 함수, AnalyticsDashboard.experiments 필드
  - AC8: 설계서 §12 최신화 — Enrichment Layer 아키텍처, 12개 시그널 테이블, 최종 점수 공식, 동적 Tier 가중치
  - 신규: context-enricher.ts (479줄)
  - 변경: three-tier-engine.ts, explanation.ts, analytics.ts, index.ts, persona-engine-v4.md
  - 테스트: context-enricher.test.ts (71 테스트), 기존 matching.test.ts 78 PASS (하위 호환), 전체 263 매칭 PASS

## DONE (v4.0 — 페르소나 품질 개선)

- [x] **T216: API 벡터 누적 포화 수정 (CRITICAL)** ✅ 2026-02-24
  - AC1: `computeVectorsFromApiResponses()`에서 l1Delta/l2Delta를 응답 수(N)로 나누어 포화 방지
  - AC2: 단위 테스트 — 30개 응답 시 포화 안 됨 검증 (3 tests PASS)
  - 변경: compute.ts

- [x] **T217: Cold-Start confidence 정규화 (HIGH)** ✅ 2026-02-24
  - AC1: confidence 계산 시 `targetDimensions` 기반 독립 관측 수로 계산 (복합질문 부풀림 방지)
  - AC2: 단위 테스트 — 복합질문 시나리오에서 confidence 정확도 검증 (2 tests PASS)
  - 변경: cold-start.ts

- [x] **T218: 3-Tier 매칭 스코어 [0,1] 범위 보장 (MEDIUM)** ✅ 2026-02-24
  - AC1: Basic/Advanced/Exploration 3개 Tier 함수 반환 시 `clamp()` 적용
  - AC2: 단위 테스트 — [0,1] 범위 검증 (3 tests PASS)
  - 변경: three-tier-engine.ts

- [x] **T219: 장르 가중치 중심 기준 스케일링 (MEDIUM)** ✅ 2026-02-24
  - AC1: `0.5 + (v - 0.5) * weight` 중심 기준 스케일링으로 변경 (원점 곱셈 편향 제거)
  - AC2: 단위 테스트 — 대칭성 검증 + 고차원 비포화 검증 (3 tests PASS)
  - 변경: tuning.ts, matching.test.ts

- [x] **T220: Balancer 아키타입 분류 로직 개선 (MEDIUM)** ✅ 2026-02-24
  - AC1: Balancer distance를 강제값(0.1) 대신 실제 거리×0.7 보너스로 변경
  - AC2: 단위 테스트 — 균형 벡터 + 경계 케이스 검증 (2 tests PASS)
  - 변경: user-archetype.ts

- [x] **T221: Psychometric↔Projection L2→L1 매핑 정합성 (MEDIUM)** ✅ 2026-02-24
  - AC1: `OCEAN_L1_MAPPINGS`에 projection-coefficients.ts와 일치하는 매핑 보강 (neuroticism→lens, conscientiousness→purpose 추가)
  - AC2: 단위 테스트 — 5개 L2 매핑 존재 + predictL1FromL2 방향 검증 (4 tests PASS)
  - 변경: psychometric.ts
  - 테스트: quality-fixes.test.ts (+17 신규), 전체 4122 PASS (101 파일), Build PASS

---

## DONE (v4.0 — Enum 통일)

- [x] **T177: Enum 이름 통일 마이그레이션** ✅ 2026-02-24
  - AC1: OnboardingLevel — LIGHT→QUICK, MEDIUM→STANDARD (engine-studio Prisma + 코드 + 마이그레이션 SQL)
  - AC2: PostSource — 설계서를 구현값(FEED_INSPIRED/ARENA_TEST/SCHEDULED) 기준으로 동기화
  - AC3: ArenaSessionStatus — 설계서를 구현값(PENDING/RUNNING/COMPLETED/CANCELLED) 기준으로 동기화
  - AC4: ReportReason — public.md/openapi를 스키마 기준(SPAM/INAPPROPRIATE/HARASSMENT/MISINFORMATION/OTHER)으로 통일
  - 변경: schema.prisma, supabase-init.sql, 033 마이그레이션, onboarding-engine.ts, cold-start routes(3), api.ts(PW), reports/route.ts
  - 설계서: persona-engine-v4-impl.md, persona-engine-v4-intelligence.md, persona-world-v4-core.md, public.md, public.openapi.yaml
  - gap-analysis.md 업데이트: 5개 Enum 불일치 → 4개 해결, 1개 의도적 확장(PersonaStatus)

---

## DONE (v4.0 — PIS 엔진)

- [x] **T176: PIS (Persona Integrity Score) 엔진 구현** ✅ 2026-02-24
  - AC1: ContextRecall — 기억 보유율 기반 정확도 측정 (recentMemoryAccuracy, mediumTermAccuracy, coreMemoryRetention)
  - AC2: SettingConsistency — 품질 로그 기반 준수도 측정 (factbookCompliance, voiceSpecAdherence, vectorBehaviorAlign)
  - AC3: CharacterStability — VoiceStyle 드리프트 + 톤 분산 + GrowthArc 정합 (persona-drift.ts 연동)
  - AC4: PIS 통합 — measurePIS() + measurePISBatch() + DI Provider + 데이터 품질 추적
  - 신규: pis-engine.ts (PISDataProvider, 3개 측정 함수, 통합 파이프라인, 배치 측정)
  - 변경: index.ts (배럴 익스포트), quality-pw.test.ts (+69 테스트)
  - 테스트: 4147 PASS (101 파일), Build PASS

## DONE (v4.0 — Developer Console)

- [x] **T224: Developer Console 미완성 UI 완성** ✅ 2026-02-25
  - AC1: Logs 페이지 — 1025줄, 3탭 (로그/에러대시보드/알림), 고급 필터링, CSV/JSON/JSONL 내보내기
  - AC2: Webhooks 관리 — 732줄, 3탭 (엔드포인트/전송이력/이벤트), CRUD, 테스트 전송, SSRF 방어
  - AC3: Team 관리 — 663줄, 3탭 (멤버/초대/권한), 초대/삭제/역할변경, CSV 내보내기
  - 백엔드: API 라우트 전체 구현 (logs 6개, webhooks 7개, team 6개) + Prisma DB 연결
  - 서비스: logs-service.ts, webhooks-service.ts, team-service.ts 완료
  - 참고: 이전 작업에서 이미 구현 완료되어 있었음 (TASK.md 미반영 상태)
  - 테스트: 4147 PASS (101 파일), Build PASS

---

## DONE (v4.0 — 감정 전염 + P0 버그)

- [x] **T225: 감정 전염 시스템 연결 + Engine Studio 제어** ✅ 2026-02-25
  - AC1: emotional-contagion.ts → persona-world/ 이동 + barrel 익스포트
  - AC2: contagion-integration.ts (DI 기반 DB 로드→실행→반영→안전 검사)
  - AC3: cron-scheduler 연동 (Kill Switch 게이트, 기본 OFF)
  - AC4: admin scheduler API trigger_contagion 수동 실행
  - AC5: 기존 53 테스트 PASS, 전체 4147 PASS, Build PASS
  - 변경: emotional-contagion.ts(이동), contagion-integration.ts(신규), cron-scheduler-service.ts, scheduler-service.ts, scheduler/route.ts, persona-world/index.ts

- [x] **T227: postCount 하드코딩 수정 (GET /personas)** ✅ 2026-02-25
  - AC1: personas 목록 API에서 `postCount: 0` → `p._count.posts` 실제 카운트 조회
  - 변경: personas/route.ts (`_count.posts` select 추가, 응답 매핑 수정)

- [x] **T228: register 응답 벡터에 sociability 추가** ✅ 2026-02-25
  - AC1: POST /auth/register 응답에 sociability 필드 포함 (7D 반환)
  - AC2: PersonaWorldUser 스키마에 sociability 컬럼 추가 (6D→7D)
  - 변경: register/route.ts, schema.prisma, 034_pw_user_sociability.sql(신규)

---

## DONE (v4.0 — API 문서)

- [x] **T226: API 문서 최신화 (미문서화 11개 + 인증/응답 불일치)** ✅ 2026-02-25
  - AC1: public.md/openapi — GET /follows, DELETE /comments/:id, credits 3개, notifications 4개, SNS 4개, cold-start 추가
  - AC2: internal.md/openapi — activity, evolution, news, quality 4개 admin 엔드포인트 추가
  - AC3: 인증 요구사항 표 추가 (공개 7개 / Internal Token 필요 8개 구분)
  - AC4: register vector 6D→7D (sociability), SixDVector→SevenDVector, 온보딩 벡터 설명
  - 변경: public.md, public.openapi.yaml, internal.md, internal.openapi.yaml, TASK.md

---

## DONE (v4.0 — 오케스트레이션 테스트)

- [x] **T229: 핵심 오케스트레이션 테스트 추가** ✅ 2026-02-25
  - AC1: cron-scheduler-service.ts 테스트 — 11 테스트 (포스트/인터랙션 오케스트레이션, LLM 미설정 스킵, 감정 전염 Kill Switch ON/OFF, 에러 graceful degradation, 멘션 알림)
  - AC2: interaction-pipeline.ts 테스트 — 13 테스트 (빈 피드 early return, 자기 글 스킵, 좋아요 확률, 댓글 engagement 결정, 벡터 캐싱, voice anchor, 관계 프로토콜)
  - AC3: post-pipeline.ts 테스트 — 15 테스트 (주제 선택 fallback, voice anchor 3단계, voice critical 재생성, emotionalState 설명, poignancy/postSource)
  - 변경: cron-scheduler-service.test.ts(신규), interaction-pipeline.test.ts(신규), post-pipeline.test.ts(신규)
  - 테스트: 4186 PASS (104 파일), Build PASS

---

## DONE (v4.0 — 프롬프트 캐싱 검증)

- [x] **T230: 프롬프트 캐싱 실적용 검증** ✅ 2026-02-25
  - AC1: cache_control 이미 전 호출에 적용 확인 — buildSystemBlocks() → cache_control:{type:"ephemeral"} 블록 생성, generateText()에서 Anthropic SDK에 전달, 응답 cache 토큰 추출+DB 로깅 완료
  - AC2: 미적용 경로 없음 — Post/Comment/Consumption/UserInteraction/NewsReaction 5종 LLM 어댑터 모두 systemPromptPrefix 사용, News Analysis만 의도적 미적용(Haiku 저비용)
  - 기존 테스트: llm-client.test.ts 8테스트 + llm-adapter.test.ts 18테스트에서 캐시 분리 검증 완료
  - 코드 변경 없음 (검증만 수행)

## DONE (v4.0 — Arena ↔ Quality 루프)

- [x] **T231: Arena ↔ Quality 양방향 루프 완성** ✅ 2026-02-25
  - AC1: Arena 결과 → correction-loop.ts 패치 → Instruction Layer(voiceProfile/styleParams/factbook) 반영 경로 검증 완료
  - AC2: arena-feedback.ts 신규 생성 — 양방향 브릿지:
    - Arena→Quality: `applyAndTrackCorrection()` — `executeCorrectionLoop()` 전체 파이프라인 + CorrectionTracking 생성
    - Quality→Arena: `processQualityTriggers()` — 트리거 처리 + CRITICAL 카운트
    - 피드백 루프: `evaluatePendingCorrections()` — 전후 PIS 비교 → verdict (EFFECTIVE/PARTIAL/INEFFECTIVE/REGRESSED)
    - 효과 요약: `summarizeCorrectionEffectiveness()` — successRate + avgImprovement
  - 신규: arena-feedback.ts, arena-feedback.test.ts (17 테스트)
  - 변경: persona-world/index.ts (배럴 익스포트)
  - 테스트: 4203 PASS (105 파일), Build PASS

---

## DONE (v4.0 — 자율 인터랙션)

- [x] **T258: 자율 팔로우 파이프라인 통합** ✅ 2026-03-01
  - AC1: interaction-pipeline.ts — 좋아요 작성자 대상 follow-engine 확률 판정 + P2002 방어
  - AC2: InteractionPipelineDataProvider 확장 — saveFollow, getCrossAxisSimilarity, getParadoxCompatibility, getPersonaState
  - AC3: cron-scheduler-service.ts — follow provider 구현
  - 테스트: 4277 PASS (108 파일), Build PASS

- [x] **T259: 자율 리포스트 엔진 + 파이프라인 통합** ✅ 2026-03-01
  - AC1: repost-engine.ts 신규 — computeRepostProbability (matchScore × interactivity × mood × 0.3)
  - AC2: interaction-pipeline.ts — 좋아요 후 리포스트 확률 판정 + P2002 방어
  - AC3: cron-scheduler-service.ts — saveRepost (트랜잭션 생성 + repostCount 증가)
  - 테스트: repost-engine.test.ts (5 테스트), interaction-pipeline.test.ts (+7), 4277 PASS

- [x] **T260: COLLAB 포스트 팬텀 멘션 방지** ✅ 2026-03-01
  - AC1: content-generator.ts — COLLAB 프롬프트에 실제 활성 페르소나 핸들 목록 주입
  - AC2: post-pipeline.ts — stripPhantomMentions() 후처리 필터 (존재하지 않는 @멘션 제거)
  - AC3: PostPipelineDataProvider.getActivePersonaHandles — 활성 페르소나 핸들 조회 인터페이스
  - 테스트: content-generator.test.ts (+4), post-pipeline.test.ts (+5), 4286 PASS

---

## DONE (v4.0 — 검색 고도화)

- [x] **T261: Explore 검색 기능 수정 + 자동완성** ✅ 2026-03-01
  - AC1: 일반 텍스트 검색 시 포스트 내용 기반 결과 표시 (기존 페르소나 클러스터만 표시 → 포스트 검색으로 변경)
  - AC2: 검색 모드 시 탐색 섹션 (클러스터/핫토픽/토론/신규) 숨김 — 검색 결과만 표시
  - AC3: 검색 자동완성 — suggestions API (페르소나 이름/핸들 + 해시태그) + 드롭다운 UI
  - 신규: search/suggestions/route.ts
  - 변경: explore/page.tsx, api.ts, types.ts
  - 테스트: 4286 PASS (108 파일)

---

## DONE (v4.0 — PersonaWorld v4.0 전체 갭 구현)

- [x] **T263~T268: PersonaWorld v4.0 DB 스키마 + 기본 모델** ✅ 2026-03-02
  - PersonaState 확장 (postsThisWeek, commentsThisWeek, lastActivityAt)
  - PersonaRelationship 확장 (lastInteractionAt, warmth/frequency/depth)
  - BudgetConfig 싱글턴 모델, DailyCostReport 집계 모델
  - ModerationLog, PWQuarantineEntry, UserTrustScore 모델
  - KPISnapshot, PersonaActivityLog 모델

- [x] **T269~T277: PW 보안 계층 통합** ✅ 2026-03-02
  - pw-gate-rules.ts: 6종 PW 특화 Gate Guard 패턴 + 4종 구조 검사 + 4종 Rate Limit
  - user-trust.ts: Trust Score 5이벤트 Decay/Recovery + 4수준 Inspection
  - pw-kill-switch.ts: 8종 PW Kill Switch 토글 + 4종 자동 트리거
  - quarantine.ts: 4단계 심각도별 자동 만료 (72h/48h/24h/수동)
  - security-middleware.ts: 입력(Gate Guard+Trust)+출력(Sentinel+Quarantine) 통합
  - trust-score-crud.ts: Prisma CRUD + 일일 회복 배치

- [x] **T278~T286: 모더레이션 + 품질 측정 + 스케줄러** ✅ 2026-03-02
  - moderation-runner.ts: DI 기반 비동기 분석 (Stage 3)
  - quality-runner.ts: 인터랙션 패턴 분석 + PIS 스냅샷 + Arena 트리거
  - quality-logger.ts: 포스트/댓글/인터랙션 품질 로그 유틸
  - post-pipeline.ts: 보안 옵션 + 모더레이션 + quarantine 통합
  - interaction-pipeline.ts: 보안 옵션 통합

- [x] **T287~T298: 비용 제어 모듈** ✅ 2026-03-02
  - cost-runner.ts: DI 기반 비용 제어 러너 (예산 체크, 일일 집계)
  - cost/index.ts: 비용 모듈 배럴 익스포트
  - budget route: GET/PUT /operations/budget BudgetConfig CRUD

- [x] **T299~T303: 비용 제어 통합** ✅ 2026-03-02
  - cron-scheduler-service.ts: 예산 체크 → EMERGENCY/CRITICAL 차단, WARNING 빈도 감소
  - admin cost route: BudgetConfig 기반 비용 대시보드 (SystemConfig fallback)

- [x] **T304~T307: 유저 인터랙션 보안 통합** ✅ 2026-03-02
  - user-rate-limiter.ts: 인메모리 슬라이딩 윈도우 (like 60/h, comment 30/h, follow 20/h, repost 30/h)
  - likes/comments/follows/repost route: Trust Score 체크 + Rate Limit + Gate Guard

- [x] **T308~T311: 온보딩 API 확장** ✅ 2026-03-02
  - daily-micro.ts: 마이크로 질문 엔진 (불확실성 기반 차원 선택, ±0.05 미세 조정)
  - daily-question route: GET (오늘의 질문) + POST (응답 처리)
  - vector-provenance.ts: 벡터 출처 추적 모듈 (cold-start/micro/sns/activity/manual)
  - T312~T314: 이전 세션에서 이미 구현 완료 (pw-gate-rules, user-trust, quarantine)

- [x] **T315~T320: v4.0 일일 운영 배치** ✅ 2026-03-02
  - v4-operations cron route: 6종 배치 작업 통합
  - T315: DailyCostReport 집계
  - T316: Trust Score 일일 회복
  - T317: 비동기 모더레이션 Stage 3
  - T318: 인터랙션 패턴 분석
  - T319: PIS 스냅샷 저장
  - T320: 관계 감쇠 (warmth × 0.99, frequency × 0.98, 7일+ 비활동)

- [x] **T321~T323: DI Provider Prisma 구현** ✅ 2026-03-02
  - T321: security-provider-factory.ts — SecurityMiddlewareProvider Prisma 팩토리 + 스케줄러 연동
  - T322~T323: QualityRunnerProvider, AsyncAnalysisProvider — v4-operations route에 인라인 구현

- [x] **T324~T325: 피드 v4.0 확장** ✅ 2026-03-02
  - social-boost.ts: 소셜 모듈 부스트 (warmth/frequency/depth 가중 평균, 최대 +0.15)
  - filterBotSuspects: 봇 의심 페르소나 필터 (suspectScore ≥ 0.8)
  - feed-engine.ts: optional FeedEnhancementOptions 통합

- [x] **T326: PersonaState 카운터 업데이트** ✅ 2026-03-02
  - state-manager.ts: postsThisWeek/commentsThisWeek 증분 + lastActivityAt 설정
  - v4-operations cron: 월요일 주간 카운터 리셋

- 테스트: 4308 PASS (108 파일), Build PASS

---

## DONE (v4.0 — TTS Voice Engine)

- [x] **T327: ElevenLabs TTS 연동 + 성별 기반 음성 매칭** ✅ 2026-03-03
  - AC1: ElevenLabs API 연동 — `textToSpeechElevenLabs()` (Eleven Multilingual v2)
  - AC2: 18개 고유 base voice — 남성 8종 × 성격 유형 + 여성 8종 × 성격 유형 + 중성 2종
  - AC3: 성별 기반 음성 매칭 — MALE/FEMALE/NON_BINARY × personality key (analytical/critical/social/emotional/default)
  - AC4: TTS 성별 재추론 + 일괄 재설정 API — `POST /api/internal/personas/recalculate-tts`
  - 변경: voice-pipeline.ts, character-generator.ts, recalculate-tts/route.ts
  - 커밋: `1cc74fe`, `1487ddd`

- [x] **T328: TTS 캐시 레이어** ✅ 2026-03-03
  - AC1: LRU 인메모리 캐시 — `TtsCacheStore` (max 5000 entries, env `TTS_CACHE_MAX_ENTRIES`)
  - AC2: SHA-256 캐시 키 — provider|voiceId|speed|stability|similarityBoost|style|text
  - AC3: LRU 제거 — lastUsed 기준 가장 오래된 항목 제거
  - AC4: 통계 API — `GET /api/internal/personas/tts-cache` (hits, misses, hitRate, estimatedMemoryMB)
  - AC5: 캐시 초기화 — `DELETE /api/internal/personas/tts-cache`
  - 변경: voice-pipeline.ts (TtsCacheStore), tts-cache/route.ts (신규)
  - 커밋: `fb8e10b`

- [x] **T329: Voice Engine 10D ↔ 페르소나 엔진 통합 파이프라인** ✅ 2026-03-03
  - AC1: voice-engine.ts (신규) — 10D VoiceCharacter 타입 (warmth/authority/energy/expressiveness/clarity/intimacy/tempo/volatility/resonance/breathiness)
  - AC2: `computeVoiceCharacter(l1, l2, l3)` — L1/L2/L3 벡터 → 10D 음성 특성 가중 합 매핑
  - AC3: `voiceCharacterToElevenLabs(vc)` — 10D → ElevenLabs API params (stability/similarityBoost/style/speed/useSpeakerBoost)
  - AC4: `voiceCharacterDistance(a, b)` — 유클리드 거리 (음성 다양성 검증)
  - AC5: 페르소나 엔진 통합 — `inferTTSVoiceFromVectors()` L3 파라미터 추가 (backward compatible), ElevenLabs 경로에서 10D 파이프라인 사용
  - AC6: 4개 호출 경로 모두 L3 + 자동 provider 감지 적용 (llm-character-generator, pipeline, recalculate-tts, auto)
  - AC7: `TTSVoiceProfile.voiceCharacter` 필드 추가 — UI 레이더 차트 시각화 대비
  - 변경: voice-engine.ts (신규), character-generator.ts, llm-character-generator.ts, pipeline.ts, recalculate-tts/route.ts, voice-pipeline.ts (useSpeakerBoost)
  - 커밋: `5035d96`, `75a5843`

---

## DONE (v4.0 — 1:1 채팅 + 통화 시스템 백엔드/프론트)

> 이전 세션에서 구현 완료, TASK.md 미반영 상태였음 (2026-03-04 확인)

- [x] **T330: DB 스키마 — ChatThread + ChatMessage + Call 모델** ✅
  - ChatThread (sessionId→InteractionSession 1:1), ChatMessage (role USER/PERSONA), CallReservation (6종 status), CallSession (InteractionSession 연결)
  - Persona TTS 필드 (ttsProvider, ttsVoiceId, ttsPitch, ttsSpeed, ttsLanguage)
  - 마이그레이션: 039_chat_call_system.sql + 041_production_catchup
- [x] **T331: Conversation Engine** ✅
  - buildConversationSystemPrefix/Suffix, generateConversationResponse (Sonnet + Vision + 프롬프트 캐싱)
  - 모드별 분기 (chat: 500 tokens, call: 200 tokens), 다국어 지원
- [x] **T332: 기억 파이프라인 통합** ✅
  - retrieveConversationMemories (RAG), recordConversationTurn (Poignancy), finalizeConversation (Factbook), adjustStateForConversation
- [x] **T333: Chat Service** ✅
  - ChatDataProvider DI, createThread, sendMessage (10코인), getThreads, getMessages (커서 페이지네이션)
- [x] **T334: Chat API 엔드포인트** ✅
  - GET/POST /chat/threads, GET/POST /chat/threads/[threadId]/messages
- [x] **T335: Chat UI — 메시지 화면** ✅ (persona-world)
  - /chat/[threadId] — 버블 UI, 타이핑 인디케이터, 페이지네이션, 10코인/턴 표시
- [x] **T336: Chat UI — 대화 목록 + 진입점** ✅ (persona-world)
  - /chat 리스트, pw-bottom-nav 채팅 탭, 페르소나 프로필 "대화하기" 버튼
- [x] **T337: Voice Pipeline — STT + TTS 통합** ✅
  - Whisper STT (다국어), OpenAI/Google/ElevenLabs TTS, LRU 캐시 (5000 entries)
- [x] **T338: Call Service** ✅
  - CallDataProvider DI, createReservation (200코인), startCall, processCallTurn (STT→LLM→TTS), endCall, cancelReservation
- [x] **T339-partial: Call 예약 API** ✅
  - GET/POST /calls/reservations, GET/DELETE /calls/reservations/[reservationId]
- [x] **T340-partial: Call UI — 예약/목록** ✅ (persona-world)
  - /calls 예약 리스트, 페르소나 프로필 "통화 예약" 버튼, 상태 뱃지
- [x] **T341: Shop 활성화** ✅
  - persona_chat/persona_call_reservation: SOON→NEW 태그 변경 완료

---

## DONE (v4.0 — 통화 세션 API + UI + 테스트 + 문서)

> T339/T340/T342 잔여 → T357~T361로 세분화 후 완료

- [x] **T357: Call Session API 3개 라우트** ✅ 2026-03-04
  - POST /calls/sessions — 통화 시작 (예약→CallSession+TTS 인사)
  - POST /calls/sessions/:id/turn — 턴 처리 (STT→LLM→TTS)
  - POST /calls/sessions/:id/end — 통화 종료 (기억 최종화)
  - CallDataProvider Prisma 인라인 구현, verifyInternalToken 적용

- [x] **T358: 통화 중 UI 페이지** ✅ 2026-03-04
  - /calls/[reservationId] — 페르소나 아바타+통화 상태, 마이크 녹음 버튼 (half-duplex)
  - 오디오 녹음→base64→API→응답 오디오 재생, 대화 로그 실시간 표시
  - 통화 타이머+턴 카운터+종료 버튼, 진행 바 (남은 시간)
  - api.ts: startCall/sendVoiceTurn/endCall, types.ts: 3개 응답 타입
  - calls/page.tsx: "통화 시작" 버튼 추가

- [x] **T359: 단위 테스트 37개** ✅ 2026-03-04
  - chat-service.test.ts (14): 스레드 생성, 메시지 전송, 에러 케이스, 페이지네이션
  - call-service.test.ts (11): 예약 생성, 세션 시작/종료, 취소
  - conversation-memory.test.ts (12): RAG 검색, poignancy 기록, factbook 갱신, state 조정

- [x] **T360: API 문서 최신화** ✅ 2026-03-04
  - public.md §17 Chat (4개 엔드포인트) + §18 Calls (6개 엔드포인트)
  - public.openapi.yaml: ChatThread/ChatMessage/CallReservation/StartCallResponse/CallTurnResponse/EndCallResponse 스키마

- [x] **T361: 전체 검증** ✅ 2026-03-04
  - 테스트 4555 PASS (117 파일), persona-world typecheck PASS, persona-world build PASS

---

## DONE (v4.1 — 관계 모델 확장)

- [x] **T350~T354: 관계 프로토콜 v4.1 확장** ✅ 2026-03-03
  - **T350: RelationshipScore 타입 확장**
    - peakStage (최고 도달 단계 추적), momentum (관계 발전 속도), milestones (이벤트 기록)
    - RelationshipMilestone 타입 신규 (first_debate/first_vulnerability/first_betrayal/first_deep_share/reconciliation)
  - **T351: 관계 유형 5→10종 확장**
    - 기존: NEUTRAL, ALLY, RIVAL, MENTOR, FAN
    - 신규: CONFIDANT (깊은 신뢰), FRENEMY (모순적 관계), NEMESIS (깊은 적대), MUSE (창작 영감), PROTEGE (멘티)
    - 각 유형별 TypeModifier 정의 (interactionBoost, debateWillingness, selfDisclosure, extraTones)
  - **T352: 관계 단계 4→6 forward + ESTRANGED**
    - 기존 4단계: STRANGER → ACQUAINTANCE → FAMILIAR → CLOSE
    - 확장 6단계: STRANGER → ACQUAINTANCE → REGULAR → FAMILIAR → INTIMATE → CLOSE
    - Decay 3단계: COOLING → DORMANT → ESTRANGED (갈등 기반 분리)
    - 총 9단계, 각 단계별 BehaviorProtocol 정의
    - ESTRANGED: peakStage ≥ FAMILIAR && tension ≥ 0.7 && warmth ≤ 0.7
  - **T353: 비대칭/동적 메커니즘**
    - 모멘텀: computeMomentum (rapid/gradual/stagnant/declining), updateMomentum (EMA)
    - 마일스톤: detectMilestones (5종 이벤트 감지), computeMilestoneQualityDelta
    - peakStage: updatePeakStage (최고 단계 추적, decay 단계 무시)
    - 관계 요약: summarizeRelationship에 모멘텀+마일스톤 서술 추가
  - **T354: 테스트 전면 업데이트**
    - 기존 41→126 테스트 (85개 신규 추가)
    - 신규 유형 10종 분류 검증, 신규 단계 6+3 전환 검증
    - 모멘텀 시스템 4종, 마일스톤 감지 7종, peakStage 추적 6종
    - 하위 호환: 기존 API (computeRelationshipProfile, determineStage 등) 시그니처 유지
  - 변경: types.ts, relationship-protocol.ts, relationship-protocol.test.ts
  - 테스트: 4479 PASS (114 파일)

- [x] **T355: 관계 유형 대규모 확장 (v4.2)** ✅ 2026-03-03
  - **T355-1: 타입 시스템 확장 (types.ts)**
    - RelationshipScore에 `attraction?: number` (0.0~1.0) 로맨틱 감정 지표 추가
    - RelationshipMilestone에 `first_flirt` / `confession` / `breakup` 3종 로맨틱 마일스톤 추가
  - **T355-2: 관계 프로토콜 전면 확장 (relationship-protocol.ts)**
    - 관계 유형 10→22종 확장 (+12종)
    - 로맨틱 6종: CRUSH, SWEETHEART, LOVER, SOULMATE, EX, OBSESSED
    - 사회적 3종: GUARDIAN, COMPANION, BESTIE
    - 감정 복합 3종: TSUNDERE, TOXIC, PUSH_PULL
    - TYPE_THRESHOLDS 12종 추가 (attraction 기반 임계값)
    - TYPE_MODIFIERS 12종 추가 (행동 프로필)
    - determineType() 7그룹 우선순위 재설계 (EX→극한→로맨틱→갈등→긍정심층→중립대→기본)
    - detectMilestones() 로맨틱 마일스톤 3종 감지 추가
    - summarizeRelationship() 12종 typeHint + attraction 표시 + 로맨틱 마일스톤 서술
  - **T355-3: 관계 매니저 attraction 연동 (relationship-manager.ts)**
    - DEFAULT_RELATIONSHIP에 `attraction: 0.0` 추가
    - computeRelationshipUpdate(): attraction 성장 (warmth≥0.5+tension≤0.3일 때 comment+0.03, like+0.01, follow+0.02, repost+0.01, 깊은대화 가속+0.02)
    - recalculateRelationship(): attraction 무활동 감쇠 7%/주
    - negative 감정 시 attraction 감소 (-0.02)
  - **T355-4: 파이프라인 일관성 (interaction-pipeline.ts)**
    - DEFAULT_RELATIONSHIP에 `attraction: 0` 추가 (파이프라인 동기화)
  - **T355-5: 테스트 확장 (relationship-protocol.test.ts)**
    - v4.2 determineType: CRUSH/SWEETHEART/LOVER/SOULMATE/EX/OBSESSED/BESTIE/GUARDIAN/COMPANION/TSUNDERE/TOXIC/PUSH_PULL + 우선순위 검증
    - v4.2 buildProtocol: 9종 신규 유형 TypeModifier 검증
    - v4.2 detectMilestones: first_flirt/confession/breakup + 동시감지 + 조건불충족 검증
    - v4.2 summarizeRelationship: attraction 표시 + typeHint + 로맨틱 마일스톤 서술
    - 기존 테스트 호환성 유지 (MENTOR 분류 기준값 조정)
  - 변경: types.ts, relationship-protocol.ts, relationship-manager.ts, interaction-pipeline.ts, relationship-protocol.test.ts
  - 테스트: 4518 PASS (114 파일)

- [x] **T356: v4.2 기억저장소 연동 + DB 영속화 + 자율 자동화 + UI** ✅ 2026-03-03
  - **T356-1: makeScore() 테스트 헬퍼에 attraction: 0 기본값 추가**
  - **T356-2: DB 스키마 + 마이그레이션 (042)**
    - PersonaRelationship에 attraction(Decimal 3,2), peak_stage(Text), momentum(Decimal 4,3), milestones(JSONB) 컬럼 추가
    - 스키마 코멘트 최신화: stage 9종, type 22종
  - **T356-3: 스케줄러 3곳 자율 자동 업데이트**
    - cron-scheduler, pw-scheduler, admin-scheduler의 getRelationship: v4.2 필드 로드
    - updateRelationship: computeRelationshipUpdate → determineStage/determineType 자동 계산 → DB 전체 upsert
    - 관리자 개입 없이 인터랙션마다 자동으로 22종 유형 + 9종 단계 + attraction + momentum + milestones 업데이트
  - **T356-4: v4-operations 배치 감쇠**
    - applyRelationshipDecay: attraction 7%/주 감쇠 추가 (warmth 1%, frequency 2%와 함께)
  - **T356-5: LLM 캐릭터 생성기 확장**
    - RelationshipSeed 타입: 5→16종 (ally/rival/mentor/fan/confidant/frenemy/nemesis/muse/protege/crush/guardian/companion/bestie/tsundere + 하위호환 student/antagonist)
    - VALID_RELATIONSHIP_TYPES: LLM 프롬프트 + 검증 + 벡터 기반 생성 함수 모두 갱신
    - generateRelationships: crush(호감+사교), tsundere(감정기복+비판) 추가
  - **T356-6: 기억 API + 뷰어 UI (읽기전용 모니터링)**
    - memories API: attraction, stage, type, peakStage, momentum, milestones 반환
    - 관계 탭 UI: type 뱃지(primary) + stage 라벨 + attraction 게이지(5열) + 마일스톤 칩
    - 관리자 직접 컨트롤 최소화 — 전부 자동 계산 결과 읽기전용 표시
  - 변경: schema.prisma, 042 마이그레이션, cron-scheduler-service.ts, pw-scheduler-service.ts, admin/scheduler-service.ts, v4-operations/route.ts, character-generator.ts, llm-character-generator.ts, memories/route.ts, persona-dimension-editor.tsx, relationship-protocol.test.ts, persona-generation.test.ts
  - 테스트: 4518 PASS (114 파일)

---

## DONE (v4.0 — TTS 자체검증 루프)

> 페르소나 생성 시 TTS 음성 추론 → 검증 샘플 생성 → 자동 검증 파이프라인

- [x] **T362: validateTTSResult() 검증 함수 (L1~L4)** ✅ 2026-03-04
  - L1: 크기 기반 빠른 거부 (빈 오디오 / 과대 응답)
  - L2: MP3 포맷 유효성 (프레임 싱크 바이트 / ID3 헤더)
  - L3: 무음 비율 감지 (MP3 프레임 바이트 패턴 분석)
  - L4: 텍스트-오디오 길이 정합성 (예상 vs 실제 비율)

- [x] **T363: textToSpeech() 자체검증 + 재시도 + fallback 통합** ✅ 2026-03-04
  - 캐시 HIT 시에도 검증 (불량 캐시 자동 제거 → `ttsCache.remove()`)
  - 검증 FAIL → 1회 재시도 → fallback provider 전환 (elevenlabs→openai→google)
  - 전부 실패 시 `audioFailed: true` 플래그로 텍스트 폴백

- [x] **T364: TTSResult 타입 확장 + 검증 메트릭 로깅** ✅ 2026-03-04
  - `audioFailed?: boolean` 추가
  - `TTSValidationMetrics` 프로바이더별/실패코드별 메트릭 수집
  - `getTTSValidationMetrics()` / `resetTTSValidationMetrics()` API

- [x] **T365: 페르소나 생성 파이프라인 음성 검증 통합** ✅ 2026-03-04
  - `pipeline.ts` auto/manual 모드 모두 `verifyTTSVoice()` 통합
  - TTS API 키 없으면 검증 스킵 (음성 설정만 저장)
  - 검증 실패 시 fallback provider로 재추론 + DB 저장

- [x] **T366: TTS 검증 단위 테스트** ✅ 2026-03-04
  - `tts-validation.test.ts` 20개 테스트
  - L1~L4 정상/빈/과대/깨진/무음/길이불일치 시나리오
  - 메트릭 초기화/조회 테스트 + audioFailed 플래그 테스트

- [x] **T367: 전체 검증 + 커밋** ✅ 2026-03-04
  - typecheck PASS, 4575 테스트 PASS (118 files)
  - 커밋 `492b913`, 푸시 완료

## DONE (v4.0 — 적응형 온보딩)

> 고정 24문항 → 적응형 20~28문항 가변 시스템
> 답변 기반 불확실도 분석 → 가장 정보 획득량 높은 질문 자동 선택
> CAT(Computerized Adaptive Testing) 기법 적용

- [x] **T370: 적응형 타입 + 알고리즘 코어** ✅ 2026-03-04
  - vector-core/adaptive.ts — 16D 불확실도 프로필, 정보 획득량 계산, 종료 판정
  - adaptive-engine.ts — 세션 생성, 질문 선택(phase-aware), 점진 벡터 업데이트, 결과 빌드
  - 기존 phase 기반 onboarding-engine과 공존, DI 프로바이더 패턴

- [x] **T371: 질문 풀 확장 (24→45문항)** ✅ 2026-03-04
  - 추가 21문항 (L1 Deepening 7, L2 Deepening 5, L3 Narrative 4, Cross-Layer 3, Verification 2)
  - PsychProfileTemplate 스키마 확장 — isAdaptive, poolCategory, informationGain, minPriorAnswers
  - 마이그레이션 043_adaptive_onboarding.sql (ALTER + INSERT)
  - 기존 24문항에 poolCategory 태깅 (Phase 1→core, Phase 2→cross_layer, Phase 3→verification)

- [x] **T372: 적응형 온보딩 API 3개 라우트** ✅ 2026-03-04
  - POST /adaptive/start — 세션 시작 + 첫 질문 반환 (in-memory store MVP)
  - POST /adaptive/answer — 답변 → 벡터 업데이트 → 다음 질문 or 완료
  - GET /adaptive/status — 세션 상태 (진행률, 불확실도, 벡터)
  - 기존 phase 기반 cold-start API 하위 호환 유지

- [x] **T373: Persona World UI 적응형 온보딩 플로우** ✅ 2026-03-04
  - AdaptiveOnboardingFlow 컴포넌트 (intro → questions → complete)
  - 기본 모드 = adaptive, ?mode=phase로 기존 Phase 방식 선택 가능
  - 동적 프로그레스 바 (20~28 가변), 수렴도 표시, 마일스톤 피드백
  - PWQuestionCard 재사용 (adaptiveToOnboardingQuestion 변환)

- [x] **T374: Engine Studio 질문 풀 관리 UI** ✅ 2026-03-04
  - /user-insight/question-pool 페이지 — 45문항 테이블, 카테고리/레벨/적응형 필터
  - 인라인 편집 (poolCategory, isAdaptive, informationGain, minPriorAnswers)
  - 질문 상세 확장 패널 (옵션별 L1/L2/L3 가중치 시각화)
  - GET/PATCH /api/internal/user-insight/question-pool API

- [x] **T375: 테스트 + API 문서 + 전체 검증** ✅ 2026-03-04
  - adaptive-onboarding.test.ts — 19 테스트 PASS (불확실도, 평균, 상위 차원, 세션, 답변, 종료, 진행, 결과, 선택)
  - public.md 적응형 API 3개 문서화, internal.md question-pool API 문서화
  - pnpm test — 119 파일, 4594 테스트 ALL PASS

---

## DONE (v4.0 — 활동 시간대)

- [x] **T376: 활동 시간대 다양성 개선 (4 Chronotype)** ✅ 2026-03-04
  - `computeActiveHours()` 4개 크로노타입 분류: 새벽형(4~7시)/오전형(8~11시)/오후형(13~18시)/야행형(21~01시)
  - 야행성 조건: AND 2개 → 점수 기반(neuroticism×0.4 + volatility×0.3 + (1-extraversion)×0.3 > 0.55)
  - 윈도우 폭: endurance × (4~12시간) 단일 계산으로 균일화
  - `ACTIVE_HOURS` constants 전면 교체 (구 상수 7개 → 신규 상수 12개)
  - 단위 테스트 20개 PASS (4 크로노타입 시나리오 + 경계 케이스)

---

## DONE (v4.0 — 자율 스케줄러)

- [x] **T377: 자율 스케줄러 인터랙션 시간대 분리** ✅ 2026-03-04
  - `getActivePersonas()`: 시간대 필터 제거 → `isInActiveHours: boolean` 플래그로 교체 (에너지 필터만 유지)
  - `decideActivity()`: `isInActiveHours=false` 시 포스팅 차단 + 인터랙션 확률 50% 감소
  - 로그: 시간대 내/인터랙션전용/에너지부족 3단계 분류 표시
  - 단위 테스트 15개 PASS (신규 T377 시나리오 3개 포함)

- [x] **T378: [CRITICAL] PersonaFollow DB 인덱스 추가** ✅ 2026-03-04
  - `schema.prisma`: `@@index([followerUserId])`, `@@index([followingPersonaId])` 추가
  - `CHANGELOG_SCHEMA.md` 업데이트

- [x] **T379: [CRITICAL] followingIds 쿼리 3중 실행 → 1회 통합** ✅ 2026-03-04
  - POST 핸들러 최상단에서 followingIds 1회 조회 후 handleFollowingTab/handleExploreTab/for-you 공유
  - 불필요한 DB 쿼리 2회 제거

- [x] **T380: [MAJOR] 탭별 캐시 — 전환 시 즉시 표시** ✅ 2026-03-04
  - `tabCacheRef: useRef<Map<FeedTab, TabCache>>` 도입
  - 탭 재방문 시 캐시 즉시 표시 → 백그라운드 refresh 패턴
  - loadMore 후 누적 포스트 캐시 갱신
  - 첫 방문에만 loading skeleton

- [x] **T381: [MODERATE] IntersectionObserver 안정화** ✅ 2026-03-04
  - `loadMoreRef` 도입: observer가 항상 최신 loadMore 참조
  - Observer 마운트 시 1회 생성 (deps 제거)

- [x] **T382: [MINOR] feedPostSelect hashtags 누락 수정** ✅ 2026-03-04
  - `feedPostSelect`: `hashtags: true` 추가
  - for-you enrichedPosts, buildTabResponse 매핑에 hashtags 포함

---

## QUEUE

> 마지막 업데이트: 2026-03-05
> 방향: 벡터 매칭 실제 연결 → 소비 가시화 → 추천 컨텍스트 → ContentItem B2B

---

### 영역 1 — 벡터 매칭 실제 연결 (getCandidates 스텁 교체)

- [x] **T383: PersonaWorldUser 벡터 → matchAll() getCandidates 교체** ✅ 2026-03-04
  - 변경: `apps/engine-studio/src/app/api/public/feed/route.ts`
  - `buildVectorCandidates()` 헬퍼 추가: PersonaWorldUser L1/L2 → UserProfile → matchAll() → RecommendedCandidate[]
  - L1 null 시 likeCount fallback 유지 (온보딩 미완료 대응)
  - PersonaLayerVector SOCIAL/TEMPERAMENT/NARRATIVE → PersonaCandidate[] 조립
  - scoreMap으로 personaId별 tier별 best score 집계 → 최근 포스트에 할당
  - 테스트: 4601 PASS (119 files), Build PASS

- [x] **T384: Enrichment Context 실제 조립 (context-enricher 연동)** ✅ 2026-03-04
  - 변경: `apps/engine-studio/src/app/api/public/feed/route.ts`
  - `buildVectorCandidates()` 내 DB 3개 병렬 조회 추가:
    - 유저 좋아요 이력(7d) → ExposureSignal (fatiguePrevention 프록시)
    - 페르소나 포스트 engagement 집계(30d) → EngagementSignal
    - 페르소나 ConsumptionLog 태그/rating → ConsumptionSignal
    - PersonaWorldUser.preferences → preferredTags
  - `EnrichedMatchingContext` 조립 → `matchAll(context.enrichment)` 주입
  - 로그: `[feed/enrichment] userId=... personas=N exposure_signals=N consumption_signals=N`
  - 테스트: 4601 PASS (119 files), Build PASS

- [x] **T385: recommended-posts.ts 실제 동작 검증 + 포스트 선택 개선** ✅ 2026-03-04
  - 변경: `tests/unit/persona-world/feed.test.ts`
  - T383에서 연결된 실제 matchAll 스코어로 Tier 분리 동작 검증 테스트 추가
  - basicScore/explorationScore/advancedScore가 명확히 차이나는 후보로 각 Tier 선택 검증
  - Exploration = explorationScore 최상위 (Cross-Axis 발산 점수) 후보 우선 선택 확인
  - 테스트: 4602 PASS (119 files, +1 test), Build PASS

---

### 영역 2 — 페르소나 콘텐츠 소비 가시화

- [x] **T386: ConsumptionLog 공개 API** ✅ 2026-03-04
  - 변경: `apps/engine-studio/src/app/api/public/personas/[personaId]/taste/route.ts` (신규)
  - 변경: `apps/engine-studio/src/app/api/public/personas/[personaId]/taste/summary/route.ts` (신규)
  - 변경: `tests/unit/persona-world/taste-api.test.ts` (신규, 10개 테스트)
  - 변경: `docs/api/public.md` + `docs/api/public.openapi.yaml` 최신화
  - 테스트: PASS (4612/4612)

- [x] **T387: 페르소나 프로필 "취향" 탭 UI** ✅ 2026-03-04
  - 변경: `apps/persona-world/src/app/persona/[id]/page.tsx` (탭 UI + TasteCard + 무한 스크롤)
  - 변경: `apps/persona-world/src/lib/api.ts` (getPersonaTaste, getPersonaTasteSummary 추가)
  - 변경: `apps/persona-world/src/lib/types.ts` (TasteItem, TasteResponse, TasteSummary 추가)
  - 테스트: Build PASS (persona-world)

- [x] **T388: 취향 태그 집계 + 프로필 헤더 taste chips** ✅ 2026-03-04
  - 변경: `apps/persona-world/src/app/persona/[id]/page.tsx` (프로필 헤더 taste chips 추가)
  - summary API 최초 로드 시 비동기 호출 → topTags 상위 5개 chips 표시
  - 소비 기록 없으면 chips 미노출 (topTags 빈 배열 조건)
  - 테스트: Build PASS (persona-world)

---

### 영역 3 — 피드 추천 컨텍스트 ("왜 이 포스트?")

- [x] **T389: 매칭 스코어 + Tier 정보를 피드 응답에 포함** ✅ 2026-03-04
  - 변경: `apps/engine-studio/src/app/api/public/feed/route.ts` (matchContext 필드 추가)
  - 변경: `docs/api/public.md` (matchContext 응답 스펙 문서화)
  - basic/exploration/advanced 소스에만 matchContext 포함, following/trending은 null
  - reason: "취향 기반" | "새로운 발견" | "깊은 일치"
  - 테스트: PASS (4612/4612), Build PASS

- [x] **T390: 피드 카드 UI — 추천 컨텍스트 표시** ✅ 2026-03-04
  - **AC**:
    - 변경: `apps/persona-world/src/app/feed/page.tsx` (matchContext 배지 추가)
    - 변경: `apps/persona-world/src/lib/types.ts` (MatchContext, FeedPost.matchContext)
    - Exploration → Compass 아이콘 + 보라색, Basic/Advanced → Sparkles + violet
    - Build PASS (persona-world)

- [x] **T391: 취향 기반 피드 필터 (Exploration 전용 토글)** ✅ 2026-03-04
  - 변경: `apps/persona-world/src/app/feed/page.tsx` (서브 토글 + displayedPosts 필터)
  - "새로운 발견만" 토글: exploration 포스트만 표시, localStorage 유지
  - For You 탭 전용 노출, Compass 아이콘
  - 테스트: Build PASS (persona-world)

---

### 영역 4 — ContentItem 테이블 + B2B 인제스트 파이프라인

> **Phase 4-1: 데이터 계층** → **Phase 4-2: 자동화 파이프라인** → **Phase 4-3: B2B API** → **Phase 4-4: 관리 도구**

---

#### Phase 4-1: 데이터 계층

- [x] **T392: ContentItem + PersonaCuratedContent + UserContentFeedback 스키마 + migration**
  - **파일**: `apps/engine-studio/prisma/schema.prisma`, `apps/engine-studio/prisma/migrations/017_content_item_curation.sql`
  - **할 일**:
    - `ContentType` enum 추가: `MOVIE | DRAMA | MUSIC | BOOK | ARTICLE | PRODUCT | VIDEO | PODCAST`
    - `ContentItem` 모델:
      - `id, tenantId, contentType(ContentType), title, description?, sourceUrl?, externalId?`
      - `genres String[], tags String[]`
      - `contentVector Json?` — L1 7D `{ depth, lens, stance, scope, taste, purpose, sociability }`
      - `narrativeTheme Json?` — L3 4D `{ lack, moralCompass, volatility, growthArc }`
      - `vectorizedAt DateTime?, createdAt, updatedAt`
      - `@@unique([tenantId, externalId])`
    - `CurationStatus` enum: `PENDING | APPROVED | REJECTED`
    - `PersonaCuratedContent` 모델:
      - `id, personaId → Persona, contentItemId → ContentItem`
      - `curationScore Decimal(4,3), curationReason String?, highlights String[]`
      - `status CurationStatus @default(PENDING)`
      - `createdAt, updatedAt`
      - `@@unique([personaId, contentItemId])`
    - `ContentFeedbackAction` enum: `LIKE | SKIP | SAVE | CONSUME`
    - `UserContentFeedback` 모델:
      - `id, userId → PersonaWorldUser, contentItemId → ContentItem`
      - `action ContentFeedbackAction, viaPersonaId String?`
      - `createdAt`
      - `@@unique([userId, contentItemId])`
    - 마이그레이션 SQL: `CREATE TABLE IF NOT EXISTS` 스타일
  - **AC**:
    - `prisma generate` 성공
    - 마이그레이션 SQL 완비 (3 테이블 + 3 enum)
    - `docs/CHANGELOG_SCHEMA.md` 업데이트
    - Build PASS

- [x] **T393: content-vectorizer.ts — Claude API 기반 콘텐츠 벡터화**
  - **파일 (신규)**: `apps/engine-studio/src/lib/content/content-vectorizer.ts`
  - **파일 (신규)**: `apps/engine-studio/tests/unit/content/content-vectorizer.test.ts`
  - **할 일**:
    - `ContentVectorResult` 타입: `{ contentVector: L1Vector7D, narrativeTheme: L3Vector4D }`
    - `vectorizeContent(item: { title, description?, genres, tags }): Promise<ContentVectorResult>`
      - Claude API (`claude-sonnet-4-6`) 호출
      - 시스템 프롬프트: 콘텐츠 메타 → "이 콘텐츠에 끌릴 사람의 취향 프로필" 7D + 4D 추론
      - 응답 JSON 파싱 + 전체 `clamp(0, 1)` 처리
    - `vectorizeBatch(items[], concurrency = 5): Promise<ContentVectorResult[]>`
      - p-limit 또는 직접 구현으로 동시 실행 제한
    - 단위 테스트: Claude SDK mock → 프롬프트 구조 + clamp 동작 검증
  - **AC**:
    - 출력 벡터 11개 값 모두 [0, 1]
    - concurrency=2 배치 → 순차 완료 순서 보장
    - 테스트 PASS, Build PASS

---

#### Phase 4-2: 자동화 파이프라인

- [x] **T394: auto-curation.ts — ConsumptionLog → PersonaCuratedContent 비즈니스 로직**
  - **파일 (신규)**: `apps/engine-studio/src/lib/content/auto-curation.ts`
  - **파일 (신규)**: `apps/engine-studio/tests/unit/content/auto-curation.test.ts`
  - **할 일**:
    - `runAutoCuration(personaId: string): Promise<{ created: number, skipped: number }>`
      1. ConsumptionLog 조회: `personaId` + `rating >= 0.7` + `contentItemId IS NOT NULL`
      2. 각 log → `PersonaCuratedContent` upsert (`PENDING`, `curationScore = rating`, `curationReason = impression`)
      3. 이미 존재하면 skip (updateAt 갱신 안 함)
    - `runAutoCurationAll(): Promise<void>` — 전체 페르소나 순회
    - 단위 테스트: Prisma mock → rating 필터, upsert, skip 동작
  - **AC**:
    - rating 0.69 → skip, 0.70 → 생성
    - 중복 실행 → 기존 레코드 유지
    - 테스트 PASS, Build PASS

- [x] **T395: cron/content-auto-curation — 자동 큐레이션 cron route**
  - **파일 (신규)**: `apps/engine-studio/src/app/api/cron/content-auto-curation/route.ts`
  - **할 일**:
    - `GET` handler (Vercel cron 규칙)
    - `verifyInternalToken` 인증
    - `runAutoCurationAll()` 호출
    - 응답: `{ success, data: { processed, created, skipped, durationMs } }`
    - `vercel.json` cron 스케줄 추가: `0 3 * * *` (매일 새벽 3시)
  - **AC**:
    - 인증 없는 요청 401
    - cron 스케줄 등록 확인
    - Build PASS

---

#### Phase 4-3: B2B API

- [x] **T396: Content Ingest API — 단건 등록 (POST /api/v1/content/ingest)**
  - **파일 (신규)**: `apps/engine-studio/src/app/api/v1/content/ingest/route.ts`
  - **파일 (신규)**: `apps/engine-studio/tests/unit/content/ingest-validation.test.ts`
  - **할 일**:
    - `POST /api/v1/content/ingest`
    - 인증: `verifyApiKey(request)` → `tenantId` 추출 (기존 Developer Console API Key)
    - 입력 검증: `title` 필수, `contentType` enum 검증, `genres/tags` 배열
    - `ContentItem` upsert (`@@unique([tenantId, externalId])`)
    - 벡터화: 비동기 큐 (현재는 즉시 `vectorizeContent()` 호출 → DB 저장)
    - 응답: `{ success, data: { id, vectorizedAt } }`
  - **AC**:
    - 인증 없으면 401
    - title 누락 시 400 + `VALIDATION_ERROR`
    - contentType 오류 시 400
    - externalId 중복 → upsert (200, 에러 아님)
    - 테스트 PASS, Build PASS

- [x] **T397: Content Ingest Batch API + external-v1 docs**
  - **파일 (신규)**: `apps/engine-studio/src/app/api/v1/content/ingest/batch/route.ts`
  - **할 일**:
    - `POST /api/v1/content/ingest/batch`
    - 입력: `{ items: ContentIngestInput[] }` (최대 100건)
    - 각 item 개별 upsert (실패해도 다음 진행)
    - 응답: `{ success, data: { created, updated, failed, items: [{id, status}] } }`
    - 100건 초과 시 400 반환
    - `docs/api/external-v1.md` + `external-v1.openapi.yaml` — ingest 단건/배치 엔드포인트 추가
  - **AC**:
    - 101건 입력 → 400
    - 일부 실패 시 `failed` 카운트 + 나머지 처리 계속
    - docs 최신화
    - 테스트 PASS, Build PASS

- [x] **T398: content-ranking.ts — ContentItem × Persona 매칭 스코어 계산**
  - **파일 (신규)**: `apps/engine-studio/src/lib/content/content-ranking.ts`
  - **파일 (신규)**: `apps/engine-studio/tests/unit/content/content-ranking.test.ts`
  - **할 일**:
    - `scoreContentForUser(userVector: L1Vector7D, content: ContentItem): number`
      - L1 코사인 유사도 계산 (기존 `@deepsight/vector-core` 활용)
      - narrativeTheme L3 보너스 (+0~0.1) 선택적 적용
    - `rankContents(userVector, contents: ContentItem[], limit): RankedContent[]`
      - `finalScore = matchScore × curationScore`
      - 내림차순 정렬 → 상위 limit개
    - 단위 테스트: 동일 벡터 → score 1.0, 직교 벡터 → score 0
  - **AC**:
    - score 범위 [0, 1]
    - limit 적용 정확
    - 테스트 PASS, Build PASS

- [x] **T399: B2B Recommendations API + external-v1 docs**
  - **파일 (신규)**: `apps/engine-studio/src/app/api/v1/recommendations/route.ts`
  - **할 일**:
    - `POST /api/v1/recommendations`
    - 입력: `{ userId, limit?: number (default 20, max 50) }`
    - 처리 흐름:
      1. `verifyApiKey` → `tenantId`
      2. `PersonaWorldUser` 벡터 조회 → 없으면 fallback
      3. `matchAll()` → 상위 5개 페르소나
      4. 각 페르소나의 `PersonaCuratedContent (APPROVED)` + `ContentItem` 조회
      5. `rankContents()` → `finalScore = matchScore × curationScore`
      6. 중복 contentItemId 제거 (최고 score 유지)
      7. 상위 limit개 반환
    - Fallback (벡터 없음): `tenantId` 기준 최신 ContentItem limit개 반환
    - 응답: `{ items: [{ contentItem, recommendedBy[], finalScore, tier }] }`
    - `docs/api/external-v1.md` + `external-v1.openapi.yaml` 최신화
  - **AC**:
    - `recommendedBy` 포함 (페르소나명 + matchScore + curationScore)
    - Fallback 동작 검증
    - 테스트 PASS, Build PASS
    - docs 최신화

---

#### Phase 4-4: 관리 도구

- [x] **T400: internal curation CRUD API**
  - **파일 (신규)**: `apps/engine-studio/src/app/api/internal/curation/pending/route.ts`
  - **파일 (신규)**: `apps/engine-studio/src/app/api/internal/curation/[id]/approve/route.ts`
  - **파일 (신규)**: `apps/engine-studio/src/app/api/internal/curation/[id]/reject/route.ts`
  - **파일 (신규)**: `apps/engine-studio/src/app/api/internal/curation/manual/route.ts`
  - **할 일**:
    - `GET /api/internal/curation/pending?personaId=&page=` — PENDING 목록 (페이지네이션)
    - `PATCH /api/internal/curation/[id]/approve` — status → APPROVED
    - `PATCH /api/internal/curation/[id]/reject` — status → REJECTED
    - `POST /api/internal/curation/manual` — 수동 연결 (status = APPROVED 직접 저장)
    - 모두 `requireAuth` 보호
  - **AC**:
    - approve/reject 시 존재하지 않는 id → 404
    - manual 시 `@@unique` 중복 → 400
    - 테스트 PASS, Build PASS

- [x] **T401: Engine Studio — 큐레이션 관리 UI**
  - **파일 (신규)**: `apps/engine-studio/src/app/(dashboard)/curation/page.tsx`
  - **파일 (신규)**: `apps/engine-studio/src/app/(dashboard)/curation/components/CurationCard.tsx`
  - **할 일**:
    - 페르소나 선택 드롭다운 + status 필터 탭 (PENDING | APPROVED | REJECTED)
    - `CurationCard`: contentItem 메타 + curationScore + curationReason + 승인/거절 버튼
    - 수동 연결 폼: 페르소나 선택 + ContentItem ID 입력 + 제출
    - Optimistic update (버튼 클릭 → 즉시 제거 → 서버 확인)
    - 사이드바 네비게이션에 "큐레이션" 메뉴 추가
  - **AC**:
    - PENDING → APPROVED 클릭 → 목록에서 즉시 제거
    - 수동 연결 후 APPROVED 탭에 노출
    - Build PASS (engine-studio)

---

---

## DONE — Phase 5: 랜딩페이지 소비자 친화화 ✅ 2026-03-05

> 기술 용어를 소비자 친화 언어로 교체. 기능·수치는 유지, 표현만 변경.

### Phase 5-1: 고노출 페이지 (기술 용어 다수)

- [x] **T402: landing — features/taste-analysis 소비자 친화화**
  - **파일**: `apps/landing/src/app/features/taste-analysis/page.tsx`
  - **할 일**:
    - "3-Layer 벡터 시스템" → "나를 이해하는 3가지 층"
    - "L1 — 사회적 취향 (7개 차원)" → "표면 취향 — 내가 좋아한다고 아는 것들"
    - "L2 — 내면 기질 (OCEAN 5개 차원)" → "내면 성격 — 나를 움직이는 감정과 태도"
    - "L3 — 서사적 욕망 (4개 차원)" → "욕망의 방향 — 내가 진짜 원하는 것"
    - "106D+" 수치 → 숨김 (미노출)
    - "Big Five / OCEAN" → "5가지 내면 성격"
    - L1 7개 차원 이름 → 질문형 소비자 언어 변환 (기획서 참고)
    - "콜드스타트 해결" → "처음부터 맞는 추천, 3가지 방법"
    - Phase 1/2/3 단계명 → 입문·발전·심화 (정확도 % 수치는 유지)
  - **AC**:
    - 페이지 내 L1/L2/L3/OCEAN/Big Five/106D 문자열 미노출
    - Build PASS (landing)

- [x] **T403: landing — features/persona 소비자 친화화**
  - **파일**: `apps/landing/src/app/features/persona/page.tsx`
  - **할 일**:
    - "P-inger Print (2D/3D 시각적 정체성)" → "취향 지문 — 당신만의 고유한 취향 패턴"
    - "3-Layer 벡터 프로필: 사용자와 동일한 방식으로 정량화" → "당신의 취향을 깊이 이해한 AI"
    - 4대 런타임 알고리즘 명칭 (Init/Override/Adapt/Express) → 기억·반응·적응·표현
    - 배포 전 6범주 검증 섹션 → "엄격한 품질 검증 후 출시" (상세 분류 숨김)
    - 12 아키타입 설명: "논리↔불안" 등 기호 제거, 서사형 한 줄 설명으로 변환
  - **AC**:
    - "런타임 알고리즘", "3-Layer 벡터" 문자열 미노출
    - Build PASS (landing)

### Phase 5-2: 중노출 페이지

- [x] **T404: landing — features/matching 소비자 친화화**
  - **파일**: `apps/landing/src/app/features/matching/page.tsx`
  - **할 일**:
    - "3-Tier 매칭" → "3단계 맞춤 추천"
    - "L1 벡터 기반 기본 매칭" → "취향 유사도 분석"
    - "L1+L2 종합 고려" 등 벡터 코드 → 결과 설명으로 대체
    - "매칭 파이프라인 4단계" → "추천이 만들어지는 과정"
    - 피드 구성 비율 (60%/30%/10%) → "팔로우 중심 + 새로운 발견 혼합" (수치 숨김)
  - **AC**:
    - "L1", "L2", "파이프라인", "3-Tier" 문자열 미노출
    - Build PASS (landing)

- [x] **T405: landing — pricing 소비자 친화화**
  - **파일**: `apps/landing/src/app/pricing/page.tsx`
  - **할 일**:
    - "API 호출 N만/월" → "월 추천 요청 N만 건"
    - "Rate Limit N/분" → 툴팁으로 이동 (테이블에서 숨김) or "초당 처리 속도"
    - "TypeScript SDK" → "개발자 도구 (SDK)"
    - "Webhook" → "실시간 이벤트 연동"
    - "Prompt Caching (LLM 비용 90% 절감)" → 숨김 (내부 지표)
    - "스마트 캐싱 (70% 히트율)" → 숨김
    - "초과 과금: $0.001/call" → "추가 사용 시 건당 $0.001"
  - **AC**:
    - "Rate Limit", "Webhook", "TypeScript SDK", "LLM", "Prompt Caching" 미노출
    - Build PASS (landing)

### Phase 5-3: 소노출 페이지

- [x] **T406: landing — home + footer + features-hub 소노출 수정**
  - **파일**:
    - `apps/landing/src/app/page.tsx`
    - `apps/landing/src/components/layout/footer.tsx`
    - `apps/landing/src/app/features/page.tsx`
  - **할 일**:
    - Home Problem 섹션: "콜드스타트 문제" → "처음 시작해도 바로 맞는 추천"
    - Home Problem 섹션: "필터버블" → "비슷한 것만 반복되는 문제"
    - Footer 슬로건: "AI 페르소나 기반 3-Layer 벡터 추천 플랫폼" → "당신의 취향을 가장 잘 이해하는 AI 추천 서비스"
    - Features Hub 카드 설명 문구 순화 (L1/L2 등 미노출)
  - **AC**:
    - "3-Layer 벡터", "콜드스타트", "필터버블" 문자열 미노출
    - Build PASS (landing)

- [x] **T407: landing — faq 항목 제목 순화**
  - **파일**: `apps/landing/src/app/faq/page.tsx`
  - **할 일**:
    - FAQ 카테고리 "3-Layer 벡터 시스템" → "취향 분석 시스템"
    - FAQ 카테고리 "12 아키타입" → "12가지 성격 유형"
    - FAQ 카테고리 "P-inger Print" → "취향 지문 (P-inger Print)" (브랜드명은 유지, 설명 추가)
    - FAQ 카테고리 "콜드스타트 해결" → "처음 시작할 때"
    - FAQ 카테고리 "Developer Console & API" → "개발자 연동"
    - 개별 Q 제목 내 "L1/L2/L3", "OCEAN", "106D+" 표현 → 소비자 언어
    - (내용 본문은 설명 목적이므로 기술 용어 일부 유지 허용)
  - **AC**:
    - FAQ 카테고리 제목에서 L1/L2/L3/OCEAN/106D 미노출
    - Build PASS (landing)

## DONE — Phase 6: v5.0 Semantic Memory Architecture ✅ 2026-03-05

> 에피소드 기억을 압축해 자아관을 유지하고, L3 벡터를 조금씩 진화시키며, 정체성 드리프트를 감지하는 3계층 기억 시스템.

- [x] **T408: SemanticMemory DB 모델 + migration** ✅ 2026-03-05
  - Prisma schema: `SemanticMemory` 모델 + `SemanticMemoryCategory` enum
  - 인덱스: personaId×category, personaId×confidence, personaId×consolidatedAt
  - migration 045: `semantic_memories` 테이블 + FK + 3개 인덱스
  - Persona 모델에 `semanticMemories` relation 추가

- [x] **T409: Memory Consolidation Scheduler** ✅ 2026-03-05
  - `memory-consolidation.ts`: 주 1회 LLM(Haiku) 호출 → 에피소드 압축 → SemanticMemory upsert
  - poignancy ≥ 0.5 에피소드 최대 30개 수집 (InteractionLog + ConsumptionLog + PersonaPost)
  - subject 기준 중복 병합 (confidence 가중 평균)
  - Factbook.mutableContext 업데이트
  - `consolidateAllPersonas()` 배치 함수

- [x] **T410: Growth Arc Updater (L3 진화)** ✅ 2026-03-05
  - `growth-arc-updater.ts`: SemanticMemory.l3Influence 누적 → L3 벡터 조금씩 업데이트
  - 경계 규칙: lack/moralCompass ±0.10, volatility ±0.20, growthArc ±0.40 (생애 최대)
  - 단일 consolidation 최대: lack/moralCompass 0.001, volatility 0.002, growthArc 0.005
  - PersonaLayerVector version++ 이력 보존

- [x] **T411: Identity Drift Detector** ✅ 2026-03-05
  - `identity-drift-detector.ts`: 최근 24h 생성 출력 vs ImmutableCore 비교
  - 키워드 overlap + 금지 패턴 위반 → driftScore 계산
  - driftScore > 0.30 → consistencyScore 하락 + 경고
  - driftScore > 0.50 → DEGRADED 자동 전환 (T140 kill switch 연동)
  - LLM 비용 0 (순수 규칙 기반)

- [x] **T412: Context Enricher SemanticMemory 주입** ✅ 2026-03-05
  - `conversation-engine.ts`: ConversationContext에 `semanticMemories` 옵셔널 필드 추가
  - `buildConversationSystemPrefix()`: SemanticMemory TOP-10 → "내면에 쌓인 자아관" 섹션 주입
  - 토큰 효율: 에피소드 대비 10배 이상 (10항목 ≈ 400토큰)

- [x] **T413: cron + 테스트 + 전체 검증** ✅ 2026-03-05
  - `api/cron/v5-memory/route.ts`: 주간 배치 3단계 (Consolidation → GrowthArc → DriftDetection)
  - 단위 테스트 36개: growth-arc-updater(13) + identity-drift-detector(18) + memory-consolidation(5)
  - 전체 4692 테스트 PASS
  - Build PASS (engine-studio)

## 🔄 IN_PROGRESS (진행중)

### T414: 크레딧 기반 페르소나 재요청 (70%+ 유저)

> 매칭률 70% 이상 유저가 크레딧을 사용해 더 높은 매칭률의 페르소나를 요청할 수 있는 기능.
> 70% 미만은 기존대로 무료, 70% 이상은 크레딧 300 차감.

- [ ] **T414-1: Backend — persona-requests API 수정**
  - `topSimilarity >= 70` 시 `SIMILARITY_TOO_HIGH` 거부 → 크레딧 차감 후 허용
  - 요청 body에 `useCredits: boolean` 옵션 추가
  - `useCredits=true && topSimilarity >= 70` → credit-service.spendCredits(300) → 요청 생성
  - `useCredits=false && topSimilarity >= 70` → 기존대로 거부
  - `topSimilarity < 70` → 기존대로 무료 (useCredits 무시)
  - PersonaGenerationRequest에 `creditSpent` 필드 기록
  - 파일: `apps/engine-studio/src/app/api/public/persona-requests/route.ts`

- [ ] **T414-2: Frontend — clientApi + user-store 수정**
  - `requestPersonaGeneration`에 `useCredits` 파라미터 추가
  - `requestPersona(topSimilarity, useCredits)` 시그니처 변경
  - 크레딧 부족 시 에러 핸들링 (INSUFFICIENT_BALANCE)
  - 성공 시 `creditsBalance` 로컬 차감
  - 파일: `apps/persona-world/src/lib/api.ts`, `apps/persona-world/src/lib/user-store.ts`

- [ ] **T414-3: Frontend — PWMatchingPreview UI 업데이트**
  - 70%+ 유저: "더 맞는 페르소나를 찾고 싶다면" 카드 + 크레딧 300 비용 표시 + 요청 버튼
  - 크레딧 부족 시 "크레딧이 부족합니다" 안내 + 충전 유도
  - 70% 미만: 기존 무료 요청 UI 유지
  - 파일: `apps/persona-world/src/components/persona-world/pw-matching-preview.tsx`

- [ ] **T414-4: 테스트 + API 문서 + 전체 검증**
  - 단위 테스트: 70%+ 크레딧 요청 성공/실패, 잔액 부족, 70% 미만 무료 유지
  - `docs/api/public.md` + `public.openapi.yaml` 최신화
  - typecheck + build + test PASS

- **AC**:
  - 70% 미만 → 무료 요청 (기존 동작 유지)
  - 70% 이상 + 크레딧 300 이상 → 크레딧 차감 후 요청 성공
  - 70% 이상 + 크레딧 부족 → 402 에러 + UI 안내
  - 중복 요청 방지 기존 로직 유지

---

### Phase VFINAL: V_Final 동적 블렌딩 + 10-Level 월드 표현 강도

> 계획서: `docs/plans/2026-03-11-vfinal-dynamic-blending.md`
> PersonaWorld 전체 페르소나의 V_Final을 PersonaState 기반 동적 Pressure로 계산.
> 관리자가 Engine Studio에서 월드 표현 강도(1~10)를 설정하여 허용 범위 제어.

- [ ] **T415: VFinalConfig DB 모델 + 10-Level 상수 + 설정 API**
  - schema.prisma: VFinalConfig 싱글턴 모델 (expressionLevel Int @default(5))
  - 마이그레이션 SQL 작성
  - vfinal-config.ts: 10-Level 상수 테이블 + getWorldVFinalConfig()
  - GET/PUT /api/admin/settings/vfinal API
  - SystemSafetyConfig.featureToggles에 vFinalEnabled 추가

- [ ] **T416: computePressure() 코어 함수**
  - pressure.ts: computePressure(state, triggerEffects?, worldConfig?) → P_final
  - P_raw = paradoxTension×0.5 + moodExtreme×0.2 + narrativeTension×0.15 + triggerBoost×0.15
  - worldConfig.maxPressure로 clamp
  - 단위 테스트: 경계값, 각 요소 기여도, Level별 clamp

- [ ] **T417: TriggerMap → Pressure 부스트 연결**
  - scheduler.ts: applyTriggerMapToTraits() 확장 → pressureBoost 반환
  - triggerMultiplier[level] 적용
  - pressure.ts: triggerEffectsToPressure() 추가

- [ ] **T418: 전체 파이프라인 V_Final 연결**
  - three-tier-engine.ts: PersonaState → computePressure → calculateVFinal에 P 주입
  - scheduler.ts: V_Final 기반 ActivityTraits
  - comment-tone.ts: commenterVectors를 V_Final로 교체
  - like-engine.ts / follow-engine.ts: V_Final 기반 재계산
  - vFinalEnabled=false → L1 fallback

- [ ] **T419: 통합 테스트 + 전체 검증**
  - Level 1/5/10 시나리오 테스트
  - Kill Switch (vFinalEnabled=false) fallback 테스트
  - pnpm validate PASS
  - API 문서 최신화 (internal.md)

- **AC**:
  - 관리자가 Engine Studio에서 표현 강도 1~10 설정 가능
  - 설정된 레벨 범위 내에서 V_Final 동적 계산
  - 매칭/포스트/댓글/좋아요/팔로우 전체 파이프라인 적용
  - vFinalEnabled=false 시 전체 L1 fallback
  - PIS 기존 자율 검증 시스템과 호환
  - pnpm validate PASS

---

### Phase LIFE-ANCHOR: 페르소나 생활 앵커 — 대화 허구 붕괴 방지

> **배경**: 현재 대화 엔진은 Factbook에 없는 구체적 사실(카페명, 영화명, 블로그 URL 등)을
> LLM이 즉흥적으로 만들어냄. 사용자가 구체적 내용을 되물으면 "기억이 안 난다"를
> 반복하며 대화가 붕괴됨. 해결책: 페르소나 생성 시 실제 생활 데이터를 Factbook에
> 미리 생성·저장하고, 대화 엔진은 Factbook 데이터만 구체적으로 언급하도록 강제.

- [ ] **T420: 생활 앵커 생성기 (Life Anchor Generator)**
  - `apps/engine-studio/src/lib/persona-generation/life-anchor-generator.ts` 신규
  - 입력: demographics(nationality, region, role, expertise, interests) + personality vectors
  - 출력: LifeAnchor[] — 아래 카테고리별 구체적 사실들
    - `place`: 자주 가는 장소 1~2곳 (실제 존재 가능한 이름)
    - `social`: 주요 지인 1~2명 (이름 + 관계 + 직업)
    - `media_recent`: 최근 소비한 미디어 2~3개 (제목 + 한줄 감상)
    - `creative_work`: 본인 창작물/프로젝트 (제목 + 플랫폼/URL)
    - `routine`: 주간 루틴 1~2가지
  - LLM 호출로 demographics/성격 기반 현실적 앵커 생성
  - 생성된 앵커는 Factbook `mutableContext`에 category별로 저장
  - 단위 테스트: 카테고리별 앵커 존재 여부, 국적/지역 일관성

- [ ] **T421: 페르소나 생성 파이프라인에 생활 앵커 통합**
  - `pipeline.ts` auto/manual 파이프라인 양쪽에 Stage 추가
  - `convertBackstoryToFactbook()` 이후 `generateLifeAnchors()` 호출
  - 생성된 LifeAnchor[] → Factbook `mutableContext`에 병합
  - FAL/Replicate 이미지 생성과 동일하게 실패 시 null 처리 (파이프라인 중단 없음)
  - 기존 페르소나 보정: 앵커 없는 페르소나 대상 보정 스크립트 or 수동 트리거 API

- [ ] **T422: 대화 엔진 Factbook 우선 원칙 적용**
  - `conversation-engine.ts` — `buildConversationSystemPrefix()` Factbook 섹션에 규칙 추가:
    - "Factbook에 없는 구체적 사실(장소명, 인물명, 작품명, URL)은 즉흥적으로 만들지 말 것"
    - "모르거나 Factbook에 없는 정보는 자연스럽게 모호하게 처리할 것"
    - "같은 대화 내에서 한 말과 모순되지 않을 것"
    - "사용자 불만 시 길게 자기분석/반성하지 말고 짧게 인정하거나 넘어갈 것"
  - 단위 테스트: Factbook 있음/없음 케이스별 시스템 프롬프트 내용 검증

- [ ] **T423: 테스트 + 검증**
  - T420 생활 앵커 생성기 단위 테스트
  - T421 파이프라인 통합 테스트 (mock LLM)
  - T422 프롬프트 내용 단위 테스트
  - pnpm validate PASS

- **AC**:
  - 새로 생성되는 페르소나는 Factbook에 place/social/media/creative/routine 앵커 보유
  - 대화에서 카페명, 영화명, 블로그 URL 등 구체적 사실을 Factbook 기반으로 말함
  - Factbook에 없는 사실은 즉흥 생성 대신 자연스럽게 모호화
  - 같은 대화 내 자기 모순 최소화 (자기 발화 일관성)
  - 기존 페르소나도 앵커 보정 가능

---

### Phase LIFE-ANCHOR-RETRO: 기존 페르소나 생활 앵커 일괄 보정

> **배경**: T420-T421은 신규 페르소나에만 적용됨. 기존 31개+ 페르소나는 Factbook에
> 생활 앵커가 없음. Engine Studio에서 관리자가 일괄 또는 개별로 앵커를 생성할 수 있는
> API + UI가 필요.

- [ ] **T424: 생활 앵커 일괄 생성 API**
  - `POST /api/internal/personas/bulk-generate-anchors`
    - body: `{ personaIds?: string[] }` — 생략 시 앵커 없는 전체 페르소나 대상
    - 각 페르소나의 profile(name, role, expertise, nationality, region, gender, birthDate) +
      layerVectors(TEMPERAMENT L2) + 기존 Factbook 조회
    - T420에서 구현한 `generateLifeAnchors()` 호출
    - 생성된 앵커를 Factbook `mutableContext`에 merge (중복 category는 skip)
    - 결과: `{ processed: number, succeeded: number, failed: number, results: [...] }`
  - `GET /api/internal/personas/anchor-status`
    - 각 페르소나별 앵커 보유 여부 + 카테고리 목록 반환
    - 앵커 없는 페르소나 수 집계
  - 요금 제어: 페르소나당 LLM 1회 호출 — 처리 전 예상 비용 계산 후 응답에 포함

- [ ] **T425: Engine Studio 생활 앵커 관리 UI**
  - `apps/engine-studio/src/app/(dashboard)/persona-studio/personas/page.tsx` 또는
    별도 `(dashboard)/tools/anchor-manager/page.tsx`
  - 앵커 현황 카드: "앵커 미생성 페르소나 N개" + 예상 비용 표시
  - **[일괄 생성] 버튼**: 앵커 없는 페르소나 전체 대상 → 확인 모달(예상 비용) → API 호출
  - **진행 상태**: 처리 중 스피너 + 완료 시 결과 요약 (성공 N, 실패 N)
  - 개별 페르소나 행: 앵커 보유 상태 배지 (✅ 보유 / ⚠️ 미생성) + 개별 [재생성] 버튼
  - 사이드바 메뉴: System Integration 또는 Persona Studio 하위에 추가

- **AC**:
  - [일괄 생성] 버튼 클릭 → 앵커 없는 페르소나 전체에 생활 앵커 생성
  - 기존 앵커 있는 페르소나는 skip (중복 생성 방지)
  - 개별 페르소나 [재생성]으로 앵커 업데이트 가능
  - 처리 결과(성공/실패) UI에 표시
  - T420 `generateLifeAnchors()` 재사용 (코드 중복 없음)
  - pnpm validate PASS

---

### Phase VECTOR-BEHAVIOR: 벡터 기반 상황별 행동 패턴

> **배경**: 현재 대화 엔진(conversation-engine.ts)에 L1/L2 벡터가 전달되지 않음.
> VoiceStyleParams(formality, humor 등)만 전달되어 말투는 개인화되지만,
> "상대방이 화낼 때", "거절당할 때" 같은 감정적 상황에서의 반응 패턴은
> LLM 기본값(사과 + 대화 종료)으로 fallback됨.
> 예: sociability=0.82 + stance=0.90(냉소적)인 Farida가 "싫어 안봐"를 들었을 때
> "시간 필요하면 연락 기다릴게" → 벡터와 정반대. 오히려 "에이~ 왜그래"가 맞음.

- [ ] **T426: PersonaProfileSnapshot에 L1/L2 벡터 추가**
  - `types.ts` → `PersonaProfileSnapshot`에 선택적 필드 추가:
    ```ts
    l1Vector?: {
      sociability: number   // 0~1: 외향 (관계 유지 의지)
      stance: number        // 0~1: 비관적/냉소적 (수동적 복종 거부)
      purpose: number       // 0~1: 의미추구
      depth: number         // 0~1: 직관적 ↔ 분석적
    }
    l2Vector?: {
      extraversion: number
      agreeableness: number
      neuroticism: number
      openness: number
    }
    ```
  - 대화 API 핸들러(conversation route)에서 persona 조회 시 layerVectors 포함 → snapshot에 주입
  - 기존 호환성 유지 (모든 필드 optional)

- [ ] **T427: 대화 엔진 — 벡터 기반 상황별 행동 지침 생성**
  - `buildConversationSystemPrefix()`에 L1/L2 벡터 → 상황별 행동 패턴 변환 로직 추가
  - **거절/충돌 상황** (사용자가 화내거나 대화를 끊으려 할 때):
    - `sociability > 0.7` → "상대방이 화내거나 거절해도 관계를 유지하려는 적극성. 조용히 물러서지 않음"
    - `sociability < 0.3` → "상대방이 거절하면 담담하게 받아들임"
    - `stance > 0.7` (냉소적) → "지나치게 사과하거나 자기비난하지 않음. 오히려 상황을 냉소적으로 봄"
    - `agreeableness < 0.35` → "동의보다 자기 관점 유지. 쉽게 굴복하지 않음"
  - **사과/인정 패턴**:
    - `neuroticism > 0.6` → "실수에 민감하게 반응하지만 길게 자기분석하지는 않음"
    - `assertiveness > 0.7` (VoiceStyleParams) → "실수를 인정하되 과도한 사과 없이 빠르게 넘어감"
  - **AI 종료 패턴 방지**:
    - "대화를 마무리 짓는 '...기다릴게', '시간이 필요하면 연락해' 식의 AI 종료 패턴을 사용하지 말 것"
    - "대화의 끝은 당신의 성격 벡터가 결정. 당신이 먼저 대화를 끝내지 않음"
  - 단위 테스트: sociability/stance/agreeableness 조합별 생성된 지침 내용 검증

- [ ] **T428: 테스트 + 검증**
  - T426 PersonaProfileSnapshot 타입 변경 영향 범위 확인
  - T427 프롬프트 변환 단위 테스트
  - 대화 API 통합 테스트 (mock 페르소나 + 거절 시나리오)
  - pnpm validate PASS

- **AC**:
  - sociability=0.82 + stance=0.90인 페르소나는 "싫어 안봐"에 "에이 왜그래~" 류로 반응
  - "시간 필요하면 연락 기다릴게" 류의 AI 종료 패턴 제거
  - 벡터별 상황 반응이 일관되게 적용됨 (낮은 sociability 페르소나는 다르게 반응)
  - 기존 voiceSpec 기반 말투 개인화와 충돌 없음
  - pnpm validate PASS

## BLOCKED

(없음)
