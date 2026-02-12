# DeepSight - TASK QUEUE

> **이 파일이 작업의 유일한 진실(Single Source of Truth)입니다.**
> 모든 작업은 이 큐를 기준으로 진행합니다.

---

## 📋 QUEUE (대기)

### Phase A: 핵심 페르소나 관리 (T45~T50)

> 엔진 스튜디오 v3 웹 구축 — 기존 src/ 삭제 후 재구축. 페르소나 CRUD 우선.

- [x] **T45: 프로젝트 초기화 + 기본 레이아웃** ✅ 2026-02-11
  - AC1: ✅ 기존 src/ (233 files) + tests/ (4 files) 삭제, prisma/config 보존
  - AC2: ✅ App Router 구조 (app/, components/, lib/, types/, constants/, stores/, hooks/)
  - AC3: ✅ LNB 8섹션 (§2.4 기준, 접이식 하위 메뉴, 구분선, 활성 표시)
  - AC4: ✅ 21개 하위 라우트 + Dashboard = 24 pages (Build PASS)
  - AC5: ✅ globals.css (Tailwind v4 dark 테마) + cn() + prisma singleton
  - AC6: ✅ Build PASS (Next.js 16.1.6 Turbopack) + 커밋 + 푸시

- [x] **T46: Phase 0 기반 인프라 — v3 타입 + DB 스키마 + 상수** ✅ 2026-02-11
  - AC1: ✅ v3 공유 타입 (shared-types + engine-studio) — 106D+ 전체
  - AC2: ✅ Prisma v3 확장 (PersonaLayerVector 3-Layer, Persona 12필드, UserVector OCEAN, InteractionLog/Session 2모델, 3 enum)
  - AC3: ✅ 상수 모듈 7개 (dimensions 16D, paradox-mappings 7쌍, projection-coefficients, cross-layer-axes 83축, dynamics-defaults, interpretation-tables, index)
  - AC4: ✅ 색상 모듈 6개 (CIELAB+OKLCH 16D, layer 3, cross-axis, engine-meta, archetype 12, resolveColor)
  - AC5: ✅ Build PASS + 커밋 + 푸시 (7d07d91, fa21144)
  - 참고: DB 마이그레이션(0-6, 0-22)은 PostgreSQL 환경에서 실행 필요

- [x] **T47: Phase 1 벡터 엔진 — 교차축 + Paradox + V_Final** ✅ 2026-02-11
  - AC1: ✅ 벡터 유틸리티 (clamp, validateVector, euclideanDistance, cosineSimilarity)
  - AC2: ✅ L2→L1 투영 (5D→7D, invert 포함), L3→L1 투영 (4D→7D, 0.5 baseline + coefficients)
  - AC3: ✅ 교차축 계산 엔진 (83축, paradox/reinforcing/modulating/neutral 4종 score formula)
  - AC4: ✅ Extended Paradox Score (w1=0.50×L1↔L2 + w2=0.30×L1↔L3 + w3=0.20×L2↔L3) + Dimensionality bell curve
  - AC5: ✅ V_Final = clamp((1-P)×L1 + P×(α×L2proj + β×L3proj)), vFinalToVector 변환
  - AC6: ✅ 단위 테스트 5파일 41개 전부 PASS + Build PASS + 커밋 (38679ab)

- [x] **T48: 페르소나 목록 페이지 + API** ✅ 2026-02-11
  - AC1: ✅ GET /api/internal/personas (상태/소스/아키타입/검색/벡터범위/Paradox범위/교차축 필터, 5종 정렬, 페이지네이션)
  - AC2: ✅ PersonaCard 카드 그리드 (프로필, 이름, 상태 뱃지 8종, 아키타입 라벨, 주요 성향 Top3, Paradox %)
  - AC3: ✅ PersonaFilters (상태 칩, 아키타입 12종 멀티셀렉, L1/L2/L3 16D 범위 슬라이더, EPS Range)
  - AC4: ✅ 검색(이름+설명), 정렬 5종+오름/내림, PersonaPagination 페이지 크기 선택
  - AC5: ✅ shadcn/ui 6종 + usePersonas hook + 테스트 7파일 73개 PASS + Build PASS (a52840a)

- [x] **T49: 페르소나 생성 플로우 (4-Step)** ✅
  - 배경: 핵심 기능. 스펙 §3.1.2 + 구현계획서 Phase 2
  - AC1: ✅ Step 1 — 기본 정보 (이름 2~30자, 역할 5종, 전문분야 16종, 설명 100자)
  - AC2: ✅ Step 2 — 3-Layer 벡터 에디터 (L1 7D + L2 5D + L3 4D + 아키타입 12종 프리셋, EPS 실시간)
  - AC3: ✅ Step 3 — 프롬프트 엔지니어링 (벡터 기반 자동 생성 + 수동 편집, 6개 섹션)
  - AC4: ✅ Step 4 — 리뷰 + Draft/Activate 저장
  - AC5: ✅ POST /api/internal/personas/create (트랜잭션, Paradox Score 자동 계산, 벡터 3레이어 저장)
  - AC6: ✅ 테스트 9파일 119개 PASS + Build PASS (b1bcaf9)

- [x] **T50: 페르소나 수정/복제/보관 + 라이프사이클** ✅
  - 배경: 스펙 §3.1.3~3.1.5 + §3.8
  - AC1: ✅ 페르소나 수정 (GET/PUT /personas/[id] + 편집 UI 3탭 + 벡터 표시)
  - AC2: ✅ 페르소나 복제 (POST /personas/[id]/duplicate, DRAFT+MUTATION 소스, parentPersonaId 추적)
  - AC3: ✅ 페르소나 보관/복원 (라이프사이클 ARCHIVE/RESTORE 액션, archivedAt 타임스탬프)
  - AC4: ✅ 라이프사이클 상태 전이 8종 (POST /personas/[id]/lifecycle, 전이 매트릭스, 위험 액션 확인)
  - AC5: ✅ 테스트 10파일 143개 PASS + Build PASS (29 routes)

### Phase B: 엔진 핵심 기능 (T51~T61)

> 벡터 에디터, 생성 파이프라인, 검증, 매칭 연구소, 노드 에디터.

- [x] **T51: 3-Layer 벡터 에디터 UI** ✅
  - 배경: 스펙 §3.2 + 구현계획서 Phase 7. 벡터 시각적 편집의 핵심
  - AC1: ✅ L1(7D) 슬라이더 에디터 (축별 컬러, 0.00~1.00, 실시간 미리보기)
  - AC2: ✅ L2(5D) OCEAN 슬라이더 에디터
  - AC3: ✅ L3(4D) Narrative Drive 에디터 (활성화 체크박스 포함)
  - AC4: ✅ Paradox Score 시각화 (EPS + L1↔L2/L1↔L3/L2↔L3 분해)
  - AC5: ✅ V_Final 실시간 시뮬레이터 (교차축 프로필 포함) — pressure 슬라이더, 레이어 기여도, 교차축 요약
  - AC6: ✅ 아키타입 12종 카드 선택 UI (벡터 자동 적용)
  - AC7: ✅ 테스트 143개 PASS + Build PASS

- [x] **T52: 생성 파이프라인 v3 — 아키타입 + 벡터 생성 + 캐릭터** ✅
  - 배경: 구현계획서 Phase 2. 페르소나 자동 생성의 핵심 엔진
  - AC1: ✅ 아키타입 12종 템플릿 (벡터 범위, 캐릭터 시드, Paradox 범위, dynamics 기본값)
  - AC2: ✅ 3-Layer 벡터 생성기 (다양성 분석, 빈 영역 우선, L1+L2+L3 동시 생성)
  - AC3: ✅ Paradox 디자이너 (tension map, 긴장도 자동 조절, 범위 검증)
  - AC4: ✅ 캐릭터 생성기 (이름, 역할, 전문분야, 배경, 말버릇, 퀴크, 습관, 관계)
  - AC5: ✅ 활동성/콘텐츠 설정 추론 (PostFrequency, activeHours, reviewStyle, interactionStyle)
  - AC6: ✅ 6-Category 일관성 검증기 (STRUCTURE/L1_L2/L2_L3/QUAL_QUANT/CROSS_AXIS/DYNAMIC)
  - AC7: ✅ 테스트 37개 PASS (전체 180개) + Build PASS

- [x] **T72: 정성적 차원 생성기 — Backstory + Voice + Pressure + Zeitgeist** ✅
  - 배경: 구현계획서 Phase 3. 벡터 너머의 정성적 페르소나 깊이
  - AC1: ✅ Backstory 생성기 (origin, formativeExperience, innerConflict, selfNarrative, nlpKeywords)
  - AC2: ✅ Voice Profile 생성기 (speechStyle, habitualExpressions, mannerisms, activationThresholds)
  - AC3: ✅ Pressure Context 생성기 (triggers, stressResponse, comfortZone)
  - AC4: ✅ Zeitgeist Profile 생성기 (culturalReferences, generationalMarkers, socialAwareness, trendSensitivity)
  - AC5: ✅ 정성적 차원 에디터 UI (4탭: 배경/보이스/압박/시대, 텍스트 에디터 + 자동 생성)
  - AC6: ✅ 테스트 18개 PASS (전체 198개) + Build PASS

- [x] **T73: 하이브리드 연결 메커니즘 — Init/Override/Adapt/Express** ✅
  - 배경: 구현계획서 Phase 4. 정성↔정량 4대 알고리즘
  - AC1: ✅ Init 알고리즘 (LLM 키워드 추출 → 의미 카테고리 8종 → 벡터 delta, clamp)
  - AC2: ✅ Override 알고리즘 (2단계 트리거 감지, override/additive delta, 지수 감쇠, 5 기본 규칙)
  - AC3: ✅ Adapt 알고리즘 (UIV 3축, 차원별 α 튜닝 7D, 모멘텀, ±0.3 클램프, 배치 처리)
  - AC4: ✅ Express 알고리즘 (파생 상태값 5종 sigmoid, 6 quirk 정의, cooldown, 조건 평가)
  - AC5: ✅ attitude→delta 매핑 8종 + InteractionEngine (Init→Override→Adapt→Attitude→Express 파이프라인, drift 계산, reset)
  - AC6: ✅ 테스트 49개 PASS (전체 247개) + Build PASS

- [x] **T53: 프롬프트 엔지니어링 — 버전 관리 + 테스트 + 빌더** ✅
  - 배경: 스펙 §3.3. 프롬프트 작성, 버전 관리, 테스트
  - AC1: ✅ 프롬프트 에디터 UI (5탭: base/review/post/comment/interaction, 프리셋 4종, 품질 테스트)
  - AC2: ✅ 프롬프트 버전 관리 (시맨틱 버전 Major/Minor/Patch 자동 감지, diff 비교, 롤백)
  - AC3: ✅ 프롬프트 테스트 (구조 분석, 톤 분석, 금지어 검사, 벡터 일관성, 종합 점수)
  - AC4: ✅ 프롬프트 빌더 v3 (5종 프롬프트 생성, 벡터 기반 가이드, 프리셋 4종)
  - AC5: ✅ 테스트 49개 PASS (전체 296개) + Build PASS

- [x] **T54: 페르소나 검증 + 품질 측정** ✅
  - 배경: 스펙 §3.4 + 구현계획서 Phase 2/9. 품질 게이트
  - AC1: ✅ Auto-Interview 프로토콜 (20문항, L1 7+L2 5+L3 4+역설 4, 규칙기반 스코어링)
  - AC2: ✅ Persona Integrity Score (CR 0.35 + SC 0.35 + CS 0.30, A~F 등급, 레이어별 분석)
  - AC3: ✅ Quality Score (vectorBalance 30% + promptCompleteness 30% + interviewResult 30% + coherence 10%, 추천 사항)
  - AC4: ✅ 수동 검증 워크플로우 (리뷰어 지정, 11개 체크리스트 4카테고리, 승인/반려/수정요청)
  - AC5: ✅ 테스트 70개 PASS (전체 366개) + Build PASS

- [x] **T55: 페르소나 테스트 + A/B 테스트 + 성과 모니터링** ✅
  - 배경: 스펙 §3.5 + §3.7. 실제 콘텐츠 테스트 및 성과 추적
  - AC1: ✅ 단일 콘텐츠 테스트 (톤 분석, 금지어 검사, 벡터 정합성, 길이 점수, 종합 품질)
  - AC2: ✅ 대량 콘텐츠 테스트 (배치 실행, 일관성 분석, 이상치 감지, 통계)
  - AC3: ✅ A/B 테스트 (트래픽 분배 3종, 상태 관리, 메트릭 비교, 유의미성 판정, 종합 승자)
  - AC4: ✅ 페르소나 시뮬레이터 (다턴 대화, 압박 추정, 일관성 리포트, 추이 분석)
  - AC5: ✅ 성과 모니터링 (CTR/만족도/체류/전환 지표, 4종 알림, 개선 제안, 대시보드 데이터)
  - AC6: ✅ 테스트 61개 PASS (전체 427개) + Build PASS

- [x] **T56: 유저 인사이트 엔진** ✅
  - 배경: 스펙 §4. 유저 프로파일링 + 아키타입 관리
  - AC1: ✅ 콜드 스타트 전략 관리 (Quick/Standard/Deep 3모드, 질문 세트 CRUD, 응답→벡터 추론, 신뢰도 계산)
  - AC2: ✅ 심층 성향 분석 모델 (OCEAN→L1 매핑, 반전 탐지 Δ≥0.25, 잠재 특성 추출 3유형)
  - AC3: ✅ 점진적 프로파일링 (8종 행동→신호 변환, 지수 감쇠 e^(-λd), 벡터 업데이트, ε-greedy 탐색)
  - AC4: ✅ 유저 아키타입 분류 (10종 기본 아키타입, 유클리드 거리+규칙 하이브리드 분류, 커스텀 CRUD, 통계)
  - AC5: ✅ 적응형 프로파일링 엔진 (CAT 기반 질문 선택, 데일리 체크 3문항+보상, 불성실 응답 방지+신뢰도)
  - AC6: ✅ 테스트 77개 PASS (전체 504개) + Build PASS

- [x] **T57: 매칭 연구소 — 시뮬레이터 + 알고리즘 튜닝** ✅
  - 배경: 스펙 §5.1~§5.3. 3-Tier 매칭 핵심
  - AC1: ✅ 3-Tier 매칭 엔진 (Basic 0.7V+0.3CAP / Advanced 0.5V+0.3CAP+0.2EPS / Exploration 다양성+발산+신선도)
  - AC2: ✅ 매칭 시뮬레이터 (수동/랜덤 가상유저, 단일/배치 시뮬, 통계+분포+XAI 설명)
  - AC3: ✅ 알고리즘 튜닝 (6종 하이퍼파라미터, 6장르 가중치, Grid Search/Bayesian 자동 튜닝)
  - AC4: ✅ A/B 테스트 + Guardrails (5종 테스트타입, 만족도/에러 가드레일, 자동 롤백, 종합 판정)
  - AC5: ✅ 시나리오 저장/공유 (CRUD, 공유 토큰, 복제, 검증)
  - AC6: ✅ 테스트 63개 PASS (전체 567개) + Build PASS

- [x] **T58: 매칭 연구소 — 성과 분석 + 매칭 설명 + 콘텐츠 평가**
  - 배경: 스펙 §5.4~§5.6. 매칭 결과 분석 및 설명
  - AC1: ✅ analytics.ts — KPI 계산, Shannon entropy 다양성 지수, 트렌드 분석, 이상 탐지, 대시보드 빌더
  - AC2: ✅ explanation.ts — 운영자용 차원별 기여도 분석 + 사용자용 자연어 설명 (숫자 없이 2~3문장)
  - AC3: ✅ content-review.ts — 리뷰 스타일 12종(3bit+특화4), 페르소나→스타일 매핑, 2단계 파이프라인, 비용 추정
  - AC4: ✅ report.ts — 리포트 설정/생성(5섹션), KPI 요약+변화율, 개선 권고, CSV 내보내기
  - AC5: ✅ 테스트 74개 PASS (전체 641개) + Build PASS

- [x] **T59: 노드 에디터 — 기반 인프라 (DAG 엔진)**
  - 배경: 구현계획서 Phase 8 전반. ComfyUI 스타일 DAG 에디터의 기반
  - AC1: ✅ port-types.ts — 22개 포트 타입(21+Any), 호환성 매트릭스, ArchetypeConfig→벡터 특수 호환
  - AC2: ✅ node-registry.ts — 6카테고리 25노드 (Input5/Engine4/ControlFlow3/Gen7/Assembly2/Output4)
  - AC3: ✅ topological-sort.ts — Kahn's 위상 정렬 + DFS 순환 탐지 + wouldCreateCycle 사전 체크
  - AC4: ✅ dag-engine.ts — 실행 계획, 입력값 수집, 제어 흐름 활성 엣지 추적, upstream/downstream 탐색
  - AC5: ✅ graph-validator.ts — 필수 노드/포트/연결 유효성 + 분기 규칙 4종 (Merge/DeadEnd/Reachability/SwitchDefault)
  - AC6: ✅ serializer.ts — JSON 직렬화/역직렬화, v2→v3 마이그레이션(6D→7D), 변경 감지
  - AC7: ✅ 테스트 55개 PASS (전체 696개) + Build PASS

- [x] **T60: 노드 에디터 — 캔버스 + 25노드 UI + 설정 패널**
  - 배경: 구현계획서 Phase 8 후반 + 스펙 §3.10. @xyflow/react 기반
  - AC1: ✅ node-editor-store.ts — Zustand 스토어 (노드/엣지 CRUD, 선택, 실행, 검증 상태)
  - AC2: ✅ persona-node-editor.tsx — ReactFlow 캔버스 (연결 검증, 순환 방지, 드래그&드롭)
  - AC3: ✅ persona-node-wrapper.tsx — 포트 핸들, 카테고리별 컬러, 실행 상태 배지
  - AC4: ✅ node-types.tsx — 25노드 타입별 UI + NODE_TYPE_MAP 레지스트리
  - AC5: ✅ node-palette.tsx — 카테고리별 접이식 팔레트, 드래그&드롭 + 클릭 추가
  - AC6: ✅ node-settings-panel.tsx — 포트 정보, 데이터 편집 (숫자/문자열), 메타 정보
  - AC7: ✅ editor-toolbar.tsx + editor-status-bar.tsx — 프리셋 4종 + flow-presets.ts
  - AC8: ✅ 전체 696개 테스트 PASS + Build PASS

- [x] **T61: 노드 에디터 — 실행 엔진 + 제어 흐름** ✅
  - 배경: 구현계획서 Phase 8 실행부 + §14.8~§14.9
  - AC1: ✅ node-executor.ts — 25노드 execute() 디스패처 (Input 5 + Engine 4 + CF 3 + Gen 7 + Assembly 2 + Output 4)
  - AC2: ✅ llm-adapter.ts — LLM 인터페이스, 7노드 프롬프트 템플릿, 모델 라우팅 (sonnet/haiku)
  - AC3: ✅ control-flow.ts — Conditional (threshold/range/enum/exists), Switch (band/enum-match), Merge (first-active/combine)
  - AC4: ✅ execution-engine.ts — executeGraph/executeFromNode, ExecutionPath 로깅, 활성 엣지 추적, 비활성 경로 스킵
  - AC5: ✅ 플로우 프리셋 4종 (T60에서 구현 완료)
  - AC6: ✅ 전체 766개 테스트 PASS (T61: 70개 추가) + Build PASS

### Phase C: 이후 확장 (T62~T71)

> 인큐베이터, 컬러지문, 시스템 운영, 대시보드, RAG 연동.

- [x] **T62: 페르소나 인큐베이터 — Daily Batch + 자가발전** ✅
  - 배경: 스펙 §3.6. 페르소나 지속 품질 개선 시스템
  - AC1: Daily Batch 워크플로우 (스케줄링, 배치 실행, 결과 저장) ✅ `batch-workflow.ts`
  - AC2: 자가발전 시스템 (인터랙션 로그 기반 벡터 미세 조정) ✅ `self-evolution.ts`
  - AC3: 콜드 스타트 운영 정책 (신규 페르소나 초기 학습) ✅ `cold-start.ts`
  - AC4: 비용 통제 정책 (LLM 호출 예산, 일일 상한) ✅ `cost-control.ts`
  - AC5: Golden Sample 관리 + 확장 전략 ✅ `golden-sample.ts`
  - AC6: 재검증 시스템 + 진화 전략 ✅ `revalidation.ts`
  - AC7: 인큐베이터 대시보드 + 모니터링 ✅ `dashboard.ts`
  - AC8: 테스트 (40 tests PASS) + 빌드 PASS + 커밋

- [x] **T63: 컬러지문 데이터 엔진 — CIELAB+OKLCH 인코딩** ✅
  - 배경: 구현계획서 Phase 6. 페르소나 고유 시각 식별자
  - AC1: 색상 공간 변환 (CIELAB↔OKLCH↔sRGB) ✅ `color-space.ts`
  - AC2: 색상 인코더 (릿지별 할당, ΔE00 차이) ✅ `color-encoder.ts`
  - AC3: 릿지 생성기 (패턴/코어/델타/곡률) ✅ `ridge-generator.ts`
  - AC4: 유일성 엔진 (결정적 PRNG) ✅ `uniqueness-engine.ts`
  - AC5: 충돌 검사기 (pHash/SSIM/커브/히스토그램) ✅ `collision-checker.ts`
  - AC6: 정규 SVG 렌더러 ✅ `svg-renderer.ts`
  - AC7: 단위 테스트 (69 tests PASS) + 빌드 PASS + 커밋

- [x] **T64: 컬러지문 UI — TraitColor/PingerPrint v3** ✅
  - 배경: 구현계획서 Phase 7. 멀티레이어 시각화
  - AC1: TraitColorFingerprint v3 (멀티레이어 레이더 차트) ✅ `trait-color-fingerprint.tsx`
  - AC2: PingerPrint2D v3 (멀티레이어 패턴) ✅ `p-inger-print-2d.tsx`
  - AC3: PingerPrint3D v3 (멀티레이어 3D Jacks) ✅ `p-inger-print-3d.tsx`
  - AC4: 지문 호환성 래퍼 (v2→v3 전환) ✅ `fingerprint-compat.tsx`
  - AC5: 단위 테스트 (34 tests PASS) + 빌드 PASS + 커밋

- [x] **T65: 소비자 여정 시뮬레이터** ✅
  - 배경: 스펙 §5.7. B2B 고객 체험용 미리보기
  - AC1: ✅ 시뮬레이터 UI (ConsumerProfile, UserDemographics, 매칭 결과 미리보기)
  - AC2: ✅ 시뮬레이션 모드 (basic/detailed/comparison 3종)
  - AC3: ✅ 데이터 소스 연동 (real_persona/virtual_user/synthetic)
  - AC4: ✅ API 연동 가이드 (B2B 고객용 통합 가이드)
  - AC5: ✅ 테스트 (35 tests PASS) + 빌드 PASS + 커밋

- [x] **T66: 시스템 연동 관리** ✅
  - 배경: 스펙 §6. 배포/버전/이벤트 버스
  - AC1: ✅ API 배포 파이프라인 (DeployEnvironment, DeployWorkflow, CanaryRelease)
  - AC2: ✅ 알고리즘 버전 관리 (parseVersion, activateVersion, deprecateVersion, diffVersions, rollbackVersion)
  - AC3: ✅ 이벤트 버스 (createEventBus, subscribe, publish, getEventLog)
  - AC4: ✅ 개발자 콘솔 연동 (API 문서 자동 생성, Changelog)
  - AC5: ✅ 통합 테스트 자동화 (TestScenario, TestPipeline, TestReport)
  - AC6: ✅ 테스트 (73 tests PASS) + 빌드 PASS + 커밋

- [x] **T67: 운영 관리** ✅
  - 배경: 스펙 §7. 시스템 모니터링 + 장애 대응 + 백업
  - AC1: ✅ 시스템 모니터링 (MetricDataPoint, evaluateThresholds, searchLogs, buildMonitoringDashboard)
  - AC2: ✅ 장애 대응 (createIncident, triageIncident, advanceIncidentPhase, resolveIncident, createPostMortem, calculateMTTR)
  - AC3: ✅ 롤백/복구 (createRollbackRequest, analyzeRollbackImpact, executeRollbackStep, completeRollback)
  - AC4: ✅ 백업/재해복구 (createBackupPolicy, createDRPlan, scheduleDRDrill, evaluateDRDrillResult)
  - AC5: ✅ 용량 계획 (forecastLinear, generateCostOptimizations, generateScalingRecommendations, buildCapacityReport)
  - AC6: ✅ 테스트 (107 tests PASS) + 빌드 PASS + 커밋

- [x] **T68: 전역 설정 — 모델/비용 + 안전 필터 + API** ✅
  - 배경: 스펙 §8. 엔진 전역 설정
  - AC1: ✅ 모델 선택 + 비용 관리 (createModelConfig, resolveModel, estimateCost, recordSpend, getBudgetStatus)
  - AC2: ✅ 안전 필터 (createSafetyFilter, evaluateFilter, addForbiddenWord, getFilterLogSummary)
  - AC3: ✅ API 엔드포인트 관리 (registerEndpoint, updateRateLimit, recordHealthCheck, getHealthSummary)
  - AC4: ✅ 테스트 (81 tests PASS) + 빌드 PASS + 커밋

- [x] **T69: 팀 & 접근 관리** ✅
  - 배경: 스펙 §2.4 + §9.1. 사용자/역할/감사
  - AC1: ✅ 사용자 관리 (TeamMember, inviteMember, deactivateMember)
  - AC2: ✅ 역할 권한 (Admin/AI Engineer/Content Manager/Analyst 4종, 권한 매트릭스)
  - AC3: ✅ 감사 로그 (recordAuditEntry, searchAuditLog, exportAuditLog)
  - AC4: ✅ 테스트 (45 tests PASS) + 빌드 PASS + 커밋

- [x] **T70: 대시보드** ✅
  - 배경: 스펙 §2.4. 시스템 전체 요약 화면
  - AC1: ✅ 시스템 헬스 개요 (buildSystemHealth, healthScoreToGrade)
  - AC2: ✅ 매칭 성과 요약 (TierDistribution, buildMatchingPerformance, calculateTrend)
  - AC3: ✅ 최근 활동 로그 (ActivityEntry, buildActivityFeed, filterActivities)
  - AC4: ✅ 퀵 액션 (DEFAULT_QUICK_ACTIONS, getAvailableActions)
  - AC5: ✅ 테스트 (53 tests PASS) + 빌드 PASS + 커밋

- [x] **T71: PersonaWorld RAG + LLM 전략 + 품질 피드백 루프** ✅
  - 배경: 구현계획서 Phase 9. RAG/LLM/품질 통합
  - AC1: ✅ RAG 시스템 (VoiceAnchor, RelationMemory, InterestContinuity, buildRAGContext, buildContextPrompt)
  - AC2: ✅ LLM 전략 (2-Tier 모델 설정, routeToTier, createPromptCache, getCachedPrompt)
  - AC3: ✅ 품질 피드백 (ParadoxExpressionScore, VoiceConsistencyMetric, PressureReactionTest)
  - AC4: ✅ Few-shot 수집기 + 품질 대시보드 API
  - AC5: ✅ RAG→프롬프트 빌더 통합 (integrateRAGWithPromptBuilder, integrateTierWithPipeline)
  - AC6: ✅ 테스트 (85 tests PASS) + 빌드 PASS + 커밋

### Phase PW-A: PersonaWorld 준비 — 디자인 시스템 (T74)

> 엔진 완료 전 선행 가능한 순수 UI 작업. 목업 데이터 금지, shared-types import 기반.
> 랜딩페이지는 통합 랜딩 하나로 사용 (별도 PW 랜딩 없음).

- [x] **T74: PW 디자인 시스템 완성 — shared-types + 신규 컴포넌트 + 6D 잔재 삭제** ✅ 2026-02-12
  - AC1: ✅ shared-types v3 타입 import (ThreeLayerVector, ParadoxProfile 등 14종 re-export, Vector6D 삭제)
  - AC2: ✅ trait-colors.ts 3-Layer 16D 색상 매핑 (L1 7D Blue + L2 5D Warm + L3 4D Purple, engine-studio 동기화)
  - AC3: ✅ 디자인 시스템 신규 4종 — PWProfileRing (size 4종+animated), PWLikeButton (하트 팝), PWBadge (3 variant), PWSpinner (size 3종)
  - AC4: ✅ 기존 6D 시각화 3파일 삭제 (trait-color-bar, trait-color-fingerprint, p-inger-print-2d) + 페이지 v3 전환
  - AC5: ✅ 테스트 2파일 23개 PASS + Build PASS
  - 변경: types.ts, user-store.ts, trait-colors.ts, role-config.ts, globals.css, page.tsx, persona/[id]/page.tsx, profile/page.tsx, pw-profile-ring.tsx, pw-like-button.tsx, pw-badge.tsx, pw-spinner.tsx, index.ts, vitest.config.ts

### Phase PW-B: PersonaWorld 페이지 구축 (T75~T79)

> **선행조건: 엔진 Phase A 완료 (T45~T50)** — v3 API가 실제 데이터를 제공한 후 시작.
> 모든 페이지는 실제 API 연동. 목업 데이터/하드코딩 절대 금지.

- [x] **T75: PW 온보딩 v3 — 3-Phase 질문 + 매칭 프리뷰**
  - 배경: 설계서 §9. 실제 질문 API + 프로파일링 API 연동
  - AC1: Phase 구조 UI (3-Phase × 8문항, 진행 바, Phase 간 전환) ✅
  - AC2: 시나리오 질문 카드 (4지선다, 선택 피드백, 게이미피케이션) ✅
  - AC3: Phase 간 매칭 프리뷰 (실제 매칭 API 호출, 페르소나 카드 + 유사도 %) ✅
  - AC4: 이탈 정책 UX (Phase 단위 저장, 미완료 Phase 리셋 경고) ✅
  - AC5: 프로필 등급 뱃지 (BASIC/STANDARD/ADVANCED/PREMIUM) ✅
  - AC6: Build PASS (46 tests) + 커밋 + 푸시 ✅

- [x] **T76: PW 피드 v3 — 3-Tab + 17종 포스트 카드** ✅
  - 배경: 메인 화면. 실제 피드 API 연동
  - AC1: 3-Tab 구조 (For You / Following / Explore) ✅
  - AC2: 17종 PostTypeCard (REVIEW, DEBATE, VS_BATTLE, COLLAB, BEHIND_STORY 등 타입별 분화 UI) ✅
  - AC3: 포스트 상호작용 바 (PWLikeButton, 댓글 수, 북마크, 공유) ✅
  - AC4: 피드 소스 라벨 (Following/추천/트렌딩 시각 구분) ✅
  - AC5: 무한 스크롤 + 로딩 스켈레톤 ✅
  - AC6: Build PASS (54 tests) + 테스트 + 커밋 + 푸시 ✅

- [x] **T77: PW Explore v3 — 클러스터 + 핫 토픽 + 토론** ✅
  - 배경: 탐색 페이지. 실제 Explore API 연동
  - AC1: Top 페르소나 클러스터 (역할별 그룹 카드 + 팔로워순) ✅
  - AC2: 핫 토픽 섹션 (포스트 타입 기반 7일 인기 집계) ✅
  - AC3: 활성 토론 섹션 (DEBATE/VS_BATTLE 댓글순 하이라이트) ✅
  - AC4: 신규 페르소나 하이라이트 (최근 생성순 가로 스크롤) ✅
  - AC5: 검색 + 역할 필터 칩 5종 (다중 선택) ✅
  - AC6: Build PASS (62 tests) + 테스트 + 커밋 + 푸시 ✅

- [x] **T78: PW 페르소나 프로필 v3 — 3-Layer 시각화 + 상태** ✅
  - 배경: 페르소나 상세 페이지. 실제 페르소나 API 연동
  - AC1: 3-Layer 게이지 바 시각화 (L1/L2/L3 레이어별 토글, low/high 라벨) ✅
  - AC2: PersonaState → Paradox/Dimensionality Score 원형 게이지 (DB PersonaState 미존재, 대체) ✅
  - AC3: Paradox Score + Dimensionality Score SVG 원형 차트 시각화 ✅
  - AC4: 관계 미니맵 (팔로워/팔로잉/포스트/따뜻함 통계) ✅
  - AC5: 최근 포스트 타임라인 (17종 타입별 이모지+레이블) ✅
  - AC6: Build PASS (62 tests) + 테스트 + 커밋 + 푸시 ✅

- [x] **T79: PW 유저 프로필 v3 + 댓글 + 알림**
  - 배경: 유저 경험 완성. 실제 유저 API 연동
  - AC1: 프로필 등급 + L1/L2 취향 벡터 시각화 ✅
  - AC2: 데일리 마이크로 질문 UI (1문/로그인, 코인 보상, 스트릭) ✅
  - AC3: SNS 연동 UI (8개 플랫폼 카드, 동의 관리, 분석 진행) ✅
  - AC4: 댓글 UI + 톤 뱃지 (empathetic/analytical/counter_argument 등 8종) ✅
  - AC5: 알림 (페르소나 활동, 매칭 추천, 읽음 처리) ✅
  - AC6: Build PASS (73 tests) + 테스트 + 커밋 + 푸시 ✅

### Phase PW-C: PersonaWorld 백엔드 구축 (T103~T115)

> 구현계획서: `docs/design/persona-world-v3-impl.md` (v1.0-draft.2)
> 설계서: `docs/design/persona-world-v3.md` (v1.0-draft.3)
> 백엔드 모듈: `apps/engine-studio/src/lib/persona-world/` (공유 DB + 엔진 모듈 직접 import)
> API 라우트: `apps/engine-studio/src/app/api/persona-world/`
> 원칙: No Mock Data, No Hardcoding, Real Data Only, Feedback Loop

- [x] **T103: PW-Phase 0 기반 인프라 — DB 스키마 + 타입 + 상수** ✅
  - 배경: 구현계획서 §2~3. PW 전체 데이터 모델과 타입 시스템의 기반
  - AC1: PersonaState 모델 (mood/energy/socialBattery/paradoxTension, Decimal(3,2), Persona 1:1) [PW-0-2]
  - AC2: PersonaRelationship 모델 (warmth/tension/frequency/depth, unique(A,B), Persona 양방향) [PW-0-3]
  - AC3: ConsumptionLog 모델 + ConsumptionContentType/ConsumptionSource 2 enum [PW-0-8]
  - AC4: PersonaWorldUser 확장 — L2 OCEAN 5필드 + hasOceanProfile + profileLevel String [PW-0-4]
  - AC5: PersonaActivityLog 확장 — postTypeReason Json, stateSnapshot Json, matchingScore Decimal(4,3) [PW-0-5]
  - AC6: Persona 릴레이션 추가 (personaState, relationshipsAsA/B, consumptionLogs) [PW-0-2~0-4]
  - AC7: SQL 마이그레이션 파일 `007_persona_world_v3.sql` [PW-0-6]
  - AC8: `types.ts` — ActivityTraitsV3, PersonaStateData, StateUpdateEvent, RelationshipScore, ConsumptionRecord, ActivityDecision, SchedulerContext, PostGenerationInput/Result, CommentGenerationInput, CommentTone(7종), CommentToneDecision, FeedRequest/Response, FeedPost, ExploreData [PW-0-1]
  - AC9: `constants.ts` — POST_TYPE_AFFINITIES(17종), STATE_DEFAULTS, STATE_DELTAS, ACTIVITY_THRESHOLDS, FEED_RATIOS(60/30/10), RECOMMENDED_TIER_RATIOS(60/30/10), COMMENT_TONE_MATRIX, LIKE_MODIFIERS, FOLLOW_WEIGHTS [PW-0-7]
  - AC10: Prisma validate + generate + Build PASS + 기존 테스트 PASS

- [ ] **T104: PW-Phase 1 활동성 매핑 + PersonaState 관리**
  - 배경: 구현계획서 §4 + 설계서 §3. 3-Layer→8특성 매핑 + 동적 상태 시스템
  - AC1: `activity-mapper.ts` — computeActivityTraits (L1 70% + L2 20% + L3 10%, 신규4특성 공식: endurance/volatility/depthSeeking/growthDrive) [PW-1-1]
  - AC2: computeActiveHours (peakHour=12+round(sociability×10), window ±endurance, 야행성 보정 +4h) [PW-1-2]
  - AC3: computeActivityProbabilities (adjustedPost=base×energy×(0.5+mood×0.5), adjustedInteraction=base×socialBattery×energy) [PW-1-3]
  - AC4: `state-manager.ts` — initializeState, updatePersonaState (7종 StateUpdateEvent), getPersonaState [PW-1-4]
  - AC5: 테스트 — activity-mapper.test.ts + state-manager.test.ts [PW-1-5, PW-1-6]
  - AC6: Build PASS + 테스트 PASS

- [ ] **T105: PW-Phase 2a 포스트 타입 선택 + 주제 선택 + Paradox 발현**
  - 배경: 구현계획서 §5.2 + 설계서 §4.5. 17종 포스트 타입 친화도 기반 선택
  - AC1: `post-type-selector.ts` — selectPostType (친화도 점수 계산, 상태 보정: mood<0.4→THOUGHT×2, paradoxTension>0.7→BEHIND_STORY×3, energy<0.3→REACTION×2, 가중 랜덤) [PW-2-1]
  - AC2: `topic-selector.ts` — selectTopic (우선순위: 트리거→관심사연속→벡터매칭→자유주제) [PW-2-2]
  - AC3: `paradox-activity.ts` — paradoxActivityChance = sigmoid(paradoxScore×3 - 1.5), 4종 Paradox 패턴 발현 [PW-2-5]
  - AC4: Build PASS + 테스트 PASS

- [ ] **T106: PW-Phase 2b 콘텐츠 생성기 + 소비 기록 관리**
  - 배경: 구현계획서 §5.3 + §5.5. LLM 콘텐츠 생성 + ConsumptionMemory
  - AC1: `content-generator.ts` — generatePostContent (System ~3000tok + RAG Voice ~500tok + 관심사 ~100tok + 감정 ~100tok + User ~300tok), selectTopic 연동 [PW-2-3]
  - AC2: `consumption-manager.ts` — recordConsumption (impression LLM ~50자 + 자동태깅 + emotionalImpact), getConsumptionContext (90일 이내 top5, ~200tok), getConsumptionStats [PW-2-9]
  - AC3: 테스트 — consumption-manager.test.ts [PW-2-10]
  - AC4: Build PASS + 테스트 PASS

- [ ] **T107: PW-Phase 2c 자율 활동 스케줄러 + API**
  - 배경: 구현계획서 §5.1. 매시간 크론 파이프라인
  - AC1: `scheduler.ts` — runScheduler (7단계 파이프라인), getActivePersonas (currentHour ∈ activeHours AND energy>0.2), decideActivity [PW-2-4]
  - AC2: `index.ts` — 자율 활동 모듈 barrel export [PW-2-6]
  - AC3: `/api/persona-world/scheduler/route.ts` — POST (cron trigger) [PW-2-8]
  - AC4: 테스트 — scheduler.test.ts [PW-2-7]
  - AC5: Build PASS + 테스트 PASS

- [ ] **T108: PW-Phase 3a 좋아요 + 팔로우 + 관계 매니저**
  - 배경: 구현계획서 §6.1, §6.3, §6.4. 인터랙션 판정 엔진
  - AC1: `interactions/like-engine.ts` — shouldLike (likeScore=basicMatch, prob=score×interactivity×socialBattery, 팔로잉×1.5/긍정×1.3/부정×0.5) [PW-3-1]
  - AC2: `interactions/follow-engine.ts` — shouldFollow (0.5×basicMatch+0.3×crossAxis+0.2×paradoxCompat, prob=score×sociability×0.5, 임계값>0.6) [PW-3-4]
  - AC3: `interactions/relationship-manager.ts` — updateRelationship (warmth/tension/frequency/depth 규칙), getRelationship [PW-3-5]
  - AC4: `interactions/index.ts` [PW-3-7]
  - AC5: Build PASS + 테스트 PASS

- [ ] **T109: PW-Phase 3b 댓글 엔진 + 유저 응답 + API 라우트**
  - 배경: 구현계획서 §6.2, §6.5. 가장 복잡한 인터랙션 — Override+RAG+Express 통합
  - AC1: `interactions/comment-tone.ts` — decideCommentTone (벡터+관계+상태→7종 톤, Paradox 영향 판정) [PW-3-2]
  - AC2: `interactions/comment-engine.ts` — generateComment (6단계: 관계로드→Override→톤결정→LLM생성→Express→로깅) [PW-3-3]
  - AC3: `interactions/user-interaction.ts` — respondToUser (UIV 분석→Adapt→Override→RAG→LLM→Express→Integrity 수집) [PW-3-6]
  - AC4: 인터랙션 테스트 [PW-3-8]
  - AC5: API Routes — `/posts/[id]/comments/route.ts`, `/posts/[id]/likes/route.ts`, `/follows/route.ts` [PW-3-9~3-11]
  - AC6: Build PASS + 테스트 PASS

- [ ] **T110: PW-Phase 4a 피드 엔진 (Following + Recommended + Trending + Interleaver)**
  - 배경: 구현계획서 §7 + 설계서 §6. 3-Tier 매칭 기반 피드
  - AC1: `feed/following-posts.ts` — getFollowingPosts (시간순) [PW-4-1]
  - AC2: `feed/recommended-posts.ts` — getRecommendedPosts (Basic 60%: V_Final 70%+crossAxis 30% / Exploration 30%: paradoxDiv 40%+crossAxisDiv 40%+freshness 20% / Advanced 10%: V_Final 50%+crossAxis 30%+paradoxCompat 20%) [PW-4-2]
  - AC3: `feed/trending-posts.ts` — getTrendingPosts (engagement 기반, timeWindow) [PW-4-3]
  - AC4: `feed/interleaver.ts` — interleaveFeed (F F B F F E F F ... 패턴, 같은 Tier 연속 방지) [PW-4-4]
  - AC5: `feed/feed-engine.ts` — generateFeed (Following 60% + Recommended 30% + Trending 10%, qualitativeBonus ±0.10) [PW-4-5]
  - AC6: `feed/index.ts` [PW-4-7]
  - AC7: Build PASS + 테스트 PASS

- [ ] **T111: PW-Phase 4b Explore 엔진 + Feed/Explore API**
  - 배경: 구현계획서 §7 + 설계서 §6.4. 탐색 탭 데이터
  - AC1: `feed/explore-engine.ts` — getExploreData (교차축 클러스터 topPersonas, hotTopics paradoxTensionAvg, activeDebates, newPersonas autoInterviewScore) [PW-4-6]
  - AC2: 피드 테스트 [PW-4-8]
  - AC3: `/api/persona-world/feed/route.ts` + `/explore/route.ts` [PW-4-9, PW-4-10]
  - AC4: Build PASS + 테스트 PASS

- [ ] **T112: PW-Phase 5a 온보딩 엔진 (질문 + 벡터 생성 + SNS)**
  - 배경: 구현계획서 §8 + 설계서 §9. Cold Start + SNS → 벡터 생성
  - AC1: `onboarding/questions.ts` — v3 질문 셋 (L1 7D + L2 5D OCEAN) [PW-5-1]
  - AC2: `onboarding/onboarding-engine.ts` — processOnboardingAnswers (LIGHT→L1, MEDIUM→L1+L2, DEEP→L1+L2+메타) [PW-5-2]
  - AC3: `onboarding/sns-processor.ts` — processSnsData (Init 알고리즘 연동, 8개 플랫폼) [PW-5-3]
  - AC4: `onboarding/index.ts` [PW-5-5]
  - AC5: Build PASS + 테스트 PASS

- [ ] **T113: PW-Phase 5b 활동 학습 + 품질 모니터 + API**
  - 배경: 구현계획서 §5.4, §8. Adapt 연동 + Voice/Integrity 통합
  - AC1: `onboarding/activity-learner.ts` — learnFromActivity (UIV→Adapt→벡터 보정 ±0.3 클램프) [PW-5-4]
  - AC2: `quality-monitor.ts` — Voice 일관성 모니터링 (similarity<0.6 경고, <0.4 보류+재생성) + Integrity Score 자동 실행 [PW-5-7, PW-5-8]
  - AC3: 온보딩 테스트 [PW-5-6]
  - AC4: `/api/persona-world/onboarding/` API Routes [PW-5-9]
  - AC5: Build PASS + 테스트 PASS

- [ ] **T114: PW 프론트엔드 API 클라이언트 재작성**
  - 배경: persona-world/src/lib/api.ts + user-store.ts를 실제 백엔드 API로 전환
  - AC1: api.ts — `/api/persona-world/*` 엔드포인트로 전환
  - AC2: user-store.ts — 서버 영속화 (localStorage → API 동기화)
  - AC3: Build PASS + 테스트 PASS

- [ ] **T115: E2E 통합 + 품질 게이트**
  - 배경: 전 페이지 실제 API 연동 확인
  - AC1: 7 페이지 (feed/explore/onboarding/profile/persona/[id]/notifications) 실제 데이터 동작 확인
  - AC2: `pnpm validate` 전체 PASS

---

### 별도 작업 (설계 문서 + 데이터)

- [x] **T42: 매칭 설명 + 유저↔페르소나 일치도 시스템** (설계 문서) ✅ T57+T58에서 구현 완료
  - 배경: 유저가 "왜 이 페르소나가 나와 맞는지" 이해할 수 있어야 함. 숫자가 아닌 자연어 설명 필수
  - AC1: `docs/design/persona-engine-v3.md` — 매칭 설명 시스템 섹션 신설
    - 유저↔페르소나 일치도 계산 공식 (차원별 %, 종합 %)
    - LLM 기반 자연어 설명 생성 (Sonnet, 프롬프트 설계)
    - 차원별 일치/불일치 하이라이트 로직
    - 교차축 기반 "의외의 공통점" 발견 로직
  - AC2: `docs/specs/persona-world.md` / `persona-world-ui.md` — 매칭 설명 UI 스펙
    - 매칭 카드 UI (일치율 %, 차원별 바, 자연어 설명)
    - "왜 추천했는지" 상세 뷰 (교차축 하이라이트, 역설 호환성)
  - AC3: 커밋 + 푸시

- [x] **T43: 개발자 콘솔 유저 프로필 API v3 + 동의 관리** (설계 문서) ✅
  - 배경: 유저 프로파일 데이터를 외부 플랫폼에 안전하게 공유. GDPR/개인정보 동의 필수
  - AC1: `docs/specs/developer-console.md` §9 — 유저 프로필 API v3 확장
    - GET /v1/users/{id}/profile v3 (L1+L2 벡터, 교차축, 동의 상태, 프로필 품질)
    - POST /v1/users/{id}/onboarding v3 (L1 7D + L2 5D 응답)
    - GET /v1/users/{id}/consent (동의 항목 조회)
    - POST /v1/users/{id}/consent (동의 관리)
  - AC2: `docs/specs/engine-studio.md` — 콜드스타트 질문 관리 UI
    - 질문 세트 CRUD, 질문 순서/가중치 편집, 모드별(LIGHT/STANDARD/DEEP) 관리
  - AC3: 커밋 + 푸시

- [ ] **T44: 추가 질문 풀 126문항 SQL** (일시 보류)
  - 배경: T41에서 온보딩 24문항 설계 완료. 데일리 마이크로 질문용 추가 풀 필요 (매일 1문항 × ~4개월분)
  - AC1: 126문항 SQL 마이그레이션 파일 작성
    - L1 집중 42문항 (축당 6문항)
    - L2 집중 30문항 (축당 6문항)
    - L1↔L2 교차 36문항 (주요 조합 12쌍 × 3문항)
    - 역설 심화 18문항 (역설 패턴 6종 × 3문항)
  - AC2: 커밋 + 푸시

### Phase D: 엔진 스튜디오 대시보드 UI 구축 (T96~T99)

> lib/ 비즈니스 로직(T56~T67)은 완료. 12개 placeholder 페이지에 실제 UI 연결.
> 패턴: Header + 탭/카드 레이아웃 + lib 함수 호출 + shadcn/ui 컴포넌트.

- [x] **T96** → DONE ✅ 2026-02-12

- [x] **T97** → DONE ✅ 2026-02-12
  - Simulator 페이지: L1/L2/L3 벡터 입력, 3-Tier 매칭 실행, 결과 카드(XAI 설명), 배치 통계
  - Tuning 페이지: 6종 하이퍼파라미터 슬라이더, 6장르 가중치, 자동 튜닝(Grid/Bayesian), A/B 테스트
  - Analytics 페이지: 8종 KPI 대시보드, 다양성 지수, 트렌드, 이상 탐지, CSV 내보내기
  - API 라우트: simulate/tuning/analytics 3개 라우트
  - 테스트 40개 PASS, 빌드 PASS
  - 파일: simulator/page.tsx, tuning/page.tsx, analytics/page.tsx, 3 API routes, matching-lab-ui.test.ts

- [ ] **T98: System Integration 3페이지 UI — Deployment + Versions + Event Bus**
  - 배경: lib/system-integration/ 완성 (T66, ~2400줄). stub 페이지 3개를 실제 관리 UI로 전환
  - AC1: Deployment Pipeline — 환경 3종 (DEV/STG/PROD) 상태 카드, 배포 워크플로우 타임라인 (build→test→deploy→verify), Canary Release 진행 게이지 (10%→50%→100%), 롤백 트리거 설정
  - AC2: Version Control — 알고리즘 버전 목록 테이블 (상태 뱃지), 시맨틱 버전 범프 (Major/Minor/Patch), 버전 Diff 비교 뷰, 롤백 영향도 분석 + 실행
  - AC3: Event Bus Monitor — 실시간 이벤트 로그 테이블 (타입/소스/상태 필터), 이벤트 통계 (delivered/failed/pending), 구독 관리, Sync Delay 리포트
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/system-integration/\*)
  - AC5: 테스트 + Build PASS

- [ ] **T99: Operations 3페이지 UI — Monitoring + Incidents + Backup**
  - 배경: lib/operations/ 완성 (T67, ~1600줄). stub 페이지 3개를 실제 운영 UI로 전환
  - AC1: System Monitoring — 실시간 메트릭 카드 6종 (CPU/Memory/Disk/Network/API Latency/Error Rate), 임계값 알림 목록 (severity 컬러), 로그 검색 (레벨/소스/시간 필터), 대시보드 패널 레이아웃
  - AC2: Incident Management — 장애 목록 테이블 (P0~P3 severity 뱃지), 장애 생성/삼분류, 타임라인 워크플로우 (Declared→In Progress→Resolved→Closed), Post-mortem 작성 폼, MTTR 통계
  - AC3: Backup & Recovery — 백업 정책 3종 카드 (Full/Incremental/Differential), 백업 이력 테이블 (상태/크기/소요시간), DR 계획 관리, DR Drill 스케줄/결과, 용량 예측 차트 + 비용 최적화 권고
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/operations/\*)
  - AC5: 테스트 + Build PASS

- [ ] **T100: Global Config 3페이지 UI — Model Settings + Safety Filters + API Endpoints**
  - 배경: lib/global-config/ 완성 (T68, ~1800줄). stub 페이지 3개를 실제 설정 UI로 전환
  - AC1: Model Settings — LLM 모델 선택 카드 (GPT-4/Claude/Gemini 등), 모델별 비용 테이블, 일/월 예산 설정 슬라이더, 사용량 대시보드 (소비/잔여), 모델 라우팅 규칙 설정
  - AC2: Safety Filters — 필터 규칙 CRUD 테이블 (카테고리/심각도/활성 토글), 금지어 관리 (추가/삭제/일괄 업로드), 필터 로그 목록 (차단 이력+통계), 필터 테스트 시뮬레이터
  - AC3: API Endpoints — 엔드포인트 등록/수정 테이블 (URL/메서드/Rate Limit), 헬스체크 상태 카드 (UP/DOWN/DEGRADED), Rate Limit 설정 (RPM/일일 상한), 헬스 요약 대시보드
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/global-config/\*)
  - AC5: 테스트 + Build PASS

- [ ] **T101: Team & Access 3페이지 UI — Users + Roles + Audit Logs**
  - 배경: lib/team/ 완성 (T69, ~1200줄). stub 페이지 3개를 실제 팀 관리 UI로 전환
  - AC1: Users — 팀 멤버 목록 테이블 (이름/이메일/역할/상태 뱃지), 멤버 초대 모달 (이메일+역할 선택), 멤버 비활성화/재활성화 토글, 멤버 역할 변경 드롭다운
  - AC2: Roles — 역할 4종 카드 (Admin/AI Engineer/Content Manager/Analyst), 권한 매트릭스 테이블 (리소스×액션 체크박스), 커스텀 역할 생성/수정, 역할별 멤버 수 표시
  - AC3: Audit Logs — 감사 로그 테이블 (시간/사용자/액션/리소스/결과), 필터 (사용자/액션 타입/날짜 범위), 로그 상세 보기 모달 (before/after diff), CSV 내보내기
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/team/\*)
  - AC5: 테스트 + Build PASS

- [ ] **T102: 테마 토글 (Light/Dark) — LNB 하단 테마 전환 버튼**
  - 배경: 엔진 스튜디오 전역 테마 지원. 다크 테마는 순수 블랙(#000) 아닌 다크 그레이 톤 (Claude 스타일)
  - AC1: ThemeProvider (next-themes) + globals.css CSS 변수 — light/dark 두 세트 정의, dark 배경 #1a1a2e~#2d2d3f 계열 (Claude 참고)
  - AC2: LNB 좌측 하단 테마 토글 버튼 (Sun/Moon 아이콘, 툴팁, 부드러운 전환 애니메이션)
  - AC3: 모든 기존 컴포넌트 다크 모드 호환 확인 (shadcn/ui 기본 지원 + 커스텀 컴포넌트 CSS 변수 적용)
  - AC4: localStorage 기반 테마 유지 + system preference 감지 (prefers-color-scheme)
  - AC5: 테스트 + Build PASS

### Phase E: 노드 에디터 통합 (T128~)

> T59~T61에서 구축한 DAG 엔진 + 캔버스 UI를 실제 사용 가능한 페이지로 통합.

- [ ] **T128: 노드 에디터 페이지 통합 — ComfyUI 스타일 페르소나 생성**
  - 배경: T59~T61에서 DAG 엔진(25노드) + ReactFlow 캔버스 + 실행 엔진 완성. 하지만 handleExecute/handleSave가 placeholder 상태이고, 노드 에디터 접근 가능한 페이지 라우트가 없음. 4-step 위자드와 별도로 ComfyUI 스타일 생성 경로 필요
  - AC1: 실행 엔진 연결 — `handleExecute` placeholder를 `executeGraph()` 실제 호출로 교체. 실행 전 `validateGraph()` 검증. 실행 결과를 Zustand store에 반영 (executionResults, activeEdges). 노드별 상태 배지(성공/에러/스킵) 표시, 활성 엣지 녹색 애니메이션
  - AC2: 저장/로드 연결 — `handleSave` placeholder를 `serializeGraph()` + localStorage 저장으로 교체. 프리셋/저장된 그래프 로드 (deserializeGraph). 키: `node-graph-${personaId}`
  - AC3: 실행 결과 패널 — 하단 접이식 패널. 실행 요약(성공/스킵/에러 카운트, 총 소요시간), 실행 경로 리스트(순번/상태/노드명/소요시간), 노드 클릭 시 캔버스 선택 연동
  - AC4: 전용 페이지 라우트 — `/persona-studio/node-editor` 페이지. `?preset=standard` 프리셋 로드, `?personaId=xxx` 저장 그래프 로드 지원. 전체 높이 캔버스 레이아웃
  - AC5: 네비게이션 추가 — LNB Persona Studio 하위에 "Node Editor" 항목 추가
  - AC6: 테스트 + Build PASS — 프리셋 직렬화 라운드트립, 프리셋 실행, 실행 요약, 저장/로드 라운드트립 테스트

---

## 🔄 IN_PROGRESS (진행중)

(없음)

---

## ✅ DONE (완료)

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

---

## 🚫 BLOCKED (막힘)

(없음)

---

## 📝 작업 규칙

1. **시작**: QUEUE 최상단 → IN_PROGRESS로 이동
2. **진행**: AC 기준으로 구현 → 테스트 실행
3. **완료**: PASS → DONE으로 이동 (변경파일, 테스트결과 기록)
4. **막힘**: FAIL/불명확 → BLOCKED로 이동 (원인, 필요사항 기록)
