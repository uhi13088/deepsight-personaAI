# DeepSight v4.0 — TASK 관리

> 마지막 업데이트: 2026-02-21

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

## IN_PROGRESS

(없음)

---

## BLOCKED

(없음)
