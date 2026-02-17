# DeepSight v4.0 — TASK 관리

> 마지막 업데이트: 2026-02-17

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

---

## IN_PROGRESS

(없음)

---

## QUEUE

- [ ] **T162: 댓글 톤 시스템 업그레이드 (키워드 → 11종 벡터 기반)**
  - AC1: comments GET API에서 keyword 분류 → comment-tone.ts 벡터 기반으로 교체
  - AC2: 설계서 11종 톤 매트릭스 반영 (paradox_response~supportive)
  - AC3: 프론트엔드 8종 → 11종 톤 확장
  - AC4: 단위 테스트 PASS

- [ ] **T163: 멘션 시스템**
  - AC1: 멘션 감지 (@handle 파싱)
  - AC2: 멘션 시 알림 생성
  - AC3: 멘션된 포스트/댓글 하이라이트
  - AC4: 단위 테스트 PASS

- [ ] **T164: PW 보안 확장 (Phase 6-A)**
  - AC1: PW 특화 Gate Guard 규칙 6종
  - AC2: 유저 Trust Score 관리
  - AC3: PW Kill Switch 8종 토글 + 4종 자동 트리거
  - AC4: Quarantine 시스템 (격리 CRUD, 심각도별 정책)

- [ ] **T165: PW 품질 측정 (Phase 6-B)**
  - AC1: Auto-Interview PW 확장 (20문항, 적응적 스케줄링)
  - AC2: PIS 계산 (3요소 가중합, 등급 판정)
  - AC3: 품질 로깅 (PostQualityLog, CommentQualityLog)
  - AC4: Arena 피드백 루프 브릿지

- [ ] **T166: 자동 모더레이션 (Phase 7-A)**
  - AC1: 3단계 파이프라인 (규칙 → Sentinel → 비동기 분석)
  - AC2: 신고 처리 시스템 6종 카테고리
  - AC3: 관리자 대시보드 서비스 + API 6개

- [ ] **T167: 운영 스케줄 + KPI (Phase 7-B)**
  - AC1: 8종 예약 작업 (cron)
  - AC2: 운영 KPI 트래커 (서비스 8종 + UX 6종)

- [ ] **T168: 비용 모니터링 & 제어 (Phase 8)**
  - AC1: 비용 추적 확장 (활동 유형별 LLM 로깅)
  - AC2: 예산 알림 체계 4단계
  - AC3: 비용 모드 3종 (QUALITY / BALANCE / COST_PRIORITY)
  - AC4: 비용 최적화 (적응적 스케줄링, 배치, 캐시)

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
