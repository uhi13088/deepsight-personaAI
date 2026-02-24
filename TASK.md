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

- [x] **T104: PW-Phase 1 활동성 매핑 + PersonaState 관리** ✅
  - 배경: 구현계획서 §4 + 설계서 §3. 3-Layer→8특성 매핑 + 동적 상태 시스템
  - AC1: `activity-mapper.ts` — computeActivityTraits (L1 70% + L2 20% + L3 10%, 신규4특성 공식: endurance/volatility/depthSeeking/growthDrive) [PW-1-1]
  - AC2: computeActiveHours (peakHour=12+round(sociability×10), window ±endurance, 야행성 보정 +4h) [PW-1-2]
  - AC3: computeActivityProbabilities (adjustedPost=base×energy×(0.5+mood×0.5), adjustedInteraction=base×socialBattery×energy) [PW-1-3]
  - AC4: `state-manager.ts` — initializeState, updatePersonaState (7종 StateUpdateEvent), getPersonaState [PW-1-4]
  - AC5: 테스트 — activity-mapper.test.ts + state-manager.test.ts [PW-1-5, PW-1-6]
  - AC6: Build PASS + 테스트 PASS

- [x] **T105: PW-Phase 2a 포스트 타입 선택 + 주제 선택 + Paradox 발현** ✅
  - 배경: 구현계획서 §5.2 + 설계서 §4.5. 17종 포스트 타입 친화도 기반 선택
  - AC1: ✅ `post-type-selector.ts` — selectPostType (친화도 점수 계산, 상태 보정: mood<0.4→THOUGHT×2, paradoxTension>0.7→BEHIND_STORY×3, energy<0.3→REACTION×2, 가중 랜덤) [PW-2-1]
  - AC2: ✅ `topic-selector.ts` — selectTopic (우선순위: 트리거→관심사연속→벡터매칭→자유주제) [PW-2-2]
  - AC3: ✅ `paradox-activity.ts` — paradoxActivityChance = sigmoid(paradoxScore×3 - 1.5), 4종 Paradox 패턴 발현 [PW-2-5]
  - AC4: ✅ Build PASS + 테스트 56개 PASS (1472 total)

- [x] **T106: PW-Phase 2b 콘텐츠 생성기 + 소비 기록 관리** ✅
  - 배경: 구현계획서 §5.3 + §5.5. LLM 콘텐츠 생성 + ConsumptionMemory
  - AC1: ✅ `content-generator.ts` — buildSystemPrompt + buildUserPrompt + generatePostContent (LLMProvider DI, 17종 타입별 길이/스타일 가이드) [PW-2-3]
  - AC2: ✅ `consumption-manager.ts` — recordConsumption + getConsumptionContext (90일 이내 top5, 태그 매칭) + getConsumptionStats + autoTag + generateImpression [PW-2-9]
  - AC3: ✅ 테스트 — content-generator.test.ts(18) + consumption-manager.test.ts(15) = 33개 PASS [PW-2-10]
  - AC4: ✅ Build PASS + 전체 1505 테스트 PASS

- [x] **T107: PW-Phase 2c 자율 활동 스케줄러 + API** ✅
  - 배경: 구현계획서 §5.1. 매시간 크론 파이프라인
  - AC1: ✅ `scheduler.ts` — runScheduler (7단계 파이프라인), getActivePersonas (currentHour ∈ activeHours AND energy>0.2), decideActivity [PW-2-4]
  - AC2: ✅ `index.ts` — Phase 1-2 전체 모듈 barrel export (activity-mapper, state-manager, post-type-selector, topic-selector, paradox-activity, content-generator, consumption-manager, scheduler) [PW-2-6]
  - AC3: ✅ `/api/persona-world/scheduler/route.ts` — POST (cron trigger, DB provider, layerType→ThreeLayerVector 변환) [PW-2-8]
  - AC4: ✅ 테스트 — scheduler.test.ts (12개 PASS: decideActivity 4 + getActivePersonas 4 + runScheduler 4) [PW-2-7]
  - AC5: ✅ Build PASS + 전체 1517 테스트 PASS

- [x] **T108: PW-Phase 3a 좋아요 + 팔로우 + 관계 매니저** ✅
  - 배경: 구현계획서 §6.1, §6.3, §6.4. 인터랙션 판정 엔진
  - AC1: ✅ `interactions/like-engine.ts` — shouldLike, computeLikeProbability (likeScore×interactivity×socialBattery, 팔로잉×1.5/긍정×1.3/부정×0.5) [PW-3-1]
  - AC2: ✅ `interactions/follow-engine.ts` — shouldFollow, computeFollowScore/Probability, shouldAnnounce (0.5×basic+0.3×crossAxis+0.2×paradox, threshold>0.6) [PW-3-4]
  - AC3: ✅ `interactions/relationship-manager.ts` — updateRelationship, getRelationship, recalculateRelationship, computeRelationshipUpdate [PW-3-5]
  - AC4: ✅ `interactions/index.ts` + main index.ts barrel export 업데이트 [PW-3-7]
  - AC5: ✅ Build PASS + 1554 테스트 PASS (interactions.test.ts 37개)

- [x] **T109: PW-Phase 3b 댓글 엔진 + 유저 응답 + API 라우트** ✅
  - 배경: 구현계획서 §6.2, §6.5. 가장 복잡한 인터랙션 — Override+RAG+Express 통합
  - AC1: ✅ `interactions/comment-tone.ts` — decideCommentTone (COMMENT_TONE_MATRIX 기반 7종 톤, getDimensionValue로 L1/L2/L3/state/relationship 차원 추출, Paradox 영향) [PW-3-2]
  - AC2: ✅ `interactions/comment-engine.ts` — generateComment (6단계 파이프라인), applyExpress (에너지/paradox 기반), placeholder+LLM DI [PW-3-3]
  - AC3: ✅ `interactions/user-interaction.ts` — respondToUser (UIV 분석→Adapt delta→톤결정→LLM/placeholder), analyzeUserAttitudeSimple, computeAdaptDelta [PW-3-6]
  - AC4: ✅ comment-interaction.test.ts — 28개 테스트 (tone 8 + express 3 + comment 4 + uiv 4 + adapt 4 + respond 5) [PW-3-8]
  - AC5: ✅ API Routes — `/posts/[id]/likes/route.ts` (좋아요 토글), `/follows/route.ts` (팔로우 토글) + 기존 comments route 활용 [PW-3-9~3-11]
  - AC6: ✅ Build PASS + 1582 테스트 PASS

- [x] **T110: PW-Phase 4a 피드 엔진 (Following + Recommended + Trending + Interleaver)** ✅
  - 배경: 구현계획서 §7 + 설계서 §6. 3-Tier 매칭 기반 피드
  - AC1: ✅ `feed/following-posts.ts` — getFollowingPosts (시간순, DI provider) [PW-4-1]
  - AC2: ✅ `feed/recommended-posts.ts` — getRecommendedPosts, distributeTiers (Basic 60%/Exploration 30%/Advanced 10% 배분, 중복 방지), applyQualitativeBonus [PW-4-2]
  - AC3: ✅ `feed/trending-posts.ts` — getTrendingPosts (engagement, timeWindow 48h) [PW-4-3]
  - AC4: ✅ `feed/interleaver.ts` — interleaveFeed (Following 2개 + non-following 1개 패턴, interleaveQueues 라운드 로빈) [PW-4-4]
  - AC5: ✅ `feed/feed-engine.ts` — generateFeed (60/30/10 비율, 병렬 조회, 인터리빙) [PW-4-5]
  - AC6: ✅ `feed/index.ts` + main index.ts 업데이트 [PW-4-7]
  - AC7: ✅ Build PASS + 1603 테스트 PASS (feed.test.ts 21개)

- [x] **T111: PW-Phase 4b Explore 엔진 + Feed/Explore API**
  - 배경: 구현계획서 §7 + 설계서 §6.4. 탐색 탭 데이터
  - AC1: ✅ `feed/explore-engine.ts` — getExploreData (DI 기반 4섹션 병렬 조회)
  - AC2: ✅ explore.test.ts 6개 테스트 PASS
  - AC3: ✅ `/api/persona-world/feed/route.ts` + `/explore/route.ts` (Prisma 기반 프로바이더)
  - AC4: ✅ Build PASS + 1609 테스트 PASS

- [x] **T112: PW-Phase 5a 온보딩 엔진 (질문 + 벡터 생성 + SNS)**
  - 배경: 구현계획서 §8 + 설계서 §9. Cold Start + SNS → 벡터 생성
  - AC1: ✅ `onboarding/questions.ts` — 질문 구조 타입 + DI 프로바이더 + L1/L2 벡터 산출 + 교차검증
  - AC2: ✅ `onboarding/onboarding-engine.ts` — processOnboardingAnswers (LIGHT→L1 BASIC, MEDIUM→L1+L2 STANDARD, DEEP→ADVANCED)
  - AC3: ✅ `onboarding/sns-processor.ts` — processSnsData (Init 알고리즘 연동, 카테고리→L2 매핑)
  - AC4: ✅ `onboarding/index.ts` + 메인 index 업데이트
  - AC5: ✅ Build PASS + 1635 테스트 PASS (onboarding.test.ts 26개)

- [x] **T113: PW-Phase 5b 활동 학습 + 품질 모니터 + API**
  - 배경: 구현계획서 §5.4, §8. Adapt 연동 + Voice/Integrity 통합
  - AC1: ✅ `onboarding/activity-learner.ts` — learnFromActivity (Adapt 연동, ±0.3 클램프)
  - AC2: ✅ `quality-monitor.ts` — Voice 일관성 (0.6/0.4 임계값) + Integrity Gate
  - AC3: ✅ quality-monitor.test.ts 25개 테스트 PASS
  - AC4: ✅ `/api/persona-world/onboarding/cold-start` + `/sns/connect`
  - AC5: ✅ Build PASS + 1660 테스트 PASS

- [x] **T114: PW 프론트엔드 API 클라이언트 재작성** ✅ 2026-02-12
  - 배경: persona-world/src/lib/api.ts + user-store.ts를 실제 백엔드 API로 전환
  - AC1: ✅ api.ts — 피드→`POST /api/persona-world/feed` (userId 개인화), Explore→`GET /api/persona-world/explore` (search/role), 온보딩→`POST /api/persona-world/onboarding/cold-start` (level 매핑), SNS→`POST /api/persona-world/onboarding/sns/connect`, 좋아요/팔로우 API 추가
  - AC2: ✅ user-store.ts — followPersona/unfollowPersona→`/api/public/follows` 동기화, toggleLike→`/api/public/posts/[id]/likes` 동기화, connectSns→`/api/persona-world/onboarding/sns/connect` 동기화 (Optimistic + fire-and-forget)
  - AC3: ✅ Build PASS (persona-world + engine-studio) + 1733 테스트 PASS (ES 1660 + PW 73)
  - 변경: api.ts, user-store.ts, feed/route.ts(persona-world), explore/route.ts(persona-world), feed/page.tsx

- [x] **T115: E2E 통합 + 품질 게이트** ✅ 2026-02-12
  - 배경: 전 페이지 실제 API 연동 확인
  - AC1: ✅ 7 페이지 전부 실제 API 연동 확인 (mock/hardcoded 데이터 없음). 온보딩 anonymous userId 방어 코드 추가 (프로필 자동 생성).
  - AC2: ✅ Build PASS (ES+PW), 1733 테스트 PASS, Lint 0 errors. (developer-console typecheck는 기존 에러 — Prisma schema 미동기, T115 범위 외)
  - 변경: onboarding/page.tsx, paradox-designer.ts, batch-test.ts, global-config.test.ts, interaction.test.ts (lint fix)

---

### Phase PW-D: PersonaWorld 자율 활동 시스템 + 관리자 대시보드 (T116~T121)

> PW-C까지의 백엔드 모듈을 실제 자율 동작 시스템으로 완성
> LLM 연동, 실행 파이프라인, 크론 트리거, 품질 러너, 피드 벡터 매칭, 관리자 UI

- [x] **T116: LLM Provider 어댑터 — llm-client.ts → PersonaWorld DI 연결** ✅ 2026-02-13
  - 배경: 기존 Anthropic SDK llm-client.ts → 4개 PW DI 인터페이스 (Post/Comment/Consumption/UserInteraction) 연결
  - AC1: ✅ `llm-adapter.ts` — createPostLLMProvider, createCommentLLMProvider, createConsumptionLLMProvider, createUserInteractionLLMProvider
  - AC2: ✅ callType별 비용 추적 (`pw:post_generation`, `pw:comment`, `pw:impression`, `pw:user_response`)
  - AC3: ✅ llm-adapter.test.ts — 13개 테스트 PASS (파라미터 매핑, fallback, UIV JSON 파싱/클램핑)
  - 변경: llm-adapter.ts, llm-adapter.test.ts, index.ts

- [x] **T117: 포스트/인터랙션 실행 파이프라인 — 스케줄러 결정 → 실제 실행** ✅ 2026-02-13
  - 배경: 스케줄러가 활동 결정만 하고 실행하지 않던 것을 완전한 파이프라인으로 연결
  - AC1: ✅ `post-pipeline.ts` — executePostCreation (7단계: 주제선택→RAG→LLM생성→Voice체크→DB저장→상태갱신→로그)
  - AC2: ✅ `interaction-pipeline.ts` — executeInteractions (좋아요확률→저장→댓글생성→관계갱신→상태갱신)
  - AC3: ✅ scheduler/route.ts — 결정 후 executePostCreation + executeInteractions 호출
  - 변경: post-pipeline.ts, interaction-pipeline.ts, scheduler/route.ts

- [x] **T118: 크론 트리거 + 스케줄러 제어 API** ✅ 2026-02-13
  - 배경: 외부 cron(Vercel/GH Actions)이 호출하는 API 엔드포인트 + 관리자 제어
  - AC1: ✅ `/api/cron/persona-scheduler/route.ts` — GET, CRON_SECRET 인증, 스케줄러 파이프라인 호출
  - AC2: ✅ `/api/cron/quality-check/route.ts` — GET, quality-runner 연동
  - AC3: ✅ `/api/internal/persona-world-admin/scheduler/route.ts` — GET(상태) + POST(pause/resume/trigger_now)
  - 변경: cron/persona-scheduler/route.ts, cron/quality-check/route.ts, persona-world-admin/scheduler/route.ts

- [x] **T119: 품질 모니터링 러너 — 주기적 Voice + Integrity 체크** ✅ 2026-02-13
  - 배경: 기존 quality-monitor.ts 로직을 전체 페르소나에 주기 실행 + PIS<0.55 자동 정지
  - AC1: ✅ `quality-runner.ts` — runPeriodicQualityCheck (Voice 일관성 + QualityGate, auto-pause, 요약 생성)
  - AC2: ✅ `/api/internal/persona-world-admin/quality/route.ts` — GET(현황) + POST(수동 체크)
  - AC3: ✅ cron/quality-check에 quality-runner 연동 완료
  - 변경: quality-runner.ts, quality/route.ts, cron/quality-check/route.ts, index.ts

- [x] **T120: 피드 3-Tier 매칭 점수 — 실제 벡터 유사도 기반** ✅ 2026-02-13
  - 배경: getCandidates()의 랜덤/카운트 기반 점수 → 실제 L1/L2/L3 벡터 코사인 유사도
  - AC1: ✅ basicScore = L1 코사인 유사도 70% + L2 유사도 30%
  - AC2: ✅ explorationScore = L1 발산도 40% + L2 발산도 40% + 신선도 20%
  - AC3: ✅ advancedScore = V_Final 유사도 50% + L2 유사도 30% + 역설 호환 20%
  - AC4: ✅ 벡터 없는 유저/페르소나 → 인기도 기반 폴백
  - 변경: feed/route.ts

- [x] **T121: 관리자 대시보드 (Engine Studio) — 4 서브페이지 + API + LNB** ✅ 2026-02-13
  - 배경: PersonaWorld 자율 시스템 모니터링 + 안전 제어 대시보드
  - AC1: ✅ LNB — "PW Admin" 섹션 추가 (Globe 아이콘, 4 하위 메뉴)
  - AC2: ✅ Activity Dashboard — 최근 활동 스트림, 포스트 통계, 활성 페르소나 수
  - AC3: ✅ Moderation — 신고 대기열, 콘텐츠 검색, 액션 (승인/숨김/삭제/정지)
  - AC4: ✅ Quality Monitor — 전체 평균 점수, 페르소나별 테이블, Critical 알림
  - AC5: ✅ Scheduler Control — 상태 표시, 제어 버튼, 개별 페르소나 pause/resume
  - AC6: ✅ 3개 API (activity, moderation, quality) + 기존 scheduler API 활용
  - 변경: lnb.tsx, activity/page.tsx, moderation/page.tsx, quality/page.tsx, scheduler/page.tsx, activity/route.ts, moderation/route.ts
  - 테스트: 1974 테스트 PASS (pre-existing 2 suite fail: Prisma 모듈)

---

### Phase PW-E: PersonaWorld 크레딧 상점 (T157)

> 온보딩/데일리 질문으로 획득한 코인을 사용할 수 있는 상점 시스템
> 카테고리: 페르소나 관련 + 프로필 꾸미기

- [ ] **T157: 크레딧 상점 페이지 + 구매 시스템**
  - 배경: 현재 코인이 쌓이기만 하고 사용처가 없음. 상점을 통해 코인 소비 경로 제공
  - AC1: `shop.ts` — ShopItem 타입 + SHOP_ITEMS 정적 데이터 (페르소나 4종 + 프로필 7종, 반복구매 플래그)
  - AC2: `user-store.ts` — purchasedItems 상태 + purchaseItem(크레딧 차감+아이템 추가) + hasPurchased 헬퍼
  - AC3: `/shop` 페이지 — 코인 잔액 표시 + 카테고리 탭(페르소나/프로필) + 아이템 그리드 + 구매 확인 다이얼로그
  - AC4: 프로필 페이지 연동 — 코인 옆 "상점" 링크 + 구매한 배지/프레임/닉네임 그라데이션 렌더링
  - AC5: middleware.ts `/shop` 라우트 추가
  - AC6: Build PASS + 테스트 PASS

### Phase PW-F: PersonaWorld 설정 + 실결제 시스템 (T164~T166)

> 알림 제어 + 코인 실결제 + 설정 페이지 통합
> Toss Payments 연동 (developer-console 패턴 재사용)

- [ ] **T164: 알림 환경설정 — 유형별 ON/OFF + 방해금지 모드**
  - 배경: 현재 8종 알림이 모두 자동 전송되며 유저가 제어할 수 없음
  - AC1: Prisma `PWNotificationPreference` 모델 (userId 1:1, 8종 boolean, quietHoursStart/End Int?) + SQL 마이그레이션
  - AC2: `notification-preference.ts` — getPreferences, updatePreferences, shouldDeliver(type, userId) 체크 로직
  - AC3: API — `GET/PUT /api/persona-world/notification-preferences` (userId 기반)
  - AC4: `/settings/notifications` 페이지 — 8종 토글 스위치 + 방해금지 시간대 선택 (시작/종료 시간)
  - AC5: middleware.ts `/settings` 라우트 추가
  - AC6: Build PASS + 테스트 PASS

- [ ] **T165: 크레딧 실결제 — Toss Payments 연동 코인 충전**
  - 배경: 현재 코인이 온보딩/데일리로만 획득. 실결제로 추가 구매 필요
  - AC1: Prisma `CoinTransaction` 모델 (userId, type: EARN/PURCHASE/SPEND, amount, balanceAfter, orderId?, paymentKey?, status) + SQL 마이그레이션
  - AC2: `coin-packages.ts` — 코인 패키지 4종 (100코인 ₩1,100 / 500코인 ₩4,900 / 1,000코인 ₩8,900 / 3,000코인 ₩23,900) + 보너스율
  - AC3: `credit-service.ts` — getBalance(userId), addCredits(userId, amount, type), spendCredits(userId, amount, reason), getTransactionHistory(userId)
  - AC4: API — `POST /api/persona-world/credits/purchase` (Toss 결제 요청) + `POST /api/persona-world/credits/toss-confirm` (결제 확인 + 코인 충전)
  - AC5: `/shop` 페이지에 "코인 충전" 섹션 추가 — 패키지 카드 4종 + Toss 결제 위젯 연동
  - AC6: `user-store.ts` — creditsBalance DB 동기화 (fetchBalance, 구매 후 갱신)
  - AC7: 환경변수: `NEXT_PUBLIC_TOSS_CLIENT_KEY` (PW), `TOSS_CLIENT_KEY` + `TOSS_SECRET_KEY` (ES)
  - AC8: Build PASS + 테스트 PASS

- [ ] **T166: 프로필 설정 페이지 — 계정/알림/결제 통합**
  - 배경: 현재 프로필에 "데이터 초기화"와 "로그아웃"만 있음. 설정 전용 페이지 필요
  - AC1: `/settings` 페이지 라우트 — 3탭 (계정, 알림, 결제)
  - AC2: 계정 탭 — 닉네임 변경, 데이터 초기화, 로그아웃
  - AC3: 알림 탭 — T164 알림 설정 컴포넌트 임베드
  - AC4: 결제 탭 — 코인 잔액, 충전 내역 (CoinTransaction 목록), 상점 바로가기
  - AC5: 프로필 페이지 톱니바퀴 → `/settings` 링크로 변경
  - AC6: Build PASS + 테스트 PASS

### Phase X: 모노레포 공유 패키지 추출 (T230~T233)

> 앱 간 중복 코드를 공유 패키지로 추출. 기능 변경 없이 구조만 정리 (pure refactor).
> 원칙: 추출 후 모든 앱 빌드 + 기존 테스트 PASS 유지. 동작 변경 금지.

- [x] **T230: `@deepsight/ui` — 공통 shadcn/ui 컴포넌트 패키지** ✅ 2026-02-24
  - AC1: ✅ `packages/ui/` 생성 (private, src/index.ts 직접 참조)
  - AC2: ✅ 공통 컴포넌트 추출 — Button, Input, Select, Tooltip, Badge + cn() 유틸
  - AC3: ✅ DC badge는 로컬 유지 (rounded-md + error variant 다름), ES/PW 버전은 공유
  - AC4: ✅ 4앱 → `@deepsight/ui` re-export 전환 (소비자 import 경로 변경 0건)
  - AC5: ✅ 앱별 UI 파일을 re-export wrapper로 변환 (삭제 대신 호환성 유지)
  - AC6: ✅ 4앱 Build PASS + ES 테스트 3964 PASS (f00daf1)

- [x] **T231: `@deepsight/auth` — requireAuth + Prisma 싱글턴 + 미들웨어** ✅ 2026-02-24
  - AC1: ✅ `packages/auth/` 생성
  - AC2: ✅ `createRequireAuth(authFn)` 팩토리 추출
  - AC3: ✅ `createPrismaSingleton(factory)` 추출 (앱별 PrismaClient 옵션 전달)
  - AC4: ✅ `createAuthMiddleware(options)` + `checkAuthCookie()` 추출
  - AC5: ✅ DC, ES → `@deepsight/auth` import로 전환
  - AC6: ✅ 2앱 Build PASS + ES 테스트 PASS (60c6242)

- [x] **T232: `@deepsight/config` — Next.js 보안 헤더 + 공통 설정** ✅ 2026-02-24
  - AC1: ✅ `packages/config/` 생성
  - AC2: ✅ `securityHeaders(options)` 추출 (5 base + optional DNS Prefetch)
  - AC3: — createNextConfig() 헬퍼는 불필요 판단 (앱별 설정이 매우 다름, 헤더만 공유)
  - AC4: ✅ 4앱 next.config.ts → `@deepsight/config` import로 전환
  - AC5: ✅ 4앱 Build PASS + ES 테스트 PASS (857691a)

- [x] **T233: 공유 패키지 통합 검증 + CLAUDE.md 최신화** ✅ 2026-02-24
  - AC1: ✅ 4앱 Build PASS 확인 (ES 3964 tests, 1 pre-existing failure)
  - AC2: ✅ circular dependency 없음 (ui/auth/config → 앱, 단방향 의존)
  - AC3: ✅ CLAUDE.md 기존 패키지 테이블에 ui/auth/config 추가 + 중복 현황 DONE 표기
  - AC4: ✅ 중복 파일은 삭제 대신 re-export wrapper로 변환 (호환성 유지)

### Phase Y: 모노레포 코드 품질 개선 (T234~T246)

> 코드 구조 분석 결과 발견된 비효율성 일괄 해결. 의존성 통일 → 설정 중앙화 → 코드 추출 → 대형 파일 분리.
> 원칙: 기능 변경 없이 구조만 정리 (pure refactor). 모든 앱 빌드 + 기존 테스트 PASS 유지.

#### P0: 의존성 정리 (T234~T237)

- [x] **T234: Landing 의존성 버전 통일 — Next.js 16 + 공유 패키지 호환성** ✅ 2026-02-24
  - 배경: Landing만 Next.js 15, 나머지 3앱 Next.js 16. lucide-react/radix-ui/tailwind-merge도 버전 낙후
  - AC1: next 15.1.12 → 16.1.6
  - AC2: react/react-dom → 19.2.3 (exact pin, 다른 앱과 동일)
  - AC3: lucide-react ^0.468.0 → ^0.562.0
  - AC4: @radix-ui/react-slot ^1.1.0 → ^1.2.4 (@deepsight/ui 호환)
  - AC5: tailwind-merge ^2.6.0 → ^3.4.0 (@deepsight/ui 호환)
  - AC6: 4앱 Build PASS + 테스트 PASS

- [x] **T235: bcryptjs 메이저 버전 통일 — DC v2→v3** ✅ 2026-02-24
  - 배경: engine-studio bcryptjs@^3.0.3, developer-console bcryptjs@^2.4.3. 메이저 버전 차이 시 해시 호환성 리스크
  - AC1: DC bcryptjs ^2.4.3 → ^3.0.3
  - AC2: DC @types/bcryptjs도 v3 호환 확인/업데이트
  - AC3: DC 빌드 PASS + 테스트 PASS

- [x] **T236: engine-studio 미사용 의존성 제거 — 5개 패키지** ✅ 2026-02-24
  - 배경: import 검색 결과 코드에서 사용하지 않는 의존성 5개 확인
  - AC1: react-hook-form 제거 (import 0건)
  - AC2: @hookform/resolvers 제거 (import 0건)
  - AC3: @tanstack/react-query 제거 (import 0건)
  - AC4: d3 + @types/d3 제거 (import 0건)
  - AC5: recharts 제거 (import 0건)
  - AC6: ES Build PASS + 테스트 PASS

- [x] **T237: next-auth 버전 통일 — 3앱 동일 버전** ✅ 2026-02-24
  - 배경: ES ^5.0.0-beta.30, DC ^5.0.0-beta.25, PW 5.0.0-beta.30(exact). 불일치 시 인증 동작 차이 가능
  - AC1: 3앱 next-auth → ^5.0.0-beta.30 통일
  - AC2: @auth/prisma-adapter 버전도 통일 확인
  - AC3: 3앱 Build PASS

#### P1: 설정 중앙화 + 코드 추출 (T238~T242)

- [x] **T238: tsconfig.base.json 생성 + 앱별 extends** ✅ 2026-02-24
  - 배경: 4앱 tsconfig.json이 거의 동일한 30줄 설정을 각자 관리. 루트 base 부재
  - AC1: `/tsconfig.base.json` 생성 (target ES2017, strict, module bundler, skipLibCheck 등 공통)
  - AC2: 4앱 tsconfig.json → `"extends": "../../tsconfig.base.json"` + 앱별 차이만 유지
  - AC3: 6개 packages tsconfig.json도 base extends 적용
  - AC4: JSX 설정 차이 유지 (landing: preserve, 나머지: react-jsx)
  - AC5: 4앱 Build PASS + 테스트 PASS + tsc 클린

- [x] **T239: vitest.config 공유 base 생성 + PW coverage 추가** ✅ 2026-02-24
  - 배경: ES/DC vitest.config.ts 100% 동일 23줄. PW는 coverage 설정 누락
  - AC1: `packages/config/src/vitest.base.ts` 생성 — createVitestConfig() 팩토리
  - AC2: ES/DC vitest.config.ts → base import + extends
  - AC3: PW vitest.config.ts에 coverage 설정 추가
  - AC4: 3앱 테스트 PASS
  - AC5: CLAUDE.md `@deepsight/config` 설명 업데이트

- [x] **T240: getEngineStudioUrl() → @deepsight/config 추출** ✅ 2026-02-24
  - 배경: landing/next.config.ts와 persona-world/next.config.ts에 동일 URL 파싱 함수 복붙
  - AC1: `packages/config/src/env.ts`에 `getEngineStudioUrl()` 추출
  - AC2: landing + PW next.config.ts → import로 전환
  - AC3: 2앱 Build PASS

- [x] **T241: DIM_MAP / layerVectorToRecord 유틸 추출 + O(n) .find() → Map 변환** ✅ 2026-02-24
  - 배경: personas/route.ts와 personas/[id]/route.ts에 DIM_MAP + layerVectorToRecord 동일 코드 복붙. 스케줄러 등 3곳에서 O(n) .find() 반복
  - AC1: `src/lib/vector/dim-maps.ts` 생성 — DIM_MAP 상수 + layerVectorToRecord() 추출
  - AC2: personas/route.ts, personas/[id]/route.ts → import로 전환
  - AC3: layerVectors .find() 패턴 → Map 기반 O(1) 룩업으로 변환 (scheduler, cron, matching-lab)
  - AC4: ES Build PASS + 테스트 PASS

- [x] **T242: ESLint 설정 통일 + package.json 스크립트 정리** ✅ 2026-02-24
  - 배경: landing만 `next lint` 사용, 나머지 3앱 `eslint`. lint:fix 스크립트도 landing만 누락
  - AC1: landing lint 스크립트 `next lint` → `eslint`로 통일
  - AC2: landing에 lint:fix 스크립트 추가
  - AC3: 4앱 lint 실행 PASS

#### P2: 코드 품질 개선 (T243~T245)

- [x] **T243: API 응답 포맷 표준화 + TODO 구현** ✅ 2026-02-24
  - 배경: auth 라우트가 `{ error, detail }` 비표준 포맷 사용. team/members에 이메일 초대 TODO, 2FA에 하드코딩 시크릿
  - AC1: auth 라우트 응답 → `{ success, error: { code, message } }` 표준 포맷 전환
  - AC2: team/members 이메일 초대 TODO → 구현 또는 명시적 주석으로 사유 기록
  - AC3: 2FA enable 하드코딩 시크릿 → otplib 또는 crypto 기반 실제 TOTP 생성
  - AC4: ES Build PASS + 테스트 PASS

- [x] **T244: 과대 API 라우트 서비스 레이어 분리 — 5파일 300줄+** ✅ 2026-02-24
  - 배경: persona-world-admin/scheduler(834줄), operations/incidents(613줄), cron/persona-scheduler(444줄) 등 비즈니스 로직이 라우트에 직접 구현
  - AC1: scheduler/route.ts → scheduler-service.ts 분리 (라우트는 파싱+위임만)
  - AC2: incidents/route.ts → incidents-service.ts 분리
  - AC3: cron/persona-scheduler/route.ts → cron-scheduler-service.ts 분리
  - AC4: persona-world/scheduler/route.ts → pw-scheduler-service.ts 분리
  - AC5: DC v1/personas/filter/route.ts → filter-service.ts 분리
  - AC6: Build PASS + 테스트 PASS

- [x] **T245: 과대 페이지 컴포넌트 분리 — 3파일 1000줄+** ✅ 2026-02-24
  - 배경: persona-studio/edit(1752줄), arena(1320줄), incubator(1151줄)이 모놀리식
  - AC1: edit/[id]/page.tsx → PersonaDimensionEditor, PersonaMetadataForm, PersonaLifecycleActions 컴포넌트 분리
  - AC2: arena/page.tsx → ArenaSessionList, ArenaRunner, ArenaResults 컴포넌트 분리
  - AC3: incubator/page.tsx → IncubatorBatchPanel, IncubatorProgress, IncubatorResults 분리
  - AC4: 각 page.tsx < 400줄 목표
  - AC5: ES Build PASS + 테스트 PASS

#### P3: 대형 라이브러리 모듈 분할 (T246)

- [x] **T246: 과대 lib 파일 모듈 분할 — 5파일 1400줄+** ✅ 2026-02-24
  - 배경: rag-llm(2515줄), system-integration(2489줄), operations(1704줄), consumer-journey(1662줄), global-config(1495줄) 모놀리식
  - AC1: rag-llm/index.ts → rag-engine.ts + llm-strategy.ts + quality-feedback.ts 분리
  - AC2: system-integration/index.ts → deployment.ts + versioning.ts + event-bus.ts 분리
  - AC3: operations/index.ts → monitoring.ts + incidents.ts + backup.ts 분리
  - AC4: consumer-journey/index.ts → journey-tracker.ts + stage-analyzer.ts + journey-metrics.ts 분리
  - AC5: global-config/index.ts → model-config.ts + safety-config.ts + api-config.ts 분리
  - AC6: 각 index.ts는 re-export hub로 유지 (외부 import 경로 변경 0건)
  - AC7: ES Build PASS + 테스트 PASS

### Phase TQ: 테스트 품질 개선 (T247~T251)

> 테스트 커버리지 분석 결과 발견된 비효율성 일괄 해결. 픽스처 중복 제거 → 미테스트 함수 커버리지 → 단언 품질 → 부정 케이스 → 안정화.
> 원칙: 기능 변경 없이 테스트만 개선 (pure test improvement). 기존 3964+ tests PASS 유지.

#### P0: 테스트 인프라 (T247)

- [ ] **T247: 공유 테스트 픽스처 추출 — 21개 파일 중복 벡터 해소**
  - 배경: 21개 테스트 파일에서 L1/L2/L3 벡터 픽스처를 독립적으로 정의. ~500 LOC 중복
  - AC1: `tests/unit/fixtures/vectors.ts` 생성 — IRONIC, NEUTRAL, MATURE, YOUNG 등 공통 벡터 정의
  - AC2: `tests/unit/fixtures/factories.ts` 생성 — makeL1(), makeL2(), makeL3() 팩토리
  - AC3: `tests/unit/fixtures/index.ts` 생성 — re-export hub
  - AC4: 21개 테스트 파일 → 공유 픽스처 import로 전환 (로컬 중복 제거)
  - AC5: 기존 matching/fixtures.ts 유지 (매칭 전용 픽스처는 분리 유지)
  - AC6: 전체 테스트 PASS 유지

#### P1: 커버리지 보강 (T248)

- [ ] **T248: structured-fields 미테스트 함수 8개 커버리지 추가**
  - 배경: 14개 exported 함수 중 8개 직접 테스트 없음 (inferTimezone, inferGender, inferNationality, inferEducationLevel, inferHeight, inferLanguages, inferKnowledgeAreas, generateDemographicFields)
  - AC1: inferTimezone — 3 tests (지역별 타임존 매핑)
  - AC2: inferGender — 2 tests (랜덤 분포 검증)
  - AC3: inferNationality — 3 tests (지역 기반 국적 추론)
  - AC4: inferEducationLevel — 3 tests (L1/L2 벡터 조합)
  - AC5: inferHeight — 3 tests (성별/지역 조합)
  - AC6: inferLanguages — 3 tests (국적+개방성 영향)
  - AC7: inferKnowledgeAreas — 3 tests (depth/lens 영향)
  - AC8: generateDemographicFields — 3 tests (통합 검증)
  - AC9: 전체 테스트 PASS

#### P2: 단언 품질 개선 (T249~T250)

- [ ] **T249: 과도한 범위 단언 → 비교 단언으로 개선 (40~50개)**
  - 배경: `expect(x).toBeGreaterThanOrEqual(0)` + `toBeLessThanOrEqual(1)` 같은 항상-참 단언이 로직 검증 불가
  - AC1: persona-generation.test.ts — 범위 단언을 아키타입 범위 비교로 전환
  - AC2: qualitative.test.ts — high/low 입력 비교 단언 추가
  - AC3: voice-spec.test.ts — 상태별 비교 단언 강화
  - AC4: 전체 테스트 PASS

- [ ] **T250: 누락된 부정 테스트 케이스 추가 (20~35개)**
  - 배경: onboarding, comment-utils, evolution 등에서 무효 입력 / 경계 위반 테스트 부재
  - AC1: persona-world 주요 모듈에 "should reject/fail" 테스트 블록 추가
  - AC2: 경계값 위반 케이스 추가 (0 미만, 1 초과 벡터)
  - AC3: 전체 테스트 PASS

#### P3: 안정화 (T251)

- [ ] **T251: 불안정 랜덤 테스트 안정화 — 반복 횟수 증가 + 시드 고정**
  - 배경: ~5개 테스트가 랜덤 결과 의존, 간헐 실패 가능
  - AC1: structured-fields.test.ts — 랜덤 기반 테스트 반복 횟수 30→100 증가
  - AC2: interaction.test.ts — 배치 다양성 테스트 반복 증가
  - AC3: 전체 테스트 PASS

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

- [x] **T98: System Integration 3페이지 UI — Deployment + Versions + Event Bus** → DONE ✅ 2026-02-12
  - 배경: lib/system-integration/ 완성 (T66, ~2400줄). stub 페이지 3개를 실제 관리 UI로 전환
  - AC1: Deployment Pipeline — 환경 3종 (DEV/STG/PROD) 상태 카드, 배포 워크플로우 타임라인 (build→test→deploy→verify), Canary Release 진행 게이지 (10%→50%→100%), 롤백 트리거 설정
  - AC2: Version Control — 알고리즘 버전 목록 테이블 (상태 뱃지), 시맨틱 버전 범프 (Major/Minor/Patch), 버전 Diff 비교 뷰, 롤백 영향도 분석 + 실행
  - AC3: Event Bus Monitor — 실시간 이벤트 로그 테이블 (타입/소스/상태 필터), 이벤트 통계 (delivered/failed/pending), 구독 관리, Sync Delay 리포트
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/system-integration/\*)
  - AC5: 테스트 + Build PASS

- [x] **T99: Operations 3페이지 UI — Monitoring + Incidents + Backup** → DONE ✅ 2026-02-12
  - 배경: lib/operations/ 완성 (T67, ~1600줄). stub 페이지 3개를 실제 운영 UI로 전환
  - AC1: System Monitoring — 실시간 메트릭 카드 6종 (CPU/Memory/Disk/Network/API Latency/Error Rate), 임계값 알림 목록 (severity 컬러), 로그 검색 (레벨/소스/시간 필터), 대시보드 패널 레이아웃
  - AC2: Incident Management — 장애 목록 테이블 (P0~P3 severity 뱃지), 장애 생성/삼분류, 타임라인 워크플로우 (Declared→In Progress→Resolved→Closed), Post-mortem 작성 폼, MTTR 통계
  - AC3: Backup & Recovery — 백업 정책 3종 카드 (Full/Incremental/Differential), 백업 이력 테이블 (상태/크기/소요시간), DR 계획 관리, DR Drill 스케줄/결과, 용량 예측 차트 + 비용 최적화 권고
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/operations/\*)
  - AC5: 테스트 + Build PASS

- [x] **T100: Global Config 3페이지 UI — Model Settings + Safety Filters + API Endpoints** → DONE ✅ 2026-02-12
  - 배경: lib/global-config/ 완성 (T68, ~1800줄). stub 페이지 3개를 실제 설정 UI로 전환
  - AC1: Model Settings — LLM 모델 선택 카드 (GPT-4/Claude/Gemini 등), 모델별 비용 테이블, 일/월 예산 설정 슬라이더, 사용량 대시보드 (소비/잔여), 모델 라우팅 규칙 설정
  - AC2: Safety Filters — 필터 규칙 CRUD 테이블 (카테고리/심각도/활성 토글), 금지어 관리 (추가/삭제/일괄 업로드), 필터 로그 목록 (차단 이력+통계), 필터 테스트 시뮬레이터
  - AC3: API Endpoints — 엔드포인트 등록/수정 테이블 (URL/메서드/Rate Limit), 헬스체크 상태 카드 (UP/DOWN/DEGRADED), Rate Limit 설정 (RPM/일일 상한), 헬스 요약 대시보드
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/global-config/\*)
  - AC5: 테스트 + Build PASS

- [x] **T101: Team & Access 3페이지 UI — Users + Roles + Audit Logs** → DONE ✅ 2026-02-12
  - 배경: lib/team/ 완성 (T69, ~1200줄). stub 페이지 3개를 실제 팀 관리 UI로 전환
  - AC1: Users — 팀 멤버 목록 테이블 (이름/이메일/역할/상태 뱃지), 멤버 초대 모달 (이메일+역할 선택), 멤버 비활성화/재활성화 토글, 멤버 역할 변경 드롭다운
  - AC2: Roles — 역할 4종 카드 (Admin/AI Engineer/Content Manager/Analyst), 권한 매트릭스 테이블 (리소스×액션 체크박스), 커스텀 역할 생성/수정, 역할별 멤버 수 표시
  - AC3: Audit Logs — 감사 로그 테이블 (시간/사용자/액션/리소스/결과), 필터 (사용자/액션 타입/날짜 범위), 로그 상세 보기 모달 (before/after diff), CSV 내보내기
  - AC4: 각 페이지 API 라우트 연결 (GET/POST /api/internal/team/\*)
  - AC5: 테스트 + Build PASS

- [x] **T102: 테마 토글 (Light/Dark) — LNB 하단 테마 전환 버튼** → DONE ✅ 2026-02-12
  - 배경: 엔진 스튜디오 전역 테마 지원. 다크 테마는 순수 블랙(#000) 아닌 다크 그레이 톤 (Claude 스타일)
  - AC1: ThemeProvider (next-themes) + globals.css CSS 변수 — light/dark 두 세트 정의, dark 배경 #1a1a2e~#2d2d3f 계열 (Claude 참고)
  - AC2: LNB 좌측 하단 테마 토글 버튼 (Sun/Moon 아이콘, 툴팁, 부드러운 전환 애니메이션)
  - AC3: 모든 기존 컴포넌트 다크 모드 호환 확인 (shadcn/ui 기본 지원 + 커스텀 컴포넌트 CSS 변수 적용)
  - AC4: localStorage 기반 테마 유지 + system preference 감지 (prefers-color-scheme)
  - AC5: 테스트 + Build PASS

### Phase E: 노드 에디터 통합 (T128~)

> T59~T61에서 구축한 DAG 엔진 + 캔버스 UI를 실제 사용 가능한 페이지로 통합.

- [x] **T128: 노드 에디터 페이지 통합 — ComfyUI 스타일 페르소나 생성**
  - 배경: T59~T61에서 DAG 엔진(25노드) + ReactFlow 캔버스 + 실행 엔진 완성. 하지만 handleExecute/handleSave가 placeholder 상태이고, 노드 에디터 접근 가능한 페이지 라우트가 없음. 4-step 위자드와 별도로 ComfyUI 스타일 생성 경로 필요
  - AC1: 실행 엔진 연결 — `handleExecute` placeholder를 `executeGraph()` 실제 호출로 교체. 실행 전 `validateGraph()` 검증. 실행 결과를 Zustand store에 반영 (executionResults, activeEdges). 노드별 상태 배지(성공/에러/스킵) 표시, 활성 엣지 녹색 애니메이션
  - AC2: 저장/로드 연결 — `handleSave` placeholder를 `serializeGraph()` + localStorage 저장으로 교체. 프리셋/저장된 그래프 로드 (deserializeGraph). 키: `node-graph-${personaId}`
  - AC3: 실행 결과 패널 — 하단 접이식 패널. 실행 요약(성공/스킵/에러 카운트, 총 소요시간), 실행 경로 리스트(순번/상태/노드명/소요시간), 노드 클릭 시 캔버스 선택 연동
  - AC4: 전용 페이지 라우트 — `/persona-studio/node-editor` 페이지. `?preset=standard` 프리셋 로드, `?personaId=xxx` 저장 그래프 로드 지원. 전체 높이 캔버스 레이아웃
  - AC5: 네비게이션 추가 — LNB Persona Studio 하위에 "Node Editor" 항목 추가
  - AC6: 테스트 + Build PASS — 프리셋 직렬화 라운드트립, 프리셋 실행, 실행 요약, 저장/로드 라운드트립 테스트

### Phase F: 하드코딩 목업 데이터 제거 (T129)

> T96~T102에서 구축한 18+ 페이지의 인라인 목업/샘플 데이터를 제거하고, 기존 API 라우트에서 동적으로 fetch하도록 전환.

- [x] **T129: 하드코딩 목업 데이터 제거 — 전체 페이지 API 기반 동적 전환** → DONE ✅ 2026-02-12
  - 배경: T96~T102에서 대시보드 UI 구축 시 각 페이지에 인라인 샘플 데이터 생성 함수(createSample*, generate* 등)를 포함. API 라우트는 이미 GET/POST 핸들러 완성. 페이지에서 API를 호출하여 동적으로 데이터를 로드/변경하도록 전환 필요
  - AC1: System Integration 3페이지 (Deployment, Versions, Event Bus) — 인라인 목업 제거, useEffect + fetch로 전환, 뮤테이션 API 호출
  - AC2: Operations 3페이지 (Monitoring, Incidents, Backup) — 인라인 목업 제거, useEffect + fetch로 전환, 뮤테이션 API 호출
  - AC3: Global Config 3페이지 (Model Settings, Safety Filters, API Endpoints) — 인라인 목업 제거, useEffect + fetch로 전환, 뮤테이션 API 호출
  - AC4: Team & Access 3페이지 (Users, Roles, Audit Logs) — 인라인 목업 제거, useEffect + fetch로 전환, 뮤테이션 API 호출
  - AC5: Matching Lab 3페이지 (Simulator, Tuning, Analytics) — 인라인 목업 제거, useEffect + fetch로 전환, 뮤테이션 API 호출
  - AC6: User Insight 3페이지 + Dashboard (Cold Start, Psychometric, Archetype, Dashboard) — 인라인 목업 제거, useEffect + fetch로 전환
  - AC7: 테스트 + Build PASS

### Phase G: LLM 비용 모니터링 (T131)

> 실시간 LLM 호출 비용 추적 및 대시보드. 기존 estimateRequestCost/CostPolicy 인프라 활용.

- [x] **T131: LLM 실시간 비용 모니터링 대시보드** ✅ 2026-02-13
  - AC1: ✅ Prisma LlmUsageLog 모델 + LlmCallStatus enum
  - AC2: ✅ llm-client.ts에 자동 로깅 인터셉터 (모델별 가격 추정, 소요시간, 에러 추적)
  - AC3: ✅ GET /api/internal/operations/llm-costs (요약, 일별 추이, 유형별 통계, 최근 호출)
  - AC4: ✅ /operations/llm-costs 대시보드 (요약 6카드, 바 차트, 유형별 테이블, 최근 호출 테이블)
  - AC5: ✅ LNB Operations 하위 "LLM 비용" 추가
  - AC6: ✅ 51 test files, 1931 tests PASS + Build PASS

### Phase H: 골든 샘플 관리 (T133)

> T62-AC5에서 구현한 golden-sample.ts 백엔드 로직은 완성. 하지만 CRUD API/관리 UI 부재로 팀 운영 불가능.
> 설계서: §3.6.4 골든 샘플 관리 정책 + §3.6.6 자동 확장 전략

- [x] **T133: 골든 샘플 CRUD API + 관리 UI 페이지** ✅ 2026-02-15
  - 배경: 스펙 §3.6.4~§3.6.6. Prisma GoldenSample 모델 + golden-sample.ts 로직 완성됨. 인큐베이터 대시보드에 read-only 메트릭 탭만 있고 등록/수정/삭제 UI 없음
  - AC1: ✅ CRUD API — `GET/POST /api/internal/incubator/golden-samples` (목록+필터+페이지네이션, 생성), `GET/PUT/DELETE /api/internal/incubator/golden-samples/[id]` (조회/수정/삭제)
  - AC2: ✅ 메트릭 API — `GET /api/internal/incubator/golden-samples/metrics` (풀 현황, 차원 커버리지, 확장 필요성)
  - AC3: ✅ 관리 UI 페이지 `/persona-studio/incubator/golden-samples` — 테이블(제목/장르/난이도/차원/상태), 생성/수정 폼(제목/장르/질문/예상반응 JSON 에디터/난이도/검증차원), 삭제
  - AC4: ✅ LNB 네비게이션 — Persona Studio > Incubator 하위에 "Golden Samples" 항목 추가
  - AC5: ✅ 메트릭 카드 — 총 샘플 수, 활성 수, 차원별 커버리지, 확장 필요 여부
  - AC6: ✅ 테스트 4건 + Build PASS

### Phase DC-A: 개발자콘솔 v3 기반 인프라 (T116~T117)

> 선택적 리빌드: 핵심(Schema/Types/API) 재작성 + 벡터 무관 페이지(API Keys/Usage/Logs/Settings/Team) 보존.
> 현재 v1 6D 아키텍처 → v3 3-Layer 106D+ 전환. 설계서: `docs/specs/developer-console.md`

- [x] **T116: Prisma Schema v3 + 타입 시스템 재구축** ✅
  - 배경: 현재 6D 스키마/타입 → v3 3-Layer 106D+ 전환. 모든 후속 작업의 기반
  - AC1: Prisma Schema v3 — Persona 모델 (L1 7D + L2 5D + L3 4D + paradox + archetype), MatchResult v3
  - AC2: PlanType enum 확장 (6-Tier: Starter/Pro/Max/EntStarter/EntGrowth/EntScale)
  - AC3: UserVector 모델 (L1 7D + L2 5D + 교차축 + 프로필 품질)
  - AC4: Consent 모델 (data_collection/sns_analysis/third_party_sharing/marketing)
  - AC5: 공유 타입 정의 (v3 PersonaVector, ThreeLayerVector, ParadoxProfile 등 — shared-types import)
  - AC6: 서비스 타입 업데이트 (DashboardMetrics, UsageStats 등 v3 호환)
  - AC7: Build PASS

- [x] **T117: Billing 6-Tier 플랜 체계 업데이트** ✅ 2026-02-15
  - 배경: 스펙 §8.1.1 v3.1. 현재 4-Tier → 6-Tier 전환
  - AC1: ✅ 플랜 데이터 상수 6-Tier (Starter $199 / Pro $499 / Max $1,499 / Ent.S $3,500 / Ent.G $5,000 / Ent.Sc $15,000)
  - AC2: ✅ 플랜 비교 테이블 UI — 활성 PW 페르소나, 매칭 API, Rate Limit, API Keys, 팀원, SLA
  - AC3: ✅ 초과 요금(Overage) — 매칭 API 초과 + PW 페르소나 초과 단가
  - AC4: ✅ 연간 결제 20% 할인 토글 + Enterprise 문의 분기
  - AC5: ✅ 매칭 기능 비교 섹션 (3-Tier 매칭 + 스마트 캐싱 + Prompt Caching)
  - AC6: ✅ billing-service 타입 업데이트
  - AC7: ✅ 테스트 19건 + Build PASS

### Phase DC-B: v1 Public API v3 재구축 (T118~T120)

> 기존 6D v1 API 전체 삭제 후 v3 3-Layer 106D+ 기반 재구축.

- [x] **T118: v1 매칭/페르소나/피드백 API v3 전환** ✅ 2026-02-15
  - 배경: 현재 6D → v3 3-Layer 전환. 스펙 §9.3.1~§9.3.4
  - AC1: ✅ `POST /v1/match` — user_id + context + options.matching_tier(basic/advanced/exploration)
  - AC2: ✅ `GET /v1/personas` — role/expertise 필터 + v3 벡터 응답 (L1/L2/L3 + paradox)
  - AC3: ✅ `GET /v1/personas/{id}` — v3 상세 (3-Layer 벡터 + paradox + 교차축)
  - AC4: ✅ `POST /v1/feedback` — user_id + persona_id + feedback_type(LIKE/DISLIKE)
  - AC5: ✅ `POST /v1/batch-match` — 배치 매칭 v3
  - AC6: ✅ Rate Limit 헤더 (X-RateLimit-Limit/Remaining/Reset) + 플랜별 Rate Limit
  - AC7: ✅ Build PASS

- [x] **T119: 페르소나 필터 API (§9.3.9)** ✅ 2026-02-15
  - 배경: Enterprise 고객용 106D+ 다차원 정밀 검색
  - AC1: ✅ `POST /v1/personas/filter` — 아키타입 include/exclude 필터 (12종)
  - AC2: ✅ 벡터 범위 필터 (L1 7D + L2 5D + L3 4D 각 차원 min/max)
  - AC3: ✅ Paradox 범위 필터 (extendedScore, l1l2Score, l1l3Score, l2l3Score)
  - AC4: ✅ 교차축 패턴 필터 (axisId + relationship + scoreRange)
  - AC5: ✅ 정렬 7종 (paradox.extendedScore, vectors.l1.\*, createdAt, name 등)
  - AC6: ✅ 응답: personas + appliedFilters + filterStats (아키타입 분포)
  - AC7: ✅ 플랜별 Rate Limit (Starter 50/분 ~ Ent.Scale 무제한)
  - AC8: ✅ Build PASS

- [x] **T120: v3.3 사용자 프로필/온보딩/동의 API** ✅ 2026-02-15
  - 배경: 스펙 §9.3.5~§9.3.11. 외부 플랫폼 유저 프로파일링 연동
  - AC1: ✅ `GET /v1/users/{id}/profile` — 3-Layer 벡터 + 교차축 + 동의 + 프로필 품질
  - AC2: ✅ `POST /v1/users/{id}/onboarding` — QUICK(12)/STANDARD(30)/DEEP(60) 온보딩
  - AC3: ✅ `GET /v1/users/{id}/consent` — 동의 항목 4종 조회
  - AC4: ✅ `POST /v1/users/{id}/consent` — 동의 생성/변경 + side_effects
  - AC5: ✅ 동의 미취득 시 403 CONSENT_REQUIRED 처리
  - AC6: ✅ Build PASS

### Phase DC-C: UI 페이지 재구축/적응 (T121~T124)

> Dashboard/Playground/Docs는 v1 하드코딩이므로 재구축. Support 신규. Webhooks 적응.

- [x] **T121: Dashboard v3 리팩토링** ✅ 2026-02-15
  - 배경: 현재 v1 메트릭 구조 → v3 호환 대시보드. 스펙 §4.1
  - AC1: ✅ 핵심 지표 4카드 (API Calls, Success Rate, P95 Latency, Cost)
  - AC2: ✅ 최근 7일 API 호출 추이 차트 + 최근 활동 로그
  - AC3: ✅ 퀵 액션 (새 API Key 생성, 문서 보기, Playground 열기)
  - AC4: ✅ 환영 메시지 + 오늘/이번달 사용량 요약
  - AC5: ✅ dashboard-service v3 호환 업데이트
  - AC6: ✅ 테스트 10건 + Build PASS

- [x] **T122: API Playground v3 재구축** ✅ 2026-02-15
  - 배경: 현재 v1 엔드포인트 하드코딩 → v3 API 구조. 스펙 §12.1.3
  - AC1: ✅ 엔드포인트 선택 (match, personas, personas/filter, feedback, onboarding, consent + 4개 추가)
  - AC2: ✅ 요청 파라미터 UI (JSON 에디터 + 필드별 폼)
  - AC3: ✅ 인증 설정 (API Key 선택 / 직접 입력)
  - AC4: ✅ 실행 + 응답 표시 (상태코드, 헤더, Body, 소요시간)
  - AC5: ✅ cURL / Python / Node.js / Java 코드 자동 생성
  - AC6: ✅ 요청 히스토리 (최근 10개)
  - AC7: ✅ Build PASS

- [x] **T123: API Documentation v3 재구축** ✅ 2026-02-15
  - 배경: 현재 v1 문서 → v3 API 레퍼런스 + SDK 가이드. 스펙 §9 + §11 + §12.1
  - AC1: ✅ Quick Start (3-step 가이드 — Key 발급 → SDK 설치 → 첫 호출)
  - AC2: ✅ API Reference — v3 10개 엔드포인트 명세 (match, personas, filter, onboarding, consent 등)
  - AC3: ✅ 인증 가이드 (API Key + Rate Limit + 에러 코드 8종)
  - AC4: ✅ SDK 가이드 — Python / Node.js / Java / Go 코드 예제
  - AC5: ✅ 통합 가이드 — 온보딩, 동의, 매칭, 피드백, 프로필 5단계
  - AC6: ✅ 사이드바 네비게이션 + 코드 블록 복사 버튼
  - AC7: ✅ Build PASS

- [x] **T124: Support 페이지 + Webhooks v3 적응** ✅ 2026-02-15
  - 배경: Support 재구축(§12) + Webhooks 이벤트명 v3 업데이트
  - AC1: ✅ FAQ 아코디언 (3카테고리: Getting Started, API/Technical, Billing)
  - AC2: ✅ 문의하기 폼 (유형 4종: Technical Issue, Billing, Account, Feature Request)
  - AC3: ✅ 플랜별 지원 채널 안내 (6-Tier 응답시간 테이블 + SLA)
  - AC4: ✅ 커뮤니티 링크 (Discord, Forum, Newsletter, Status Page)
  - AC5: ✅ Webhooks 이벤트 v3 (9종: persona.activated/deprecated, match.completed, feedback, user.onboarded 등)
  - AC6: ✅ 테스트 9건(webhooks) + Build PASS

### Phase DC-D: 대시보드/분석 고도화 (T125~T126)

> 기존 보존 페이지(Usage/Logs) 고도화 + 실시간 모니터링/알림 추가.

- [x] **T125: 실시간 모니터링 + 알림 센터 + Usage 고도화** ✅ 2026-02-15
  - 배경: 스펙 §4.2 + §4.3 + §6.2~§6.3
  - AC1: ✅ 실시간 지표 패널 — RPS, 성공률, 응답시간, 활성 연결 (5초 자동 갱신)
  - AC2: ✅ 알림 센터 드롭다운 — 5종 알림 + 4채널 설정(Email/Slack/Webhook/Quiet Hours) + 히스토리
  - AC3: ✅ 엔드포인트별 상세 분석 — 6탭(Overview/Endpoints/Errors/Distribution/Performance/Cost), P50/P90/P95/P99
  - AC4: ✅ 비용 분석 + 시뮬레이터 — 예상 월말 비용, 6-Tier 플랜별 비용 비교
  - AC5: ✅ 리포트 빌더 — CSV/JSON 내보내기
  - AC6: ✅ 테스트 10건(usage) + Build PASS

- [x] **T126: Logs 고도화 (고급 검색 + 에러 분석)** ✅ 2026-02-15
  - 배경: 스펙 §7.2 + §7.3
  - AC1: ✅ 고급 검색 쿼리 (status:400 AND endpoint:/v1/match AND duration:>500 DSL 구문)
  - AC2: ✅ 로그 상세 모달 (Request/Response 헤더+바디, JSON 구문강조)
  - AC3: ✅ 에러 대시보드 — 에러율 추이(7일), 유형/엔드포인트별 그룹화
  - AC4: ✅ 에러 알림 설정 — 에러율 임계값 + 연속 에러 + 3채널(Email/Slack/Webhook)
  - AC5: ✅ 로그 내보내기 — CSV/JSON/JSONL
  - AC6: ✅ 테스트 11건(logs) + Build PASS

### Phase DC-E: 테스트 (T127)

- [x] **T127: 개발자콘솔 테스트 스위트** ✅ 2026-02-15
  - 배경: 현재 테스트 0개. CLAUDE.md "테스트 없이 완료 처리 금지"
  - AC1: ✅ Vitest 설정 + vitest.config.ts (v8 coverage, @/ alias)
  - AC2: ✅ v1 API 라우트 테스트 — api-client 14건
  - AC3: ✅ 서비스 테스트 — billing 19건, api-keys 8건, dashboard 10건, usage 10건, logs 11건, webhooks 9건, team 7건, settings 11건
  - AC4: ✅ 유틸리티 테스트 — api-key-validator 12건, usage-tracker 10건, utils 38건, export 12건
  - AC5: ✅ **171개 테스트 PASS** (≥150) + Build PASS

### Phase V4-A: 기억 시스템 강화 — Poignancy + 팩트북 + 망각곡선 (T135~T137)

> v4.0 핵심 — 기존 RAG/기억 시스템에 감정 가중, 불변/가변 분리, 자연 망각을 추가.

- [x] **T135: Poignancy Score — 감정 가중 기억 검색** ✅
  - 배경: 현재 RAG는 recency + similarity만 사용. 감정적으로 중요한 기억이 우선되지 않음
  - AC1: ✅ `src/lib/persona-world/poignancy.ts` — Poignancy 계산 함수 (`pressure × (1 + volatility) × emotionalDelta`), LLM 비용 0
  - AC2: ✅ RAG 검색 가중치 변경 — `recency × 0.3 + similarity × 0.4 + poignancy × 0.3` (computeRAGSearchScore)
  - AC3: ✅ InteractionLog/PersonaPost에 poignancyScore 필드 추가 (Prisma 스키마 + 010_poignancy_score.sql)
  - AC4: ✅ 포스트 생성 시 poignancy 자동 계산 + 저장 (post-pipeline.ts 통합)
  - AC5: ✅ 단위 테스트 31개 PASS (전체 2131개) + Build PASS

- [x] **T136: 팩트북 — immutable/mutable 기억 분리** ✅
  - 배경: 현재 backstory JSON이 단일 구조. "불변의 진실"과 "변할 수 있는 맥락"이 혼재
  - AC1: ✅ backstory JSON 구조 변경 — `immutableFacts[]` + `mutableContext[]` 분리 (Factbook 타입)
  - AC2: ✅ 공유 타입 업데이트 — ImmutableFact, MutableContext, Factbook 인터페이스 (persona-v3.ts)
  - AC3: ✅ `factbook.ts` — convertBackstoryToFactbook (origin/exp/conflict→immutable, selfNarrative→mutable 자동 분류)
  - AC4: ✅ RAG 프롬프트 빌더 — buildFactbookPrompt (immutable=시스템 프롬프트 최상단 고정, mutable=컨텍스트 동적 주입)
  - AC5: ✅ SHA256 해시 — computeFactbookHash + verifyFactbookIntegrity (Web Crypto API, 변조 감지)
  - AC6: ✅ 단위 테스트 31개 PASS (전체 2162개) + Build PASS

- [x] **T137: Forgetting Curve — 자연 망각 시스템** ✅
  - 배경: 10년 활동 페르소나의 RAG DB 무한 성장 방지. "3년 전 점심 메뉴"까지 기억하는 불쾌한 골짜기 방지
  - AC1: ✅ `forgetting-curve.ts` — 에빙하우스 `retention = e^(-t/S)`, S = stability (Poignancy 기반, power=2 스케일)
  - AC2: ✅ RAG 검색 — `applyForgettingCurve(relevance × retention)` + `filterAndRankByRetention` 정렬/필터
  - AC3: ✅ 안정성 매핑 — poignancy 0→S=7일(1주), 0.5→96일(3개월), ≥0.8→3650일(10년=영구), RETENTION_CUTOFF=0.05
  - AC4: ✅ 단위 테스트 29개 PASS (전체 2191개) + Build PASS

### Phase V4-B: 보안 3계층 아키텍처 (T138~T141)

> v4.0 최우선 — 입구/내부/출구 3단계 보안 필터 + 킬 스위치.

- [x] **T138: Gate Guard — 입력 보안 계층** ✅ 2026-02-16
  - 배경: 유저 발화/페르소나 간 메시지가 메모리에 닿기 전 1차 방어선
  - AC1: ✅ `src/lib/security/gate-guard.ts` — 12개 Injection 패턴(정규식), 14개 금지어, 5가지 구조적 검증(길이/반복/URL/특수문자)
  - AC2: ✅ 의미론적 필터 — SemanticFilterProvider DI, 규칙 high severity→즉시 차단(LLM 0), medium→Haiku 2차 검증
  - AC3: ✅ 출처 태깅 — MemoryEntry 타입(source, trustLevel, propagationDepth, gateResult) + GateResult/RuleViolation/MemorySource/TrustLevel
  - AC4: ✅ 신뢰도 전파 규칙 — direct 1.0, 1-hop 0.7×, 2-hop 0.5×, 3-hop+ quarantined + propagateMemoryEntry 연쇄 전파
  - AC5: ✅ 79 단위 테스트 PASS + 전체 2270 테스트 PASS + Build PASS

- [x] **T139: Integrity Monitor — 내부 감시 계층** ✅ 2026-02-16
  - 배경: 저장 후 시간이 지나면서 발생하는 오염 탐지
  - AC1: ✅ `src/lib/security/integrity-monitor.ts` — computeFactbookHash 재사용, immutableFacts 변조 감지
  - AC2: ✅ 상태 드리프트 감지 — vectorCosineSimilarity + checkL1Drift (0.85 warning, 0.70 critical)
  - AC3: ✅ mutableContext 변경 로그 — checkChangeLog (하루 5회/항목, 20회/전체), 자동 플래그
  - AC4: ✅ 집단 이상 탐지 — checkCollectiveAnomaly (mood≤0.3 depression, ≥0.9 euphoria, minSample=3)
  - AC5: ✅ 42 단위 테스트 PASS + 전체 2312 테스트 PASS + Build PASS

- [x] **T140: Output Sentinel — 출력 보안 계층** ✅ 2026-02-16
  - 배경: 페르소나 생성 콘텐츠가 유저에 도달하기 전 마지막 관문
  - AC1: ✅ `src/lib/security/output-sentinel.ts` — 6개 PII 패턴, 8개 시스템 유출 패턴, 4개 혐오 패턴
  - AC2: ✅ 팩트북 위반 검증 — extractKeywords(4자+) × FACTBOOK_NEGATION_PATTERNS(3개), LLM 불필요
  - AC3: ✅ 격리 시스템 — createQuarantineEntry/reviewQuarantineEntry/countPendingQuarantine
  - AC4: ✅ Prisma 스키마 — QuarantineEntry 모델 + QuarantineStatus enum + 011 마이그레이션
  - AC5: ✅ 45 단위 테스트 PASS + Build PASS

- [x] **T141: 킬 스위치 + SystemSafetyConfig** ✅ 2026-02-16
  - 배경: v4.1 회고/v4.2 확산 도입 시 "문제 발생 → 즉시 OFF" 인프라
  - AC1: ✅ `src/lib/security/kill-switch.ts` — SystemSafetyConfig (freeze/unfreeze + 불변 업데이트)
  - AC2: ✅ 6개 기능 토글 — diffusion(off), reflection(off), emotionalContagion(off), arena/evolution/autonomousPosting(on)
  - AC3: ✅ 자동 트리거 — quarantine 50/10min→freeze, mood≤0.2→warning, drift≤0.7 20%→freeze
  - AC4: ✅ Prisma SystemSafetyConfig(singleton) + API GET/PUT /api/internal/safety-config + 012 마이그레이션
  - AC5: ✅ 35 단위 테스트 PASS + Build PASS

### Phase V4-C: 출처 추적 + 프롬프트 캐싱 (T142~T143)

> 데이터 출처 추적 인프라 + 비용 최적화.

- [x] **T142: 출처 추적 시스템 (Data Provenance)** ✅ 2026-02-16
  - 배경: 향후 확산 기능 대비, 모든 기억에 출처/신뢰도/전파 깊이 추적
  - AC1: ✅ Prisma 스키마 — InteractionLog에 source(InteractionSource), trustLevel, propagationDepth, originPersonaId + PersonaPost에 postSource(PostSource) (T138~T141에서 완료)
  - AC2: ✅ PostSource enum (AUTONOMOUS/FEED_INSPIRED/ARENA_TEST/SCHEDULED) + InteractionSource enum (DIRECT/PERSONA_RELAY/EXTERNAL_FEED/SYSTEM)
  - AC3: ✅ 신뢰도 자동 계산 — data-provenance.ts(computeInteractionProvenance/determinePostSource/computeRelayProvenance/summarizeProvenance) + post-pipeline.ts(postSource 태깅) + interaction-pipeline.ts(좋아요/댓글 provenance 태깅) + user-interaction.ts(DIRECT 출처 태깅) + scheduler/route.ts(Prisma 연동)
  - AC4: ✅ 27개 data-provenance 테스트 PASS + 전체 77파일 3136개 PASS + Build PASS

- [x] **T143: 프롬프트 캐싱 전략** ✅ 2026-02-16
  - 배경: 팩트북(~500 tok) + 보이스 스펙(~300 tok) + 시스템 프롬프트(~200 tok) = ~1,000 토큰이 매 턴 동일
  - AC1: ✅ LLM 클라이언트에 Anthropic prompt caching 적용 — llm-client.ts(systemPromptPrefix 파라미터, buildSystemBlocks, cache_control: ephemeral)
  - AC2: ✅ cache_control 블록 설정 — llm-adapter.ts(포스트/댓글/감상/UIV분석/유저응답 5개 provider에 정적 prefix 분리, splitSystemPromptForCache)
  - AC3: ✅ 비용 절감 추적 — LlmUsageLog에 cacheCreationInputTokens/cacheReadInputTokens/cacheSavingsUsd 3필드 추가, calculateCacheSavings() + 014_prompt_caching.sql 마이그레이션
  - AC4: ✅ 78파일 3149개 테스트 PASS + Build PASS

### Phase V4-D: 아레나 v1 (T144~T146)

> 1:1 스파링 + AI 심판 + 비용 제어 + 교정 플로우.

- [x] **T144: 아레나 세션 인프라** ✅ 2026-02-16
  - 배경: 페르소나 품질 검증을 위한 대전 테스트 시스템
  - AC1: ✅ Prisma 스키마 — ArenaSession (mode, participants, profileLoadLevel, maxTurns, budget, status) + 6 enum + 5 model
  - AC2: ✅ ArenaTurn 모델 (sessionId, turnNumber, speakerId, content, vectorSnapshot, poignancy) + Cascade 삭제
  - AC3: ✅ ArenaJudgment 모델 (sessionId, characterConsistency, l2Emergence, paradoxEmergence, triggerResponse, issues[]) + 1:1 관계
  - AC4: ✅ API — POST /api/internal/arena/sessions (입력 검증, 참가자 존재 확인, 예상 비용 계산)
  - AC5: ✅ 프로필 로드 수준 3단계 — Full(~3,200tok), Standard(~1,800tok), Lite(~600tok) + PROFILE_TOKEN_ESTIMATES
  - AC6: ✅ 78파일 3149개 테스트 PASS + Build PASS

- [x] **T145: 아레나 실행 엔진 + AI 심판** ✅ 2026-02-16
  - 배경: 1:1 스파링 실행 + 심판관 자동 평가
  - AC1: ✅ arena-engine.ts runSession() — 턴 기반 대화 실행 (예산 내 자동 반복)
  - AC2: ✅ judgeSessionLLM() — LLM 기반 AI 심판 + parseJudgmentResponse() 응답 파싱 + 룰 기반 폴백
  - AC3: ✅ JUDGMENT_MODEL_MAP — Sonnet(PRECISE) / Haiku(QUICK) 모델 선택
  - AC4: ✅ TurnIssue[] — 턴별 이슈 (category/severity/description/suggestion)
  - AC5: ✅ addTurn()에서 budgetTokens/maxTurns 초과 시 자동 중단 + getRemainingBudget()
  - AC6: ✅ 78파일 3159개 테스트 PASS + Build PASS

- [x] **T146: 아레나 교정 플로우 + 관리자 UI** ✅ 2026-02-16
  - 배경: 심판 자동 체크 → 보고서 → 관리자 승인 → 페르소나 지침 자동 반영
  - AC1: ✅ POST/PATCH /api/internal/arena/sessions/[id]/corrections
  - AC2: ✅ 승인 시 voiceProfile 자동 반영 + correction-loop.ts
  - AC3: ✅ 아레나 관리자 UI (/arena) — 세션 생성+목록+리뷰
  - AC4: ✅ 예산 현황 UI + arena-cost-control.ts(0.8 경고, 1.0 차단)
  - AC5: ✅ 78파일 3159개 테스트 PASS + Build PASS

### Phase V4-E: Social Module + 관리자 대시보드 (T147~T148)

> L4 대신 독립 모듈 시스템 + 보안 대시보드.

- [x] **T147: Social Module System — Connectivity (보안 전용)** ✅
  - 배경: L4를 레이어가 아닌 독립 모듈로. v4.0에서는 Connectivity만 보안 모니터링용 활성화
  - AC1: ✅ `src/lib/social-module/types.ts` — SocialModuleConfig (authority/connectivity/reputation/tribalism 각 ON/OFF + weight)
  - AC2: ✅ `src/lib/social-module/connectivity.ts` — PersonaRelationship 그래프 분석 (Hub/Isolate 탐지, degree centrality)
  - AC3: ✅ featureBindings 설정 — matching: ["reputation"], feed: ["authority","reputation"], arena: ["tribalism"], security: ["connectivity"]
  - AC4: ✅ DB 스키마 — SocialModuleConfig 테이블 (글로벌 싱글톤, 모듈별 enabled/weight)
  - AC5: ✅ 단위 테스트 45개 + Build PASS

- [x] **T148: 관리자 보안 대시보드** ✅
  - 배경: 보안 3계층의 모니터링/관리 UI
  - AC1: ✅ 보안 알림 패널 — Gate Guard/Integrity/Output 경고 실시간 표시
  - AC2: ✅ 격리 큐 관리 — QuarantineEntry 목록, 승인/삭제, 필터링
  - AC3: ✅ 집단 이상 모니터링 — 전체 mood 분포, L1 드리프트 분포
  - AC4: ✅ 킬 스위치 제어판 — SystemSafetyConfig UI (기능별 토글, 긴급 동결 버튼)
  - AC5: ✅ Social Module Connectivity 시각화 — Hub/Isolate 표시, 관계 그래프 요약
  - AC6: ✅ 단위 테스트 + Build PASS

### Phase QI: 페르소나 품질 개선 (T150~T154)

> 하드코딩 패턴 품질 향상: 로직 개선(T150~T152) + LLM 업그레이드(T153~T154)

- [x] **T150: 5단계 벡터 묘사 시스템 확장**
  - 배경: 현재 3단계(high/mid/low) 묘사가 벡터 0.9와 0.7을 동일하게 "심층적"으로 표현. 5단계로 세분화하면 LLM 프롬프트 정교화 + 매칭 XAI 표현력 향상
  - AC1: `prompt-builder.ts` — describeLevel() 3단계→5단계 (veryLow/low/mid/high/veryHigh). L1 7D + L2 5D + L3 4D = 16D × 5 = 80개 묘사 문장
  - AC2: `matching/explanation.ts` — TraitLevel 3단계→5단계, DIM_LABELS에 veryHigh/veryLow 추가, TRAIT_EXPRESSIONS 14개→28개, PERSONA_MATCH_EXPRESSIONS 14개→28개
  - AC3: getTopTraits() 임계값 조정 (≥0.8→very_high, ≥0.6→high, ≤0.2→very_low, ≤0.4→low)
  - AC4: 기존 테스트 호환성 유지 + 추가 테스트 + Build PASS

- [x] **T151: 아키타입 22종 전체 매핑 + 이름 중복 방지**
  - 배경: roleMap/archetypeStyleMap이 구버전 12종만 매핑. 이름 생성 시 기존 페르소나와 중복 가능
  - AC1: ✅ `character-generator.ts` — roleMap 22종 전체 매핑 (완료)
  - AC2: ✅ `voice-generator.ts` — archetypeStyleMap 22종 전체 매핑 (완료)
  - AC3: `character-generator.ts` — generateCharacter()에 existingNames 파라미터 추가, generateName()에서 중복 시 재선택 (최대 10회 시도)
  - AC4: 호출부 (generate-random/route.ts, create/route.ts) 수정 — 기존 페르소나 이름 목록 전달
  - AC5: 테스트 + Build PASS

- [x] **T152: Express 알고리즘 교차축 퀴크 + Voice sigmoid 개선**
  - 배경: calculateDerivedStates가 L1만 사용 (L2/L3 미반영). Voice activationThresholds가 단순 선형 공식. 6개 고정 퀴크로 다양성 부족
  - AC1: `express-algorithm.ts` — calculateDerivedStates()에 L2(OCEAN)/L3(NarrativeDrive) 벡터 반영. 교차축 역설 기반 파생 상태 계산
  - AC2: `express-algorithm.ts` — L1↔L2 역설 패턴 4종 기반 동적 퀴크 자동 생성 (기존 6개 + 벡터 기반 추가). 예: sociability↔extraversion 역설 시 "대화를 주도하다가 갑자기 침묵" 퀴크 자동 추가
  - AC3: `voice-generator.ts` — calculateThresholds()에 sigmoid 적용 (현재 선형 0.3+x\*0.4 → sigmoid 기반 비선형 감도 곡선)
  - AC4: 테스트 + Build PASS

- [x] **T153: 캐릭터 생성기 LLM 업그레이드**
  - 배경: character-generator.ts에 ~150개 하드코딩 패턴 (이름 64개, 전문분야 24개, 말버릇 29개, 습관 18개 등). T149 패턴(LLM-first + fallback) 적용
  - AC1: `llm-character-generator.ts` (신규) — 벡터+아키타입+정성적 프로필 기반 캐릭터 LLM 생성. 프롬프트 캐싱 적용
  - AC2: 이름/역할/전문분야/설명/배경/말버릇/퀴크/습관/관계를 벡터 역설에 맞게 일관된 캐릭터로 생성
  - AC3: generate-random/route.ts, create/route.ts에 LLM-first + 기존 패턴매칭 fallback 적용
  - AC4: 예상 비용: ~$0.01/페르소나 (1회성 생성 비용)
  - AC5: 테스트 + Build PASS

- [x] **T154: Express 퀴크 LLM 동적 생성**
  - 배경: 6개 고정 퀴크의 표현이 모든 페르소나에 동일. 페르소나별 고유 퀴크를 LLM으로 생성하면 캐릭터 일관성 대폭 향상
  - AC1: `llm-express-quirks.ts` (신규) — 벡터+아키타입+VoiceProfile 기반 페르소나 전용 퀴크 5~8개 LLM 생성
  - AC2: QuirkDefinition 스키마 준수 (condition/baseProbability/cooldownTurns/expression)
  - AC3: 생성된 퀴크를 PersonaLayerVector 또는 별도 필드에 저장. 런타임에서 DEFAULT_QUIRKS 대신 사용
  - AC4: 예상 비용: ~$0.005/페르소나 (1회성)
  - AC5: 테스트 + Build PASS

### Phase V4-F: 생성 파이프라인 v4 통합 (T158)

> v4 빌딩 블록(VoiceSpec, Factbook, TriggerMap)을 생성 파이프라인에 통합.

- [x] **T158: 페르소나 생성 파이프라인 v4 통합 — VoiceSpec + Factbook + TriggerMap** ✅ 2026-02-20
  - AC1: ✅ Prisma 스키마 — `voiceSpec`, `factbook`, `triggerMap` Json? 필드 + 019 마이그레이션
  - AC2: ✅ `computeVoiceStyleParams(l1, l2, l3)` — 6D 스타일 파라미터 벡터 기반 계산
  - AC3: ✅ `generateInitialTriggerRules(l1, l2, l3)` — 3~6개 트리거 규칙 자동 생성
  - AC4: ✅ `buildInstructionLayer()` 공유 함수 추출 → pipeline.ts + create/route.ts 공통 사용
  - AC5: ✅ 기존 `voiceProfile`/`backstory` 필드 유지 (하위 호환성)
  - AC6: ✅ 3629 테스트 PASS + Build PASS
  - 추가 수정: 마이그레이션 컬럼명 camelCase 수정, 복제 API v4 필드 누락 수정

- [x] **T159: 페르소나 생성 전체 모듈화 — create/route.ts → 공유 파이프라인 통합** ✅ 2026-02-20

### Phase V4-G: 프롬프트 v4 + 다양성 강화 + 구조화 필드 (T160~T163)

> 생성 파이프라인 v4 품질 강화 — 프롬프트 v4 전환, 다양성 개선, 구조화 필드 자동생성, 기억 저장소 런타임 연동.

- [x] **T160: 시스템 프롬프트 v4 전환 — VoiceSpec/Factbook 기반 프롬프트 빌더** ✅ 2026-02-20
  - AC1: ✅ `buildBasePrompt` — voiceSpec의 6D 스타일 파라미터 기반 프롬프트로 전환 (L1/L2/L3 수치 제거, 자연어 서술)
  - AC2: ✅ factbook.immutableFacts를 [출생/형성경험/내면갈등/핵심정체성] 섹션으로 프롬프트에 반영
  - AC3: ✅ triggerMap 규칙을 [행동 트리거] 섹션으로 프롬프트에 반영
  - AC4: ✅ 5종 프롬프트(base/review/post/comment/interaction) 전체 v4 전환
  - AC5: v3 fallback 유지로 A/B 비교 가능 (voiceSpec 없으면 v3, 있으면 v4)
  - AC6: ✅ 89파일 3649 테스트 PASS + Build PASS

- [x] **T163: Factbook 런타임 연동 — mutableContext 업데이트 파이프라인** ✅ 2026-02-20

### Phase SEC: 보안 감사 수정 (T167~T172)

> 전체 보안 정밀 검사에서 발견된 CRITICAL~MEDIUM 취약점 일괄 수정.

- [x] **T167: [SEC-C1] 하드코딩 자격증명 제거** ✅ 2026-02-22
  - 배경: seed 라우트에 관리자 비밀번호·이메일·시드 시크릿이 소스코드에 하드코딩됨 (CRITICAL)
  - AC1: developer-console `admin/seed/route.ts`에서 하드코딩된 비밀번호(`Ghrnfldks12!!@`), 이메일(`uhi1308@naver.com`), 시드 시크릿(`deepsight-init-2024`) 제거 → 환경변수 필수화
  - AC2: engine-studio `prisma/seed.ts`에서 하드코딩된 비밀번호 fallback 제거 → 환경변수 필수화
  - AC3: seed GET 핸들러 제거 (POST만 허용), 시크릿을 query param → Authorization 헤더로 변경

- [x] **T168: [SEC-C2] Developer Console 조직 격리 강화** ✅ 2026-02-22
  - 배경: 6개 라우트에서 `prisma.organization.findFirst()` WHERE 없이 사용 → Cross-Org 접근 가능 (CRITICAL)
  - AC1: `getUserOrganization(userId)` 헬퍼 함수 생성 (OrganizationMember 기반 조회)
  - AC2: `team/route.ts`, `team/invite/route.ts`, `billing/route.ts`에 헬퍼 적용
  - AC3: `api-keys/route.ts`, `billing/toss/success/route.ts`에서 `findFirst()` fallback 제거
  - AC4: `webhooks/[id]/route.ts` PATCH/DELETE에 조직 소유권 검증 추가
  - AC5: `team/members/[id]/route.ts` PATCH/DELETE에 조직 소유권 검증 추가

- [x] **T169: [SEC-C3] Toss 웹훅 서명 검증** ✅ 2026-02-22
  - 배경: 웹훅 엔드포인트에 서명 검증 없이 누구든 결제 상태 변조 가능 (CRITICAL)
  - AC1: Toss Basic Auth (Base64 시크릿키) 기반 서명 검증 추가
  - AC2: `TOSS_WEBHOOK_SECRET` 환경변수 필수화

- [x] **T170: [SEC-C4] Public API 인증 가드 — IDOR 방지** ✅ 2026-02-22
  - 배경: engine-studio public API가 userId를 body에서 받아 인증 없이 사용 → 누구나 다른 유저로 액션 가능 (CRITICAL)
  - AC1: engine-studio에 `verifyInternalToken()` 유틸리티 생성 (`INTERNAL_API_SECRET` 환경변수)
  - AC2: persona-world 미들웨어에 API 프록시 경로 인증 + `X-Internal-Token` 헤더 주입
  - AC3: engine-studio public 라우트 6개에 internal token 검증 적용 (likes, comments, repost, follows, feed, onboarding/answers)

- [x] **T171: [SEC-H1] 입력 검증 강화** ✅ 2026-02-22
  - 배경: 배열 크기/문자열 길이 무제한으로 DoS 가능 (HIGH)
  - AC1: `onboarding/answers` 배열 크기 50 제한 + `answer.value` 길이 1000 제한
  - AC2: developer-console `search` 쿼리 길이 100 제한
  - AC3: developer-console `login` 이메일 254/비밀번호 128 길이 제한
  - AC4: `sns/upload` uploadedData 항목 수 10000 제한

- [x] **T172: [SEC-M1] 보안 헤더 + CORS 강화** ✅ 2026-02-22
  - 배경: CORS 와일드카드, CSP 미설정 (MEDIUM)
  - AC1: engine-studio CORS에서 와일드카드(`*`) 제거 → 허용 도메인 환경변수화
  - AC2: 3개 앱에 Content-Security-Policy 헤더 추가

### Phase FIX: 테스트 동기화 (T173)

> 소스 코드 리팩토링 후 미동기화된 테스트 파일 일괄 수정.

- [x] **T173: 테스트 파일 타입 에러 일괄 수정** ✅ 2026-02-22
  - 배경: v3→v4 리팩토링 시 타입 인터페이스/Prisma 스키마가 변경되었으나 테스트 파일이 동기화되지 않아 `pnpm test` 실행 불가
  - AC1: ✅ Prisma import 경로 수정 — `@prisma/client` → `@/generated/prisma` (lifecycle, random-generation, post-type-selector)
  - AC2: ✅ 인터페이스 필드명 동기화 — `vFinal`→`l1/l2/l3`, `basicScore`→`vectorScore` 등 (consumer-journey)
  - AC3: ✅ 제거된 메서드/필드 반영 — `saveActivityLog` 제거 (scheduler), `LLMCallType` import 수정 (cost)
  - AC4: ✅ 타입 불일치 수정 — `string`→`Date`, `number[]`→`[number,number]`, `null`→`undefined` (comment-utils, llm-express-quirks, data-architecture)
  - AC5: ✅ Next.js 16 호환 — `RequestInit.signal` 타입, `NotificationSettings.push` 추가 (api-key-validator, settings-service)
  - AC6: ✅ `pnpm test` 전체 PASS (3,993 tests / 113 files)

- [ ] **T176: 프로덕션 DB 마이그레이션 미적용 수정 — 500 에러 해결**
  - 배경: 엔진 스튜디오 프로덕션 `/api/internal/personas`, `/api/internal/incubator/dashboard` 500 에러. 원인: 마이그레이션 016~024가 프로덕션 DB에 미적용. Prisma 클라이언트는 최신 스키마 기준 빌드하나 실제 DB에 컬럼/테이블 부재
  - AC1: 마이그레이션 023 테이블명 버그 수정 (`"Persona"` → `"personas"`)
  - AC2: 통합 마이그레이션 스크립트 생성 (`apply_missing_016_to_024.sql`)
  - AC3: 프로덕션 DB에 마이그레이션 적용 후 500 에러 해결 확인

### Phase QI-B: 페르소나 품질 개선 2차 — 관계 감쇠 + 드리프트 + 다양성 + 매칭 강화 (T177~T181)

> 연구 기반 + 코드베이스 분석에서 도출된 5개 품질 개선.
> 우선순위: (1) 안 하면 장기 시스템 붕괴 → (2) 모니터링 사각지대 → (3) 매칭 품질 → (4) 데이터 인프라
> 원칙: LLM 비용 0, 기존 코드 최소 변경, 테스트 필수

- [x] **T177: COOLING/DORMANT + warmth 시간 감쇠 — 관계 자연 소멸** ✅ 2026-02-22
  - 배경: 현재 관계 단계가 올라가기만 하고 내려가지 않음. 장기 운영 시 모든 관계가 CLOSE에 수렴하여 관계 시스템 자체가 무의미해짐
  - AC1: ✅ `relationship-protocol.ts` — COOLING/DORMANT 2단계 추가 (STRANGER→ACQUAINTANCE→FAMILIAR→CLOSE→COOLING→DORMANT), 시간 기반 하강 조건
  - AC2: ✅ `relationship-manager.ts` — `recalculateRelationship()`에 warmth 시간 감쇠 적용 (`warmth × e^(-0.02 × daysSinceLastInteraction)`), frequency 주간 감쇠
  - AC3: ✅ COOLING 진입 조건: lastInteractionAt > 14일 AND warmth < 이전 단계 threshold. DORMANT: > 30일 무활동
  - AC4: ✅ COOLING/DORMANT 단계별 행동 프로토콜 (interactionBoost 감소, allowedTones 축소, vulnerabilityAllowed false)
  - AC5: ✅ 단위 테스트 66개 PASS + Build PASS

- [x] **T178: PersonaDrift 감지 — VoiceStyle baseline 비교** ✅ 2026-02-22
  - 배경: VoiceAnchor(few-shot)로 일관성을 유지하지만 드리프트가 발생하는지 측정할 수 없음. Arena 교정 루프의 핵심 입력
  - AC1: ✅ `persona-drift.ts` (신규) — VoiceStyleParams baseline 저장 + 현재값 비교 (코사인 유사도)
  - AC2: ✅ 드리프트 점수 = 1 - cosineSimilarity(baseline, current), WARNING: > 0.15, CRITICAL: > 0.30
  - AC3: ✅ `quality-integration.ts`에 드리프트 점수 통합 — QualityCheckResult에 driftScore 추가
  - AC4: ✅ 단위 테스트 20개 PASS + Build PASS

- [x] **T179: DiversityScore — 콘텐츠 다양성 측정** ✅ 2026-02-22
  - 배경: B2B 고객이 "페르소나가 맨날 비슷한 말만 해요" → 해지 사유. trigram 중복 체크로 다양성 지표 제공
  - AC1: ✅ `diversity-score.ts` (신규) — trigram 추출 + 자기반복률 계산 (최근 N개 포스트 내)
  - AC2: ✅ DiversityScore = 1 - selfRepetitionRate. WARNING: < 0.6, CRITICAL: < 0.4
  - AC3: ✅ `quality-integration.ts`에 DiversityScore 통합 — QualityCheckResult에 diversityScore 추가
  - AC4: ✅ 단위 테스트 21개 PASS + Build PASS

- [x] **T180: Basic Tier에 Paradox 소량 반영 — 매칭 인간미 향상** ✅ 2026-02-22
  - 배경: Paradox 호환성이 Advanced Tier(10%)에서만 사용됨. Basic Tier(60%)에도 5% 반영하면 즉시 매칭 인간미 향상
  - AC1: ✅ `three-tier-engine.ts` — calculateBasicScore 가중치 변경: V_Final 65% + 교차축 30% + Paradox 5%
  - AC2: ✅ calculateBasicScore 시그니처에 ParadoxProfile 파라미터 추가 (옵셔널, 하위호환)
  - AC3: ✅ matchPersona(), matchAll() 호출부 업데이트
  - AC4: ✅ 단위 테스트 63개 PASS + Build PASS

- [x] **T181: TrustScore + RapportScore 인프라 — 데이터 수집 + 계산 로직** ✅ 2026-02-22
  - 배경: 신뢰/라포 매칭은 데이터가 쌓여야 의미. 지금 인프라를 구축하고 데이터 수집 시작, 활성화는 데이터 축적 후
  - AC1: 보류 — Prisma 스키마 변경은 프로덕션 DB 마이그레이션 인프라(T176) 완료 후 적용
  - AC2: ✅ `trust-score.ts` (신규) — computeTrustScore(totalSessions, conflictResolutionRate, engagementDepthSlope), λ = sigmoid(sessions/30 - 1)로 가중치 자동 조절
  - AC3: ✅ `rapport-score.ts` (신규) — computeRapportScore(lexicalAlignment, balanceScore, warmth), lexicalAlignment = trigram Jaccard 유사도, balanceScore = 발화 길이 대칭성
  - AC4: 보류 — 데이터 수집 배선은 스키마 변경(AC1) 후 적용
  - AC5: 보류 — 상태 API는 스키마 변경(AC1) 후 적용
  - AC6: ✅ 단위 테스트 55개 PASS (trust 32 + rapport 23) + Build PASS

### Phase QI-C: 품질 자동 교정 — Diversity + Drift 자동화 (T182~T183)

> T179/T178 감지(measure)에서 교정(correct)으로 확장. 운영자 개입 없이 자동 복구.
> 원칙: LLM 비용 0, 순수 수학/텍스트 처리, 기존 파이프라인 최소 변경

- [x] **T182: DiversityConstraint 자동 주입 — 반복 trigram 블랙리스트** ✅ 2026-02-22
  - 배경: DiversityScore CRITICAL/WARNING 시 운영자가 수동 수정해야 함. topRepeatedTrigrams를 콘텐츠 생성 프롬프트에 자동 주입하면 다음 생성부터 즉시 회피
  - AC1: ✅ `diversity-constraint.ts` (신규) — `buildDiversityConstraint(result)`: DiversityResult → constraint 텍스트 생성 (DIVERSE=NONE/WARNING=SOFT/CRITICAL=STRONG)
  - AC2: ✅ `applyDiversityConstraint(prompt, result)`: WARNING 이상 시 프롬프트 끝에 constraint 블록 추가, DIVERSE면 원본 반환
  - AC3: ✅ `quality-integration.ts` — QualityCheckResult에 `diversityConstraint: DiversityConstraintResult | null` 추가, runQualityCheck Step 7에서 자동 생성
  - AC4: ✅ 단위 테스트 42개 PASS + Build PASS

- [x] **T183: VoiceStyle Drift 자동 보정 — baseline pull-back** ✅ 2026-02-22
  - 배경: Drift WARNING/CRITICAL 시 운영자가 수동 교정해야 함. dimensionDrifts 기반으로 baseline 방향 수식 보정 (α = severity별 차등)
  - AC1: ✅ `drift-correction.ts` (신규) — `applyDriftCorrection(current, baseline, severity)`: 6개 차원을 severity별 α(WARNING=0.3, CRITICAL=0.7)로 pull-back, 0~1 클램프
  - AC2: ✅ `getCorrectionStrength(severity)`: α값 결정 함수 (STABLE=0, WARNING=0.3, CRITICAL=0.7)
  - AC3: ✅ `quality-integration.ts` — QualityCheckResult에 `driftCorrection: DriftCorrectionResult | null` 추가, STABLE이 아닐 때 자동 계산
  - AC4: ✅ CRITICAL 교정 시 reasons에 "[자동 교정] ..." 내역 기록 (운영자 사후 확인용)
  - AC5: ✅ 단위 테스트 42개 PASS + Build PASS

### Phase OPS-A: Operations 가짜 데이터 일괄 제거 (T184~T187)

> 감사 결과: Backup/DR/Incident 메뉴에 Math.random(), 하드코딩 결과값, 가짜 용량 데이터 다수 발견.
> 원칙: 가짜 데이터 0 — 없는 데이터는 보여주지 않거나 안내로 대체. 사용자 입력이 필요한 곳은 폼으로.

- [x] **T184: Backup 페이지 — 가짜 백업 실행 제거 + Neon 자동백업 안내** ✅ 2026-02-22
  - 배경: Vercel+Neon 환경에서 "백업 실행" 버튼은 150MB 고정값/랜덤 체크섬의 가짜 DB 레코드만 생성. Neon이 PITR 자동백업을 제공하므로 앱 레벨 백업 불필요
  - AC1: ✅ `backup/route.ts` — `create_backup` action 완전 제거. 가짜 백업 레코드 생성 코드(150MB 고정, 랜덤 체크섬) 삭제
  - AC2: ✅ `backup/route.ts` — `buildDefaultCapacityReport()` 제거, GET 응답에서 `capacityReport` 제거
  - AC3: ✅ `backup/page.tsx` — "백업 실행" 버튼 제거, 정책 카드를 "참고용" 표시로 변경
  - AC4: ✅ `backup/page.tsx` — 상단에 Neon 자동백업 안내 배너 추가 (Neon 콘솔 링크 포함)
  - AC5: ✅ `backup/page.tsx` — 가짜 Capacity Report 섹션 제거 → T186 실측 현황으로 교체
  - AC6: ✅ Build PASS

- [x] **T185: DR 드릴 완료 — 랜덤값 제거 + 사용자 입력 폼** ✅ 2026-02-22
  - 배경: "훈련 완료" 버튼이 RTO=25~40분(랜덤), RPO=3~8분(랜덤), findings/improvements 고정 문자열을 자동 저장. SLA 지표를 조작하는 것과 같음
  - AC1: ✅ `backup/route.ts` — `complete_drill`: Math.random() 완전 제거. `actualRtoMinutes`, `actualRpoMinutes` 필수값으로 요구, `findings`/`improvements` 사용자 입력 수신
  - AC2: ✅ `backup/page.tsx` — "완료 입력" 버튼 클릭 시 인라인 폼 표시 (RTO, RPO 필수, 발견/개선사항 선택). "자동 생성 없음" 안내 명시
  - AC3: ✅ `backup/route.ts` — `schedule_drill`: body에서 `scheduledAt` 수신 가능 (없으면 7일 기본값, 주석 명시)
  - AC4: ✅ Build PASS

- [x] **T186: Capacity Report — 실 DB 쿼리로 교체** ✅ 2026-02-22
  - 배경: `buildDefaultCapacityReport()`의 30일 이력이 `10 + day * 0.5` 등 공식으로 생성한 완전 가짜 데이터. 실제 LlmUsageLog, Persona 집계로 교체
  - AC1: ✅ `backup/route.ts` — `buildRealCapacitySnapshot()`: Promise.all로 3개 실 DB 쿼리 (활성 페르소나 count, LLM 30일 집계, 매칭 30일 count)
  - AC2: ✅ 스냅샷 이력 없이 현재 단일 시점 실측값만 표시 (Decimal 타입 Number() 변환 포함)
  - AC3: ✅ `backup/page.tsx` — 4개 실측 현황 카드 (활성 페르소나/LLM 호출/LLM 비용/매칭 횟수) 표시
  - AC4: ✅ Build PASS

- [x] **T187: Post-mortem — 하드코딩 액션아이템/교훈 제거** ✅ 2026-02-22
  - 배경: 모든 장애 사후분석에 "모니터링 개선 (ops-team, 7일)" 액션과 "알림 임계값 조정 필요" 교훈이 자동 삽입됨. 실제 분석과 무관한 고정값
  - AC1: ✅ `incidents/route.ts` — `createPostMortem` 호출에서 하드코딩 actionItems/lessons 제거, 빈 배열 기본값
  - AC2: ✅ `incidents/route.ts` — POST body에서 `actionItems` (priority 타입 안전 포함), `lessons` 수신하여 전달
  - AC3: ✅ Build PASS

### Phase OPS-B: Operations 추가 하드코딩 제거 (T188~T190)

- [x] **T188: Incidents — DEMO_DETECTION_RULES 폴백 제거** ✅ 2026-02-22
  - 배경: DB에 감지 규칙이 없을 때 `DEMO_DETECTION_RULES`(가짜 데모 규칙)를 반환해 실제 규칙처럼 보임
  - AC1: ✅ `incidents/route.ts` — `loadDetectionRules()` 폴백을 빈 배열로 교체
  - AC2: ✅ `DEMO_DETECTION_RULES` import 제거
  - AC3: ✅ Build PASS

- [x] **T189: Cost — LLM 가격 하드코딩 → SystemConfig DB 기반** ✅ 2026-02-22
  - 배경: `PRICING = { inputPerMillion: 3.0, outputPerMillion: 15.0 }` 하드코딩 → 가격 변경 시 코드 수정 필요
  - AC1: ✅ `cost/route.ts` — `loadPricing()` 함수 추가 (SystemConfig `COST.llm_pricing` 조회, 없으면 현행 가격 기본값)
  - AC2: ✅ `createPrismaCostDataProvider()` → async 전환, pricing 로드 후 cost 함수에 전달
  - AC3: ✅ `computeInputCost/computeCacheCost/computeOutputCost` pricing 인자 추가
  - AC4: ✅ Build PASS

- [x] **T190: KPIs — 가짜 UX 기본값(12, 25) → 0** ✅ 2026-02-22
  - 배경: `getAvgSessionDurationMinutes()=12`, `getAvgFeedScrollCount()=25` — 실측값처럼 보이는 가짜 수치
  - AC1: ✅ `kpis/route.ts` — 두 함수 모두 0 반환으로 변경 (추적 인프라 미구축 명시)
  - AC2: ✅ Build PASS

### Phase RA: Rapport-Aware Engagement System (T191~T194)

> 관계 tension + L2 기질 패턴 → "참여 여부" 먼저 결정, 이후 "어떻게 말할지" 결정.
> 핵심 인사이트: 침묵도 행동이다 (Avoidant + 고갈등 → 댓글 없음이 자연스러운 반응).
> 원칙: 기존 11종 tone 시스템 최소 변경, 앞단 참여 결정 + 뒤단 voice 보정만 추가.

- [x] **T191: L2 Behavioral Pattern Classifier** ✅ 2026-02-23
  - 배경: OCEAN 5D → 5가지 갈등 행동 패턴 분류. 패턴별로 tension 고조 시 다른 행동 발현
  - AC1: ✅ `interactions/l2-pattern.ts` — `L2ConflictPattern` (Avoidant/Aggressive/Dominant/Anxious/Stable) + `classifyL2Pattern(temperament)` 순수 함수
  - AC2: ✅ 분류 기준 — Dominant(agr≤0.4 AND ext≥0.6) > Aggressive(agr≤0.4 AND neu≥0.6) > Anxious(neu≥0.6 AND ext≤0.4) > Avoidant(agr≥0.6 AND ext≤0.4) > Stable
  - AC3: ✅ `L2PatternResult` — { pattern, confidence: 0~1, reason }
  - AC4: ✅ 단위 테스트 (rapport-engagement.test.ts, 경계값 포함) + Build PASS

- [x] **T192: Engagement Decision Layer** ✅ 2026-02-23
  - 배경: "댓글을 쓸지 말지" 결정하는 레이어. 기질 + tension → skip/react_only/comment 확률적 결정
  - AC1: ✅ `interactions/engagement-decision.ts` — `EngagementAction` (skip/react_only/comment), `EngagementDecision` 타입
  - AC2: ✅ tension 구간 × 5 기질 확률 테이블 (3×5=15 행) — low(<0.5)/mid(0.5~0.7)/high(>0.7) × Avoidant/Aggressive/Dominant/Anxious/Stable
  - AC3: ✅ Avoidant+high: skip 70%, react_only 20%, comment 10% / Aggressive+high: comment 90%, react_only 5%, skip 5%
  - AC4: ✅ `decideEngagement(pattern, tension, rand?)` — rand 파라미터로 결정론적 테스트 가능
  - AC5: ✅ 단위 테스트 (rapport-engagement.test.ts, 48개) + Build PASS

- [x] **T193: Voice Adjustment Layer** ✅ 2026-02-23
  - 배경: comment 선택 시 기존 allowedTones + VoiceStyleParams 보정. tension < 0.5 → null (조정 없음)
  - AC1: ✅ `interactions/voice-adjustment.ts` — `VoiceAdjustment` 타입 { toneFilter, styleOverride, lengthMultiplier, suppressEmotionWords }
  - AC2: ✅ `computeVoiceAdjustment(pattern, tension)` — 기질별 스타일 조정 (Avoidant: 길이 0.2배+격식체, Aggressive: assertiveness↑, Dominant: 길이 1.5배, Anxious: 길이 0.3배+감정억제)
  - AC3: ✅ `mergeAllowedTones(existing, adjustment)` — 기존 프로토콜 allowedTones와 toneFilter 교집합
  - AC4: ✅ 단위 테스트 (rapport-engagement.test.ts) + Build PASS

- [x] **T194: interaction-pipeline 통합 + PW Admin UI 연동** ✅ 2026-02-23
  - 배경: T191~T193 모듈을 실제 파이프라인에 연결. engagement decision 로깅 + 관리자 UI 표시
  - AC1: ✅ `interaction-pipeline.ts` — 루프 전 벡터 캐싱 + L2Pattern 분류. 댓글 결정부에 `decideEngagement()` 적용 (기존 `Math.random() < 0.3` 대체)
  - AC2: ✅ skip/react_only → `COMMENT_SUPPRESSED` 활동 로그 저장 (engagementDecision 메타데이터 포함)
  - AC3: ✅ comment → `computeVoiceAdjustment()` + `mergeAllowedTones()` 적용 후 `generateComment()` 호출
  - AC4: ✅ `interactions/index.ts` barrel export 업데이트
  - AC5: ✅ PW Admin Activity 대시보드 — engagement 결정 통계 카드 추가 (comment/react_only/skip 비율 지난 24h)
  - AC6: ✅ 48 tests PASS + Build PASS + `PersonaActivityType.COMMENT_SUPPRESSED` schema 추가 (migration 029)

### Phase NB: News-Based Persona Reaction System (T195~T198)

> 뉴스를 씨앗으로 심으면, 페르소나들이 성향에 따라 자연스럽게 반응하는 SNS 구조.
> Arena/논쟁 없음. 관심 있는 페르소나가 피드에 반응 포스트 → 다른 페르소나들이
> Phase RA 기반으로 알아서 댓글/침묵/좋아요 결정. 기존 파이프라인 최소 변경.

- [x] **T195: 뉴스 수집 인프라 (DB 모델 + RSS 페처 + Claude 분석)** ✅ 2026-02-23
  - 배경: 외부 RSS 피드 → NewsArticle 저장 + Claude로 요약/태그 추출
  - AC1: ✅ Prisma — `NewsSource`, `NewsArticle` 모델 + `PersonaPostType.NEWS_REACTION` enum + `PersonaPost.newsArticleId` FK
  - AC2: ✅ `lib/persona-world/news/news-fetcher.ts` — `fetchArticlesFromRss(rssUrl)` + `analyzeArticleWithClaude(title, content)`
  - AC3: ✅ Claude 분석 결과: `{ summary: string, topicTags: string[] }` (요약 300자 이내, LLM 없으면 fallback)
  - AC4: ✅ `content-generator.ts` — `NEWS_REACTION` 타입 길이/스타일 가이드 추가
  - AC5: ✅ 마이그레이션 030 + Build PASS

- [x] **T196: 뉴스-페르소나 관심도 매칭 엔진** ✅ 2026-02-23
  - 배경: 주어진 뉴스에 "누가 반응할 것인가" 결정. 입장(찬/반) 아닌 순수 관심도 점수
  - AC1: ✅ `lib/persona-world/news/news-interest-matcher.ts` — `computeNewsInterestScore(article, persona)` → 0~1
  - AC2: ✅ 점수 계산: tagOverlap(40%) + L2 openness(30%) + L2 extraversion(30%)
  - AC3: ✅ `selectPersonasForArticle(article, personas, topN)` — threshold(0.25) 초과 + 상위 N명 반환
  - AC4: ✅ 단위 테스트 15개 PASS (news-interest-matcher.test.ts) + Build PASS

- [x] **T197: 뉴스 반응 포스트 자동 생성 파이프라인** ✅ 2026-02-23
  - 배경: 관심 있는 페르소나들이 TRENDING 트리거로 NEWS_REACTION 포스트 자동 생성
  - AC1: ✅ `lib/persona-world/news/news-reaction-trigger.ts` — `triggerNewsReactionPosts()` + `formatNewsArticleTopic()`
  - AC2: ✅ `triggerData.topicId` = newsArticleId (기존 TRENDING 트리거 인터페이스 재사용)
  - AC3: ✅ `createNewsPostPipelineProvider(topic)` — selectTopic()이 뉴스 요약 반환
  - AC4: ✅ 스케줄러 API `trigger_news_article` 액션 추가 + `createNewsReactionDataProvider()` 헬퍼
  - AC5: ✅ Build PASS

- [x] **T198: Admin UI — 뉴스 소스 관리 + 반응 현황 대시보드** ✅ 2026-02-23
  - 배경: 관리자가 RSS 소스 추가/수집 트리거 + 반응 현황 확인
  - AC1: ✅ `app/api/internal/persona-world-admin/news/route.ts` — GET/POST(add_source/fetch_source/fetch_all)/PUT
  - AC2: ✅ `app/(dashboard)/persona-world-admin/news/page.tsx` — 소스 관리 + 기사 목록 + 반응 트리거 버튼
  - AC3: ✅ LNB + header에 "뉴스 반응" 메뉴 추가
  - AC4: ✅ Build PASS (109 static pages)

---

## 🔄 IN_PROGRESS (진행중)

(없음)

---

## ✅ DONE (최근 완료)

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

---

## ✅ DONE (완료)

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

---

## 🚫 BLOCKED (막힘)

(없음)

---

## 📝 작업 규칙

1. **시작**: QUEUE 최상단 → IN_PROGRESS로 이동
2. **진행**: AC 기준으로 구현 → 테스트 실행
3. **완료**: PASS → DONE으로 이동 (변경파일, 테스트결과 기록)
4. **막힘**: FAIL/불명확 → BLOCKED로 이동 (원인, 필요사항 기록)
