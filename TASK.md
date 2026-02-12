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

### Phase B: 엔진 핵심 기능 (T51~T61)

> 벡터 에디터, 생성 파이프라인, 검증, 매칭 연구소, 노드 에디터.

- [ ] **T51: 3-Layer 벡터 에디터 UI**
  - 배경: 스펙 §3.2 + 구현계획서 Phase 7. 벡터 시각적 편집의 핵심
  - AC1: L1(7D) 슬라이더 에디터 (축별 컬러, 0.00~1.00, 실시간 미리보기)
  - AC2: L2(5D) OCEAN 슬라이더 에디터
  - AC3: L3(4D) Narrative Drive 에디터 (활성화 체크박스 포함)
  - AC4: Paradox Score 시각화 (EPS + L1↔L2/L1↔L3/L2↔L3 분해)
  - AC5: V_Final 실시간 시뮬레이터 (교차축 프로필 포함)
  - AC6: 아키타입 12종 카드 선택 UI (벡터 자동 적용)
  - AC7: 테스트 + 커밋 + 푸시

- [ ] **T52: 생성 파이프라인 v3 — 아키타입 + 벡터 생성 + 캐릭터**
  - 배경: 구현계획서 Phase 2. 페르소나 자동 생성의 핵심 엔진
  - AC1: 아키타입 12종 템플릿 (벡터 프리셋, 캐릭터 시드, Paradox 범위)
  - AC2: 3-Layer 벡터 생성기 (다양성 분석, 빈 영역 우선, L1+L2+L3 동시 생성)
  - AC3: Paradox 디자이너 (역설 패턴 매핑, 긴장도 조절)
  - AC4: 캐릭터 생성기 (이름, 배경, 말버릇, 습관, 관계 설정)
  - AC5: 활동성/콘텐츠 설정 추론 (벡터→활동 패턴 매핑)
  - AC6: 6-Category 일관성 검증기 (구조/L1↔L2/L2↔L3/정성↔정량/교차축/동적)
  - AC7: 테스트 + 커밋 + 푸시

- [ ] **T72: 정성적 차원 생성기 — Backstory + Voice + Pressure + Zeitgeist**
  - 배경: 구현계획서 Phase 3. 벡터 너머의 정성적 페르소나 깊이
  - AC1: Backstory 생성기 (배경 서사, 경험, 동기)
  - AC2: Voice Profile 생성기 (말투, 어휘 수준, 커뮤니케이션 스타일)
  - AC3: Pressure Context 생성기 (스트레스 반응, 압박 상황 행동 패턴)
  - AC4: Zeitgeist Profile 생성기 (시대적 감수성, 트렌드 반응)
  - AC5: 정성적 차원 에디터 UI (텍스트 에디터 + LLM 제안)
  - AC6: 테스트 + 커밋 + 푸시

- [ ] **T73: 하이브리드 연결 메커니즘 — Init/Override/Adapt/Express**
  - 배경: 구현계획서 Phase 4. 정성↔정량 4대 알고리즘
  - AC1: Init 알고리즘 (LLM 키워드 추출 → 의미 카테고리 → 벡터 delta)
  - AC2: Override 알고리즘 (2단계 트리거 감지, override/additive delta, 지수 감쇠 복귀)
  - AC3: Adapt 알고리즘 (UIV 3축 분석, 차원별 α 튜닝, 모멘텀, ±0.3 클램프)
  - AC4: Express 알고리즘 (파생 상태값 5종, sigmoid 공식, quirk 스키마, cooldown)
  - AC5: attitude→delta 매핑 상수 + 통합 InteractionEngine
  - AC6: 단위 테스트 + 커밋 + 푸시

- [ ] **T53: 프롬프트 엔지니어링 — 버전 관리 + 테스트 + 빌더**
  - 배경: 스펙 §3.3. 프롬프트 작성, 버전 관리, 테스트
  - AC1: 프롬프트 에디터 UI (basePrompt, reviewPrompt, postPrompt 등)
  - AC2: 프롬프트 버전 관리 (생성/비교/롤백)
  - AC3: 프롬프트 테스트 (단일 콘텐츠 테스트, LLM 응답 미리보기)
  - AC4: 프롬프트 빌더 v3 (RAG 컨텍스트 구조, 프리셋 기반)
  - AC5: 테스트 + 커밋 + 푸시

- [ ] **T54: 페르소나 검증 + 품질 측정**
  - 배경: 스펙 §3.4 + 구현계획서 Phase 2/9. 품질 게이트
  - AC1: Auto-Interview 프로토콜 (20문항, L1 7+L2 5+L3 4+역설 4)
  - AC2: Persona Integrity Score (CR 0.35 + SC 0.35 + CS 0.30)
  - AC3: Quality Score 대시보드 (Pass/Warning/Fail 상태, 차원별 점수)
  - AC4: 수동 검증 워크플로우 (리뷰어 지정, 승인/반려)
  - AC5: 테스트 + 커밋 + 푸시

- [ ] **T55: 페르소나 테스트 + A/B 테스트 + 성과 모니터링**
  - 배경: 스펙 §3.5 + §3.7. 실제 콘텐츠 테스트 및 성과 추적
  - AC1: 단일 콘텐츠 테스트 (입력 콘텐츠 → 페르소나 응답 미리보기)
  - AC2: 대량 콘텐츠 테스트 (배치 실행, 결과 비교)
  - AC3: A/B 테스트 (페르소나 버전 비교, 결과 통계)
  - AC4: 페르소나 시뮬레이터 (가상 대화, 성격 일관성 확인)
  - AC5: 성과 모니터링 대시보드 (핵심 지표, 알림 설정, 개선 제안)
  - AC6: 테스트 + 커밋 + 푸시

- [ ] **T56: 유저 인사이트 엔진**
  - 배경: 스펙 §4. 유저 프로파일링 + 아키타입 관리
  - AC1: 콜드 스타트 전략 관리 UI (질문 세트 CRUD, 모드별 관리)
  - AC2: 심층 성향 분석 모델 (심리학 모델, 반전 매칭 탐지)
  - AC3: 점진적 프로파일링 (행동 데이터 수집, 피드백 루프 UI)
  - AC4: 유저 아키타입 분류 + 관리 UI (정의, 분류 로직, 관리)
  - AC5: 적응형 프로파일링 엔진 (질문 선택/생성, 데일리 체크, 불성실 방지)
  - AC6: 테스트 + 커밋 + 푸시

- [ ] **T57: 매칭 연구소 — 시뮬레이터 + 알고리즘 튜닝**
  - 배경: 스펙 §5.1~§5.3. 3-Tier 매칭 핵심
  - AC1: 3-Tier 매칭 엔진 구현 (Basic/Advanced/Exploration)
  - AC2: 매칭 시뮬레이터 UI (가상 유저 생성, 시뮬레이션 실행, 결과 시각화)
  - AC3: 알고리즘 튜닝 UI (하이퍼파라미터, 가중치 조정)
  - AC4: A/B 테스트 실행 + 안전 장치 (Guardrails)
  - AC5: 시나리오 저장/공유
  - AC6: 테스트 + 커밋 + 푸시

- [ ] **T58: 매칭 연구소 — 성과 분석 + 매칭 설명 + 콘텐츠 평가**
  - 배경: 스펙 §5.4~§5.6. 매칭 결과 분석 및 설명
  - AC1: 매칭 성과 분석 대시보드 (KPI, 실시간 대시보드, 세그먼트 분석, 이상 탐지)
  - AC2: 매칭 설명 시스템 (운영자용 분석 + 사용자용 자연어 설명)
  - AC3: 콘텐츠 평가 시스템 (리뷰 스타일 12종, 페르소나→스타일 매핑, 2단계 생성)
  - AC4: 리포트 생성 (PDF/CSV 내보내기)
  - AC5: 테스트 + 커밋 + 푸시

- [ ] **T59: 노드 에디터 — 기반 인프라 (DAG 엔진)**
  - 배경: 구현계획서 Phase 8 전반. ComfyUI 스타일 DAG 에디터의 기반
  - AC1: 포트 타입 시스템 (21개 타입, 호환성 매트릭스)
  - AC2: 노드 레지스트리 (카테고리 7종, 25노드 등록)
  - AC3: 위상 정렬 (Kahn's) + 순환 탐지 (DFS)
  - AC4: DAG 평가 엔진 (노드 실행 순서, 활성 엣지 추적)
  - AC5: 그래프 검증기 (연결 유효성, 분기 규칙 4종)
  - AC6: 직렬화/역직렬화 + v2→v3 마이그레이션
  - AC7: 단위 테스트 + 커밋 + 푸시

- [ ] **T60: 노드 에디터 — 캔버스 + 25노드 UI + 설정 패널**
  - 배경: 구현계획서 Phase 8 후반 + 스펙 §3.10. @xyflow/react 기반
  - AC1: Zustand 에디터 스토어 (노드/엣지 상태, 실행 상태, 선택)
  - AC2: 메인 캔버스 (DAG 레이아웃, 자동 배치, 줌/팬)
  - AC3: 노드 래퍼 v3 (포트 핸들, 상태 표시, 카테고리별 컬러)
  - AC4: 25노드 타입별 UI (Input 5 + Engine 4 + Generation 7 + Assembly 2 + Output 4 + Control Flow 3)
  - AC5: 노드 팔레트 (드래그&드롭, 카테고리별 필터)
  - AC6: 노드 설정 패널 (§3.10 스펙 — 설정 19종 + 자동 6종)
  - AC7: 에디터 툴바 (프리셋 4종, 실행, 검증) + 상태 바
  - AC8: 테스트 + 커밋 + 푸시

- [ ] **T61: 노드 에디터 — 실행 엔진 + 제어 흐름**
  - 배경: 구현계획서 Phase 8 실행부 + §14.8~§14.9
  - AC1: 22노드 execute() 디스패처 + 실행 함수
  - AC2: LLM 호출 어댑터 (프롬프트 템플릿, 모델 라우팅)
  - AC3: Control Flow 3종 (Conditional/Switch/Merge)
  - AC4: 분기 실행 엔진 (활성 엣지 추적, ExecutionPath, 비활성 경로 스킵)
  - AC5: 플로우 프리셋 4종 (기본/고급/탐색/커스텀)
  - AC6: 단위 테스트 + 커밋 + 푸시

### Phase C: 이후 확장 (T62~T71)

> 인큐베이터, 컬러지문, 시스템 운영, 대시보드, RAG 연동.

- [ ] **T62: 페르소나 인큐베이터 — Daily Batch + 자가발전**
  - 배경: 스펙 §3.6. 페르소나 지속 품질 개선 시스템
  - AC1: Daily Batch 워크플로우 (스케줄링, 배치 실행, 결과 저장)
  - AC2: 자가발전 시스템 (인터랙션 로그 기반 벡터 미세 조정)
  - AC3: 콜드 스타트 운영 정책 (신규 페르소나 초기 학습)
  - AC4: 비용 통제 정책 (LLM 호출 예산, 일일 상한)
  - AC5: Golden Sample 관리 + 확장 전략
  - AC6: 재검증 시스템 + 진화 전략
  - AC7: 인큐베이터 대시보드 + 모니터링
  - AC8: 테스트 + 커밋 + 푸시

- [ ] **T63: 컬러지문 데이터 엔진 — CIELAB+OKLCH 인코딩**
  - 배경: 구현계획서 Phase 6. 페르소나 고유 시각 식별자
  - AC1: 색상 공간 변환 (CIELAB↔OKLCH↔sRGB)
  - AC2: 색상 인코더 (릿지별 할당, ΔE00 차이)
  - AC3: 릿지 생성기 (패턴/코어/델타/곡률)
  - AC4: 유일성 엔진 (결정적 PRNG)
  - AC5: 충돌 검사기 (pHash/SSIM/커브/히스토그램)
  - AC6: 정규 SVG 렌더러
  - AC7: 단위 테스트 + 커밋 + 푸시

- [ ] **T64: 컬러지문 UI — TraitColor/PingerPrint v3**
  - 배경: 구현계획서 Phase 7. 멀티레이어 시각화
  - AC1: TraitColorFingerprint v3 (멀티레이어 레이더 차트)
  - AC2: PingerPrint2D v3 (멀티레이어 패턴)
  - AC3: PingerPrint3D v3 (멀티레이어 3D Jacks)
  - AC4: 지문 호환성 래퍼 (v2→v3 전환)
  - AC5: 테스트 + 커밋 + 푸시

- [ ] **T65: 소비자 여정 시뮬레이터**
  - 배경: 스펙 §5.7. B2B 고객 체험용 미리보기
  - AC1: 시뮬레이터 UI (유저 프로필 입력, 매칭 결과 미리보기)
  - AC2: 시뮬레이션 모드 (기본/상세/비교)
  - AC3: 데이터 소스 연동 (실제 페르소나 + 가상 유저)
  - AC4: API 연동 가이드 (B2B 고객용)
  - AC5: 테스트 + 커밋 + 푸시

- [ ] **T66: 시스템 연동 관리**
  - 배경: 스펙 §6. 배포/버전/이벤트 버스
  - AC1: API 배포 파이프라인 (환경 구성, 워크플로우, Canary Release)
  - AC2: 알고리즘 버전 관리 (버전 정책, 저장소, Diff, 롤백)
  - AC3: 이벤트 버스 (이벤트 유형/스키마, 모니터링, 동기화 지연)
  - AC4: 개발자 콘솔 연동 (API 문서 자동 생성, Changelog, 사용량 동기화)
  - AC5: 통합 테스트 자동화 (파이프라인, 시나리오, 리포트)
  - AC6: 테스트 + 커밋 + 푸시

- [ ] **T67: 운영 관리**
  - 배경: 스펙 §7. 시스템 모니터링 + 장애 대응 + 백업
  - AC1: 시스템 모니터링 대시보드 (실시간, 레이아웃, 알림, 로그 검색)
  - AC2: 장애 대응 (등급 정의, 탐지, 워크플로우, 대시보드, Post-mortem)
  - AC3: 롤백/복구 (유형, 실행, 영향 분석, 데이터 복구)
  - AC4: 백업/재해복구 (정책, 대상, 모니터링, DR 계획, 훈련)
  - AC5: 용량 계획 (리소스 모니터링, 예측, 비용 최적화)
  - AC6: 테스트 + 커밋 + 푸시

- [ ] **T68: 전역 설정 — 모델/비용 + 안전 필터 + API**
  - 배경: 스펙 §8. 엔진 전역 설정
  - AC1: 모델 선택 + 비용 관리 (LLM 모델 선택, 라우팅 규칙, 비용 대시보드)
  - AC2: 안전 필터 (필터 강도 설정, 커스텀 금기어, 필터 로그)
  - AC3: API 엔드포인트 관리 (내부/외부 API, Rate Limiting, 버전 관리)
  - AC4: 테스트 + 커밋 + 푸시

- [ ] **T69: 팀 & 접근 관리**
  - 배경: 스펙 §2.4 + §9.1. 사용자/역할/감사
  - AC1: 사용자 관리 (목록, 초대, 비활성화)
  - AC2: 역할 권한 (Admin/AI Engineer/Content Manager/Analyst 4종, 권한 매트릭스)
  - AC3: 감사 로그 (전체 작업 기록, 필터링, 내보내기)
  - AC4: 테스트 + 커밋 + 푸시

- [ ] **T70: 대시보드**
  - 배경: 스펙 §2.4. 시스템 전체 요약 화면
  - AC1: 시스템 헬스 개요 (API 상태, 응답 시간, 에러율)
  - AC2: 매칭 성과 요약 (Tier별 분포, 평균 매칭률, 트렌드)
  - AC3: 최근 활동 로그 (페르소나 생성/수정, 매칭 실행, 시스템 이벤트)
  - AC4: 퀵 액션 (페르소나 생성, 시뮬레이션, 인큐베이터 실행)
  - AC5: 테스트 + 커밋 + 푸시

- [ ] **T71: PersonaWorld RAG + LLM 전략 + 품질 피드백 루프**
  - 배경: 구현계획서 Phase 9. RAG/LLM/품질 통합
  - AC1: RAG 시스템 (Voice anchor, relation memory, interest continuity, context builder)
  - AC2: LLM 전략 (2-Tier 모델 설정, 동적 라우터, 프로바이더 어댑터, Prompt Caching)
  - AC3: 품질 피드백 (Paradox 표현 점수, Voice 일관성, Pressure 반응 테스트)
  - AC4: Few-shot 수집기 + 품질 대시보드 API
  - AC5: RAG→프롬프트 빌더 통합, Tier 라우터→생성 파이프라인 통합
  - AC6: 테스트 + 커밋 + 푸시

### Phase PW-A: PersonaWorld 준비 — 디자인 시스템 (T74)

> 엔진 완료 전 선행 가능한 순수 UI 작업. 목업 데이터 금지, shared-types import 기반.
> 랜딩페이지는 통합 랜딩 하나로 사용 (별도 PW 랜딩 없음).

- [ ] **T74: PW 디자인 시스템 완성 — shared-types + 신규 컴포넌트 + 6D 잔재 삭제**
  - 배경: PW v3 재구축 전제조건. 타입은 shared-types에서 import, 로컬 재정의 금지
  - AC1: shared-types v3 타입 import 설정 (PersonaV3, LayerVector, PostType 등 — 로컬 types.ts에서 re-export만)
  - AC2: `lib/trait-colors.ts` 3-Layer 16D 색상 매핑 (engine-studio 상수 참조, 동기화)
  - AC3: 디자인 시스템 신규 4종 — PWProfileRing, PWLikeButton, PWBadge, PWSpinner (UI 스펙 §4 준수, props 타이핑)
  - AC4: 기존 6D 시각화 3파일 삭제 (trait-color-bar, trait-color-fingerprint, p-inger-print-2d)
  - AC5: Build PASS + 테스트 + 커밋 + 푸시

### Phase PW-B: PersonaWorld 페이지 구축 (T75~T79)

> **선행조건: 엔진 Phase A 완료 (T45~T50)** — v3 API가 실제 데이터를 제공한 후 시작.
> 모든 페이지는 실제 API 연동. 목업 데이터/하드코딩 절대 금지.

- [ ] **T75: PW 온보딩 v3 — 3-Phase 질문 + 매칭 프리뷰**
  - 배경: 설계서 §9. 실제 질문 API + 프로파일링 API 연동
  - AC1: Phase 구조 UI (3-Phase × 8문항, 진행 바, Phase 간 전환)
  - AC2: 시나리오 질문 카드 (4지선다, 선택 피드백, 게이미피케이션)
  - AC3: Phase 간 매칭 프리뷰 (실제 매칭 API 호출, 페르소나 카드 + 유사도 %)
  - AC4: 이탈 정책 UX (Phase 단위 저장, 미완료 Phase 리셋 경고)
  - AC5: 프로필 등급 뱃지 (STARTER/STANDARD/ADVANCED/EXPERT)
  - AC6: Build PASS + 테스트 + 커밋 + 푸시

- [ ] **T76: PW 피드 v3 — 3-Tab + 17종 포스트 카드**
  - 배경: 메인 화면. 실제 피드 API 연동
  - AC1: 3-Tab 구조 (For You / Following / Explore)
  - AC2: 17종 PostTypeCard (REVIEW, DEBATE, VS_BATTLE, COLLAB, BEHIND_STORY 등 타입별 분화 UI)
  - AC3: 포스트 상호작용 바 (PWLikeButton, 댓글 수, 북마크, 공유)
  - AC4: 피드 소스 라벨 (Following/추천/트렌딩 시각 구분)
  - AC5: 무한 스크롤 + 로딩 스켈레톤
  - AC6: Build PASS + 테스트 + 커밋 + 푸시

- [ ] **T77: PW Explore v3 — 클러스터 + 핫 토픽 + 토론**
  - 배경: 탐색 페이지. 실제 Explore API 연동
  - AC1: Top 페르소나 클러스터 (역할/아키타입별 그룹 카드)
  - AC2: 핫 토픽 섹션 (태그 기반, 참여 페르소나 수)
  - AC3: 활성 토론 섹션 (대립 페르소나 페어 하이라이트)
  - AC4: 신규 페르소나 하이라이트 (최근 생성, Auto-Interview 점수)
  - AC5: 검색 + 아키타입/역할 필터
  - AC6: Build PASS + 테스트 + 커밋 + 푸시

- [ ] **T78: PW 페르소나 프로필 v3 — 3-Layer 시각화 + 상태**
  - 배경: 페르소나 상세 페이지. 실제 페르소나 API 연동
  - AC1: 3-Layer 멀티레이어 레이더 차트 (L1/L2/L3 오버레이, 레이어별 토글)
  - AC2: PersonaState 표시 (mood/energy/socialBattery/paradoxTension 게이지)
  - AC3: Paradox Score 시각화 + 교차축 하이라이트 Top 3
  - AC4: 관계 미니맵 (팔로워/팔로잉, 관계 강도)
  - AC5: 최근 포스트 타임라인 (17종 타입별 아이콘/레이아웃)
  - AC6: Build PASS + 테스트 + 커밋 + 푸시

- [ ] **T79: PW 유저 프로필 v3 + 댓글 + 알림**
  - 배경: 유저 경험 완성. 실제 유저 API 연동
  - AC1: 프로필 등급 + L1/L2 취향 벡터 시각화
  - AC2: 데일리 마이크로 질문 UI (1문/로그인, 코인 보상, 스트릭)
  - AC3: SNS 연동 UI (8개 플랫폼 카드, 동의 관리, 분석 진행)
  - AC4: 댓글 UI + 톤 뱃지 (empathetic/analytical/counter_argument 등 8종)
  - AC5: 알림 (페르소나 활동, 매칭 추천, 읽음 처리)
  - AC6: Build PASS + 테스트 + 커밋 + 푸시

### 보류: PW 백엔드 통합 (엔진 스튜디오 충돌 가능)

> **엔진 스튜디오 작업 완료 후 상황 봐서 진행. Prisma 스키마 + API 라우트 변경 포함.**

- 보류-1: Prisma 스키마 추가 (PersonaState, PersonaRelationship, ConsumptionLog 등)
- 보류-2: API 라우트 재작성 (`/api/persona-world/*` 전체)
- 보류-3: `user-store.ts` + `api.ts` 실제 API 연동 전환
- 보류-4: 피드 알고리즘 3-Tier 매칭 엔진 연동
- 보류-5: 자율 활동 엔진 (스케줄러, 콘텐츠 생성, RAG)
- 보류-6: 품질 모니터링 (Auto-Interview, Integrity Score, Voice drift)

---

### 별도 작업 (설계 문서 + 데이터)

- [ ] **T42: 매칭 설명 + 유저↔페르소나 일치도 시스템** (설계 문서)
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

- [ ] **T43: 개발자 콘솔 유저 프로필 API v3 + 동의 관리** (설계 문서)
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

---

## 🔄 IN_PROGRESS (진행중)

- [ ] **T50: 페르소나 수정/복제/보관 + 라이프사이클**
  - 배경: 스펙 §3.1.3~3.1.5 + §3.8
  - AC1: 페르소나 수정 (PUT API + 편집 UI + 벡터 버전 관리)
  - AC2: 페르소나 복제 (DRAFT로 생성)
  - AC3: 페르소나 보관/복원 (Archive/Restore)
  - AC4: 라이프사이클 상태 전이 8종 (Draft→Review→Active→Standard→Legacy→Deprecated→Paused→Archived)
  - AC5: 테스트 + 커밋 + 푸시

---

## ✅ DONE (완료)

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
