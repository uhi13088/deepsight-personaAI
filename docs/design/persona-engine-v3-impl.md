# DeepSight Persona Engine v3.0 — 구현 계획서

## 3-Layer Orthogonal Multi-Vector Architecture Implementation Plan

> **문서 정보**
>
> - 작성일: 2026-02-10
> - 버전: v1.13
> - 상태: 확정 — 구현 대기
> - 관련 문서: `docs/design/persona-engine-v3.md` (설계서)
> - 목적: 설계서의 "무엇을"에 대응하는 "어떻게" — 이 문서만 보고 구현 가능

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| v1.0 | 2026-02-10 | 초판 작성 — 전체 아키텍처 결정사항, 데이터 모델, 타입 시스템, 구현 태스크 |
| v1.1 | 2026-02-10 | Section 12 전면 개편 — 106D+ 다층 상수/색상 체계. 교차축 83개+ 관계축, 엔진 메타, 아키타입 색상 추가. Phase 0 태스크 0-7~0-20으로 확장. 파일 구조 단일→모듈(v3/, colors/) |
| v1.2 | 2026-02-10 | Section 12 신설 — 컬러지문(P-inger Print) 시스템. 3종 컴포넌트 v3 설계 |
| v1.3 | 2026-02-10 | Section 12 전면 확장 — "미래 스캐너 디코딩 가능 지문" 스키마 v1 확정. Pantone 완전 제거, CIELAB(D50)+OKLCH 이중 색공간. 6대 고정 규칙, 패턴↔벡터 매핑, 고유성 엔진, 색상 인코딩, canonical/display 이중 렌더. Phase 6(지문 데이터 엔진) 신설, 기존 UI→Phase 7. `docs/schemas/fingerprint-v1.json` 추가 |
| v1.4 | 2026-02-10 | Section 13 신설 — 노드 에디터 아키텍처 (ComfyUI 스타일). 현재 선형 파이프라인→DAG 기반 자유 그래프. 5개 노드 카테고리(20+종), 21종 포트 타입 시스템, Kahn's 위상 정렬, 순환 감지, Zustand 그래프 스토어, 4종 플로우 프리셋(Quick/L1 Custom/Full Custom/Archetype+Override), 최소 필수 노드 규칙, v2→v3 마이그레이션. Phase 8(노드 에디터 재구축, 22태스크) 신설. 파일 변경 맵 확장. 섹션 번호 정리(상수→14, Phase→15, 파일맵→16) |
| v1.5 | 2026-02-10 | 품질 아키텍처 3대 핵심 추가 — Section 15(PersonaWorld RAG 구현: 컨텍스트 빌더, Voice 앵커, 관계 기억, 캐싱), Section 16(품질 피드백 루프 구현: 4대 측정 엔진, Few-shot 자동 수집, 대시보드), Section 17(LLM 모델 전략 구현: 3-Tier 라우터, Prompt Caching, Provider Adapter). Phase 9(RAG+피드백+모델 전략, 18태스크) 신설. 파일 변경 맵 확장. 섹션 재번호(Phase→18, 파일맵→19) |
| v1.6 | 2026-02-10 | 교차축 계산 엔진 + Paradox Score 확장 (T27) — Section 6 전면 개편: 83축 교차축 스코어 계산 엔진(CrossAxisProfile, 관계유형별 공식 4종), L1↔L3/L2↔L3 역설 지표, Extended Paradox Score(3-Layer 가중 합산). Section 5 확장: VFinalResult에 crossAxisProfile+paradoxProfile 추가. Phase 1 태스크 1-4~1-9로 확장(교차축 엔진, 역방향 매핑 테이블). 파일 변경 맵: cross-axis.ts, cross-axis-inversions.ts 추가 |
| v1.7 | 2026-02-10 | 매칭 알고리즘 다층 확장 (T28) — Section 10 전면 개편: 7D 코사인 유사도→3-Tier 매칭(Basic/Advanced/Exploration). Tier별 차원 조합(V_Final 7D + 교차축 83축 + Paradox 호환 + 비정량적 보정). 피드 믹싱 전략(60/30/10), 통합 매칭 엔진, MatchingResult 타입. Phase 5 태스크 5-1~5-7로 확장. 파일 변경 맵: 매칭 모듈 6개 파일 추가 |
| v1.8 | 2026-02-10 | 비정량↔정량 연결 알고리즘 구체화 (T29) — Section 9 확장(9.3~9.6): ① Init(LLM 구조화 키워드 추출, 의미 카테고리→벡터 매핑 테이블, delta 적용 규칙), ② Override(2단계 트리거 감지, override/additive delta, 지수 감쇠 복귀 곡선 λ=0.7-0.6×volatility), ③ Adapt(UIV 3축 분석, 차원별 α, 모멘텀, ±0.3 드리프트 클램프), ④ Express(파생 상태값 5종, sigmoid 확률 공식, 쿨다운). Phase 4 태스크 4-1~4-9로 확장. 파일 변경 맵: 상호작용 모듈 9개 항목 추가 |
| v1.9 | 2026-02-10 | 일관성 검증 완성 (T30) — Section 11 전면 개편: 6-Category 검증 엔진(A구조/BL1↔L2/CL2↔L3/D정성↔정량/E교차축/F동적), ValidationIssue/ValidationResult 타입, 카테고리별 구현 코드(C: L2↔L3 정합성 4종, D: 정성↔정량 3종 LLM 기반, E: 교차축 3종), 종합 일관성 점수 공식. Phase 2 태스크 2-7 확장(6-Category) |
| v1.10 | 2026-02-11 | 품질 측정 강화 (T31) — Section 3.4 InteractionLog/InteractionSession Prisma 모델 신설(턴 로그+세션 집계+네트워크 분석 예약 필드). Section 16 확장: §16.7 Auto-Interview 구현(질문 생성기+벡터 추론+차원별 비교), §16.8 Persona Integrity Score 구현(ContextRecall+SettingConsistency+CharacterStability), §16.9 인터랙션 로그 수집기(세션 관리+턴 로깅+메트릭 집계). Phase 9 태스크 9-23~9-32로 확장(Auto-Interview, Integrity Score, Logger, Prisma 마이그레이션). 파일 변경 맵: 품질 모듈 3개 파일 추가(auto-interview.ts, integrity-score.ts, interaction-logger.ts) |
| v1.11 | 2026-02-11 | Phase 태스크 재배치 — InteractionLog 스키마→Phase 0(0-21~0-22, 기반 인프라), Auto-Interview→Phase 2(2-11~2-13, 생성 직후 품질 게이트), Integrity Score+Logger는 Phase 9 유지(9-23~9-29로 재번호). Phase 0 제목에 인터랙션 로그 스키마, Phase 2 제목에 Auto-Interview 품질 게이트 추가 |
| v1.12 | 2026-02-11 | 용어 통일 (T36) — 전체 문서 "106D+" 표기 통일 |
| v1.13 | 2026-02-11 | 노드 실행 로직 (T37) — Section 13.12 신설: 22개 노드 executeNode() 구현 상세. 디스패처, Input 5종, Engine 4종(Paradox/Pressure/VFinal/Projection), Generation 7종(LLM 호출 패턴), Assembly 2종, Output 4종. 평가 전략별 실행 분류(Eager 14개/Manual 8개). Phase 8 태스크 8-23~8-26 추가(executor, helpers, prompts, tests) |

---

## 목차

1. [확정된 아키텍처 결정사항](#1-확정된-아키텍처-결정사항)
2. [벡터 시스템 상세](#2-벡터-시스템-상세)
3. [데이터 모델 (Prisma Schema)](#3-데이터-모델-prisma-schema)
4. [타입 시스템 (TypeScript)](#4-타입-시스템-typescript)
5. [V_Final 계산 엔진](#5-v_final-계산-엔진)
6. [Paradox Score 계산](#6-paradox-score-계산)
7. [L2→L1 / L3→L1 투영 로직](#7-l2l1--l3l1-투영-로직)
8. [아키타입 템플릿 시스템](#8-아키타입-템플릿-시스템)
9. [생성 파이프라인](#9-생성-파이프라인)
10. [매칭 알고리즘](#10-매칭-알고리즘)
11. [일관성 검증](#11-일관성-검증)
12. [컬러지문 (P-inger Print) 시스템](#12-컬러지문-p-inger-print-시스템)
13. [노드 에디터 아키텍처 (ComfyUI 스타일)](#13-노드-에디터-아키텍처-comfyui-스타일)
14. [상수 및 설정](#14-상수-및-설정)
15. [PersonaWorld RAG 구현](#15-personaworld-rag-구현)
16. [품질 피드백 루프 구현](#16-품질-피드백-루프-구현)
17. [LLM 모델 전략 구현](#17-llm-모델-전략-구현)
18. [구현 Phase 및 태스크](#18-구현-phase-및-태스크)
19. [파일 변경 맵](#19-파일-변경-맵)

---

## 1. 확정된 아키텍처 결정사항

모든 결정은 합의 완료. 구현 시 재논의 없이 적용한다.

### 1.1 벡터 구조

| 결정 | 내용 |
|------|------|
| 구조 | 3-Layer Orthogonal Vector System (7D + 5D + 4D + 교차축 83 + 동적 3 = 106D+) |
| Layer 1 | Social Persona Vector (7D) — 표면/가면 |
| Layer 2 | Core Temperament / OCEAN (5D) — 본성/기질 |
| Layer 3 | Narrative Drive (4D) — 서사/동력 |
| 관계 | 레이어 간 역설(Paradox)이 캐릭터 깊이를 만듦 |

### 1.2 L1↔L2 역설 매핑

7개 L1 차원 전부가 L2에 연결된다. 고아 차원 없음. Many-to-One 매핑 포함.

| L1 (Social Persona) | L2 (OCEAN) | 방향 | 매핑 유형 | 역설 의미 |
|---|---|---|---|---|
| `depth` (분석 깊이) | `openness` (개방성) | 정방향 | Primary | 지적 호기심의 역설 |
| `taste` (취향 성향) | `openness` (개방성) | 정방향 | Secondary | 심미적 취향의 역설 ("보수적 힙스터") |
| `lens` (판단 렌즈) | `neuroticism` (신경성) | 역방향 | Primary | 감성/불안의 역설 |
| `stance` (평가 태도) | `agreeableness` (우호성) | 역방향 | Primary | 태도의 역설 ("상처받은 비평가") |
| `sociability` (사교성) | `extraversion` (외향성) | 정방향 | Primary | 에너지의 역설 ("사교적 내향인") |
| `purpose` (소비 목적) | `conscientiousness` (성실성) | 정방향 | Primary | 목표/실천의 역설 |
| `scope` (관심 범위) | `conscientiousness` (성실성) | 정방향 | Secondary | 디테일/규칙의 역설 ("게으른 완벽주의자") |

**Many-to-One 관계:**
- `openness` ← `depth`(Primary) + `taste`(Secondary)
- `conscientiousness` ← `purpose`(Primary) + `scope`(Secondary)

### 1.3 L3 역할 정의

| L3 차원 | 역할 | L1-L2 역설에 대한 기능 |
|---|---|---|
| `lack` (결핍) | 역설의 **원인** | "왜 겉과 속이 달라졌는가" — 서사적 기원 |
| `moralCompass` (도덕 나침반) | 역설의 **기준** | "어디까지 본성을 숨기는가" — 윤리적 방향성 |
| `volatility` (변동성) | 역설의 **불안정성** | "가면이 얼마나 쉽게 벗겨지는가" — 압력 민감도 |
| `growthArc` (성장 궤적) | 역설의 **방향** | "겉과 속이 수렴하는가, 괴리가 커지는가" — 시간적 변화 |

### 1.4 기타 확정 사항

| 결정 항목 | 확정 내용 |
|-----------|-----------|
| Paradox Score | L2 균등 가중 방식 (B) — 5개 OCEAN 요인이 각 20%씩 기여 |
| 역방향 퇴행 | 허용 — 압박은 가면을 벗김 (McKee 원칙). 예외 처리 불필요 |
| DB 구조 | 단일 테이블 `PersonaLayerVector` + `LayerType` enum + JSON 설정 |
| 유저 벡터 | L1(7D) 필수 + L2(5D) 선택. L3는 수집하지 않음 |
| 생성 전략 | 아키타입 템플릿(10~20개) → 규칙 변형 → (향후) LLM 보조 |
| L3→L1 투영 계수 | Beta v1 상수로 확정. `constants`에 분리하여 튜닝 가능 |
| 마이그레이션 | 불필요 — 기존 데이터 없음 |

---

## 2. 벡터 시스템 상세

### 2.1 Layer 1: Social Persona Vector (7D)

표면적으로 보이는 성격. "사회적 가면(Persona)"에 해당한다.

| 차원 | 키 | 범위 | Low (0.0) | High (1.0) | 설명 |
|------|-----|------|-----------|------------|------|
| 분석 깊이 | `depth` | 0.0~1.0 | 직관적 | 심층적 | 콘텐츠를 얼마나 깊이 분석하는가 |
| 판단 렌즈 | `lens` | 0.0~1.0 | 감성적 | 논리적 | 감성 vs 논리 중 어떤 관점으로 평가하는가 |
| 평가 태도 | `stance` | 0.0~1.0 | 수용적 | 비판적 | 콘텐츠에 대한 수용/비판 정도 |
| 관심 범위 | `scope` | 0.0~1.0 | 핵심만 | 디테일 | 핵심 요약 vs 세부 사항 관심 |
| 취향 성향 | `taste` | 0.0~1.0 | 클래식 | 실험적 | 검증된 작품 vs 실험적 작품 선호 |
| 소비 목적 | `purpose` | 0.0~1.0 | 오락 | 의미추구 | 가벼운 오락 vs 의미 추구 |
| 사교성 | `sociability` | 0.0~1.0 | 은둔형 | 사교형 | 타인과의 상호작용 빈도/선호 |

**v2 대비 변경:** 기존 6D에 `sociability` 추가 (기존 활동성 속성에서 승격).

### 2.2 Layer 2: Core Temperament Vector — OCEAN (5D)

본원적 기질. Big Five 성격 모델 기반. 평소에는 숨겨져 있다가 압박 상황에서 드러난다.

| 차원 | 키 | 범위 | Low (0.0) | High (1.0) | 설명 |
|------|-----|------|-----------|------------|------|
| 경험 개방성 | `openness` | 0.0~1.0 | 보수적/관습적 | 호기심/개방적 | 새로운 경험에 대한 태도 |
| 성실성 | `conscientiousness` | 0.0~1.0 | 즉흥적/무질서 | 원칙적/체계적 | 계획과 규율에 대한 태도 |
| 외향성 | `extraversion` | 0.0~1.0 | 내향적/에너지소모 | 외향적/에너지충전 | 사회적 상호작용에서의 에너지 흐름 |
| 우호성 | `agreeableness` | 0.0~1.0 | 경쟁적/의심 | 협조적/신뢰 | 타인에 대한 기본 태도 |
| 신경성 | `neuroticism` | 0.0~1.0 | 정서적 안정 | 정서적 불안정 | 부정적 감정 경험 빈도 |

### 2.3 Layer 3: Narrative Drive Vector (4D)

서사적 동력. 캐릭터가 "왜 그런 사람이 되었는가"를 수치화한다.

| 차원 | 키 | 범위 | Low (0.0) | High (1.0) | 설명 |
|------|-----|------|-----------|------------|------|
| 결핍 | `lack` | 0.0~1.0 | 충족/안정 | 결핍/갈망 | 채워지지 않은 욕구의 크기 (Campbell "Ordinary World"의 불만족) |
| 도덕 나침반 | `moralCompass` | 0.0~1.0 | 유연/상황적 | 엄격/절대적 | 윤리적 기준의 강도 |
| 변동성 | `volatility` | 0.0~1.0 | 안정/예측가능 | 불안정/예측불가 | 감정과 행동의 진폭 |
| 성장 궤적 | `growthArc` | 0.0~1.0 | 정체/퇴행 | 성장/통합 | Campbell 영웅 여정에서의 현재 위치 (0.0=일상세계, 1.0=귀환) |

---

## 3. 데이터 모델 (Prisma Schema)

### 3.1 PersonaLayerVector (신규 모델)

```prisma
// ── 3-Layer 벡터 저장 (단일 테이블 + LayerType) ──────────────
model PersonaLayerVector {
  id        String    @id @default(cuid())
  personaId String
  persona   Persona   @relation(fields: [personaId], references: [id], onDelete: Cascade)

  layerType LayerType
  version   Int       @default(1)

  // 범용 차원 컬럼 (레이어별 의미가 다름 — 아래 매핑 테이블 참조)
  // Decimal(4,3) = 최대 9.999, 소수점 3자리 — 0.000~1.000 범위
  dim1      Decimal?  @db.Decimal(4, 3)
  dim2      Decimal?  @db.Decimal(4, 3)
  dim3      Decimal?  @db.Decimal(4, 3)
  dim4      Decimal?  @db.Decimal(4, 3)
  dim5      Decimal?  @db.Decimal(4, 3)
  dim6      Decimal?  @db.Decimal(4, 3)
  dim7      Decimal?  @db.Decimal(4, 3)

  createdAt DateTime  @default(now())

  @@unique([personaId, layerType, version])
  @@index([personaId])
  @@index([layerType])
  @@map("persona_layer_vectors")
}

enum LayerType {
  SOCIAL        // Layer 1: 7D (dim1~dim7 사용)
  TEMPERAMENT   // Layer 2: 5D (dim1~dim5 사용, dim6~dim7 = null)
  NARRATIVE     // Layer 3: 4D (dim1~dim4 사용, dim5~dim7 = null)
}
```

**dim 컬럼 ↔ 차원 매핑:**

| dim | SOCIAL (L1) | TEMPERAMENT (L2) | NARRATIVE (L3) |
|-----|-------------|-------------------|----------------|
| dim1 | depth | openness | lack |
| dim2 | lens | conscientiousness | moralCompass |
| dim3 | stance | extraversion | volatility |
| dim4 | scope | agreeableness | growthArc |
| dim5 | taste | neuroticism | — (null) |
| dim6 | purpose | — (null) | — (null) |
| dim7 | sociability | — (null) | — (null) |

### 3.2 Persona 모델 확장

기존 `Persona` 모델에 v3 전용 필드를 추가한다. 기존 필드는 하위호환을 위해 유지.

```prisma
model Persona {
  // ═══ 기존 필드 전부 유지 ═══
  // id, name, role, expertise, description, profileImageUrl,
  // handle, tagline, birthDate, country, region, warmth, expertiseLevel,
  // speechPatterns, quirks, background, favoriteGenres, dislikedGenres,
  // viewingHabits, sociability, initiative, expressiveness, interactivity,
  // postFrequency, timezone, activeHours, peakHours,
  // contentSettings, relationshipSettings,
  // promptTemplate, promptVersion, basePrompt, reviewPrompt, postPrompt,
  // commentPrompt, interactionPrompt, specialPrompts,
  // status, qualityScore, validationScore, validationVersion,
  // lastValidationDate, consistencyScore,
  // source, generationConfig, parentPersonaId,
  // sampleContents, createdById, createdAt, updatedAt, activatedAt, archivedAt
  // 기존 relations: vectors, matchingLogs, feedbacks, testResults, posts, ...

  // ═══ v3.0 신규: 3-Layer 벡터 ═══
  layerVectors        PersonaLayerVector[]

  // ═══ v3.0 신규: 역설 및 동적 설정 (JSON) ═══
  paradoxConfig       Json?   // ParadoxConfig 타입. 역설 매핑, 점수, 차원성 점수
  dynamicsConfig      Json?   // DynamicsConfig 타입. α/β, 압력 범위, 블렌드 곡선

  // ═══ v3.0 신규: 정성적 차원 (JSON) ═══
  backstory           Json?   // BackstoryDimension 타입
  pressureContext     Json?   // PressureContext 타입
  voiceProfile        Json?   // VoiceProfile 타입
  zeitgeist           Json?   // ZeitgeistProfile 타입

  // ═══ v3.0 신규: 상호작용 규칙 (JSON) ═══
  interactionRules    Json?   // InteractionRules 타입

  // ═══ v3.0 신규: 아키타입 메타 ═══
  archetypeId         String? // 생성 시 사용된 아키타입 템플릿 ID
  paradoxScore        Decimal? @db.Decimal(4, 3)  // 0.000~1.000
  dimensionalityScore Decimal? @db.Decimal(4, 3)  // 0.000~1.000
  engineVersion       String?  @default("3.0")    // 엔진 버전 태깅
}
```

### 3.3 UserVector 확장

```prisma
model UserVector {
  // ═══ 기존 6D 필드 유지 (하위호환) ═══
  // depth, lens, stance, scope, taste, purpose

  // ═══ v3.0 신규 ═══
  sociability       Decimal?  @db.Decimal(3, 2)  // L1 7번째 차원

  // L2 (OCEAN) — 선택적 수집
  openness          Decimal?  @db.Decimal(3, 2)
  conscientiousness Decimal?  @db.Decimal(3, 2)
  extraversion      Decimal?  @db.Decimal(3, 2)
  agreeableness     Decimal?  @db.Decimal(3, 2)
  neuroticism       Decimal?  @db.Decimal(3, 2)

  // L2 수집 여부 플래그
  hasOceanProfile   Boolean   @default(false)
}
```

### 3.4 InteractionLog (신규 모델)

인터랙션 로그 수집 — 품질 측정, 네트워크 분석, RAG 장기 기억의 원천 데이터.

```prisma
// ── 인터랙션 로그 (턴 단위 기록) ──────────────
model InteractionLog {
  id            String    @id @default(cuid())
  sessionId     String
  session       InteractionSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  turnNumber    Int                // 세션 내 턴 번호
  timestamp     DateTime  @default(now())

  // ── 참여자 ──
  initiatorType ParticipantType    // PERSONA | USER
  initiatorId   String
  receiverType  ParticipantType    // PERSONA | USER | CONTENT
  receiverId    String

  // ── 인터랙션 유형 ──
  interactionType InteractionType  // CONVERSATION | COMMENT | REPLY | REACTION | POST | MENTION

  // ── 콘텐츠 ──
  userMessage         String?  @db.Text
  personaResponse     String?  @db.Text
  responseLengthTokens Int?

  // ── 벡터 스냅샷 (인터랙션 시점) ──
  pressure            Decimal? @db.Decimal(3, 2)  // 0.00~1.00
  activeLayer         String?                      // "L1" | "L2"
  vFinalDrift         Decimal? @db.Decimal(4, 3)  // V_Final 변동폭
  paradoxActivation   Decimal? @db.Decimal(4, 3)  // 역설 활성도

  // ── 행동 태그 (JSON) ──
  behaviorTags        Json?    // { userSentiment, personaTone, triggerActivated, quirkFired, topicCategory }

  // ── 품질 메트릭 (사후 배치 계산) ──
  contextRecall       Decimal? @db.Decimal(4, 3)
  settingConsistency  Decimal? @db.Decimal(4, 3)
  voiceDrift          Decimal? @db.Decimal(4, 3)

  createdAt           DateTime @default(now())

  @@index([sessionId])
  @@index([initiatorId, initiatorType])
  @@index([receiverId, receiverType])
  @@index([interactionType])
  @@index([timestamp])
  @@map("interaction_logs")
}

// ── 인터랙션 세션 (대화 단위 그룹) ──────────────
model InteractionSession {
  id            String    @id @default(cuid())
  personaId     String
  persona       Persona   @relation(fields: [personaId], references: [id], onDelete: Cascade)
  userId        String

  startedAt     DateTime  @default(now())
  endedAt       DateTime?
  totalTurns    Int       @default(0)

  // ── 세션 집계 메트릭 ──
  avgPressure   Decimal?  @db.Decimal(3, 2)
  peakPressure  Decimal?  @db.Decimal(3, 2)
  dominantTopic String?

  // ── 품질 점수 (세션 종료 후 배치 계산) ──
  integrityScore Decimal? @db.Decimal(4, 3)  // Persona Integrity Score

  // ── 네트워크 분석용 (Phase 10+) ──
  edgeWeight          Decimal? @db.Decimal(5, 3)  // 인터랙션 빈도 기반
  semanticSimilarity  Decimal? @db.Decimal(4, 3)  // 대화 임베딩 유사도
  sentimentValence    Decimal? @db.Decimal(3, 2)  // 감정 극성 평균 (-1~+1)

  logs          InteractionLog[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([personaId])
  @@index([userId])
  @@index([personaId, userId])
  @@map("interaction_sessions")
}

enum ParticipantType {
  PERSONA
  USER
  CONTENT
}

enum InteractionType {
  CONVERSATION
  COMMENT
  REPLY
  REACTION
  POST
  MENTION
}
```

**TypeScript 타입 (packages/shared-types):**

```typescript
// ── 인터랙션 로그 타입 ──
export interface InteractionLogEntry {
  sessionId: string
  turnNumber: number
  initiator: { type: 'persona' | 'user'; id: string }
  receiver: { type: 'persona' | 'user' | 'content'; id: string }
  interactionType: 'conversation' | 'comment' | 'reply' | 'reaction' | 'post' | 'mention'
  content: {
    userMessage?: string
    personaResponse?: string
    responseLengthTokens?: number
  }
  vectorSnapshot: {
    pressure: number
    activeLayer: 'L1' | 'L2'
    vFinalDrift: number
    paradoxActivation: number
  }
  behaviorTags: {
    userSentiment: 'supportive' | 'neutral' | 'challenging' | 'aggressive'
    personaTone: string
    triggerActivated: string | null
    quirkFired: string | null
    topicCategory: string
  }
}

export interface InteractionSessionSummary {
  sessionId: string
  personaId: string
  userId: string
  totalTurns: number
  avgPressure: number
  peakPressure: number
  dominantTopic: string
  integrityScore: number | null
}
```

---

## 4. 타입 시스템 (TypeScript)

모든 타입은 `packages/shared-types/src/persona-v3.ts`에 정의하고, `index.ts`에서 re-export한다.
앱 레벨 타입은 `apps/engine-studio/src/types/persona-v3.ts`에 앱 특화 타입을 추가한다.

### 4.1 Layer 벡터 타입

```typescript
// ── Layer 1: Social Persona Vector (7D) ──
export interface SocialPersonaVector {
  depth: number       // 0.0~1.0: 직관적 ↔ 심층적
  lens: number        // 0.0~1.0: 감성적 ↔ 논리적
  stance: number      // 0.0~1.0: 수용적 ↔ 비판적
  scope: number       // 0.0~1.0: 핵심만 ↔ 디테일
  taste: number       // 0.0~1.0: 클래식 ↔ 실험적
  purpose: number     // 0.0~1.0: 오락 ↔ 의미추구
  sociability: number // 0.0~1.0: 은둔형 ↔ 사교형
}

// ── Layer 2: Core Temperament / OCEAN (5D) ──
export interface CoreTemperamentVector {
  openness: number          // 0.0~1.0: 보수적 ↔ 개방적
  conscientiousness: number // 0.0~1.0: 즉흥적 ↔ 원칙적
  extraversion: number      // 0.0~1.0: 내향적 ↔ 외향적
  agreeableness: number     // 0.0~1.0: 경쟁적 ↔ 협조적
  neuroticism: number       // 0.0~1.0: 안정 ↔ 불안정
}

// ── Layer 3: Narrative Drive (4D) ──
export interface NarrativeDriveVector {
  lack: number         // 0.0~1.0: 충족 ↔ 결핍
  moralCompass: number // 0.0~1.0: 유연 ↔ 엄격
  volatility: number   // 0.0~1.0: 안정 ↔ 불안정
  growthArc: number    // 0.0~1.0: 정체 ↔ 성장 (0.0=일상세계, 1.0=귀환)
}

// ── 3-Layer 통합 벡터 ──
export interface ThreeLayerVector {
  social: SocialPersonaVector
  temperament: CoreTemperamentVector
  narrative: NarrativeDriveVector
}

// ── 차원 키 유니온 타입 ──
export type SocialDimension = keyof SocialPersonaVector
export type TemperamentDimension = keyof CoreTemperamentVector
export type NarrativeDimension = keyof NarrativeDriveVector
```

### 4.2 역설(Paradox) 타입

```typescript
// ── 개별 역설 매핑 ──
export type ParadoxDirection = 'aligned' | 'inverse'
export type ParadoxPriority = 'primary' | 'secondary'

export interface ParadoxMapping {
  l1Dimension: SocialDimension
  l2Dimension: TemperamentDimension
  direction: ParadoxDirection
  priority: ParadoxPriority
  tensionScore: number  // 계산된 |L1 - L2_adjusted| 값 (0.0~1.0)
}

// ── 역설 설정 (Persona JSON 컬럼) ──
export interface ParadoxConfig {
  mappings: ParadoxMapping[]             // 7개 매핑 전부 포함
  overallParadoxScore: number            // 0.0~1.0 (L2 균등 가중 결과)
  dimensionalityScore: number            // 0.0~1.0 (캐릭터 입체성)
  dominantParadox: {                     // 가장 큰 역설
    l1: SocialDimension
    l2: TemperamentDimension
    score: number
  }
}
```

### 4.3 동적 설정 타입

```typescript
export type BlendCurve = 'linear' | 'exponential' | 'sigmoid'

export interface DynamicsConfig {
  // 압력 계수 범위
  pressureRange: {
    min: number      // 보통 0.0
    max: number      // 보통 1.0
    default: number  // 이 페르소나의 일상적 압력 수준
  }
  // L2/L3 블렌딩 비율 (alpha + beta = 1.0)
  alpha: number      // L2(본성) 가중치. 보통 0.6~0.7
  beta: number       // L3(서사) 가중치. 보통 0.3~0.4
  // 블렌드 곡선
  blendCurve: BlendCurve
}
```

### 4.4 V_Final 결과 타입

```typescript
export interface VFinalResult {
  vector: number[]       // 7D 배열 (L1 차원 순서: depth~sociability)
  pressure: number       // 적용된 압력 계수
  layerContributions: {
    l1Weight: number     // (1 - P)
    l2Weight: number     // P * α
    l3Weight: number     // P * β
  }
  // 디버깅/시각화용
  l2Projected: number[]  // L2 → L1 투영 결과 (7D)
  l3Projected: number[]  // L3 → L1 투영 결과 (7D)
}
```

### 4.5 정성적 차원 타입

```typescript
// ── Backstory & Narrative Identity ──
export interface BackstoryDimension {
  origin: string                // 출신/환경 (예: "서울 중산층 가정")
  formativeExperience: string   // 결정적 경험 (예: "대학 시절 영화 동아리에서의 좌절")
  innerConflict: string         // 내면 갈등 (예: "인정받고 싶지만 사람이 두려운")
  selfNarrative: string         // 자기 서사 (예: "나는 진실을 말하는 사람이다")
  nlpKeywords: string[]         // 초기화 로직용 키워드 (예: ["좌절", "인정", "고독"])
}

// ── Pressure Context ──
export interface PressureContext {
  situationalTriggers: TriggerRule[]  // 압력 트리거 목록
  stressResponse: string              // 스트레스 반응 패턴 (서술)
  comfortZone: string                 // 안전지대 (서술)
}

export interface TriggerRule {
  condition: string                   // 트리거 조건 (예: "비판을 받을 때")
  affectedLayer: 'L1' | 'L2' | 'L3'
  affectedDimension: string           // 영향받는 차원 (예: "stance")
  effect: 'boost' | 'suppress' | 'override'
  magnitude: number                   // 효과 크기 (0.0~1.0)
}

// ── Voice & Quirks ──
export interface VoiceProfile {
  speechStyle: string                 // 말투 특성 (예: "짧고 건조한 문장, 간헐적 자조적 유머")
  habitualExpressions: string[]       // 습관적 표현 (예: ["솔직히 말해서", "객관적으로 보면"])
  physicalMannerisms: string[]        // 행동 습관 (예: ["엔딩크레딧 끝까지 확인"])
  unconsciousBehaviors: string[]      // 무의식적 행동 (예: ["감동받으면 말이 빨라짐"])
  activationThresholds: Record<string, number>  // 표현 로직용 (퀘르크별 활성화 임계값)
}

// ── Zeitgeist & Cultural Code ──
export interface ZeitgeistProfile {
  culturalReferences: string[]        // 문화적 레퍼런스 (예: ["90년대 한국 영화 르네상스"])
  generationalMarkers: string[]       // 세대적 특징 (예: ["IMF 세대", "아날로그 감성"])
  socialAwareness: number             // 0.0~1.0: 사회 이슈 민감도
  trendSensitivity: number            // 0.0~1.0: 트렌드 반응도
}
```

### 4.6 상호작용 규칙 타입

```typescript
// ── 4가지 연결 메커니즘 통합 ──
export interface InteractionRules {
  initialization: InitializationRule    // ① 백스토리 → 벡터 세팅 (1회)
  overrides: OverrideRule[]             // ② 트리거 → 벡터 강제 변경 (이벤트)
  adaptation: AdaptationRule            // ③ 유저 태도 → 실시간 조정 (연속)
  expression: ExpressionRule[]          // ④ 벡터 상태 → 퀘르크 활성화 (확률)
}

// ① 초기화 로직 — 백스토리 NLP 키워드로 벡터 초기값 보정
export interface InitializationRule {
  keywordVectorMap: Record<string, Partial<SocialPersonaVector>>
  // 예: { "좌절": { stance: 0.1 }, "고독": { sociability: -0.1 } }
  // 값은 기존 벡터에 더하는 delta 값
  appliedOnce: boolean  // true면 생성 시 1회만 적용
}

// ② 오버라이드 로직 — 특정 트리거 발생 시 벡터 강제 변경
export interface OverrideRule {
  id: string
  triggerKeyword: string              // 트리거 키워드 (예: "배신", "거절")
  forcedVectorChange: {
    layer: 'L1' | 'L2' | 'L3'
    dimension: string                 // 영향받는 차원
    targetValue: number               // 강제 설정할 값
    duration: 'permanent' | 'temporary'
    decayRate?: number                // temporary일 때 감쇠율 (per interaction)
  }
}

// ③ 적응 로직 — 유저 상호작용에 따른 실시간 벡터 조정
export interface AdaptationRule {
  userAttitudeMap: Record<string, {
    affectedDimension: SocialDimension
    adjustmentRate: number            // interaction당 조정량
    bounds: { min: number; max: number }  // 조정 범위 제한
  }>
  // 예: { "공감적": { affectedDimension: "stance", adjustmentRate: -0.02, bounds: { min: 0.1, max: 0.9 } } }
}

// ④ 표현 로직 — 벡터 상태에 따른 퀘르크 활성화 확률
export interface ExpressionRule {
  id: string
  vectorCondition: {
    dimension: SocialDimension
    operator: 'gt' | 'lt' | 'between'
    value: number | [number, number]  // 단일 값 또는 [min, max] 범위
  }
  quirkActivation: {
    quirk: string                     // 활성화될 퀘르크 (예: "자조적 유머")
    probability: number               // 활성화 확률 (0.0~1.0)
  }
}
```

### 4.7 아키타입 템플릿 타입

```typescript
export type ParadoxTension = 'HIGH' | 'MEDIUM' | 'LOW'

export interface PersonaArchetype {
  id: string
  name: string
  nameEn: string              // 영문명 (코드에서 사용)
  description: string         // 한 문장 설명
  detailedDescription: string // 상세 설명 (이 아키타입이 어떤 인물인지)

  // 3-Layer 벡터 범위 ([min, max])
  layer1: Record<SocialDimension, [number, number]>
  layer2: Record<TemperamentDimension, [number, number]>
  layer3: Record<NarrativeDimension, [number, number]>

  // 의도적 역설 설계
  paradoxPattern: {
    primary: {
      l1: SocialDimension
      l2: TemperamentDimension
      tension: ParadoxTension
    }
    secondary?: {
      l1: SocialDimension
      l2: TemperamentDimension
      tension: ParadoxTension
    }
  }

  // 기대 역설 점수 범위
  expectedParadoxRange: [number, number]

  // 서사 힌트 (정성적 차원 생성 가이드)
  narrativeHint: string

  // 동적 설정 기본값
  dynamicsDefaults: {
    alpha: number   // L2 가중치
    beta: number    // L3 가중치
  }
}
```

---

## 5. V_Final 계산 엔진

### 5.1 공식

```
V_Final[i] = clamp( (1 - P) × L1[i] + P × (α × L2proj[i] + β × L3proj[i]) )

where:
  P     = 압력 계수 (0.0~1.0)
  α + β = 1.0
  clamp = min(1, max(0, value))
```

### 5.2 구현 파일

`apps/engine-studio/src/lib/vector/v-final.ts`

```typescript
import { clamp } from './utils'
import { projectL2toL1 } from './projection'
import { projectL3toL1 } from './projection'
import { calculateCrossAxisProfile } from './cross-axis'
import { calculateExtendedParadoxScore } from './paradox'
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  DynamicsConfig,
  VFinalResult,
} from '@deepsight/shared-types'

const L1_KEYS: (keyof SocialPersonaVector)[] = [
  'depth', 'lens', 'stance', 'scope', 'taste', 'purpose', 'sociability'
]

export function calculateVFinal(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  dynamics: DynamicsConfig,
  pressure: number,
): VFinalResult {
  const P = clamp(pressure)
  const { alpha, beta } = dynamics

  const l2Proj = projectL2toL1(l2)
  const l3Proj = projectL3toL1(l3)
  const l1Arr = L1_KEYS.map(k => l1[k])

  const vector = l1Arr.map((v, i) =>
    clamp((1 - P) * v + P * (alpha * l2Proj[i] + beta * l3Proj[i]))
  )

  // 교차축 프로필 계산 (83축 전체)
  const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)

  // 확장 Paradox Score (L1↔L2 + L1↔L3 + L2↔L3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3)

  return {
    vector,
    pressure: P,
    layerContributions: {
      l1Weight: 1 - P,
      l2Weight: P * alpha,
      l3Weight: P * beta,
    },
    l2Projected: l2Proj,
    l3Projected: l3Proj,
    crossAxisProfile,    // NEW: 83축 스코어 + 요약
    paradoxProfile,      // NEW: 3-layer 역설 상세
  }
}
```

### 5.3 동작 검증 예시

**"상처받은 비평가"** (P=0일 때 vs P=0.7일 때):

```
L1: stance=0.8, sociability=0.3
L2: agreeableness=0.7, extraversion=0.6
L3: lack=0.8, growthArc=0.6
dynamics: α=0.65, β=0.35

P=0.0 (일상):
  V_Final.stance = 1.0*0.8 + 0.0*(...) = 0.8 → 날카로운 비판가
  V_Final.sociability = 1.0*0.3 + 0.0*(...) = 0.3 → 혼자 있는 편

P=0.7 (압박):
  L2proj.stance = 1 - 0.7 = 0.3 (역방향: 우호적 본성)
  L3proj.stance = 0.5 + 0.5*0.2 = 0.6 (도덕적 기준 → 약간 비판)
  V_Final.stance = 0.3*0.8 + 0.7*(0.65*0.3 + 0.35*0.6)
                 = 0.24 + 0.7*(0.195 + 0.21)
                 = 0.24 + 0.2835 = 0.524 → 갑자기 부드러워짐

  L2proj.sociability = 0.6 (외향적 본성)
  L3proj.sociability = 0.5 + 0.6*0.1 = 0.56
  V_Final.sociability = 0.3*0.3 + 0.7*(0.65*0.6 + 0.35*0.56)
                      = 0.09 + 0.7*(0.39 + 0.196)
                      = 0.09 + 0.4102 = 0.500 → 사람을 찾기 시작
```

---

## 6. Paradox Score + 교차축 계산 엔진

> **핵심**: 3-Layer 구조는 단순 7+5+4=16이 아니다.
> 레이어 간 교차 상호작용(83축)이 실제 캐릭터 해상도를 결정한다.
> 이 섹션은 83축 전체의 스코어를 실제 계산하는 엔진을 정의한다.

### 6.1 L1↔L2 Paradox Score (기존 — 유지)

L1↔L2 역설은 "가면 vs 본성" 긴장의 핵심 지표. 기존 공식 유지.

```
l1l2ParadoxScore = (
  opennessParadox +
  neuroticismParadox +
  agreeablenessParadox +
  extraversionParadox +
  conscientiousnessParadox
) / 5

where:
  opennessParadox          = avg( |depth - openness|,   |taste - openness| )
  neuroticismParadox       = |lens - (1 - neuroticism)|
  agreeablenessParadox     = |stance - (1 - agreeableness)|
  extraversionParadox      = |sociability - extraversion|
  conscientiousnessParadox = avg( |purpose - conscientiousness|, |scope - conscientiousness| )
```

### 6.2 교차축 계산 엔진 (Cross-Axis Computation Engine)

#### 6.2.1 교차축 스코어 계산 원리

83개 교차축 각각에 대해 **관계 유형(relationship)**에 따라 다른 공식으로 스코어를 계산한다.

| 관계 유형 | 공식 | 의미 | 예시 |
|-----------|------|------|------|
| `paradox` | `\|dimA - f(dimB)\|` | 차이가 클수록 강한 역설 | stance(0.9) × agreeableness(0.9) → 0.8 |
| `reinforcing` | `1 - \|dimA - dimB\|` | 같은 방향일수록 강화 | depth(0.9) × openness(0.9) → 0.98 |
| `modulating` | `dimA × dimB` | 한 축이 다른 축의 표현 강도를 조절 | moralCompass(0.9) × stance(0.9) → 0.81 |
| `neutral` | `(dimA + dimB) / 2` | 독립적 — 평균값 참조용 | scope(0.5) × extraversion(0.5) → 0.5 |

> `f(dimB)`: 역방향 매핑인 경우 `1 - dimB`, 정방향이면 `dimB` 그대로.
> 역방향 여부는 `PARADOX_MAPPINGS`의 `direction` 필드로 결정.

#### 6.2.2 타입 정의

```typescript
// src/lib/vector/cross-axis.ts

interface CrossAxisScore {
  axisId: string                          // "l1_depth__l2_openness"
  type: 'L1xL2' | 'L1xL3' | 'L2xL3'
  relationship: 'paradox' | 'reinforcing' | 'modulating' | 'neutral'
  score: number                           // 0.0~1.0
  dimA: { layer: 'L1' | 'L2' | 'L3'; key: string; value: number }
  dimB: { layer: 'L1' | 'L2' | 'L3'; key: string; value: number }
  interpretation: string                  // highHigh/highLow/lowHigh/lowLow 중 해당 텍스트
}

interface CrossAxisProfile {
  axes: CrossAxisScore[]                  // 83개 전체
  byType: {
    l1l2: CrossAxisScore[]                // 35개
    l1l3: CrossAxisScore[]                // 28개
    l2l3: CrossAxisScore[]                // 20개
  }
  summary: {
    paradoxCount: number                  // relationship=paradox & score > 0.5인 축 수
    reinforcingCount: number              // relationship=reinforcing & score > 0.7인 축 수
    modulatingIntensity: number           // modulating 축들의 평균 스코어
    dominantRelationship: 'paradox' | 'reinforcing' | 'modulating' | 'neutral'
    characterComplexity: number           // 0.0~1.0 — 전체 캐릭터 복잡도
  }
}
```

#### 6.2.3 계산 엔진

```typescript
import { CROSS_LAYER_AXES } from '@/constants/v3/cross-layer-axes'
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from '@deepsight/shared-types'

const L1_ACCESSOR = (l1: SocialPersonaVector, key: string) =>
  l1[key as keyof SocialPersonaVector] as number
const L2_ACCESSOR = (l2: CoreTemperamentVector, key: string) =>
  l2[key as keyof CoreTemperamentVector] as number
const L3_ACCESSOR = (l3: NarrativeDriveVector, key: string) =>
  l3[key as keyof NarrativeDriveVector] as number

function getLayerValue(
  layer: 'L1' | 'L2' | 'L3',
  key: string,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
): number {
  if (layer === 'L1') return L1_ACCESSOR(l1, key)
  if (layer === 'L2') return L2_ACCESSOR(l2, key)
  return L3_ACCESSOR(l3, key)
}

/**
 * 관계 유형별 스코어 계산.
 * 핵심: paradox = 차이, reinforcing = 일치, modulating = 곱, neutral = 평균
 */
function computeAxisScore(
  valA: number,
  valB: number,
  relationship: string,
  invert: boolean,
): number {
  const effectiveB = invert ? 1 - valB : valB

  switch (relationship) {
    case 'paradox':
      return Math.abs(valA - effectiveB)
    case 'reinforcing':
      return 1 - Math.abs(valA - effectiveB)
    case 'modulating':
      return valA * effectiveB
    case 'neutral':
    default:
      return (valA + effectiveB) / 2
  }
}

/**
 * 해석 텍스트 선택 (highHigh/highLow/lowHigh/lowLow)
 */
function selectInterpretation(
  valA: number,
  valB: number,
  interpretation: { highHigh: string; highLow: string; lowHigh: string; lowLow: string },
): string {
  const threshold = 0.5
  if (valA >= threshold && valB >= threshold) return interpretation.highHigh
  if (valA >= threshold && valB < threshold) return interpretation.highLow
  if (valA < threshold && valB >= threshold) return interpretation.lowHigh
  return interpretation.lowLow
}

export function calculateCrossAxisProfile(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
): CrossAxisProfile {
  const axes: CrossAxisScore[] = CROSS_LAYER_AXES.map(axis => {
    // 축의 두 차원 값 가져오기
    const layerA = axis.type.split('x')[0] as 'L1' | 'L2' | 'L3'
    const layerB = axis.type.split('x')[1] as 'L1' | 'L2' | 'L3'
    const keyA = axis.l1Dim ?? axis.l2Dim!
    const keyB = axis.l2Dim ?? axis.l3Dim!

    const valA = getLayerValue(layerA, keyA, l1, l2, l3)
    const valB = getLayerValue(layerB, keyB, l1, l2, l3)

    // 역방향 여부 (L1↔L2 매핑에서 neuroticism, agreeableness는 역방향)
    const invert = isInverseMapping(axis.id)

    return {
      axisId: axis.id,
      type: axis.type,
      relationship: axis.relationship,
      score: computeAxisScore(valA, valB, axis.relationship, invert),
      dimA: { layer: layerA, key: keyA, value: valA },
      dimB: { layer: layerB, key: keyB, value: valB },
      interpretation: selectInterpretation(valA, valB, axis.interpretation),
    }
  })

  // 유형별 분류
  const byType = {
    l1l2: axes.filter(a => a.type === 'L1xL2'),
    l1l3: axes.filter(a => a.type === 'L1xL3'),
    l2l3: axes.filter(a => a.type === 'L2xL3'),
  }

  // 요약 통계
  const paradoxAxes = axes.filter(a => a.relationship === 'paradox' && a.score > 0.5)
  const reinforcingAxes = axes.filter(a => a.relationship === 'reinforcing' && a.score > 0.7)
  const modulatingAxes = axes.filter(a => a.relationship === 'modulating')
  const modulatingIntensity = modulatingAxes.length > 0
    ? modulatingAxes.reduce((sum, a) => sum + a.score, 0) / modulatingAxes.length
    : 0

  // 지배적 관계 유형 판정
  const counts = { paradox: paradoxAxes.length, reinforcing: reinforcingAxes.length }
  const dominantRelationship = counts.paradox > counts.reinforcing ? 'paradox' : 'reinforcing'

  // 캐릭터 복잡도: paradox 비율 + modulating 강도 가중
  const characterComplexity = Math.min(1.0,
    (paradoxAxes.length / axes.length) * 1.5 + modulatingIntensity * 0.3
  )

  return {
    axes,
    byType,
    summary: {
      paradoxCount: paradoxAxes.length,
      reinforcingCount: reinforcingAxes.length,
      modulatingIntensity,
      dominantRelationship,
      characterComplexity,
    },
  }
}
```

### 6.3 L1↔L3 역설 지표

L1(가면) ↔ L3(욕망) 간 역설. "표면적 행동과 내면의 욕망이 얼마나 충돌하는가"를 측정한다.

```
의미 있는 L1↔L3 역설 쌍:

| L1 (가면) | L3 (욕망) | 관계 | 역설 의미 |
|-----------|-----------|------|-----------|
| depth | lack | modulating | 결핍이 분석 집착을 만드는가 |
| stance | lack | paradox | 비판적인데 인정 결핍 → 공격적 방어기제 |
| lens | volatility | paradox | 논리적인데 감정 기복 큼 → 이성과 감정의 전쟁 |
| sociability | growthArc | modulating | 성장하면서 사교성이 변하는가 |
| purpose | lack | reinforcing | 결핍이 목적의식을 강화하는가 |
| taste | growthArc | modulating | 성장하면서 취향이 넓어지는가 |
| scope | moralCompass | modulating | 도덕 기준이 관심 범위를 제한하는가 |

l1l3ParadoxScore = 교차축 프로필에서 L1xL3 유형 중
                    relationship='paradox'인 축들의 평균 스코어
```

### 6.4 L2↔L3 역설 지표

L2(본성/OCEAN) ↔ L3(욕망) 간 역설. "타고난 기질과 내면의 욕망이 얼마나 충돌하는가".

```
의미 있는 L2↔L3 역설 쌍:

| L2 (OCEAN) | L3 (욕망) | 관계 | 역설 의미 |
|-----------|-----------|------|-----------|
| neuroticism | volatility | reinforcing | 이중 불안정 → 극적 감정 표출 |
| agreeableness | moralCompass | modulating | 우호적인데 도덕 기준 높음 → 자비로운 심판자 |
| openness | growthArc | reinforcing | 개방적이면서 성장 의지 → 끊임없는 탐험가 |
| conscientiousness | lack | paradox | 성실한데 결핍 큼 → 강박적 성취자 |
| extraversion | lack | paradox | 외향적인데 결핍 큼 → 관심 갈구하는 연예인 |
| neuroticism | moralCompass | paradox | 불안한데 도덕 기준 높음 → 자기 검열이 극심한 사람 |

l2l3ParadoxScore = 교차축 프로필에서 L2xL3 유형 중
                    relationship='paradox'인 축들의 평균 스코어
```

### 6.5 확장 Paradox Score (Extended)

기존 단일 paradoxScore를 **3-layer 확장형**으로 교체한다.

```
ExtendedParadoxScore = w₁ × l1l2Score + w₂ × l1l3Score + w₃ × l2l3Score

where:
  w₁ = 0.50  (L1↔L2: 가면 vs 본성 — 캐릭터의 핵심 긴장)
  w₂ = 0.30  (L1↔L3: 가면 vs 욕망 — 행동과 욕구의 괴리)
  w₃ = 0.20  (L2↔L3: 본성 vs 욕망 — 기질과 열망의 충돌)

  l1l2Score = 기존 calculateParadoxScore(l1, l2) (6.1의 공식)
  l1l3Score = mean(crossAxisProfile.byType.l1l3
               .filter(a => a.relationship === 'paradox')
               .map(a => a.score))
  l2l3Score = mean(crossAxisProfile.byType.l2l3
               .filter(a => a.relationship === 'paradox')
               .map(a => a.score))
```

**하위 호환성**: `paradoxScore` 필드는 기존과 같은 단일 number를 반환한다. 상세가 필요한 곳에서는 `paradoxProfile`을 참조한다.

### 6.6 확장 구현

`apps/engine-studio/src/lib/vector/paradox.ts`

```typescript
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from '@deepsight/shared-types'
import type { CrossAxisProfile } from './cross-axis'

// ── 가중치 ──
const W_L1L2 = 0.50
const W_L1L3 = 0.30
const W_L2L3 = 0.20

// ── 기존 L1↔L2 Paradox (유지) ──
export function calculateL1L2ParadoxScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
): number {
  const opennessParadox = (
    Math.abs(l1.depth - l2.openness) +
    Math.abs(l1.taste - l2.openness)
  ) / 2
  const neuroticismParadox = Math.abs(l1.lens - (1 - l2.neuroticism))
  const agreeablenessParadox = Math.abs(l1.stance - (1 - l2.agreeableness))
  const extraversionParadox = Math.abs(l1.sociability - l2.extraversion)
  const conscientiousnessParadox = (
    Math.abs(l1.purpose - l2.conscientiousness) +
    Math.abs(l1.scope - l2.conscientiousness)
  ) / 2

  return (
    opennessParadox +
    neuroticismParadox +
    agreeablenessParadox +
    extraversionParadox +
    conscientiousnessParadox
  ) / 5
}

// ── 교차축 기반 L1↔L3, L2↔L3 Paradox ──
function layerParadoxFromProfile(
  profile: CrossAxisProfile,
  type: 'L1xL3' | 'L2xL3',
): number {
  const paradoxAxes = profile.byType[type === 'L1xL3' ? 'l1l3' : 'l2l3']
    .filter(a => a.relationship === 'paradox')
  if (paradoxAxes.length === 0) return 0
  return paradoxAxes.reduce((sum, a) => sum + a.score, 0) / paradoxAxes.length
}

// ── 확장 Paradox Score ──
interface ParadoxProfile {
  l1l2: number              // 가면 vs 본성 (기존)
  l1l3: number              // 가면 vs 욕망 (신규)
  l2l3: number              // 본성 vs 욕망 (신규)
  overall: number           // 가중 합산 (= paradoxScore 필드)
  dimensionality: number    // 종형 곡선 차원성
  dominant: {
    layer: 'L1xL2' | 'L1xL3' | 'L2xL3'
    score: number
  }
}

export function calculateExtendedParadoxScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  crossAxisProfile?: CrossAxisProfile,
): ParadoxProfile {
  const l1l2 = calculateL1L2ParadoxScore(l1, l2)

  // crossAxisProfile이 없으면 L1↔L3, L2↔L3는 0으로 (하위 호환)
  const l1l3 = crossAxisProfile
    ? layerParadoxFromProfile(crossAxisProfile, 'L1xL3')
    : 0
  const l2l3 = crossAxisProfile
    ? layerParadoxFromProfile(crossAxisProfile, 'L2xL3')
    : 0

  const overall = W_L1L2 * l1l2 + W_L1L3 * l1l3 + W_L2L3 * l2l3

  // 가장 강한 역설 레이어
  const scores = [
    { layer: 'L1xL2' as const, score: l1l2 },
    { layer: 'L1xL3' as const, score: l1l3 },
    { layer: 'L2xL3' as const, score: l2l3 },
  ]
  const dominant = scores.reduce((max, s) => s.score > max.score ? s : max)

  return {
    l1l2,
    l1l3,
    l2l3,
    overall,
    dimensionality: calculateDimensionality(overall),
    dominant,
  }
}

function calculateDimensionality(paradoxScore: number): number {
  const optimal = 0.35
  const sigma = 0.2
  return Math.exp(-Math.pow(paradoxScore - optimal, 2) / (2 * sigma * sigma))
}
```

### 6.7 역설 점수 해석 (확장)

| overall 범위 | 해석 | 캐릭터 느낌 |
|-------------|------|-------------|
| 0.00~0.10 | 극히 낮음 | "보이는 그대로" — 평면적이지만 신뢰감 |
| 0.10~0.25 | 낮음 | 약간의 깊이가 있는 일관된 캐릭터 |
| 0.25~0.45 | **최적 (높은 차원성)** | 풍부한 내면 — "알수록 새로운 면이 보이는 사람" |
| 0.45~0.65 | 높음 | 극적인 캐릭터 — 겉과 속이 많이 다름 |
| 0.65~1.00 | 극히 높음 | 주의 필요 — L3 서사로 잘 설명되지 않으면 비일관적으로 느껴짐 |

**레이어별 역설 해석** (신규):

| 레이어 쌍 | 높으면 | 낮으면 |
|-----------|--------|--------|
| L1↔L2 (가면vs본성) | 겉과 속이 많이 다름 — 깊이 있는 캐릭터 | 겉과 속이 일치 — 투명한 캐릭터 |
| L1↔L3 (가면vs욕망) | 행동과 욕구가 충돌 — 내적 갈등형 | 행동이 욕구를 충실히 반영 — 목적형 |
| L2↔L3 (본성vs욕망) | 타고난 기질과 열망이 충돌 — 자기 변혁형 | 기질이 열망을 자연스럽게 지원 — 안정형 |

---

## 7. L2→L1 / L3→L1 투영 로직

### 7.1 구현 파일

`apps/engine-studio/src/lib/vector/projection.ts`

### 7.2 L2 → L1 투영

L2의 5D OCEAN 벡터를 L1의 7D 공간으로 변환한다.

```typescript
import type { CoreTemperamentVector } from '@deepsight/shared-types'

/**
 * L2 (OCEAN 5D) → L1 공간 (7D)으로 투영
 *
 * 매핑:
 *   depth       ← openness           (정방향)
 *   lens        ← 1 - neuroticism    (역방향: 논리적 ↔ 정서 안정)
 *   stance      ← 1 - agreeableness  (역방향: 비판적 ↔ 비우호)
 *   scope       ← conscientiousness  (정방향)
 *   taste       ← openness           (정방향, Many-to-One)
 *   purpose     ← conscientiousness  (정방향, Many-to-One)
 *   sociability ← extraversion       (정방향)
 */
export function projectL2toL1(l2: CoreTemperamentVector): number[] {
  return [
    l2.openness,              // → depth
    1 - l2.neuroticism,       // → lens (역방향)
    1 - l2.agreeableness,     // → stance (역방향)
    l2.conscientiousness,     // → scope
    l2.openness,              // → taste (Many-to-One: openness)
    l2.conscientiousness,     // → purpose (Many-to-One: conscientiousness)
    l2.extraversion,          // → sociability
  ]
}
```

### 7.3 L3 → L1 투영

L3의 4D Narrative 벡터를 L1의 7D 공간으로 변환한다.
기저값 0.5(중립)에서 L3가 방향을 밀어낸다.

```typescript
import { clamp } from './utils'
import { L3_PROJECTION_COEFFICIENTS } from '@/constants/vector-v3'
import type { NarrativeDriveVector } from '@deepsight/shared-types'

/**
 * L3 (Narrative 4D) → L1 공간 (7D)으로 투영
 *
 * 기저값 0.5 + L3 차원별 가중 합산.
 * 계수는 constants에서 관리 (Beta v1 — 튜닝 가능)
 *
 * 매핑:
 *   depth       ← 0.5 + lack * 0.3
 *   lens        ← 0.5 + volatility * -0.2
 *   stance      ← 0.5 + moralCompass * 0.2
 *   scope       ← 0.5 + moralCompass * 0.15 + volatility * -0.1
 *   taste       ← 0.5 + growthArc * 0.2 + lack * 0.15
 *   purpose     ← 0.5 + lack * 0.2
 *   sociability ← 0.5 + growthArc * 0.1
 */
export function projectL3toL1(l3: NarrativeDriveVector): number[] {
  const C = L3_PROJECTION_COEFFICIENTS
  return [
    clamp(0.5 + l3.lack * C.depth.lack),
    clamp(0.5 + l3.volatility * C.lens.volatility),
    clamp(0.5 + l3.moralCompass * C.stance.moralCompass),
    clamp(0.5 + l3.moralCompass * C.scope.moralCompass + l3.volatility * C.scope.volatility),
    clamp(0.5 + l3.growthArc * C.taste.growthArc + l3.lack * C.taste.lack),
    clamp(0.5 + l3.lack * C.purpose.lack),
    clamp(0.5 + l3.growthArc * C.sociability.growthArc),
  ]
}
```

### 7.4 L3 투영 계수 (Beta v1)

`apps/engine-studio/src/constants/vector-v3.ts`에 상수로 분리:

```typescript
/**
 * L3 → L1 투영 계수 (Beta v1)
 *
 * 이 값들은 "심리적 인과관계"를 수치화한 것.
 * 실제 페르소나 테스트 후 튜닝 예정.
 *
 * 양수 = 해당 L3 차원이 높을수록 L1 차원이 올라감
 * 음수 = 해당 L3 차원이 높을수록 L1 차원이 내려감
 */
export const L3_PROJECTION_COEFFICIENTS = {
  depth: {
    lack: 0.3,          // "결핍이 분석 깊이(집착)를 만든다"
  },
  lens: {
    volatility: -0.2,   // "감정 변동이 논리적 판단을 흐린다"
  },
  stance: {
    moralCompass: 0.2,   // "도덕적 기준이 높으면 비판적이 된다"
  },
  scope: {
    moralCompass: 0.15,  // "원칙적인 사람은 디테일에 집착한다"
    volatility: -0.1,    // "감정 변동이 크면 집중력이 떨어진다"
  },
  taste: {
    growthArc: 0.2,      // "성장할수록 취향이 넓어진다"
    lack: 0.15,          // "결핍은 자극적/새로운 것을 탐닉하게 한다"
  },
  purpose: {
    lack: 0.2,           // "결핍이 의미 추구를 강화한다"
  },
  sociability: {
    growthArc: 0.1,      // "성장하면 조금씩 사람에게 열린다"
  },
} as const
```

---

## 8. 아키타입 템플릿 시스템

### 8.1 개요

106D+ 벡터 공간에서의 랜덤 생성은 비일관적 캐릭터를 만들 위험이 높다.
아키타입 템플릿은 **"의미 있는 캐릭터 패턴"**을 정의하고, 그 범위 내에서 변형을 생성한다.

### 8.2 초기 제공 12개 아키타입

| # | ID | 한글명 | 영문명 | 핵심 역설 | 기대 Paradox |
|---|-----|--------|--------|-----------|--------------|
| 1 | `wounded-critic` | 상처받은 비평가 | Wounded Critic | stance↔agreeableness (H) | 0.30~0.55 |
| 2 | `eager-beginner` | 열정적 초심자 | Eager Beginner | depth↔openness (L) | 0.05~0.20 |
| 3 | `conservative-hipster` | 보수적 힙스터 | Conservative Hipster | taste↔openness (H) | 0.35~0.55 |
| 4 | `lazy-perfectionist` | 게으른 완벽주의자 | Lazy Perfectionist | scope↔conscientiousness (H) | 0.30~0.50 |
| 5 | `social-introvert` | 사교적 내향인 | Social Introvert | sociability↔extraversion (H) | 0.30~0.50 |
| 6 | `cold-empath` | 냉철한 감성가 | Cold Empath | lens↔neuroticism (H) | 0.35~0.55 |
| 7 | `idealistic-slacker` | 이상주의적 게으름뱅이 | Idealistic Slacker | purpose↔conscientiousness (H) | 0.30~0.50 |
| 8 | `warm-troll` | 따뜻한 독설가 | Warm Troll | stance↔agreeableness (역) | 0.30~0.50 |
| 9 | `analytical-dreamer` | 분석적 몽상가 | Analytical Dreamer | depth+scope↔openness+consc (H) | 0.35~0.55 |
| 10 | `balanced-mediator` | 균형잡힌 중재자 | Balanced Mediator | 전체 낮은 역설 | 0.00~0.15 |
| 11 | `explosive-sage` | 폭발하는 현자 | Explosive Sage | 다중 역설 (H) | 0.45~0.65 |
| 12 | `growing-outsider` | 성장하는 아웃사이더 | Growing Outsider | sociability↔extraversion + 변화 | 0.25~0.45 |

### 8.3 아키타입 정의 위치

`apps/engine-studio/src/lib/persona-generation/archetypes.ts`

템플릿 추가 시 이 파일에 `PersonaArchetype` 객체를 추가하면 된다.
별도의 코드 변경 불필요 — 배열에 항목만 추가.

### 8.4 아키타입 기반 생성 알고리즘

```
1. 아키타입 선택 (랜덤 또는 다양성 기반)
2. 각 레이어의 각 차원에 대해 [min, max] 범위 내에서 랜덤 값 생성
3. 의도된 역설 패턴 검증:
   - primary paradox의 tension이 HIGH면 → 해당 L1-L2 쌍의 차이가 0.3 이상인지 확인
   - 미달 시 L2 값 조정
4. Paradox Score가 expectedParadoxRange 범위 내인지 확인
5. 범위 밖이면 조정 후 재검증 (최대 3회)
6. 정성적 차원 생성 (narrativeHint 기반)
7. DynamicsConfig 세팅 (dynamicsDefaults 사용)
```

---

## 9. 생성 파이프라인

### 9.1 v3 파이프라인 흐름

```
┌─────────────────────────────────────────────────┐
│  INPUT: 아키타입 선택 (또는 자동) + 옵션         │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 1: 아키타입 기반 3-Layer 벡터 생성         │
│  - L1 (7D), L2 (5D), L3 (4D)                   │
│  - 의도적 역설 설계 포함                         │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 2: Paradox Score / Dimensionality 계산     │
│  - L2 균등 가중 역설 점수                        │
│  - 차원성 점수 (종형 곡선)                       │
│  - 범위 검증 → 미달 시 Step 1로 되돌아감         │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 3: 캐릭터 속성 생성                        │
│  - 기존 character-generator를 3-Layer 입력 기반   │
│    으로 수정                                     │
│  - L1 + L2 + L3 정보를 모두 활용하여 이름,       │
│    배경, 말투, 장르 등 생성                      │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 4: 정성적 차원 생성                        │
│  - Backstory: L1/L2 역설 + L3 서사를 기반으로    │
│    배경 스토리 생성                              │
│  - Voice: L1 + 캐릭터 속성 기반 말투/습관 생성   │
│  - Pressure: L3 volatility + 역설 기반 트리거    │
│  - Zeitgeist: 세대/국가 정보 기반                │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 5: 상호작용 규칙 생성                      │
│  - Initialization: backstory NLP → 벡터 보정     │
│  - Override: pressure triggers → 규칙 생성       │
│  - Adaptation: 기본 적응 규칙 템플릿             │
│  - Expression: L1 벡터 상태 → 퀘르크 활성화 확률 │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 6: DynamicsConfig 세팅                     │
│  - 아키타입 기본값 사용                          │
│  - L3 volatility에 따라 pressureRange 조정       │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 7: 프롬프트 생성                           │
│  - 전체 3-Layer + 정성적 차원 반영               │
│  - basePrompt, reviewPrompt, postPrompt 등       │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 8: 다층 일관성 검증                        │
│  - L1↔L2↔L3 교차 일관성                        │
│  - 정성적↔정량적 일관성                          │
│  - 실패 시 Step 1로 (최대 3회 재시도)            │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 9: DB 저장                                 │
│  - PersonaLayerVector × 3 (L1, L2, L3)          │
│  - Persona 필드 (JSON 포함) 저장                 │
└─────────────────────────────────────────────────┘
```

### 9.2 파이프라인 입력/출력 타입

```typescript
export interface PersonaV3GenerationInput {
  archetypeId?: string                    // 아키타입 ID (없으면 자동 선택)
  country?: string                        // 국가
  generation?: 'GEN_Z' | 'MILLENNIAL' | 'GEN_X' | 'BOOMER'
  preferredGender?: 'male' | 'female' | 'neutral'
  organizationId?: string
  createdById: string
  // v3 전용 옵션
  targetParadoxRange?: [number, number]   // 원하는 역설 점수 범위
  forcedLayer1?: Partial<SocialPersonaVector>  // L1 일부 고정
  forcedLayer2?: Partial<CoreTemperamentVector>
  forcedLayer3?: Partial<NarrativeDriveVector>
}

export interface PersonaV3GenerationResult {
  success: boolean
  persona?: Persona
  error?: { code: string; message: string; details?: unknown }
  metadata: {
    threeLayerVector: ThreeLayerVector
    paradoxScore: number
    dimensionalityScore: number
    archetypeUsed: string
    generationTime: number
    regenerationCount: number
  }
}
```

### 9.3 상호작용 모듈 — ① Initialization (초기값 보정)

배경 서사 텍스트에서 키워드를 추출하고, 의미 카테고리→벡터 매핑으로 초기값을 보정한다. 생성 파이프라인 Step 1 이후 일회성으로 실행된다.

```typescript
// ── 타입 ──

interface ExtractedKeyword {
  text: string
  categories: SemanticCategory[]
  confidence: number  // 0.0~1.0
}

type SemanticCategory =
  | '성취_동기' | '목표_지향' | '반주류' | '독립적'
  | '사회적_욕구' | '인정_결핍' | '내향적' | '은둔'
  | '감성적' | '직관적' | '논리적' | '분석적'
  | '비판적' | '도전적'
  | '불안' | '트라우마' | '낙관적' | '안정적'
  | '친화적' | '이타적' | '냉소적'
  | '호기심' | '탐구적' | '체계적' | '계획적' | '즉흥적' | '자유로운'
  | '외향적' | '에너지_넘치는'
  | '경제적_결핍' | '풍요' | '충족'
  | '도덕적' | '정의' | '비도덕적' | '수단과_방법'
  | '감정_기복' | '폭발적' | '차분한' | '냉정한'
  | '사회_변혁' | '혁명적' | '개인적' | '내면적'

interface CategoryMapping {
  category: SemanticCategory
  dimension: string        // 예: 'L1.purpose', 'L2.neuroticism'
  deltaDirection: 1 | -1   // 증가 or 감소
  deltaRange: [number, number]  // [min, max]
}

// ── 핵심 로직 ──

// 1. LLM 구조화 추출
async function extractKeywords(backstory: string): Promise<ExtractedKeyword[]> {
  const result = await llmTierRouter.execute({
    tier: 'medium',  // 키워드 추출은 Medium 모델 사용
    prompt: KEYWORD_EXTRACTION_PROMPT,
    input: backstory,
    outputSchema: extractedKeywordArraySchema,
  })
  return result.keywords
}

// 2. 카테고리 → 벡터 매핑 적용
function applyInitialization(
  archetypeDefaults: ThreeLayerVector,
  keywords: ExtractedKeyword[],
): ThreeLayerVector {
  const deltas: Record<string, number> = {}

  for (const keyword of keywords) {
    for (const category of keyword.categories) {
      const mappings = CATEGORY_MAPPING_TABLE.filter(m => m.category === category)
      for (const mapping of mappings) {
        const delta = mapping.deltaDirection
          * lerp(mapping.deltaRange[0], mapping.deltaRange[1], keyword.confidence)
        deltas[mapping.dimension] = (deltas[mapping.dimension] ?? 0) + delta * keyword.confidence
      }
    }
  }

  // delta 클램프 ±0.4, 최종값 클램프 [0, 1]
  return applyDeltas(archetypeDefaults, deltas, { maxDelta: 0.4 })
}
```

`CATEGORY_MAPPING_TABLE`은 `src/constants/v3/keyword-mappings.ts`에 정의. 설계서 §5.3의 매핑 테이블 전체를 포함.

### 9.4 상호작용 모듈 — ② Override (벡터 오버라이드)

트리거 감지 → delta 적용 → 복귀 곡선의 3-Stage 시스템.

```typescript
// ── 타입 ──

interface TriggerRule {
  triggerId: string
  keywords: string[]
  context: string          // LLM에 전달할 맥락 설명
  effects: TriggerEffect[]
}

interface TriggerEffect {
  dimension: string        // 'L1.lens', 'L3.volatility', 'Pressure' 등
  delta: number            // 변동량 (-1.0 ~ +1.0)
  type: 'override' | 'additive'
}

interface OverrideState {
  triggerId: string
  activatedAt: number      // 턴 번호
  triggerStrength: number   // 0.5~1.0
  effects: TriggerEffect[]
  isRecovering: boolean
}

// ── Stage 1: 트리거 감지 ──

function detectTrigger(
  userText: string,
  triggers: TriggerRule[],
): { trigger: TriggerRule; strength: number } | null {
  // Step 1: 키워드 빠른 필터
  const hits = triggers.filter(t =>
    t.keywords.some(kw => userText.includes(kw))
  )
  if (hits.length === 0) return null

  // Step 2: 맥락 확인 (LLM Light = 규칙 기반)
  for (const trigger of hits) {
    const contextScore = evaluateTriggerContext(userText, trigger)
    if (contextScore >= 0.5) {
      return { trigger, strength: contextScore }
    }
  }
  return null
}

// ── Stage 2: Delta 적용 ──

function applyOverride(
  currentVectors: ThreeLayerVector,
  baseVectors: ThreeLayerVector,
  trigger: TriggerRule,
  strength: number,
): ThreeLayerVector {
  const result = deepClone(currentVectors)

  for (const effect of trigger.effects) {
    const base = getVectorValue(baseVectors, effect.dimension)
    const current = getVectorValue(result, effect.dimension)

    if (effect.type === 'override') {
      const overridden = base + effect.delta * strength
      setVectorValue(result, effect.dimension, clamp(overridden, 0, 1))
    } else {
      setVectorValue(result, effect.dimension, clamp(current + effect.delta * strength, 0, 1))
    }
  }
  return result
}

// ── Stage 3: 복귀 곡선 (Exponential Decay) ──

function applyRecovery(
  overriddenVectors: ThreeLayerVector,
  baseVectors: ThreeLayerVector,
  turnsElapsed: number,
  volatility: number,  // L3.volatility
): ThreeLayerVector {
  // λ = 0.7 - 0.6 × volatility
  const lambda = 0.7 - 0.6 * volatility
  const decayFactor = Math.exp(-lambda * turnsElapsed)

  const result = deepClone(baseVectors)
  for (const dim of ALL_DIMENSIONS) {
    const vBase = getVectorValue(baseVectors, dim)
    const vOverridden = getVectorValue(overriddenVectors, dim)
    const vRecovered = vBase + (vOverridden - vBase) * decayFactor
    setVectorValue(result, dim, clamp(vRecovered, 0, 1))
  }
  return result
}
```

### 9.5 상호작용 모듈 — ③ Adaptation (동적 가중치)

매 인터랙션마다 유저의 태도를 분석하여 벡터를 미세 보정한다.

```typescript
// ── 타입 ──

interface UserAttitude {
  politeness: number    // 0.0~1.0
  aggression: number    // 0.0~1.0
  intimacy: number      // 0.0~1.0
}

interface AdaptationState {
  recentDeltas: Array<Record<string, number>>  // 최근 3턴의 delta 기록
  cumulativeAdaptation: Record<string, number>  // 누적 적응량
}

// ── 태도 → delta 매핑 ──

const ATTITUDE_MAPPINGS: Array<{
  attitude: keyof UserAttitude
  dimension: string
  formula: (score: number) => number
}> = [
  { attitude: 'politeness', dimension: 'L2.agreeableness',
    formula: (s) => (s - 0.5) * 0.4 },
  { attitude: 'politeness', dimension: 'L2.warmth',
    formula: (s) => (s - 0.5) * 0.3 },
  { attitude: 'aggression', dimension: 'L1.stance',
    formula: (s) => (s - 0.3) * 0.5 },
  { attitude: 'aggression', dimension: 'L2.neuroticism',
    formula: (s) => (s - 0.5) * 0.2 },
  { attitude: 'intimacy',   dimension: 'L1.sociability',
    formula: (s) => (s - 0.5) * 0.3 },
  { attitude: 'intimacy',   dimension: 'L2.extraversion',
    formula: (s) => (s - 0.5) * 0.2 },
]

// ── 핵심 로직 ──

function computeAdaptation(
  currentVectors: ThreeLayerVector,
  baseVectors: ThreeLayerVector,
  attitude: UserAttitude,
  state: AdaptationState,
): { vectors: ThreeLayerVector; newState: AdaptationState } {
  const deltas: Record<string, number> = {}

  for (const mapping of ATTITUDE_MAPPINGS) {
    const rawDelta = mapping.formula(attitude[mapping.attitude])
    const alpha = computeAlpha(mapping.dimension, currentVectors)
    const momentum = computeMomentum(mapping.dimension, state.recentDeltas)

    deltas[mapping.dimension] = rawDelta * alpha * momentum
  }

  // 적용 + 드리프트 방지 클램프 (base ± 0.3)
  const result = deepClone(currentVectors)
  for (const [dim, delta] of Object.entries(deltas)) {
    const current = getVectorValue(result, dim)
    const base = getVectorValue(baseVectors, dim)
    const adapted = clamp(current + delta, base - 0.3, base + 0.3)
    setVectorValue(result, dim, clamp(adapted, 0, 1))
  }

  return {
    vectors: result,
    newState: {
      recentDeltas: [...state.recentDeltas.slice(-2), deltas],
      cumulativeAdaptation: mergeDeltaMaps(state.cumulativeAdaptation, deltas),
    },
  }
}

// 차원별 적응률
function computeAlpha(dimension: string, vectors: ThreeLayerVector): number {
  const BASE = 0.15
  const volatility = vectors.l3.volatility
  const openness = vectors.l2.openness
  const extraversion = vectors.l2.extraversion

  const alphaMap: Record<string, number> = {
    'L1.stance':        BASE * (1 + volatility * 0.5),
    'L2.agreeableness': BASE * (1 + openness * 0.3),
    'L1.sociability':   BASE * (1 + extraversion * 0.4),
    'L2.neuroticism':   BASE * (1 + volatility * 0.6),
  }
  return clamp(alphaMap[dimension] ?? BASE, 0.05, 0.35)
}

// 모멘텀 (방향 일관성 보너스)
function computeMomentum(
  dimension: string,
  recentDeltas: Array<Record<string, number>>,
): number {
  if (recentDeltas.length < 2) return 1.0
  const signs = recentDeltas.map(d => Math.sign(d[dimension] ?? 0))
  const currentSign = signs[signs.length - 1] || 0
  const sameCount = signs.filter(s => s === currentSign).length
  const consistency = (sameCount / signs.length) - 0.5
  return clamp(1.0 + 0.3 * consistency, 0.85, 1.15)
}
```

### 9.6 상호작용 모듈 — ④ Expression (확률적 발현)

현재 벡터 상태에서 quirk 발현 확률을 계산하고, 시스템 프롬프트에 동적 지침을 추가한다.

```typescript
// ── 타입 ──

interface QuirkDefinition {
  id: string
  name: string
  stateKey: DerivedStateKey
  threshold: number       // 발동 기준점
  sensitivity: number     // sigmoid 감도 (높을수록 급격한 전환)
  promptInstruction: string
  cooldown: number        // 최소 대기 턴 수
}

type DerivedStateKey =
  | 'conflictScore'
  | 'anxietyLevel'
  | 'defenseLevel'
  | 'emotionalDepth'
  | 'pressureGap'

interface ExpressionState {
  lastActivatedTurn: Record<string, number>  // quirkId → 마지막 발동 턴
}

// ── 파생 상태값 계산 ──

function computeDerivedStates(
  vectors: ThreeLayerVector,
  pressure: number,
  conversationTurnCount: number,
  pressureBaseline: number,
): Record<DerivedStateKey, number> {
  return {
    conflictScore:
      Math.abs(vectors.l1.stance - vectors.l2.agreeableness)
      * (1 + vectors.l3.volatility) / 2,
    anxietyLevel:
      vectors.l2.neuroticism * (1 + pressure) / 2,
    defenseLevel:
      (vectors.l3.lack + vectors.l2.neuroticism) / 2
      * (1 - vectors.l2.agreeableness),
    emotionalDepth:
      Math.min(conversationTurnCount / 20, 1.0)
      * (1 + vectors.l2.openness) / 2,
    pressureGap:
      Math.abs(pressure - pressureBaseline),
  }
}

// ── 확률 계산 + 프롬프트 주입 ──

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

function evaluateQuirks(
  quirks: QuirkDefinition[],
  derivedStates: Record<DerivedStateKey, number>,
  currentTurn: number,
  state: ExpressionState,
): { instructions: string[]; newState: ExpressionState } {
  const instructions: string[] = []
  const newLastActivated = { ...state.lastActivatedTurn }

  for (const quirk of quirks) {
    // 쿨다운 체크
    const lastTurn = state.lastActivatedTurn[quirk.id] ?? -Infinity
    if (currentTurn - lastTurn < quirk.cooldown) continue

    // 확률 계산
    const stateValue = derivedStates[quirk.stateKey]
    const prob = sigmoid(quirk.sensitivity * (stateValue - quirk.threshold))

    // 발현 판정
    if (Math.random() < prob) {
      instructions.push(quirk.promptInstruction)
      newLastActivated[quirk.id] = currentTurn
    }
  }

  return {
    instructions,
    newState: { lastActivatedTurn: newLastActivated },
  }
}
```

---

## 10. 매칭 알고리즘

> **핵심 변경**: 기존 7D 코사인 유사도 → 다층 매칭.
> 기저 벡터(7D) + 교차축 프로필(83축) + 비정량적 차원까지 활용.

### 10.1 매칭 전략 개요

```
┌──────────────────────────────────────────────────────────┐
│  3-Tier 매칭 전략                                         │
│                                                          │
│  Tier 1: 기본 매칭 — 7D V_Final + 교차축 유사도           │
│  Tier 2: 심화 매칭 — 유저 L1+L2 + 교차축 구조 매칭       │
│  Tier 3: 탐색 매칭 — Paradox 호환 + 교차축 다양성         │
│                                                          │
│  + 비정량적 보정: Voice 유사도, 서사 호환성               │
└──────────────────────────────────────────────────────────┘
```

### 10.2 타입 정의

```typescript
// src/lib/matching/types.ts

type MatchingTier = 'basic' | 'advanced' | 'exploration'

interface MatchingInput {
  userL1: SocialPersonaVector
  userL2?: CoreTemperamentVector          // 심화 매칭용 (온보딩 설문)
  userVoiceProfile?: VoiceProfile         // 비정량적 매칭용
  persona: {
    social: SocialPersonaVector
    temperament: CoreTemperamentVector
    narrative: NarrativeDriveVector
    dynamics: DynamicsConfig
    voiceProfile?: VoiceProfile
    backstory?: BackstoryDimension
    crossAxisProfile?: CrossAxisProfile   // 사전 캐시 또는 실시간 계산
  }
  context: {
    pressure: number
    tier: MatchingTier
  }
}

interface MatchingResult {
  score: number                           // 0.0~1.0 — 최종 통합 점수
  tier: MatchingTier
  breakdown: {
    vectorScore: number                   // 7D V_Final 유사도
    crossAxisScore: number                // 교차축 프로필 유사도
    paradoxCompatibility: number          // Paradox 호환성
    qualitativeScore: number              // 비정량적 보정
  }
  vFinal: VFinalResult
  explanation: string                     // "추천 이유" (LLM용)
}
```

### 10.3 Tier 1: 기본 매칭

**7D V_Final 유사도(70%) + 교차축 프로필 유사도(30%)** 가중 합산.

```typescript
// src/lib/matching/basic-matching.ts

/**
 * 교차축 유사도: 유저와 페르소나의 CrossAxisProfile을 비교.
 * 같은 축에서 비슷한 스코어 → 높은 유사도 = "성격 구조가 비슷하다".
 * paradox/reinforcing 축에 가중치를 부여하여 캐릭터 깊이 반영.
 */
function basicMatch(input: MatchingInput): MatchingResult {
  const { userL1, persona, context } = input

  // 1. V_Final 계산 (crossAxisProfile 포함)
  const vFinal = calculateVFinal(
    persona.social, persona.temperament,
    persona.narrative, persona.dynamics, context.pressure,
  )

  // 2. 7D 벡터 유사도 (기존)
  const userArr = socialVectorToArray(userL1)
  const vectorScore = hybridSimilarity(userArr, vFinal.vector, WEIGHTS, 0.6)

  // 3. 교차축 프로필 유사도 (신규)
  const userCrossAxis = calculateCrossAxisFromL1(userL1)
  const crossAxisScore = crossAxisSimilarity(
    userCrossAxis, vFinal.crossAxisProfile,
  )

  const score = vectorScore * 0.7 + crossAxisScore * 0.3

  return {
    score, tier: 'basic',
    breakdown: { vectorScore, crossAxisScore, paradoxCompatibility: 0, qualitativeScore: 0 },
    vFinal,
    explanation: buildExplanation('basic', vectorScore, crossAxisScore),
  }
}

/**
 * 교차축 유사도: 83축 스코어 배열의 가중 코사인 유사도.
 * paradox 축 ×1.5, reinforcing ×1.2, modulating ×1.0, neutral ×0.5.
 */
function crossAxisSimilarity(a: CrossAxisProfile, b: CrossAxisProfile): number {
  const weights = a.axes.map(ax => {
    if (ax.relationship === 'paradox') return 1.5
    if (ax.relationship === 'reinforcing') return 1.2
    if (ax.relationship === 'modulating') return 1.0
    return 0.5
  })
  return weightedCosineSimilarity(
    a.axes.map(ax => ax.score),
    b.axes.map(ax => ax.score),
    weights,
  )
}
```

### 10.4 Tier 2: 심화 매칭

**유저 L2(OCEAN)가 있을 때** 활성화. 정식 교차축 + Paradox 호환성.

```typescript
// src/lib/matching/advanced-matching.ts

/**
 * 심화 매칭 = V_Final(50%) + 교차축(30%) + Paradox 호환성(20%)
 *
 * Paradox 호환성:
 * - 유사 매칭: 같은 역설 유형이 비슷한 강도 → 공감
 * - 보완 매칭: 다른 역설 유형이 강함 → 새로운 관점 (세렌디피티)
 * - compatibility = 0.7 × similarity + 0.3 × complementarity
 */
function advancedMatch(input: MatchingInput): MatchingResult {
  const { userL1, userL2, persona, context } = input
  if (!userL2) return basicMatch(input) // fallback

  const vFinal = calculateVFinal(
    persona.social, persona.temperament,
    persona.narrative, persona.dynamics, context.pressure,
  )

  const vectorScore = hybridSimilarity(
    socialVectorToArray(userL1), vFinal.vector, WEIGHTS, 0.6,
  )

  // 정식 교차축 (유저 L1+L2로 계산)
  const userCrossAxis = calculateCrossAxisProfile(userL1, userL2, DEFAULT_L3)
  const crossAxisScore = crossAxisSimilarity(userCrossAxis, vFinal.crossAxisProfile)

  // Paradox 호환성
  const userParadox = calculateExtendedParadoxScore(userL1, userL2, DEFAULT_L3)
  const paradoxCompatibility = calculateParadoxCompatibility(
    userParadox, vFinal.paradoxProfile,
  )

  const score = vectorScore * 0.5 + crossAxisScore * 0.3 + paradoxCompatibility * 0.2

  return {
    score, tier: 'advanced',
    breakdown: { vectorScore, crossAxisScore, paradoxCompatibility, qualitativeScore: 0 },
    vFinal,
    explanation: buildExplanation('advanced', vectorScore, crossAxisScore, paradoxCompatibility),
  }
}

/**
 * Paradox 호환성 계산.
 * similarity = 1 - |user.overall - persona.overall|
 * complementarity = dominant layer가 다르면 0.8, 같으면 0.3
 */
function calculateParadoxCompatibility(
  userP: ParadoxProfile,
  personaP: ParadoxProfile,
): number {
  const similarity = 1 - Math.abs(userP.overall - personaP.overall)
  const complementarity = userP.dominant.layer !== personaP.dominant.layer ? 0.8 : 0.3
  return similarity * 0.7 + complementarity * 0.3
}
```

### 10.5 Tier 3: 탐색 매칭

**"아직 만나지 못한 유형의 페르소나"** 추천. 유사성이 아닌 **차별성**을 최대화.

```typescript
// src/lib/matching/exploration-matching.ts

/**
 * 탐색 매칭 = Paradox 다양성(40%) + 교차축 차별성(40%) + 아키타입 신선도(20%)
 */
function explorationMatch(
  input: MatchingInput,
  recentArchetypes: string[],
): MatchingResult {
  const { userL1, persona, context } = input

  const vFinal = calculateVFinal(
    persona.social, persona.temperament,
    persona.narrative, persona.dynamics, context.pressure,
  )

  // Paradox 다양성: 유저와 "다른" 역설 강도 선호
  const userParadox = calculateL1L2ParadoxScore(userL1, DEFAULT_L2)
  const paradoxDiversity = Math.abs(vFinal.paradoxProfile.overall - userParadox)

  // 교차축 차별성: 유저와 "다른" 구조 선호
  const userCrossAxis = calculateCrossAxisFromL1(userL1)
  const crossAxisDivergence = 1 - crossAxisSimilarity(
    userCrossAxis, vFinal.crossAxisProfile,
  )

  // 아키타입 신선도: 최근 안 만난 유형 우선
  const archetypeFreshness = recentArchetypes.includes(persona.archetypeId) ? 0.2 : 1.0

  const score = paradoxDiversity * 0.4 + crossAxisDivergence * 0.4 + archetypeFreshness * 0.2

  return {
    score, tier: 'exploration',
    breakdown: {
      vectorScore: 0, crossAxisScore: crossAxisDivergence,
      paradoxCompatibility: paradoxDiversity, qualitativeScore: archetypeFreshness,
    },
    vFinal,
    explanation: buildExplanation('exploration', paradoxDiversity, crossAxisDivergence),
  }
}
```

### 10.6 비정량적 매칭 보정

모든 Tier에 적용. Voice 유사도 + 서사 호환성으로 **±0.1 보정**.

```typescript
// src/lib/matching/qualitative-matching.ts

/**
 * Voice 유사도 (60%): tonalMood 일치, speechPatterns 중첩, 어휘 수준 차이
 * 서사 호환성 (40%): backstory.nlpKeywords와 유저 관심사 키워드 교집합
 * 결과: (raw - 0.5) × 0.2 → ±0.1 보정값
 */
interface QualitativeBonus {
  voiceSimilarity: number         // 0.0~1.0
  narrativeCompatibility: number  // 0.0~1.0
  combined: number                // -0.1 ~ +0.1
}

function calculateQualitativeBonus(
  userVoice?: VoiceProfile,
  userInterests?: string[],
  personaVoice?: VoiceProfile,
  personaBackstory?: BackstoryDimension,
): QualitativeBonus

function compareVoiceProfiles(a: VoiceProfile, b: VoiceProfile): number
```

### 10.7 통합 매칭 엔진

```typescript
// src/lib/matching/engine.ts

export function matchPersona(input: MatchingInput): MatchingResult {
  // Tier 분기
  let result: MatchingResult
  switch (input.context.tier) {
    case 'basic':       result = basicMatch(input); break
    case 'advanced':    result = advancedMatch(input); break
    case 'exploration': result = explorationMatch(input, []); break
  }

  // 비정량적 보정
  const bonus = calculateQualitativeBonus(
    input.userVoiceProfile, undefined,
    input.persona.voiceProfile, input.persona.backstory,
  )
  result.score = Math.max(0, Math.min(1, result.score + bonus.combined))
  result.breakdown.qualitativeScore = bonus.combined

  return result
}
```

### 10.8 피드 혼합 전략

```
피드 구성 시 3개 Tier 혼합:
  기본 매칭: 60% (유사한 페르소나)
  탐색 매칭: 30% (새로운 유형)
  심화 매칭: 10% (유저 L2가 있을 때만, 없으면 기본에 합산)

인터리빙 규칙:
  - 연속 3개 이상 같은 Tier 금지
  - Paradox Score 0.3~0.5 구간 페르소나 우선 (최적 차원성)
  - 최근 1시간 내 상호작용한 페르소나 중복 제거
```

---

## 11. 일관성 검증 (6-Category Validation Engine)

> **핵심 변경**: 기존 5항목 테이블 → 6대 카테고리 × 구체적 알고리즘.
> L2↔L3, 정성↔정량, 교차축 검증이 실제 코드로 구현됨.

### 11.1 검증 카테고리 및 가중치

| # | 카테고리 | 항목 수 | 가중치 | 구현 함수 |
|---|---------|---------|--------|-----------|
| A | 구조적 (범위, 필수 필드, α+β) | 3 | 15% | `validateStructural()` |
| B | L1↔L2 역설 타당성 | 2 | 20% | `validateL1L2Paradox()` |
| C | L2↔L3 정합성 | 4 | 20% | `validateL2L3Consistency()` |
| D | 정성적↔정량적 | 3 | 20% | `validateQualitativeQuantitative()` |
| E | 교차축 일관성 | 3 | 15% | `validateCrossAxisConsistency()` |
| F | 동적 설정 | 2 | 10% | `validateDynamicsConfig()` |

### 11.2 검증 결과 타입

```typescript
type ValidationLevel = 'error' | 'warning' | 'info'

interface ValidationIssue {
  level: ValidationLevel
  category: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  code: string              // 예: 'C1_LACK_PARADOX_MISMATCH'
  message: string
  dimensions?: string[]     // 관련 차원
  actualValues?: Record<string, number>
}

interface ValidationResult {
  issues: ValidationIssue[]
  consistencyScore: number   // 0.0~1.0 종합 점수
  categoryScores: Record<string, number>  // 카테고리별 pass rate
  isValid: boolean           // Error가 하나라도 있으면 false
}
```

### 11.3 카테고리 C: L2↔L3 정합성 검증

```typescript
function validateL2L3Consistency(
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  paradoxScore: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // C1: 결핍-역설 정합성
  if (l3.lack >= 0.7 && paradoxScore < 0.2) {
    issues.push({
      level: 'warning', category: 'C', code: 'C1_LACK_PARADOX_MISMATCH',
      message: `높은 결핍(lack=${l3.lack})에 비해 역설이 부족(paradox=${paradoxScore})`,
      dimensions: ['L3.lack', 'ParadoxScore'],
      actualValues: { lack: l3.lack, paradoxScore },
    })
  }
  if (l3.lack < 0.2 && paradoxScore >= 0.7) {
    issues.push({
      level: 'info', category: 'C', code: 'C1_LOW_LACK_HIGH_PARADOX',
      message: `결핍 낮음(${l3.lack})에 높은 역설(${paradoxScore}). 결핍 외 동기 확인 필요`,
      dimensions: ['L3.lack', 'ParadoxScore'],
    })
  }

  // C2: 변동성-신경증 일관성
  const volNeuGap = Math.abs(l3.volatility - l2.neuroticism)
  if (volNeuGap > 0.5) {
    issues.push({
      level: 'warning', category: 'C', code: 'C2_VOLATILITY_NEUROTICISM_GAP',
      message: `변동성(${l3.volatility})과 신경증(${l2.neuroticism}) 괴리(${volNeuGap.toFixed(2)})`,
      dimensions: ['L3.volatility', 'L2.neuroticism'],
      actualValues: { volatility: l3.volatility, neuroticism: l2.neuroticism },
    })
  }

  // C3: 범위-개방성 정합성
  if (l3.scope >= 0.8 && l2.openness < 0.3) {
    issues.push({
      level: 'info', category: 'C', code: 'C3_SCOPE_OPENNESS_DIVERGENCE',
      message: `거시적 서사(scope=${l3.scope})에 낮은 개방성(openness=${l2.openness})`,
      dimensions: ['L3.scope', 'L2.openness'],
    })
  }

  // C4: 도덕-친화 정합성
  if (l3.moralCompass < 0.2 && l2.agreeableness >= 0.8) {
    issues.push({
      level: 'warning', category: 'C', code: 'C4_IMMORAL_AGREEABLE',
      message: `비도덕적(moral=${l3.moralCompass})이면서 높은 친화(agree=${l2.agreeableness})`,
      dimensions: ['L3.moralCompass', 'L2.agreeableness'],
      actualValues: { moralCompass: l3.moralCompass, agreeableness: l2.agreeableness },
    })
  }

  return issues
}
```

### 11.4 카테고리 D: 정성적↔정량적 검증

```typescript
async function validateQualitativeQuantitative(
  persona: PersonaV3,
  llmRouter: TierRouter,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []

  // D1: 서사↔Init 벡터 정합성
  const keywords = await extractKeywords(persona.backstory)
  for (const keyword of keywords) {
    for (const category of keyword.categories) {
      const mappings = CATEGORY_MAPPING_TABLE.filter(m => m.category === category)
      for (const mapping of mappings) {
        const actual = getVectorValue(persona, mapping.dimension)
        const expectedHigh = mapping.deltaDirection > 0
        if (expectedHigh && actual < 0.4) {
          issues.push({
            level: 'warning', category: 'D', code: 'D1_KEYWORD_VECTOR_MISMATCH',
            message: `키워드 '${keyword.text}'→${mapping.dimension}↑ 암시, 실제=${actual}`,
            dimensions: [mapping.dimension],
          })
        }
        if (!expectedHigh && actual > 0.6) {
          issues.push({
            level: 'warning', category: 'D', code: 'D1_KEYWORD_VECTOR_MISMATCH',
            message: `키워드 '${keyword.text}'→${mapping.dimension}↓ 암시, 실제=${actual}`,
            dimensions: [mapping.dimension],
          })
        }
      }
    }
  }

  // D2: Voice↔L1 정합성 (LLM 기반)
  const voiceAnalysis = await llmRouter.execute({
    tier: 'medium',
    prompt: VOICE_ANALYSIS_PROMPT,
    input: JSON.stringify({ tone: persona.voice.tone, habits: persona.voice.speechHabits }),
    outputSchema: voiceRangeSchema,
  })
  for (const [dim, range] of Object.entries(voiceAnalysis.expectedRanges)) {
    const actual = getVectorValue(persona.l1, dim)
    if (actual < range.min || actual > range.max) {
      issues.push({
        level: 'warning', category: 'D', code: 'D2_VOICE_VECTOR_MISMATCH',
        message: `Voice→${dim}=[${range.min},${range.max}] 예상, 실제=${actual}`,
        dimensions: [`L1.${dim}`],
      })
    }
  }

  // D3: Triggers↔L3 정합성
  const triggers = persona.pressureTriggers ?? []
  if (triggers.length > 0 && persona.l3.volatility < 0.2) {
    issues.push({
      level: 'warning', category: 'D', code: 'D3_TRIGGER_LOW_VOLATILITY',
      message: `트리거 ${triggers.length}개인데 volatility=${persona.l3.volatility}`,
    })
  }
  if (persona.l3.volatility >= 0.7 && triggers.length === 0) {
    issues.push({
      level: 'warning', category: 'D', code: 'D3_HIGH_VOLATILITY_NO_TRIGGER',
      message: `volatility=${persona.l3.volatility}인데 트리거 미정의`,
    })
  }

  return issues
}
```

### 11.5 카테고리 E: 교차축 일관성 검증

```typescript
function validateCrossAxisConsistency(
  crossAxisProfile: CrossAxisProfile,
  paradoxProfile: PardoxProfile,
  persona: PersonaV3,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // E1: 스코어 범위
  for (const axis of crossAxisProfile.axes) {
    if (axis.score < 0 || axis.score > 1) {
      issues.push({
        level: 'error', category: 'E', code: 'E1_SCORE_OUT_OF_RANGE',
        message: `교차축 '${axis.name}' 스코어=${axis.score} 범위 초과`,
      })
    }
  }

  // E2: 관계 유형별 검증
  for (const axis of crossAxisProfile.axes) {
    const dimA = getVectorValue(persona, axis.layerADim)
    const dimB = getVectorValue(persona, axis.layerBDim)
    const gap = Math.abs(dimA - dimB)

    if (axis.relationship === 'paradox' && gap < 0.1 && axis.score > 0.7) {
      issues.push({
        level: 'warning', category: 'E', code: 'E2_PARADOX_LOW_GAP_HIGH_SCORE',
        message: `'${axis.name}' paradox: 차원 괴리(${gap.toFixed(2)}) 작은데 스코어 높음(${axis.score})`,
      })
    }
    if (axis.relationship === 'reinforcing' && gap > 0.6 && axis.score > 0.7) {
      issues.push({
        level: 'warning', category: 'E', code: 'E2_REINFORCING_HIGH_GAP_HIGH_SCORE',
        message: `'${axis.name}' reinforcing: 차원 괴리(${gap.toFixed(2)}) 큰데 스코어 높음(${axis.score})`,
      })
    }
  }

  // E3: Extended Paradox Score 재계산 검증
  const { extendedScore, l1l2Score, l1l3Score, l2l3Score } = paradoxProfile
  const expected = 0.50 * l1l2Score + 0.30 * l1l3Score + 0.20 * l2l3Score
  if (Math.abs(extendedScore - expected) > 0.01) {
    issues.push({
      level: 'error', category: 'E', code: 'E3_EPS_CALCULATION_MISMATCH',
      message: `EPS=${extendedScore} ≠ 가중합산=${expected.toFixed(4)}`,
    })
  }

  return issues
}
```

### 11.6 종합 점수 계산

```typescript
function computeConsistencyScore(issues: ValidationIssue[]): {
  total: number
  byCategory: Record<string, number>
} {
  const WEIGHTS: Record<string, number> = {
    A: 0.15, B: 0.20, C: 0.20, D: 0.20, E: 0.15, F: 0.10,
  }
  const CATEGORY_COUNTS: Record<string, number> = {
    A: 3, B: 2, C: 4, D: 3, E: 3, F: 2,
  }

  const byCategory: Record<string, number> = {}
  for (const [cat, count] of Object.entries(CATEGORY_COUNTS)) {
    const catIssues = issues.filter(
      i => i.category === cat && (i.level === 'error' || i.level === 'warning')
    )
    byCategory[cat] = Math.max(0, (count - catIssues.length) / count)
  }

  const total = Object.entries(WEIGHTS).reduce(
    (sum, [cat, w]) => sum + w * (byCategory[cat] ?? 1.0), 0
  )
  return { total, byCategory }
}
```

### 11.7 구현 파일

`apps/engine-studio/src/lib/persona-generation/consistency-validator.ts` (전면 재작성)

---

## 12. 컬러지문 (P-inger Print) 시스템

> **핵심 원칙: "생성은 예술적으로, 저장은 공학적으로"**
> 컬러지문은 단순 시각화가 아니라 **미래 스캐너 디코딩이 가능한 데이터 구조**다.
> 최종 PNG만 저장하면 복원 불가. **SVG(벡터 경로) + JSON(메타데이터)** 이중 저장 필수.
> 스키마 파일: `docs/schemas/fingerprint-v1.json`

### 12.1 현재 상태 — 6D 하드코딩

현재 컬러지문 컴포넌트 3종이 존재하며, **모두 6D `TRAIT_DIMENSIONS`에 하드코딩**되어 있다.

| 컴포넌트 | 파일 위치 (4개 앱에 중복) | 형태 | 핵심 로직 |
|----------|--------------------------|------|-----------|
| `TraitColorFingerprint` | `components/charts/trait-color-fingerprint.tsx` | 레이더 차트 + 컬러 섹터 | 6D 축별 방사형 그라디언트, Catmull-Rom 스플라인 |
| `PingerPrint2D` | `components/p-inger-print-2d.tsx` | 지문 소용돌이 패턴 | 6D → 릿지 개수, 소용돌이 회전, 비대칭, 주름, 불규칙성, 중심오프셋 |
| `PingerPrint3D` | `components/p-inger-print-3d.tsx` (landing만) | Three.js Jacks 오브젝트 | 6D → 팔 6개 길이/굵기/크롬 컬러 |

**중복 현황**: PingerPrint2D는 4개 앱에 각각 복사됨, TraitColorFingerprint는 engine-studio + persona-world에 복사됨

### 12.2 v3 설계 원칙

```
기존: 6D 값 → 단일 패턴 → PNG만 저장
v3:   3-Layer × 교차 관계 → 다층 시각 표현 → SVG + JSON + PNG 구조화 저장
```

**7대 원칙:**

1. **레이어 시각 분리**: L1/L2/L3가 시각적으로 구분 가능해야 함
2. **역설(Paradox) 표현**: L1↔L2 모순이 시각적으로 드러나야 함
3. **압력(Pressure) 반영**: P값에 따라 지문이 동적으로 변형
4. **확장성**: 향후 차원/레이어 추가 시 코드 수정 최소화
5. **데이터 구조 저장**: 그림이 아니라 데이터로 저장 — SVG + JSON 이중 보관
6. **미래 스캐너 대비**: geometry + color 이중 채널 디코딩 가능한 규격
7. **결정론적 고유성**: 같은 벡터 → 같은 지문, 다른 벡터 → 다른 지문

### 12.3 6대 고정 규칙

구현 시 예외 없이 적용하는 규칙.

| # | 규칙 | 설명 |
|---|------|------|
| 1 | **패턴 클래스 고정** | ulnar_loop, radial_loop, plain_whorl, double_loop_whorl, central_pocket_whorl, plain_arch, tented_arch — 7종 |
| 2 | **core/delta 좌표 정규화** | core 1개, delta 1~2개, 좌표는 0~1 정규화 |
| 3 | **ridge_index 단방향 증가** | 중심에서 바깥으로 단방향 증가 |
| 4 | **color_per_ridge** | 각 릿지에 1색 할당 (인코딩 채널로 활용) |
| 5 | **최소 선폭/간격 고정** | 디지털: 선폭 ≥ 4px(권장 6~10), 간격 ≥ 4px(권장 6~12). 인쇄(300dpi): 선폭 0.4~0.8mm, 간격 0.4~1.0mm |
| 6 | **self-intersection 금지** | 비대칭은 허용하되, 자기교차(self-intersection)는 절대 금지 |

### 12.4 패턴 타입 ↔ 벡터 결정론적 매핑

L1 dominant axis가 패턴 타입을 결정한다. 같은 벡터는 항상 같은 패턴.

| L1 Dominant Axis | Pattern Type | 시각적 의미 |
|------------------|-------------|-------------|
| depth (분석 깊이) | `plain_whorl` | 소용돌이 — 깊이 있는 분석 |
| lens (판단 렌즈) | `tented_arch` | 뾰족한 아치 — 날카로운 판단 |
| stance (평가 태도) | `double_loop_whorl` | 이중 루프 — 비판의 양면성 |
| scope (관심 범위) | `central_pocket_whorl` | 중심 포켓 — 디테일 집중 |
| taste (취향 성향) | `radial_loop` | 방사 루프 — 실험적 확장 |
| purpose (소비 목적) | `ulnar_loop` | 편향 루프 — 의미 추구 방향 |
| sociability (사회적 성향) | `plain_arch` | 아치 — 열린 구조 |

**동점 처리**: L1 dominant가 2개 이상이면 `index가 작은 축` 우선 (depth > lens > ... > sociability)

### 12.5 고유성 엔진

**완전 랜덤이 아닌 재현 가능한 랜덤.**

```
seed = SHA256(persona_vector_json + schema_version + salt)
```

- `persona_vector_json`: L1(7D) + L2(5D) + L3(4D) 정렬된 JSON 직렬화
- `schema_version`: "1.0.0"
- `salt`: 초기값 "", 충돌 시 증가

**seed → 지문 요소 생성:**

| 생성 요소 | seed에서 추출 방식 |
|----------|-------------------|
| 패턴 타입 | L1 dominant axis (seed 불필요 — 결정론적) |
| core/delta 좌표 | seed[0:8] → 정규화 좌표 |
| 릿지 곡률/간격 | seed[8:16] → 변형 파라미터 |
| minutiae 배치 | seed[16:24] → 세부 특징점 |
| 색상 hue_seed | seed[24:32] → 시작 색상각 |

**충돌 검사 (생성 후):**

```
1. perceptual_hash (pHash) → hamming distance ≥ 8
2. SSIM ≤ 0.85
3. curve_distance ≥ 0.15
4. color_histogram_intersection ≤ 0.7
```

충돌 시 `salt` 변경 후 재생성. 최대 재시도 횟수 초과 시 `manual_review` 또는 `reject_generation`.

### 12.6 색상 인코딩 규칙 (Pantone-free)

> **법적 안전**: 팬톤(Pantone) 완전 미사용. CIELAB(D50) + OKLCH 오픈 표준만 사용.

**이중 색공간 전략:**

| 용도 | 색공간 | 이유 |
|------|--------|------|
| **내부 기준/저장** | CIELAB(D50) | 장치 독립, 오픈 표준, 라이선스 이슈 없음 |
| **UI 렌더링/보간** | OKLCH | 시각적 균등 보간, CSS `oklch()` 네이티브 |
| **화면 표시** | sRGB HEX | CIELAB에서 파생, 호환용 |
| **인쇄** | CIELAB → ICC 프로파일 → CMYK | 팬톤 불필요 |

**릿지별 색상 = 인코딩 채널:**

```
ridge_index i마다:
  1. 의미축 값(0~1)을 OKLCH의 L(명도) / C(채도) / H(색상각)에 매핑
  2. 인접 릿지 간 ΔE00 ≥ min_adjacent_delta_e00 (기본 5) 보장
  3. 저장: { hex, oklch: {l,c,h}, lab: {L,a,b}, delta_e00_to_prev }
```

**C_Final (현재색) 계산 — LAB 공간 보간:**

```
C_L1 = L1 7D의 LAB 가중 평균 (레이어 요약색)
C_L2 = L2 5D의 LAB 가중 평균
C_L3 = L3 4D의 LAB 가중 평균

C_Final = (1 - P) × C_L1 + P × (α × C_L2 + β × C_L3)

→ 모든 보간은 LAB 공간에서 수행 (RGB 보간 금지)
→ P 변화 시 C_Final만 이동, 나머지 색상은 고정
```

### 12.7 이중 렌더 모드

| 모드 | blur/glow/shadow | 용도 | 내보내기 |
|------|-----------------|------|---------|
| `canonical` | **전부 OFF** | 저장, 미래 스캐너, 아카이브 | SVG + meta_json 필수 |
| `display` | **허용** | 화면 UI, 기존 미학 유지 | PNG 선택적 |

- canonical 렌더가 **원본**. display 렌더는 canonical에 이펙트를 얹은 파생물.
- DB에는 canonical SVG + JSON만 저장. display는 런타임 생성.

### 12.8 ridge_weight ↔ 압력(P) 동적 연결

`layers[].ridge_weight`는 고정값이 아니라 **P에서 계산되는 파생값**.

```
P=0 (안정):  L1.weight = 0.7   L2.weight = 0.2   L3.weight = 0.1
P=0.5:       L1.weight = 0.5   L2.weight = 0.35  L3.weight = 0.15
P=1 (극한):  L1.weight = 0.3   L2.weight = 0.5   L3.weight = 0.2
```

**공식 (Beta v1):**

```
L1.ridge_weight = (1 - P) * 0.7 + 0.3           → 0.3 ~ 1.0
L2.ridge_weight = P * alpha * 0.7 + 0.15         → 0.15 ~ 0.64 (alpha=0.7 기준)
L3.ridge_weight = P * beta * 0.5 + 0.05          → 0.05 ~ 0.2  (beta=0.3 기준)
```

시각적 의미: **압력이 올라가면 L1(가면) 릿지가 얇아지고, L2(본성) 릿지가 두꺼워짐** — "가면이 벗겨지는" 시각화.

### 12.9 `TraitColorFingerprint` v3 — 다층 레이더 차트

기존 단일 레이더 차트를 **3중 레이어 레이더**로 진화.

```
데이터 입력:
{
  l1: { depth: 0.8, lens: 0.3, ... },           // 7D — 외부 링(메인)
  l2: { openness: 0.6, ... },                    // 5D — 내부 링
  l3: { lack: 0.7, ... },                        // 4D — 코어 마크
  paradoxScore: 0.45,                             // 중심 글로우 색상 결정
  pressure?: number,                              // V_Final 오버레이 (선택)
}
```

**시각 구조:**

```
┌─────────────────────────────┐
│                             │
│    L1 레이더 (7축, 외곽)     │  ← 기존과 유사하지만 7D
│      ┌───────────────┐      │
│      │ L2 레이더      │      │  ← 내부, 5축, OCEAN
│      │  (5축, 내부)   │      │     축 위치는 L1 대응축과 정렬
│      │   ┌───────┐   │      │
│      │   │L3 마크 │   │      │  ← 중심 영역, 4개 심볼
│      │   └───────┘   │      │
│      └───────────────┘      │
│                             │
│  [역설 인디케이터: 대응축     │  ← L1↔L2 역설 페어를
│   사이 점선 + 색상 강도]     │     시각적으로 연결
│                             │
└─────────────────────────────┘
```

```typescript
interface TraitColorFingerprintV3Props {
  l1: Record<string, number>             // L1 Social (7D)
  l2?: Record<string, number>            // L2 Temperament (5D, 선택)
  l3?: Record<string, number>            // L3 Narrative (4D, 선택)
  paradoxScore?: number                  // 0.0~1.0
  pressure?: number                      // V_Final 오버레이용
  vFinal?: number[]                      // V_Final 벡터 (7D)

  size?: number
  mode?: 'compact' | 'full' | 'detail'  // compact=L1만, full=L1+L2, detail=전체
  showLabels?: boolean
  showGrid?: boolean
  showValues?: boolean
  showParadoxLinks?: boolean             // 역설 페어 연결선
  showVFinalOverlay?: boolean            // V_Final 오버레이
  interactive?: boolean                  // 호버 시 상세 정보
}
```

**핵심 시각 요소:**

| 요소 | 설명 | 색상 소스 |
|------|------|-----------|
| L1 외곽 레이더 | 7축 레이더 차트 (메인) | `dimension-colors.ts` L1 |
| L2 내부 레이더 | 5축 레이더 차트, L1보다 작은 반경 | `dimension-colors.ts` L2 |
| L3 코어 심볼 | 중심부 4개 방사형 마크 (lack=원, moral=십자, volatility=번개, growth=화살) | `dimension-colors.ts` L3 |
| 역설 연결선 | L1↔L2 대응 축을 점선으로 연결, 역설 크면 빨강, 작으면 초록 | `cross-axis-colors.ts` |
| 중심 글로우 | paradoxScore에 따라 중심 방사 글로우 색상 변화 | `engine-meta-colors.ts` paradoxScore |
| V_Final 오버레이 | 반투명 7축 레이더 (V_Final 벡터) — 압력에 따라 L1과의 차이 시각화 | `engine-meta-colors.ts` vFinal |

### 12.10 `PingerPrint2D` v3 — 다층 지문 패턴

기존 소용돌이 패턴을 **3겹 릿지 레이어**로 확장.

```
데이터 입력: 동일 (l1, l2, l3, paradoxScore, pressure)
```

**시각 구조:**

```
┌────────────────────────────────────┐
│                                    │
│  ╔══════════════════════════╗      │
│  ║  외곽 릿지 (L1 = 7D)     ║      │  ← 현재와 유사
│  ║  ┌──────────────────┐   ║      │     depth → 릿지 밀도
│  ║  │ 중간 릿지 (L2)    │   ║      │     lens → 소용돌이 회전
│  ║  │ ┌────────────┐   │   ║      │     stance → 비대칭
│  ║  │ │ 코어 릿지   │   │   ║      │     ...
│  ║  │ │  (L3)      │   │   ║      │
│  ║  │ └────────────┘   │   ║      │
│  ║  └──────────────────┘   ║      │
│  ╚══════════════════════════╝      │
│                                    │
└────────────────────────────────────┘
```

**L1 → 릿지 변형 (기존 6D 로직 확장):**

| 6D 파라미터 | v3 매핑 (L1 7D) | 추가: L2 영향 | 추가: L3 영향 |
|------------|----------------|--------------|--------------|
| `ridgeCount` | depth (릿지 밀도) | openness → 밀도 배율 | — |
| `spiralTurns` | lens (회전 수) | neuroticism → 떨림 | volatility → 불규칙 강도 |
| `asymmetry` | stance (비대칭) | agreeableness → 대칭/비대칭 | moralCompass → 경직도 |
| `wrinkleFactor` | scope (세부 주름) | conscientiousness → 정교함 | — |
| `irregularity` | taste (불규칙성) | openness → 실험적 변형 | growthArc → 패턴 변화율 |
| `centerOffset` | purpose (중심 이동) | — | lack → 중심 불안정 |
| **NEW** `layerGap` | sociability | extraversion → 레이어 간격 | — |

**L2 중간 릿지 레이어:**
- L1 릿지 안쪽에 별도 릿지 세트 생성
- L2 OCEAN 5D가 릿지 형태를 결정
- 색상: L2 레이어 그룹색 (앰버 계열)
- L1↔L2 paradoxScore가 높을수록 두 릿지 레이어의 패턴 차이가 커짐 (시각적 모순)

**L3 코어 릿지 레이어:**
- 가장 안쪽, 어두운 색상 (바이올렛 계열)
- 4D가 코어 패턴의 "결" 을 결정
- lack → 중심 공백 크기 (결핍이 클수록 중심이 비어있음)
- moralCompass → 릿지 정렬도 (엄격할수록 정렬)
- volatility → 릿지 요동 (높을수록 끊기는 릿지)
- growthArc → 릿지 방향성 (높을수록 나선이 바깥으로 퍼짐)

```typescript
interface PingerPrint2DV3Props {
  l1: Record<string, number>
  l2?: Record<string, number>
  l3?: Record<string, number>
  paradoxScore?: number
  pressure?: number

  size?: number
  mode?: 'l1-only' | 'l1-l2' | 'full'    // 레이어 표시 범위
  showLabel?: boolean
  animate?: boolean                        // pressure 변화 시 애니메이션
}
```

### 12.11 `PingerPrint3D` v3 — 다층 Jacks 오브젝트

기존 6팔 Jacks를 **3단계 팔 구조**로 확장.

```
현재: 6개 팔 (L1 6D)
v3:   7개 외팔 (L1) + 5개 내팔 (L2) + 4개 코어 마크 (L3) = 16 요소
      + 역설 연결 아크 (paradox 페어 사이 빛 아크)
      + 압력 반응 (P에 따라 외팔 수축, 내팔 팽창 — 가면이 벗겨지는 시각화)
```

```typescript
interface PingerPrint3DV3Props {
  l1: Record<string, number>
  l2?: Record<string, number>
  l3?: Record<string, number>
  paradoxScore?: number
  pressure?: number

  size?: number
  autoRotate?: boolean
  showLabel?: boolean
  showParadoxArcs?: boolean              // 역설 페어 빛 아크
  pressureAnimation?: boolean            // 압력 반응 애니메이션
}
```

**시각 구조:**

| 요소 | 형태 | 색상 |
|------|------|------|
| L1 외팔 (7개) | 크롬 실린더 + 구체 팁 | L1 차원 색상 (블루 계열) |
| L2 내팔 (5개) | 작은 크롬 실린더 (L1 팔 사이) | L2 차원 색상 (앰버 계열) |
| L3 코어 마크 (4개) | 중심부 부유하는 작은 결정체 | L3 차원 색상 (바이올렛 계열) |
| 역설 아크 | L1↔L2 대응 팔 사이 빛 곡선 | paradox 크기에 비례한 빨강~초록 |
| 중심 구체 | paradoxScore에 따라 글로우 강도 변화 | paradoxScore 스케일 색상 |
| **압력 반응** | P 증가 시: L1 팔 수축 + L2 팔 팽창 (본성 드러남) | V_Final 색상 |

### 12.12 컬러지문 공통 사항

#### 코드 공유 전략

현재 4개 앱에 컴포넌트가 **복사**되어 있음. v3에서는 공유 패키지로 통합.

```
packages/shared-ui/                      ← 신규 패키지 or 기존에 있으면 거기에 추가
├── src/
│   ├── fingerprint/
│   │   ├── index.ts
│   │   ├── trait-color-fingerprint.tsx   ← v3 레이더 차트
│   │   ├── p-inger-print-2d.tsx         ← v3 2D 지문
│   │   ├── p-inger-print-3d.tsx         ← v3 3D Jacks (lazy load)
│   │   ├── types.ts                     ← 공통 Props 타입
│   │   └── utils.ts                     ← 공통 유틸 (좌표 계산, 스플라인 등)
│   └── ...
```

또는 shared-ui 패키지가 없으면 engine-studio에 canonical을 두고 다른 앱에서 import.

#### 하위 호환성

기존 6D `data: Record<string, number>` 인터페이스를 유지하는 래퍼 제공.

```typescript
// 호환 래퍼 — 기존 6D data를 l1으로 변환
export function TraitColorFingerprintCompat(props: { data: Record<string, number>; ... }) {
  return <TraitColorFingerprintV3 l1={props.data} mode="compact" ... />
}
```

#### mode별 렌더링 가이드

| mode | L1 | L2 | L3 | 역설 | 용도 |
|------|----|----|----|----|------|
| `compact` | O | - | - | - | 목록 썸네일, 카드 |
| `l1-l2` | O | O | - | O | 상세 프로필 |
| `full` | O | O | O | O | 편집기, 분석 대시보드 |

### 12.13 구현 파일 목록

| 분류 | 파일 | 변경 수준 |
|------|------|-----------|
| **스키마** | `docs/schemas/fingerprint-v1.json` | **신규** (확정) |
| **스키마 TS 타입** | `src/types/fingerprint.ts` | **신규** |
| **스키마 검증** | `src/lib/fingerprint/schema-validator.ts` | **신규** |
| **고유성 엔진** | `src/lib/fingerprint/uniqueness-engine.ts` | **신규** |
| **릿지 생성기** | `src/lib/fingerprint/ridge-generator.ts` | **신규** |
| **색상 인코딩** | `src/lib/fingerprint/color-encoder.ts` | **신규** |
| **색공간 변환** | `src/lib/fingerprint/color-space.ts` | **신규** |
| **충돌 검사** | `src/lib/fingerprint/collision-checker.ts` | **신규** |
| **SVG 렌더러** | `src/lib/fingerprint/svg-renderer.ts` | **신규** |
| **모듈 index** | `src/lib/fingerprint/index.ts` | **신규** |
| **UI: TraitColorFingerprintV3** | `src/components/charts/trait-color-fingerprint.tsx` | **전면 재작성** |
| **UI: PingerPrint2DV3** | `src/components/charts/p-inger-print-2d.tsx` | **전면 재작성** |
| **UI: PingerPrint3DV3** | `src/components/charts/p-inger-print-3d.tsx` | **전면 재작성** |
| **UI: 공통 타입** | `src/components/charts/fingerprint-types.ts` | **신규** |
| **UI: 공통 유틸** | `src/components/charts/fingerprint-utils.ts` | **신규** |
| **UI: 호환 래퍼** | `src/components/charts/fingerprint-compat.tsx` | **신규** |

---

## 13. 노드 에디터 아키텍처 (ComfyUI 스타일)

### 13.1 현재 상태 — 선형 파이프라인

현재 노드 에디터(`@xyflow/react`)는 **7개 고정 노드의 선형 파이프라인**.

```
BasicInfo → Vector ──→ Prompt → Test ──→ Deploy
         → Character ─┘       → Validation ─┘
```

**핵심 한계:**

| 항목 | 현재 상태 |
|------|-----------|
| 노드 추가/삭제 | **불가** — 7개 고정 |
| 엣지 생성/제거 | **불가** — 8개 하드코딩 |
| 노드 위치 | **고정** — NODE_POSITIONS 상수 |
| 분기/합류 | **없음** — 선형 흐름만 |
| 엣지 데이터 전파 | **없음** — 엣지는 순수 시각용 |
| 데이터 흐름 | **중앙 훅** — `usePersonaEditor` 단일 state가 전부 관리 |
| 노드 간 통신 | **직접 불가** — 모든 변경이 중앙 state를 거침 |

**현재 데이터 흐름:**
```
사용자 입력 → Node.onChange(field, value) → usePersonaEditor.updateXxx()
  → setState(중앙 state) → buildNodes() 재실행 → 모든 Node 리렌더
```

### 13.2 v3 아키텍처 — DAG 기반 자유 노드 그래프

**핵심 전환:**
- 중앙 state → **노드별 독립 state + 엣지 기반 데이터 전파**
- 고정 노드 → **카테고리에서 자유 추가/삭제**
- 고정 엣지 → **사용자가 직접 연결**
- 선형 흐름 → **DAG (Directed Acyclic Graph) 평가**

```
[BasicInfo] ─┬─ [L1 Social 7D] ─────────────────────┐
             ├─ [L2 Temperament 5D] → [Paradox] ────┼→ [V_Final] → [Character] → [Prompt] → [Test] → [Deploy]
             └─ [L3 Narrative 4D] → [Pressure] ─────┘
                     │
              [Archetype Select] ← 선택적 입력
```

### 13.3 노드 카테고리 및 타입

#### Input 노드 (데이터 진입점)

| 노드 ID | 이름 | 입력 | 출력 | 필수 |
|---------|------|------|------|------|
| `basic-info` | BasicInfo | — | `BasicInfoData` | **필수** |
| `l1-vector` | L1 Social Vector | — | `SocialPersonaVector (7D)` | **필수** |
| `l2-vector` | L2 Temperament | — | `CoreTemperamentVector (5D)` | 선택 |
| `l3-vector` | L3 Narrative | — | `NarrativeDriveVector (4D)` | 선택 |
| `archetype-select` | Archetype Select | — | `ArchetypeConfig` | 선택 |

#### Engine 노드 (계산/변환)

| 노드 ID | 이름 | 입력 | 출력 | 자동/수동 |
|---------|------|------|------|-----------|
| `paradox-calc` | Paradox Calculator | `L1`, `L2` | `ParadoxResult` | 자동 |
| `pressure-ctrl` | Pressure Controller | `L3`, `DynamicsConfig?` | `PressureConfig` | 수동 가능 |
| `v-final` | V_Final Engine | `L1`, `L2?`, `L3?`, `P`, `DynamicsConfig` | `VFinalResult (7D)` | 자동 |
| `projection` | Projection Config | `DynamicsConfig` | `ProjectionConfig` | 수동 가능 |

#### Generation 노드 (콘텐츠 생성)

| 노드 ID | 이름 | 입력 | 출력 | 분기 가능 |
|---------|------|------|------|-----------|
| `character-gen` | Character Generator | `V_Final`, `BasicInfo`, `Archetype?` | `CharacterData` | O |
| `backstory-gen` | Backstory Generator | `L1`, `L2`, `L3`, `Paradox` | `BackstoryDimension` | O |
| `voice-gen` | Voice Generator | `L1`, `Character` | `VoiceProfile` | O |
| `activity-gen` | Activity Inference | `L1`, `Character` | `ActivityConfig` | O |
| `content-gen` | Content Style | `V_Final`, `Character` | `ContentSettings` | O |
| `pressure-gen` | Pressure Context | `L3`, `Paradox` | `PressureContext` | O |
| `zeitgeist-gen` | Zeitgeist Profile | `BasicInfo` | `ZeitgeistProfile` | O |

#### Assembly 노드 (합성)

| 노드 ID | 이름 | 입력 | 출력 |
|---------|------|------|------|
| `prompt-builder` | Prompt Builder | `Character`, `Voice`, `Backstory`, `Pressure`, `Zeitgeist`, `Content` | `PromptSet` |
| `interaction-rules` | Interaction Rules | `Backstory`, `Pressure`, `V_Final` | `InteractionRules` |

#### Output 노드 (검증/배포)

| 노드 ID | 이름 | 입력 | 출력 | 필수 |
|---------|------|------|------|------|
| `consistency` | Consistency Check | `전체 데이터` | `ValidationResult` | **필수** |
| `fingerprint` | Fingerprint Generator | `L1`, `L2?`, `L3?`, `Paradox?`, `P?` | `FingerprintProfile` | 선택 |
| `test-sim` | Test Simulation | `PromptSet`, `Character` | `TestResult` | **필수** |
| `deploy` | Deploy | `전체 데이터` | — | **필수** |

### 13.4 포트 타입 시스템

노드 간 연결 시 **포트 타입이 호환**되어야 연결 가능.

```typescript
// 포트 타입 정의
export type PortType =
  | 'BasicInfoData'
  | 'SocialPersonaVector'      // L1 7D
  | 'CoreTemperamentVector'    // L2 5D
  | 'NarrativeDriveVector'     // L3 4D
  | 'ArchetypeConfig'
  | 'ParadoxResult'
  | 'PressureConfig'
  | 'VFinalResult'
  | 'ProjectionConfig'
  | 'DynamicsConfig'
  | 'CharacterData'
  | 'BackstoryDimension'
  | 'VoiceProfile'
  | 'ActivityConfig'
  | 'ContentSettings'
  | 'PressureContext'
  | 'ZeitgeistProfile'
  | 'PromptSet'
  | 'InteractionRules'
  | 'ValidationResult'
  | 'FingerprintProfile'
  | 'TestResult'

export interface NodePort {
  id: string
  label: string
  type: PortType
  direction: 'input' | 'output'
  required: boolean           // 필수 연결 여부
  multi: boolean              // 다중 연결 허용 여부 (input only)
}

// 포트 호환성 매트릭스
// 기본: 동일 타입만 연결 가능
// 예외: ArchetypeConfig → SocialPersonaVector (아키타입이 L1 자동 설정)
export const PORT_COMPATIBILITY: Record<PortType, PortType[]> = {
  SocialPersonaVector: ['SocialPersonaVector', 'ArchetypeConfig'],
  CoreTemperamentVector: ['CoreTemperamentVector', 'ArchetypeConfig'],
  NarrativeDriveVector: ['NarrativeDriveVector', 'ArchetypeConfig'],
  // ... 나머지는 동일 타입만
}
```

**연결 규칙:**
1. output → input 방향만 허용 (input → input, output → output 금지)
2. 포트 타입이 호환되어야 연결 가능 (비호환 시 연결 자체가 안됨)
3. 한 output은 여러 input에 연결 가능 (fan-out)
4. 필수 input은 연결되지 않으면 노드가 "미완료" 상태로 표시
5. **순환 참조 금지** — 연결 시도 시 DAG 검증, 순환 감지되면 연결 차단

### 13.5 DAG 평가 엔진

**핵심: 엣지가 데이터를 전달한다.** 현재의 "중앙 state" 패턴을 폐기하고, 노드 그래프를 DAG로 평가.

```typescript
export interface NodeInstance {
  id: string
  type: string                          // 노드 카테고리의 노드 ID
  position: { x: number; y: number }
  data: Record<string, unknown>         // 노드 내부 설정값
  inputPorts: NodePort[]
  outputPorts: NodePort[]
}

export interface EdgeInstance {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface GraphState {
  nodes: NodeInstance[]
  edges: EdgeInstance[]
}

// DAG 평가 — 위상 정렬 순서로 노드 실행
export function evaluateGraph(graph: GraphState): Map<string, Record<string, unknown>> {
  const sorted = topologicalSort(graph)   // Kahn's algorithm
  const results = new Map<string, Record<string, unknown>>()

  for (const nodeId of sorted) {
    const node = graph.nodes.find(n => n.id === nodeId)!
    const inputs = collectInputs(node, graph.edges, results)  // 연결된 소스 노드 출력 수집
    const output = executeNode(node.type, node.data, inputs)   // 노드 실행
    results.set(nodeId, output)
  }

  return results
}

// 위상 정렬 (Kahn's Algorithm)
export function topologicalSort(graph: GraphState): string[] {
  // 진입 차수(in-degree) 계산
  // 진입 차수 0인 노드부터 BFS
  // 모든 노드 방문 못하면 → 순환 존재 (에러)
}

// 순환 감지 (엣지 추가 전 검증)
export function wouldCreateCycle(graph: GraphState, newEdge: EdgeInstance): boolean {
  // DFS로 target → source 경로 존재 여부 확인
  // 존재하면 순환 — 연결 차단
}
```

**데이터 전파 전략:**

| 전략 | 설명 | 사용 시점 |
|------|------|-----------|
| **Eager (즉시)** | 입력 변경 시 즉시 하위 노드 재평가 | 슬라이더 조정, 벡터 값 변경 |
| **Lazy (지연)** | 변경을 큐에 모아두고 일괄 평가 | 여러 노드 동시 수정 시 |
| **Manual (수동)** | "Evaluate" 버튼 클릭 시만 평가 | 무거운 Generation 노드 |

**기본 설정**: Input/Engine 노드는 Eager, Generation/Assembly 노드는 Manual.

### 13.6 노드 그래프 스토어

중앙 state(`usePersonaEditor`)를 **노드 그래프 스토어**로 교체.

```typescript
import { create } from 'zustand'

interface NodeEditorStore {
  // 그래프 상태
  graph: GraphState
  evaluationResults: Map<string, Record<string, unknown>>

  // 노드 조작
  addNode: (type: string, position: { x: number; y: number }) => void
  removeNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  moveNode: (nodeId: string, position: { x: number; y: number }) => void

  // 엣지 조작
  addEdge: (edge: Omit<EdgeInstance, 'id'>) => void     // 순환 검사 포함
  removeEdge: (edgeId: string) => void

  // 평가
  evaluateAll: () => void                                 // 전체 DAG 재평가
  evaluateFrom: (nodeId: string) => void                  // 특정 노드부터 하위만 재평가
  isDirty: boolean

  // 프리셋
  loadPreset: (preset: FlowPreset) => void
  saveAsPreset: (name: string) => FlowPreset
  currentPresetId: string | null

  // 검증
  getValidationErrors: () => NodeValidationError[]        // 필수 포트 미연결 등
  isGraphComplete: () => boolean                          // 배포 가능 여부

  // 직렬화 (저장/불러오기)
  serialize: () => SerializedGraph
  deserialize: (data: SerializedGraph) => void

  // 저장
  save: () => Promise<void>
  load: (personaId: string) => Promise<void>
}
```

### 13.7 사용 시나리오별 플로우 프리셋

사용자가 처음부터 노드를 배치할 필요 없이, **프리셋 플로우 템플릿**을 선택해서 시작.

```typescript
export interface FlowPreset {
  id: string
  name: string
  description: string
  category: 'quick' | 'standard' | 'advanced' | 'custom'
  nodes: Array<{ type: string; position: { x: number; y: number }; data?: Record<string, unknown> }>
  edges: Array<{ sourceType: string; sourcePort: string; targetType: string; targetPort: string }>
}
```

#### Preset A: 빠른 생성 (최소 노드)

```
[BasicInfo] → [Archetype Select] → [Auto Generate All] → [Consistency] → [Deploy]
```

- 아키타입 하나 고르면 L1/L2/L3 + 캐릭터 + 프롬프트 전부 자동 생성
- 노드 4~5개, 엣지 4개
- 초보 사용자 / 빠른 프로토타이핑용

#### Preset B: L1 커스텀 (기존과 유사)

```
[BasicInfo] → [L1 Vector 7D] → [Character Gen] → [Prompt Builder] → [Test] → [Deploy]
                                                                    → [Consistency] ─┘
```

- 현재 v2와 유사한 흐름, L2/L3 없이
- 노드 6~7개
- 기존 사용자 마이그레이션용

#### Preset C: 풀 커스텀 (3-Layer 전체)

```
[BasicInfo] ─┬─ [L1 7D] ──────────────────────┐
             ├─ [L2 5D] → [Paradox] ──────────┼→ [V_Final] → [Character] → [Backstory] ──┐
             └─ [L3 4D] → [Pressure Ctrl] ────┘              → [Voice]     → [Pressure] ──┼→ [Prompt Builder] → [Test] → [Deploy]
                                                              → [Activity]  → [Zeitgeist] ─┘   → [Interaction] ─┘
                                                                                            → [Consistency] ────────────────────┘
                                                                                            → [Fingerprint] (선택)
```

- 모든 레이어 + 정성적 차원 + 상호작용 규칙 + 지문
- 노드 15~20개
- 파워 유저 / 정밀 설계용

#### Preset D: 아키타입 + 부분 오버라이드

```
[Archetype Select] ─┬─ [L1 (자동)] → [수동 Override] ──→ [V_Final] → ...
                    ├─ [L2 (자동)]   ─────────────────→ [Paradox] ─┘
                    └─ [L3 (자동)] → [Pressure Ctrl] ─┘
```

- 아키타입 기반으로 시작하되 특정 레이어만 수동 조정
- "보수적 힙스터" 아키타입 선택 후 L2 openness만 조정 같은 시나리오

### 13.8 최소 필수 노드 규칙

배포(`Deploy`) 가능하려면 아래 **최소 필수 경로**가 완성되어야 함.

```
BasicInfo ─(connected)─→ ... ─(connected)─→ PromptBuilder ─(connected)─→ Deploy
```

**필수 노드:**
1. `basic-info` — 페르소나 기본 정보
2. `l1-vector` 또는 `archetype-select` — L1 벡터 (직접 or 아키타입 경유)
3. `prompt-builder` — 프롬프트 생성
4. `consistency` — 일관성 검증 (통과해야 배포 가능)
5. `deploy` — 배포

**선택 노드**: L2, L3, Paradox, V_Final, Character, Backstory, Voice, Activity, Content, Pressure, Zeitgeist, Interaction, Fingerprint, Test

**검증 로직:**

```typescript
function isGraphComplete(graph: GraphState): { complete: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. 필수 노드 존재 확인
  const requiredTypes = ['basic-info', 'prompt-builder', 'consistency', 'deploy']
  for (const type of requiredTypes) {
    if (!graph.nodes.some(n => n.type === type)) {
      errors.push(`필수 노드 "${type}" 없음`)
    }
  }

  // 2. L1 소스 확인 (l1-vector 또는 archetype-select)
  const hasL1Source = graph.nodes.some(n =>
    n.type === 'l1-vector' || n.type === 'archetype-select'
  )
  if (!hasL1Source) errors.push('L1 벡터 소스 노드 없음 (L1 Vector 또는 Archetype Select)')

  // 3. 필수 포트 연결 확인
  for (const node of graph.nodes) {
    for (const port of node.inputPorts.filter(p => p.required)) {
      const connected = graph.edges.some(e =>
        e.targetNodeId === node.id && e.targetPortId === port.id
      )
      if (!connected) errors.push(`"${node.type}".${port.id} 미연결`)
    }
  }

  // 4. BasicInfo → Deploy 경로 존재 확인 (도달 가능성)
  const reachable = findReachable(graph, 'basic-info')
  if (!graph.nodes.filter(n => n.type === 'deploy').every(n => reachable.has(n.id))) {
    errors.push('BasicInfo에서 Deploy까지 경로 없음')
  }

  return { complete: errors.length === 0, errors }
}
```

### 13.9 노드 에디터 UI 구성

```
┌─────────────────────────────────────────────────────────────────────┐
│ [+ Add Node ▼]  [Preset ▼]  [Evaluate]  [Save]       [Zoom] [Fit] │  ← 툴바
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│  📂 Input │     ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│  BasicInfo│     │ L1 Vector│────→│ V_Final  │────→│ Prompt   │    │
│  L1 Vector│     │  7D      │     │          │     │ Builder  │    │
│  L2 Vector│     └──────────┘     └──────────┘     └──────────┘    │
│  L3 Vector│                              ↑                         │
│  Archetype│     ┌──────────┐     ┌───────┴──┐                     │
│           │     │ L2 Vector│────→│ Paradox  │                     │
│  📂 Engine │     │  5D      │     │ Calc     │                     │
│  Paradox  │     └──────────┘     └──────────┘                     │
│  Pressure │                                                        │
│  V_Final  │                      ← 캔버스 (드래그/줌/팬) →        │
│  Projection│                                                        │
│           │                                                        │
│  📂 Gen   │                                                        │
│  Character│                                                        │
│  Backstory│                                                        │
│  Voice    │                                                        │
│  ...      │─────────────────────────── MiniMap ────────────────────│
│           │                                                        │
│  📂 Output│                                                        │
│  Prompt   │                                                        │
│  Test     │                                                        │
│  Deploy   │                                                        │
├──────────┴──────────────────────────────────────────────────────────┤
│ ⚠ 2 validation errors  │  12 nodes  │  15 edges  │  Dirty: Yes    │  ← 상태바
└─────────────────────────────────────────────────────────────────────┘
```

**UI 요소:**

| 요소 | 설명 |
|------|------|
| **노드 팔레트** (좌측) | 카테고리별 노드 목록. 드래그로 캔버스에 추가 |
| **캔버스** (중앙) | ReactFlow 캔버스. 노드 배치/연결/삭제 |
| **툴바** (상단) | Add Node, Preset 선택, Evaluate, Save |
| **상태바** (하단) | 검증 에러 수, 노드/엣지 수, dirty 상태 |
| **MiniMap** (우하단) | 전체 그래프 축소 뷰 |
| **노드 설정 패널** (우클릭/더블클릭) | 선택한 노드의 상세 설정 |

### 13.10 하위 호환성

기존 v2 페르소나(6D, 선형 파이프라인)를 v3 노드 그래프로 자동 변환.

```typescript
function migrateV2ToV3Graph(v2Persona: PersonaV2): GraphState {
  // v2의 6D 벡터 → L1 7D (sociability = 0.5 기본값)
  // v2의 캐릭터/프롬프트 → 각각 노드로 분리
  // Preset B (L1 커스텀) 기반 그래프 생성
  // 기존 데이터를 노드 data에 매핑
}
```

### 13.11 구현 파일 목록

| 분류 | 파일 | 변경 수준 |
|------|------|-----------|
| **DAG 엔진** | `src/lib/node-graph/dag-engine.ts` | **신규** |
| **위상 정렬** | `src/lib/node-graph/topological-sort.ts` | **신규** |
| **순환 감지** | `src/lib/node-graph/cycle-detection.ts` | **신규** |
| **노드 레지스트리** | `src/lib/node-graph/node-registry.ts` | **신규** |
| **포트 타입 시스템** | `src/lib/node-graph/port-types.ts` | **신규** |
| **그래프 검증** | `src/lib/node-graph/graph-validator.ts` | **신규** |
| **직렬화** | `src/lib/node-graph/serializer.ts` | **신규** |
| **모듈 index** | `src/lib/node-graph/index.ts` | **신규** |
| **테스트** | `src/lib/node-graph/__tests__/` | **신규** |
| **Zustand 스토어** | `src/stores/node-editor-store.ts` | **신규** |
| **플로우 프리셋** | `src/constants/flow-presets.ts` | **신규** |
| **노드 팔레트 UI** | `src/components/node-editor/node-palette.tsx` | **신규** |
| **노드 설정 패널** | `src/components/node-editor/node-settings-panel.tsx` | **신규** |
| **에디터 툴바** | `src/components/node-editor/editor-toolbar.tsx` | **신규** |
| **에디터 상태바** | `src/components/node-editor/editor-status-bar.tsx` | **신규** |
| **v2 마이그레이션** | `src/lib/node-graph/v2-migration.ts` | **신규** |
| **메인 에디터** | `src/components/node-editor/persona-node-editor.tsx` | **전면 재작성** |
| **에디터 훅** | `src/components/node-editor/use-persona-editor.ts` | **전면 재작성** |
| **노드 타입** | `src/components/node-editor/types.ts` | **전면 재작성** |
| **노드 래퍼** | `src/components/node-editor/node-wrapper.tsx` | 대폭 수정 |
| **기존 7개 노드** | `src/components/node-editor/nodes/*.tsx` | **전면 재작성** (v3 포트 시스템) |
| **v3 신규 노드** | `src/components/node-editor/nodes/v3/*.tsx` | **신규** (Engine/Gen/Assembly 노드) |

### 13.12 노드 실행 함수 (executeNode Implementation)

설계서 §14.8에서 정의한 22개 노드의 execute() 로직을, 구현 가능한 TypeScript 수준의 코드/수도코드로 상세화한다.

#### 13.12.1 executeNode 디스패처

DAG 평가 엔진(§13.5 `evaluateGraph`)에서 호출하는 핵심 함수. 노드 타입별로 적절한 실행 함수를 디스패치한다.

```typescript
// src/lib/node-graph/node-executor.ts

import type {
  BasicInfoData, SocialPersonaVector, CoreTemperamentVector,
  NarrativeDriveVector, ArchetypeConfig, ParadoxResult, PressureConfig,
  VFinalResult, ProjectionConfig, CharacterData, BackstoryDimension,
  VoiceProfile, ActivityConfig, ContentSettings, PressureContext,
  ZeitgeistProfile, PromptSet, InteractionRules, ValidationResult,
  FingerprintProfile, TestResult
} from './port-types'

export type NodeOutput = Record<string, unknown>

export interface ExecuteContext {
  /** LLM 호출 어댑터 (Generation/Test 노드에서 사용) */
  llm: LLMAdapter
  /** 페르소나 ID (fingerprint seed 용) */
  personaId: string
  /** 아키타입 템플릿 저장소 */
  archetypeStore: ArchetypeStore
  /** 투영 계수 행렬 (상수에서 로드) */
  projectionCoefficients: ProjectionCoefficients
  /** 교차축 정의 (83축, 상수에서 로드) */
  crossAxisDefinitions: CrossAxisDefinition[]
}

export function executeNode(
  type: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): NodeOutput | Promise<NodeOutput> {
  switch (type) {
    // Input
    case 'basic-info':       return executeBasicInfo(data)
    case 'l1-vector':        return executeL1Vector(data)
    case 'l2-vector':        return executeL2Vector(data)
    case 'l3-vector':        return executeL3Vector(data)
    case 'archetype-select': return executeArchetypeSelect(data, context)

    // Engine
    case 'paradox-calc':     return executeParadoxCalc(inputs, context)
    case 'pressure-ctrl':    return executePressureCtrl(data, inputs)
    case 'v-final':          return executeVFinal(inputs, context)
    case 'projection':       return executeProjection(data, inputs)

    // Generation (async — LLM 호출)
    case 'character-gen':    return executeCharacterGen(data, inputs, context)
    case 'backstory-gen':    return executeBackstoryGen(data, inputs, context)
    case 'voice-gen':        return executeVoiceGen(data, inputs, context)
    case 'activity-gen':     return executeActivityGen(inputs)
    case 'content-gen':      return executeContentGen(data, inputs, context)
    case 'pressure-gen':     return executePressureGen(data, inputs, context)
    case 'zeitgeist-gen':    return executeZeitgeistGen(data, inputs, context)

    // Assembly
    case 'prompt-builder':   return executePromptBuilder(data, inputs)
    case 'interaction-rules':return executeInteractionRules(inputs)

    // Output
    case 'consistency':      return executeConsistency(inputs, context)
    case 'fingerprint':      return executeFingerprint(data, inputs, context)
    case 'test-sim':         return executeTestSim(data, inputs, context)
    case 'deploy':           return executeDeploy(data, inputs)

    default: throw new Error(`Unknown node type: ${type}`)
  }
}
```

#### 13.12.2 Input 노드 실행 함수

```typescript
// ─── ① basic-info ───
function executeBasicInfo(data: Record<string, unknown>): BasicInfoData {
  const name = data.name as string
  const role = data.role as string
  if (!name || !role) throw new NodeValidationError('basic-info', 'name과 role은 필수')

  return {
    name,
    role,
    description: (data.description as string) ?? '',
    expertise: (data.expertise as string[]) ?? [],
    demographics: {
      age: data.age as number | undefined,
      gender: data.gender as string | undefined,
      generation: data.generation as string | undefined,  // "MILLENNIAL", "GEN_Z", etc.
      region: data.region as string | undefined,
    },
  }
}

// ─── ② l1-vector ───
function executeL1Vector(data: Record<string, unknown>): SocialPersonaVector {
  const dims = ['depth', 'lens', 'stance', 'scope', 'taste', 'purpose', 'sociability'] as const
  const vector: Record<string, number> = {}
  for (const dim of dims) {
    const val = data[dim] as number
    if (val === undefined || val < 0.0 || val > 1.0)
      throw new NodeValidationError('l1-vector', `${dim}은 0.0~1.0 범위여야 합니다 (현재: ${val})`)
    vector[dim] = val
  }
  return vector as SocialPersonaVector
}

// ─── ③ l2-vector ───
function executeL2Vector(data: Record<string, unknown>): CoreTemperamentVector {
  const dims = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const
  const vector: Record<string, number> = {}
  for (const dim of dims) {
    const val = data[dim] as number
    if (val === undefined || val < 0.0 || val > 1.0)
      throw new NodeValidationError('l2-vector', `${dim}은 0.0~1.0 범위여야 합니다`)
    vector[dim] = val
  }
  return vector as CoreTemperamentVector
}

// ─── ④ l3-vector ───
function executeL3Vector(data: Record<string, unknown>): NarrativeDriveVector {
  const dims = ['lack', 'moralCompass', 'volatility', 'growthArc'] as const
  const vector: Record<string, number> = {}
  for (const dim of dims) {
    const val = data[dim] as number
    if (val === undefined || val < 0.0 || val > 1.0)
      throw new NodeValidationError('l3-vector', `${dim}은 0.0~1.0 범위여야 합니다`)
    vector[dim] = val
  }
  return vector as NarrativeDriveVector
}

// ─── ⑤ archetype-select ───
function executeArchetypeSelect(
  data: Record<string, unknown>,
  context: ExecuteContext
): ArchetypeConfig {
  const archetypeId = data.archetypeId as string
  if (!archetypeId) throw new NodeValidationError('archetype-select', 'archetypeId 필수')

  const template = context.archetypeStore.getTemplate(archetypeId)
  if (!template) throw new NodeValidationError('archetype-select', `아키타입 "${archetypeId}" 없음`)

  const seed = (data.varianceSeed as number) ?? Math.random()

  // 허용 변동 범위 내 랜덤 변형 (설계서 §9.2)
  const applyVariance = (base: Record<string, number>, variance: Record<string, number>) => {
    const result: Record<string, number> = {}
    for (const [key, val] of Object.entries(base)) {
      const v = variance[key] ?? 0
      const delta = (seededRandom(seed, key) - 0.5) * 2 * v  // -v ~ +v
      result[key] = Math.max(0, Math.min(1, val + delta))
    }
    return result
  }

  return {
    archetypeId,
    l1Base: applyVariance(template.l1, template.l1Variance) as SocialPersonaVector,
    l2Base: applyVariance(template.l2, template.l2Variance) as CoreTemperamentVector,
    l3Base: applyVariance(template.l3, template.l3Variance) as NarrativeDriveVector,
    dynamics: template.dynamics,
    voiceKeywords: template.voiceKeywords,
    paradoxDesign: template.paradoxDesign,
  }
}
```

#### 13.12.3 Engine 노드 실행 함수

```typescript
// ─── ⑥ paradox-calc ───
function executeParadoxCalc(
  inputs: Record<string, unknown>,
  context: ExecuteContext
): ParadoxResult {
  const L1 = inputs.L1 as SocialPersonaVector
  const L2 = inputs.L2 as CoreTemperamentVector
  const L3 = inputs.L3 as NarrativeDriveVector | undefined

  // L1↔L2 역설 쌍 (설계서 §3.6.2)
  const PARADOX_PAIRS: ParadoxPairDef[] = [
    { l1Dim: 'depth',       l2Dim: 'openness',          weight: 1.0, inverse: false },
    { l1Dim: 'taste',       l2Dim: 'openness',          weight: 0.5, inverse: false },
    { l1Dim: 'lens',        l2Dim: 'neuroticism',       weight: 1.0, inverse: true  },
    { l1Dim: 'stance',      l2Dim: 'agreeableness',     weight: 1.0, inverse: true  },
    { l1Dim: 'sociability', l2Dim: 'extraversion',      weight: 1.0, inverse: false },
    { l1Dim: 'purpose',     l2Dim: 'conscientiousness', weight: 1.0, inverse: false },
    { l1Dim: 'scope',       l2Dim: 'conscientiousness', weight: 0.5, inverse: false },
  ]

  // L1↔L2 Score 계산
  let sumWeighted = 0
  let sumWeight = 0
  const paradoxPairs: ParadoxPairResult[] = []
  for (const pair of PARADOX_PAIRS) {
    const l1Val = L1[pair.l1Dim]
    const l2Val = pair.inverse ? (1 - L2[pair.l2Dim]) : L2[pair.l2Dim]
    const score = Math.abs(l1Val - l2Val)
    sumWeighted += score * pair.weight
    sumWeight += pair.weight
    paradoxPairs.push({ ...pair, l1Val, l2Val, score })
  }
  const l1l2Score = sumWeighted / sumWeight

  // 83축 교차 스코어 (설계서 §3.8.4)
  const crossAxisProfile = computeCrossAxisProfile(L1, L2, L3, context.crossAxisDefinitions)

  // L1↔L3, L2↔L3 Score
  let l1l3Score = 0
  let l2l3Score = 0
  if (L3) {
    const l1l3Axes = crossAxisProfile.axes.filter(a => a.layers === 'L1xL3' && a.relationship === 'paradox')
    l1l3Score = l1l3Axes.length > 0 ? l1l3Axes.reduce((s, a) => s + a.score, 0) / l1l3Axes.length : 0

    const l2l3Axes = crossAxisProfile.axes.filter(a => a.layers === 'L2xL3' && a.relationship === 'paradox')
    l2l3Score = l2l3Axes.length > 0 ? l2l3Axes.reduce((s, a) => s + a.score, 0) / l2l3Axes.length : 0
  }

  // Extended Paradox Score (설계서 §3.6.3)
  const extendedScore = 0.50 * l1l2Score + 0.30 * l1l3Score + 0.20 * l2l3Score

  return { l1l2Score, l1l3Score, l2l3Score, extendedScore, paradoxPairs, crossAxisProfile }
}

// 교차축 스코어 계산 헬퍼
function computeCrossAxisProfile(
  L1: SocialPersonaVector, L2: CoreTemperamentVector,
  L3: NarrativeDriveVector | undefined,
  definitions: CrossAxisDefinition[]
): CrossAxisProfile {
  const axes: CrossAxisScore[] = []
  for (const def of definitions) {
    const dimA = getVectorValue(def.layerA, def.dimA, L1, L2, L3)
    const dimB = getVectorValue(def.layerB, def.dimB, L1, L2, L3)
    if (dimA === undefined || dimB === undefined) continue

    let score: number
    switch (def.relationship) {
      case 'paradox':     score = Math.abs(dimA - (def.inverse ? 1 - dimB : dimB)); break
      case 'reinforcing': score = 1 - Math.abs(dimA - dimB); break
      case 'modulating':  score = dimA * dimB; break
      case 'neutral':     score = (dimA + dimB) / 2; break
    }
    axes.push({ ...def, score, dimAValue: dimA, dimBValue: dimB })
  }

  const paradoxAxes = axes.filter(a => a.relationship === 'paradox')
  const reinforcingAxes = axes.filter(a => a.relationship === 'reinforcing')
  const modulatingAxes = axes.filter(a => a.relationship === 'modulating')

  return {
    axes,
    summary: {
      paradoxCount: paradoxAxes.filter(a => a.score > 0.5).length,
      reinforcingCount: reinforcingAxes.filter(a => a.score > 0.7).length,
      modulatingIntensity: modulatingAxes.length > 0
        ? modulatingAxes.reduce((s, a) => s + a.score, 0) / modulatingAxes.length : 0,
      characterComplexity: paradoxAxes.length > 0
        ? paradoxAxes.reduce((s, a) => s + a.score, 0) / paradoxAxes.length : 0,
    },
  }
}

// ─── ⑦ pressure-ctrl ───
function executePressureCtrl(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): PressureConfig {
  const L3 = inputs.L3 as NarrativeDriveVector | undefined
  const dynamics = inputs.DynamicsConfig as ProjectionConfig | undefined

  const volatility = L3?.volatility ?? 0.5

  // 감쇠 상수 λ (설계서 §5.4 Stage 3)
  // λ = 0.7 - 0.6 × volatility
  const decayConstant = 0.7 - 0.6 * volatility

  return {
    range: {
      min: (data.pressureMin as number) ?? 0.0,
      max: (data.pressureMax as number) ?? 1.0,
    },
    baseline: (data.baseline as number) ?? dynamics?.pressureThreshold ?? 0.1,
    decayConstant,
    volatility,
    triggers: (data.triggers as PressureTrigger[]) ?? [],
  }
}

// ─── ⑧ v-final ───
function executeVFinal(
  inputs: Record<string, unknown>,
  context: ExecuteContext
): VFinalResult {
  const L1 = inputs.L1 as SocialPersonaVector
  const L2 = inputs.L2 as CoreTemperamentVector | undefined
  const L3 = inputs.L3 as NarrativeDriveVector | undefined
  const pressureCfg = inputs.P as PressureConfig | undefined
  const dynamics = inputs.DynamicsConfig as ProjectionConfig | undefined

  // L2/L3 없으면 V_Final = L1 (하위 호환)
  if (!L2 && !L3) {
    return { vector7D: { ...L1 }, projectedL2: null, projectedL3: null, pressure: 0, alpha: 0, beta: 0 }
  }

  const P = pressureCfg?.baseline ?? 0.1
  let alpha = dynamics?.alpha ?? 0.6
  let beta = dynamics?.beta ?? 0.4

  // α+β=1.0 강제
  if (Math.abs(alpha + beta - 1.0) > 0.01) { beta = 1.0 - alpha }

  // L2→L1 투영 (설계서 §3.9.1) — 5×7 행렬
  const { l2ToL1, l3ToL1 } = context.projectionCoefficients
  const projectedL2 = L2 ? multiplyMatrix(l2ToL1, vectorToArray(L2, 5)) : null // → 7D
  const projectedL3 = L3 ? multiplyMatrix(l3ToL1, vectorToArray(L3, 4)) : null // → 7D

  // V_Final(7D) = (1-P) × V_L1 + P × (α × proj_L2 + β × proj_L3)
  // 한쪽만 있는 경우 가중치 재정규화
  let effectiveAlpha = alpha
  let effectiveBeta = beta
  if (projectedL2 && !projectedL3) { effectiveAlpha = 1.0; effectiveBeta = 0.0 }
  if (!projectedL2 && projectedL3) { effectiveAlpha = 0.0; effectiveBeta = 1.0 }

  const L1_DIMS = ['depth', 'lens', 'stance', 'scope', 'taste', 'purpose', 'sociability'] as const
  const vector7D: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const dim = L1_DIMS[i]
    let inner = 0
    if (projectedL2) inner += effectiveAlpha * projectedL2[i]
    if (projectedL3) inner += effectiveBeta * projectedL3[i]
    vector7D[dim] = Math.max(0, Math.min(1, (1 - P) * L1[dim] + P * inner))
  }

  return {
    vector7D: vector7D as SocialPersonaVector,
    projectedL2: projectedL2 ? arrayToL1(projectedL2) : null,
    projectedL3: projectedL3 ? arrayToL1(projectedL3) : null,
    pressure: P,
    alpha: effectiveAlpha,
    beta: effectiveBeta,
  }
}

// ─── ⑨ projection ───
function executeProjection(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): ProjectionConfig {
  const defaults = inputs.DynamicsConfig as ProjectionConfig | undefined

  let alpha = (data.alpha as number) ?? defaults?.alpha ?? 0.6
  let beta = (data.beta as number) ?? defaults?.beta ?? 0.4

  // α+β=1.0 강제 (alpha 우선)
  if (Math.abs(alpha + beta - 1.0) > 0.01) { beta = 1.0 - alpha }

  return {
    alpha,
    beta,
    pressureThreshold: (data.pressureThreshold as number) ?? defaults?.pressureThreshold ?? 0.6,
    adaptabilityRate: Math.max(0, Math.min(1,
      (data.adaptabilityRate as number) ?? defaults?.adaptabilityRate ?? 0.3
    )),
  }
}
```

#### 13.12.4 Generation 노드 실행 함수

Generation 노드는 `async`이며 LLM 호출을 포함한다. 모든 LLM 호출은 **Sonnet** 모델을 사용하고, **JSON 구조화 출력**을 강제한다.

**LLM 호출 공통 패턴:**

```typescript
interface LLMAdapter {
  generate<T>(params: {
    model: 'sonnet'
    systemPrompt: string
    userPrompt: string
    schema: JSONSchema        // 구조화 출력 스키마
    maxTokens: number
    temperature?: number      // 기본 0.7
  }): Promise<T>
}
```

```typescript
// ─── ⑩ character-gen ───
async function executeCharacterGen(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<CharacterData> {
  const vFinal = inputs.V_Final as VFinalResult
  const basicInfo = inputs.BasicInfo as BasicInfoData
  const archetype = inputs.Archetype as ArchetypeConfig | undefined

  const result = await context.llm.generate<CharacterData>({
    model: 'sonnet',
    systemPrompt: CHARACTER_GEN_SYSTEM_PROMPT,
    userPrompt: buildCharacterUserPrompt({
      vFinal: vFinal.vector7D,
      name: basicInfo.name,
      role: basicInfo.role,
      description: basicInfo.description,
      archetypeId: archetype?.archetypeId,
      paradoxDesign: archetype?.paradoxDesign,
      customInstructions: data.customInstructions as string | undefined,
    }),
    schema: CHARACTER_DATA_SCHEMA,
    maxTokens: 2000,
    temperature: 0.7,
  })

  return result
}

// ─── ⑪ backstory-gen ───
async function executeBackstoryGen(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<BackstoryDimension> {
  const L1 = inputs.L1 as SocialPersonaVector
  const L2 = inputs.L2 as CoreTemperamentVector
  const L3 = inputs.L3 as NarrativeDriveVector | undefined
  const paradox = inputs.Paradox as ParadoxResult

  // 역설 패턴을 자연어로 기술
  const paradoxContext = paradox.paradoxPairs
    .filter(p => p.score > 0.3)
    .map(p => `${p.l1Dim}(${p.l1Val.toFixed(1)}) ↔ ${p.l2Dim}(${p.l2Val.toFixed(1)}) — 역설 강도 ${p.score.toFixed(2)}`)
    .join('\n')

  const backstoryResult = await context.llm.generate<BackstoryRawResult>({
    model: 'sonnet',
    systemPrompt: BACKSTORY_GEN_SYSTEM_PROMPT,
    userPrompt: buildBackstoryUserPrompt({ L1, L2, L3, paradoxContext, custom: data.customInstructions }),
    schema: BACKSTORY_RAW_SCHEMA,
    maxTokens: 2500,
    temperature: 0.8,
  })

  // Init 키워드 추출 (설계서 §5.3)
  const initResult = await context.llm.generate<InitKeywordResult>({
    model: 'sonnet',
    systemPrompt: INIT_KEYWORD_SYSTEM_PROMPT,
    userPrompt: backstoryResult.backstory,
    schema: INIT_KEYWORD_SCHEMA,
    maxTokens: 800,
  })

  // 키워드 → 벡터 delta 매핑 (설계서 §5.3 매핑 테이블)
  const initDeltas = computeInitDeltas(initResult.keywords)

  return {
    backstory: backstoryResult.backstory,
    ghost: backstoryResult.ghost,
    hiddenDesire: backstoryResult.hiddenDesire,
    traumaTriggers: backstoryResult.traumaTriggers,
    narrativeIdentity: backstoryResult.narrativeIdentity,
    initDeltas,
  }
}

// Init delta 계산 (설계서 §5.3 delta 적용 규칙)
function computeInitDeltas(keywords: InitKeyword[]): Record<string, number> {
  const accumulated: Record<string, number> = {}
  for (const kw of keywords) {
    for (const cat of kw.categories) {
      const mappings = INIT_CATEGORY_MAPPINGS[cat]  // 상수: 카테고리→차원 매핑
      if (!mappings) continue
      for (const m of mappings) {
        const delta = m.direction * m.midRange * kw.confidence
        accumulated[m.dimension] = (accumulated[m.dimension] ?? 0) + delta
      }
    }
  }
  // 클램프 ±0.4
  for (const key of Object.keys(accumulated)) {
    accumulated[key] = Math.max(-0.4, Math.min(0.4, accumulated[key]))
  }
  return accumulated
}

// ─── ⑫ voice-gen ───
async function executeVoiceGen(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<VoiceProfile> {
  const L1 = inputs.L1 as SocialPersonaVector
  const character = inputs.Character as CharacterData

  return context.llm.generate<VoiceProfile>({
    model: 'sonnet',
    systemPrompt: VOICE_GEN_SYSTEM_PROMPT,
    userPrompt: buildVoiceUserPrompt({ L1, character, custom: data.customInstructions }),
    schema: VOICE_PROFILE_SCHEMA,
    maxTokens: 1500,
    temperature: 0.7,
  })
}

// ─── ⑬ activity-gen (규칙 기반, LLM 없음) ───
function executeActivityGen(inputs: Record<string, unknown>): ActivityConfig {
  const L1 = inputs.L1 as SocialPersonaVector

  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  return {
    initiative:      clamp(L1.sociability * 0.6 + L1.stance * 0.4),
    expressiveness:  clamp(L1.depth * 0.5 + L1.scope * 0.3 + L1.sociability * 0.2),
    interactivity:   clamp(L1.sociability * 0.7 + L1.purpose * 0.3),
    contentCreation: clamp(L1.depth * 0.4 + L1.taste * 0.3 + L1.purpose * 0.3),
    curiosity:       clamp(L1.taste * 0.5 + L1.scope * 0.3 + L1.depth * 0.2),
    consistency:     clamp(L1.purpose * 0.5 + (1 - L1.taste) * 0.3 + L1.depth * 0.2),
    emotionalRange:  clamp((1 - L1.lens) * 0.5 + L1.sociability * 0.3 + L1.depth * 0.2),
    adaptability:    clamp(L1.sociability * 0.5 + (1 - L1.stance) * 0.5),
  }
}

// ─── ⑭ content-gen ───
async function executeContentGen(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<ContentSettings> {
  const vFinal = inputs.V_Final as VFinalResult
  const character = inputs.Character as CharacterData

  return context.llm.generate<ContentSettings>({
    model: 'sonnet',
    systemPrompt: CONTENT_GEN_SYSTEM_PROMPT,
    userPrompt: buildContentUserPrompt({ vFinal: vFinal.vector7D, character, custom: data.customInstructions }),
    schema: CONTENT_SETTINGS_SCHEMA,
    maxTokens: 1500,
    temperature: 0.7,
  })
}

// ─── ⑮ pressure-gen ───
async function executePressureGen(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<PressureContext> {
  const L3 = inputs.L3 as NarrativeDriveVector
  const paradox = inputs.Paradox as ParadoxResult

  return context.llm.generate<PressureContext>({
    model: 'sonnet',
    systemPrompt: PRESSURE_GEN_SYSTEM_PROMPT,
    userPrompt: buildPressureUserPrompt({
      L3,
      extendedScore: paradox.extendedScore,
      paradoxPairs: paradox.paradoxPairs,
      custom: data.customInstructions,
    }),
    schema: PRESSURE_CONTEXT_SCHEMA,
    maxTokens: 2000,
    temperature: 0.7,
  })
}

// ─── ⑯ zeitgeist-gen ───
async function executeZeitgeistGen(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<ZeitgeistProfile> {
  const basicInfo = inputs.BasicInfo as BasicInfoData

  return context.llm.generate<ZeitgeistProfile>({
    model: 'sonnet',
    systemPrompt: ZEITGEIST_GEN_SYSTEM_PROMPT,
    userPrompt: buildZeitgeistUserPrompt({
      demographics: basicInfo.demographics,
      role: basicInfo.role,
      custom: data.customInstructions,
    }),
    schema: ZEITGEIST_PROFILE_SCHEMA,
    maxTokens: 1000,
    temperature: 0.7,
  })
}
```

#### 13.12.5 Assembly 노드 실행 함수

```typescript
// ─── ⑰ prompt-builder ───
function executePromptBuilder(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): PromptSet {
  const character = inputs.Character as CharacterData
  const voice = inputs.Voice as VoiceProfile
  const backstory = inputs.Backstory as BackstoryDimension
  const pressure = inputs.Pressure as PressureContext
  const zeitgeist = inputs.Zeitgeist as ZeitgeistProfile
  const content = inputs.Content as ContentSettings

  const template = (data.templateOverride as string) ?? DEFAULT_PROMPT_TEMPLATE

  // 프롬프트 섹션 조립
  const sections: PromptSection[] = [
    // §1 정체성
    { key: 'identity', content: formatIdentity(character, backstory, zeitgeist) },
    // §2 행동 지침
    { key: 'voice', content: formatVoiceInstructions(voice) },
    // §3 콘텐츠 스타일
    { key: 'content', content: formatContentStyle(content) },
    // §4 압박 반응 규칙
    { key: 'pressure', content: formatPressureRules(pressure.triggers, pressure.overrideRules) },
    // §5 습관 발현 규칙
    { key: 'quirks', content: formatQuirksRules(pressure.quirksDefinition) },
    // §6 동적 지침 (런타임에 벡터 상태로 치환될 플레이스홀더)
    { key: 'dynamics', content: formatDynamicsPlaceholders() },
  ]

  const systemPrompt = compilePromptTemplate(template, sections)

  return {
    systemPrompt,
    vectorContext: {
      backstoryInitDeltas: backstory.initDeltas,
      pressureTriggerIds: pressure.triggers.map(t => t.triggerId),
      quirkIds: pressure.quirksDefinition?.map(q => q.id) ?? [],
    },
  }
}

// ─── ⑱ interaction-rules ───
function executeInteractionRules(inputs: Record<string, unknown>): InteractionRules {
  const backstory = inputs.Backstory as BackstoryDimension
  const pressure = inputs.Pressure as PressureContext
  const vFinal = inputs.V_Final as VFinalResult

  return {
    // ① Init (설계서 §5.3)
    initConfig: {
      deltas: backstory.initDeltas,
      clampRange: 0.4,
    },
    // ② Override (설계서 §5.4)
    overrideConfig: {
      triggers: pressure.triggers,
      overrideRules: pressure.overrideRules,
      decayRules: pressure.decayRules,
    },
    // ③ Adapt (설계서 §5.5)
    adaptConfig: {
      baseVector: vFinal.vector7D,
      adaptabilityRate: 0.15,  // α_base
      driftClamp: 0.3,
      momentumWindow: 3,
    },
    // ④ Express (설계서 §5.6)
    expressConfig: {
      quirks: pressure.quirksDefinition ?? [],
    },
  }
}
```

#### 13.12.6 Output 노드 실행 함수

```typescript
// ─── ⑲ consistency ───
function executeConsistency(
  inputs: Record<string, unknown>,
  context: ExecuteContext
): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const infos: ValidationIssue[] = []

  // ─── A: 구조적 검증 (15%) ─── (설계서 §11.3)
  const aResults = validateStructure(inputs)
  categorize(aResults, errors, warnings, infos)

  // ─── B: L1↔L2 역설 검증 (20%) ─── (설계서 §11.3)
  const bResults = validateParadoxMapping(
    inputs.Paradox as ParadoxResult,
    inputs.Archetype as ArchetypeConfig | undefined
  )
  categorize(bResults, errors, warnings, infos)

  // ─── C: L2↔L3 정합성 검증 (20%) ─── (설계서 §11.4)
  const L2 = inputs.L2 as CoreTemperamentVector | undefined
  const L3 = inputs.L3 as NarrativeDriveVector | undefined
  const paradox = inputs.Paradox as ParadoxResult | undefined
  if (L2 && L3) {
    const cResults = validateL2L3Coherence(L2, L3, paradox)
    categorize(cResults, errors, warnings, infos)
  }

  // ─── D: 정성적↔정량적 검증 (20%) ─── (설계서 §11.5)
  const dResults = validateQualitative(
    inputs.Backstory as BackstoryDimension | undefined,
    inputs.Voice as VoiceProfile | undefined,
    inputs.Pressure as PressureContext | undefined,
    inputs.L1 as SocialPersonaVector,
    L3
  )
  categorize(dResults, errors, warnings, infos)

  // ─── E: 교차축 일관성 검증 (15%) ─── (설계서 §11.6)
  if (paradox?.crossAxisProfile) {
    const eResults = validateCrossAxis(paradox.crossAxisProfile, paradox)
    categorize(eResults, errors, warnings, infos)
  }

  // ─── F: 동적 설정 검증 (10%) ─── (설계서 §11.3)
  const fResults = validateDynamics(
    inputs.P as PressureConfig | undefined,
    inputs.DynamicsConfig as ProjectionConfig | undefined
  )
  categorize(fResults, errors, warnings, infos)

  // ─── 종합 점수 (설계서 §11.7) ───
  const catWeights = { A: 0.15, B: 0.20, C: 0.20, D: 0.20, E: 0.15, F: 0.10 }
  const catPassRates = {
    A: passRate(aResults),
    B: passRate(bResults),
    C: L2 && L3 ? passRate(validateL2L3Coherence(L2, L3, paradox)) : 1.0,
    D: passRate(dResults),
    E: paradox?.crossAxisProfile ? passRate(validateCrossAxis(paradox.crossAxisProfile, paradox)) : 1.0,
    F: passRate(fResults),
  }
  const score = Object.entries(catWeights).reduce(
    (sum, [cat, w]) => sum + w * catPassRates[cat as keyof typeof catPassRates], 0
  )

  return {
    score,
    passed: score >= 0.7 && errors.length === 0,
    errors,
    warnings,
    infos,
    categoryScores: catPassRates,
  }
}

// ─── ⑳ fingerprint ───
function executeFingerprint(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): FingerprintProfile {
  const L1 = inputs.L1 as SocialPersonaVector
  const L2 = inputs.L2 as CoreTemperamentVector | undefined
  const L3 = inputs.L3 as NarrativeDriveVector | undefined
  const paradox = inputs.Paradox as ParadoxResult | undefined
  const mode = (data.mode as 'compact' | 'l1-l2' | 'full') ?? 'full'

  const seed = generateFingerprintSeed(context.personaId)

  // 다층 레이더 (설계서 §12.3)
  const radarData: RadarChartData = {
    l1Axes: L1,
    l2Axes: mode !== 'compact' ? L2 ?? null : null,
    l3Axes: mode === 'full' ? L3 ?? null : null,
    paradoxConnectors: paradox?.paradoxPairs.filter(p => p.score > 0.5) ?? [],
  }

  // 2D 지문 (설계서 §12.4~12.5)
  const print2d = generate2DFingerprint({ L1, L2, L3, seed })

  // 3D Jacks (설계서 §12.6)
  const print3d = generate3DJacksConfig({ L1, L2, L3, seed })

  return { radarData, print2d, print3d, seed }
}

// ─── ㉑ test-sim ───
async function executeTestSim(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  context: ExecuteContext
): Promise<TestResult> {
  const promptSet = inputs.PromptSet as PromptSet
  const character = inputs.Character as CharacterData

  const scenarios = (data.testScenarios as TestScenario[]) ?? DEFAULT_TEST_SCENARIOS
  const results: TestScenarioResult[] = []

  for (const scenario of scenarios) {
    // 페르소나 응답 생성
    const response = await context.llm.generate<{ text: string }>({
      model: 'sonnet',
      systemPrompt: promptSet.systemPrompt,
      userPrompt: scenario.userMessage,
      schema: { type: 'object', properties: { text: { type: 'string' } } },
      maxTokens: 500,
      temperature: 0.7,
    })

    // 품질 평가 (LLM 자기 평가)
    const evaluation = await context.llm.generate<TestEvaluation>({
      model: 'sonnet',
      systemPrompt: TEST_EVAL_SYSTEM_PROMPT,
      userPrompt: JSON.stringify({
        characterTraits: character.traits,
        scenario: scenario.description,
        userMessage: scenario.userMessage,
        personaResponse: response.text,
      }),
      schema: TEST_EVALUATION_SCHEMA,
      maxTokens: 600,
    })

    results.push({ scenario, response: response.text, evaluation })
  }

  const overallScore = results.reduce((s, r) => s + r.evaluation.overall, 0) / results.length

  return {
    scenarios: results,
    overallScore,
    sampleOutputs: results.map(r => r.response),
  }
}

// ─── ㉒ deploy ───
async function executeDeploy(
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): Promise<{ deployed: boolean; personaId: string; environment: string }> {
  const validation = inputs.Consistency as ValidationResult
  if (!validation?.passed) {
    throw new NodeExecutionError('deploy',
      `일관성 검증 미통과 (score: ${validation?.score?.toFixed(2)}, errors: ${validation?.errors?.length})`)
  }

  const persona = assemblePersonaObject(inputs)
  const env = (data.targetEnvironment as string) ?? 'staging'

  await savePersonaToDB(persona, env)
  if (env === 'production') {
    await activatePersona(persona.id)
  }

  return { deployed: true, personaId: persona.id, environment: env }
}
```

#### 13.12.7 평가 전략별 실행 분류

DAG 평가 엔진이 각 노드를 실행할 때, 노드의 **평가 전략**에 따라 실행 시점이 달라진다.

| 평가 전략 | 노드 목록 | 실행 시점 |
|-----------|----------|-----------|
| **Eager** | basic-info, l1~l3-vector, archetype-select, paradox-calc, pressure-ctrl, v-final, projection, activity-gen, prompt-builder, interaction-rules, consistency, fingerprint | 입력 변경 시 즉시 |
| **Manual** | character-gen, backstory-gen, voice-gen, content-gen, pressure-gen, zeitgeist-gen, test-sim, deploy | "Generate"/"Deploy" 버튼 클릭 시 |

```typescript
// evaluateGraph에서 평가 전략 적용
const MANUAL_NODES = new Set([
  'character-gen', 'backstory-gen', 'voice-gen',
  'content-gen', 'pressure-gen', 'zeitgeist-gen',
  'test-sim', 'deploy'
])

export async function evaluateGraph(
  graph: GraphState,
  context: ExecuteContext,
  options: { manualNodeId?: string }  // Manual 노드 중 실행할 노드 ID
): Promise<Map<string, NodeOutput>> {
  const sorted = topologicalSort(graph)
  const results = new Map<string, NodeOutput>()

  for (const nodeId of sorted) {
    const node = graph.nodes.find(n => n.id === nodeId)!

    // Manual 노드: 명시적 실행 요청이 있을 때만 실행
    if (MANUAL_NODES.has(node.type) && options.manualNodeId !== nodeId) {
      // 이전 캐시된 결과가 있으면 사용, 없으면 스킵
      const cached = graph.evaluationCache?.get(nodeId)
      if (cached) results.set(nodeId, cached)
      continue
    }

    const inputs = collectInputs(node, graph.edges, results)
    const output = await executeNode(node.type, node.data, inputs, context)
    results.set(nodeId, output)
  }

  return results
}
```

#### 13.12.8 구현 파일 및 Phase 8 태스크 추가

T37에서 정의한 노드 실행 로직의 구현은 다음 파일에 집중된다:

| 파일 | 설명 | Phase 8 태스크 |
|------|------|----------------|
| `src/lib/node-graph/node-executor.ts` | executeNode 디스패처 + 전체 22개 실행 함수 | **8-23 (신규)** |
| `src/lib/node-graph/node-executor-helpers.ts` | 교차축 계산, Init delta, 투영 행렬 등 헬퍼 | **8-24 (신규)** |
| `src/lib/node-graph/llm-prompts/` | Generation 노드용 LLM 프롬프트 템플릿 디렉토리 | **8-25 (신규)** |
| `src/lib/node-graph/__tests__/node-executor.test.ts` | 노드 실행 함수 단위 테스트 | **8-26 (신규)** |

---

## 14. 상수 및 설정

> **핵심 인식**: 벡터 구조는 단순 7+5+4=16개 기저 차원이 아니다 — **106D+**.
> 레이어 간 교차 관계축(L1×L2=35, L1×L3=28, L2×L3=20 = **83개 관계축**),
> 동적 상태(P, α, β = 3), 비정량적 4차원, 트리플 조합(7×5×4=**140개**),
> 역설 페어(7개), 엔진 메타(V_Final), 아키타입(12+)까지 색상과 상수가 필요하다.
> 단일 파일이 아닌 **다중 파일 상수 모듈**로 구성한다.

### 14.1 상수 파일 구조

```
apps/engine-studio/src/constants/v3/
├── index.ts                    ← 통합 re-export
├── dimensions.ts               ← 개별 차원 정의 (L1/L2/L3)
├── paradox-mappings.ts         ← L1↔L2 역설 매핑 테이블
├── projection-coefficients.ts  ← L2→L1, L3→L1 투영 계수
├── cross-layer-axes.ts         ← 레이어 간 교차축 정의 (83개)
├── dynamics-defaults.ts        ← 동적 설정 기본값
└── interpretation-tables.ts    ← 역설/차원성 점수 해석
```

### 14.2 `dimensions.ts` — 개별 차원 정의 (106D+)

```typescript
export interface DimensionDef {
  key: string
  layer: 'L1' | 'L2' | 'L3'
  name: string              // 영문 표시명
  label: string             // 한글 표시명
  low: string               // 0.0 쪽 레이블
  high: string              // 1.0 쪽 레이블
  description: string
}

// L1 Social Persona (7D)
export const L1_DIMENSIONS: DimensionDef[] = [
  { key: 'depth',       layer: 'L1', name: 'Depth',       label: '분석 깊이',  low: '직관적',   high: '심층적',   description: '콘텐츠를 얼마나 깊이 분석하는지' },
  { key: 'lens',        layer: 'L1', name: 'Lens',        label: '판단 렌즈',  low: '감성적',   high: '논리적',   description: '감성적 vs 논리적 판단 성향' },
  { key: 'stance',      layer: 'L1', name: 'Stance',      label: '평가 태도',  low: '수용적',   high: '비판적',   description: '콘텐츠에 대한 수용/비판 정도' },
  { key: 'scope',       layer: 'L1', name: 'Scope',       label: '관심 범위',  low: '핵심만',   high: '디테일',   description: '핵심 요약 vs 세부 사항 관심도' },
  { key: 'taste',       layer: 'L1', name: 'Taste',       label: '취향 성향',  low: '클래식',   high: '실험적',   description: '검증된 작품 vs 실험적 작품 선호' },
  { key: 'purpose',     layer: 'L1', name: 'Purpose',     label: '소비 목적',  low: '오락',     high: '의미 추구', description: '가벼운 오락 vs 의미 추구' },
  { key: 'sociability', layer: 'L1', name: 'Sociability', label: '사회적 성향', low: '독립적',   high: '사교적',   description: '혼자 소비 vs 함께 나누기 선호' },
]

// L2 Core Temperament / OCEAN (5D)
export const L2_DIMENSIONS: DimensionDef[] = [
  { key: 'openness',          layer: 'L2', name: 'Openness',          label: '개방성',   low: '보수적',   high: '개방적',   description: '새로운 경험과 아이디어에 대한 수용도' },
  { key: 'conscientiousness', layer: 'L2', name: 'Conscientiousness', label: '성실성',   low: '유연한',   high: '체계적',   description: '계획성과 꼼꼼함의 정도' },
  { key: 'extraversion',      layer: 'L2', name: 'Extraversion',      label: '외향성',   low: '내향적',   high: '외향적',   description: '에너지의 원천 (내부 vs 외부)' },
  { key: 'agreeableness',     layer: 'L2', name: 'Agreeableness',     label: '친화성',   low: '독립적',   high: '협조적',   description: '타인과의 조화를 추구하는 정도' },
  { key: 'neuroticism',       layer: 'L2', name: 'Neuroticism',       label: '신경성',   low: '안정적',   high: '민감한',   description: '감정적 반응성과 불안 수준' },
]

// L3 Narrative Drive (4D)
export const L3_DIMENSIONS: DimensionDef[] = [
  { key: 'lack',         layer: 'L3', name: 'Lack',         label: '결핍',     low: '충족',     high: '결핍',     description: '내면의 결핍 — 행동의 원인 (cause)' },
  { key: 'moralCompass', layer: 'L3', name: 'Moral Compass', label: '도덕 나침반', low: '유연한',   high: '엄격한',   description: '판단의 기준 — 옳고 그름의 잣대 (criteria)' },
  { key: 'volatility',   layer: 'L3', name: 'Volatility',   label: '변동성',   low: '안정적',   high: '폭발적',   description: '감정/행동의 불안정성 (instability)' },
  { key: 'growthArc',    layer: 'L3', name: 'Growth Arc',   label: '성장 곡선', low: '정체',     high: '변화',     description: '변화의 방향성 (direction)' },
]

// 전체 차원 (순서 보장)
export const ALL_DIMENSIONS = [...L1_DIMENSIONS, ...L2_DIMENSIONS, ...L3_DIMENSIONS] as const

// 기본 벡터값
export const DEFAULT_L1_VECTOR = { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5, sociability: 0.5 } as const
export const DEFAULT_L2_VECTOR = { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 } as const
export const DEFAULT_L3_VECTOR = { lack: 0.0, moralCompass: 0.0, volatility: 0.0, growthArc: 0.0 } as const
```

### 14.3 `cross-layer-axes.ts` — 레이어 간 교차축 정의

벡터 구조의 핵심. 단순 차원 나열이 아니라 **레이어 간 모든 관계축을 정의**.

```typescript
export interface CrossLayerAxis {
  id: string                        // 고유 ID (예: "l1_depth__l2_openness")
  l1Dim?: string                    // L1 차원 키 (없으면 해당 레이어 미관여)
  l2Dim?: string                    // L2 차원 키
  l3Dim?: string                    // L3 차원 키
  type: 'L1xL2' | 'L1xL3' | 'L2xL3' | 'L1xL2xL3'
  relationship: 'paradox' | 'reinforcing' | 'modulating' | 'neutral'
  label: string                     // 한글 설명
  interpretation: {
    highHigh: string                // 둘 다 높을 때 의미
    highLow: string                 // 첫번째 높고 두번째 낮을 때
    lowHigh: string
    lowLow: string
  }
}

// ── L1×L2 교차축 (7×5 = 35개) ──
// 역설 매핑된 7개는 relationship: 'paradox'
// 나머지 28개는 관계 유형별 분류
export const L1_L2_AXES: CrossLayerAxis[] = [
  // === 역설 매핑 (Primary) ===
  {
    id: 'l1_depth__l2_openness',
    l1Dim: 'depth', l2Dim: 'openness',
    type: 'L1xL2', relationship: 'paradox',
    label: '분석 깊이 × 개방성',
    interpretation: {
      highHigh: '깊이 있는 분석을 개방적으로 수행',
      highLow: '깊이 분석하지만 보수적 관점 — 고전주의적 학자',
      lowHigh: '직관적이지만 열린 마음 — 탐험적 감상자',
      lowLow: '직관적이고 보수적 — 습관적 소비자',
    },
  },
  // ... (7개 paradox 매핑 + 28개 일반 교차축 전체 정의)
  // 구현 시 전체 35개를 작성한다.
]

// ── L1×L3 교차축 (7×4 = 28개) ──
export const L1_L3_AXES: CrossLayerAxis[] = [
  {
    id: 'l1_stance__l3_lack',
    l1Dim: 'stance', l3Dim: 'lack',
    type: 'L1xL3', relationship: 'modulating',
    label: '평가 태도 × 결핍',
    interpretation: {
      highHigh: '비판적이면서 내면 결핍 큼 — 공격적 방어기제',
      highLow: '비판적이지만 충족됨 — 자신감 있는 비평가',
      lowHigh: '수용적이지만 내면 결핍 큼 — 타인 인정 갈구',
      lowLow: '수용적이고 충족됨 — 평온한 감상자',
    },
  },
  // ... (28개 전체 정의)
]

// ── L2×L3 교차축 (5×4 = 20개) ──
export const L2_L3_AXES: CrossLayerAxis[] = [
  {
    id: 'l2_neuroticism__l3_volatility',
    l2Dim: 'neuroticism', l3Dim: 'volatility',
    type: 'L2xL3', relationship: 'reinforcing',
    label: '신경성 × 변동성',
    interpretation: {
      highHigh: '감정적으로 민감하고 불안정 — 예측 불가 반응',
      highLow: '민감하지만 안정적 — 내면에서 처리',
      lowHigh: '안정적이지만 행동은 폭발적 — 서프라이즈형',
      lowLow: '안정적이고 예측 가능 — 바위 같은 존재',
    },
  },
  // ... (20개 전체 정의)
]

// ── L1×L2×L3 트리플 조합 (핵심 조합만 정의 — 전체 140개 중 대표 패턴) ──
export const NOTABLE_TRIPLE_AXES: CrossLayerAxis[] = [
  {
    id: 'l1_stance__l2_agreeableness__l3_lack',
    l1Dim: 'stance', l2Dim: 'agreeableness', l3Dim: 'lack',
    type: 'L1xL2xL3', relationship: 'paradox',
    label: '비판적 가면 × 높은 친화성 × 큰 결핍 — "인정받고 싶은 독설가"',
    interpretation: {
      highHigh: '비판적이지만 본성은 친화적, 결핍이 원인',
      highLow: '비판적이고 독립적, 결핍 없음 — 진짜 비평가',
      lowHigh: '수용적이고 친화적, 결핍이 큼 — 의존적',
      lowLow: '수용적이고 독립적, 충족됨 — 자족적',
    },
  },
  // 대표 패턴 20~30개를 선별하여 정의
  // 140개 전부를 정의하는 것은 비실용적이므로, 아키타입 설명에서 사용되는 핵심 조합만
]

// 전체 교차축 통합
export const ALL_CROSS_AXES = [...L1_L2_AXES, ...L1_L3_AXES, ...L2_L3_AXES, ...NOTABLE_TRIPLE_AXES] as const

// 관계 유형 필터 유틸
export function getAxesByRelationship(rel: CrossLayerAxis['relationship']): CrossLayerAxis[] {
  return ALL_CROSS_AXES.filter(a => a.relationship === rel)
}

export function getAxesForDimension(dimKey: string): CrossLayerAxis[] {
  return ALL_CROSS_AXES.filter(a => a.l1Dim === dimKey || a.l2Dim === dimKey || a.l3Dim === dimKey)
}
```

### 14.4 색상 시스템 — `trait-colors-v3.ts`

기존 `trait-colors.ts` 를 대체. **다층 색상 체계**로 구성.

```
apps/engine-studio/src/lib/colors/
├── index.ts                 ← 통합 re-export + lookup 유틸
├── dimension-colors.ts      ← 106D+ 개별 차원 색상
├── layer-colors.ts          ← 3개 레이어 그룹 색상
├── cross-axis-colors.ts     ← 교차축/역설 페어 색상
├── engine-meta-colors.ts    ← 엔진 메타 개념 색상
└── archetype-colors.ts      ← 아키타입별 색상
```

#### 14.4.1 `layer-colors.ts` — 레이어 그룹 색상

```typescript
export interface LayerColorScheme {
  /** 레이어 대표색 */
  primary: string
  /** 연한 배경색 */
  bg: string
  /** 보더/강조색 */
  border: string
  /** 차트에서 영역 채움색 (opacity 포함) */
  fill: string
  /** 텍스트/라벨색 */
  text: string
  /** CSS 그라디언트 (왼→오) */
  gradient: string
}

export const LAYER_COLORS: Record<'L1' | 'L2' | 'L3', LayerColorScheme> = {
  L1: {
    primary: '#3B82F6',     // Blue-500
    bg: '#EFF6FF',          // Blue-50
    border: '#93C5FD',      // Blue-300
    fill: 'rgba(59,130,246,0.15)',
    text: '#1E40AF',        // Blue-800
    gradient: 'linear-gradient(90deg, #DBEAFE, #3B82F6)',
  },
  L2: {
    primary: '#F59E0B',     // Amber-500
    bg: '#FFFBEB',          // Amber-50
    border: '#FCD34D',      // Amber-300
    fill: 'rgba(245,158,11,0.15)',
    text: '#92400E',        // Amber-800
    gradient: 'linear-gradient(90deg, #FEF3C7, #F59E0B)',
  },
  L3: {
    primary: '#8B5CF6',     // Violet-500
    bg: '#F5F3FF',          // Violet-50
    border: '#C4B5FD',      // Violet-300
    fill: 'rgba(139,92,246,0.15)',
    text: '#5B21B6',        // Violet-800
    gradient: 'linear-gradient(90deg, #EDE9FE, #8B5CF6)',
  },
}
```

#### 14.4.2 `dimension-colors.ts` — 개별 차원 색상 (106D+)

```typescript
export interface DimensionColor {
  /** 차트/지문에서 사용하는 대표색 */
  primary: string
  /** 게이지 그라디언트 시작색 (low 쪽) */
  from: string
  /** 게이지 그라디언트 종료색 (high 쪽) */
  to: string
}

export interface DimensionColorConfig {
  key: string
  layer: 'L1' | 'L2' | 'L3'
  color: DimensionColor
}

export const DIMENSION_COLORS: DimensionColorConfig[] = [
  // ── L1 Social Persona (7D) — 블루 계열 기반 ──
  { key: 'depth',       layer: 'L1', color: { primary: '#3B82F6', from: '#BFDBFE', to: '#1E3A8A' } },
  { key: 'lens',        layer: 'L1', color: { primary: '#10B981', from: '#FDA4AF', to: '#059669' } },
  { key: 'stance',      layer: 'L1', color: { primary: '#F59E0B', from: '#BBF7D0', to: '#EF4444' } },
  { key: 'scope',       layer: 'L1', color: { primary: '#EF4444', from: '#FEF08A', to: '#7C3AED' } },
  { key: 'taste',       layer: 'L1', color: { primary: '#8B5CF6', from: '#FDE68A', to: '#D946EF' } },
  { key: 'purpose',     layer: 'L1', color: { primary: '#EC4899', from: '#FED7AA', to: '#4338CA' } },
  { key: 'sociability', layer: 'L1', color: { primary: '#6366F1', from: '#E0E7FF', to: '#4F46E5' } }, // NEW

  // ── L2 Core Temperament / OCEAN (5D) — 따뜻한 계열 ──
  { key: 'openness',          layer: 'L2', color: { primary: '#F97316', from: '#FED7AA', to: '#C2410C' } },
  { key: 'conscientiousness', layer: 'L2', color: { primary: '#EAB308', from: '#FEF9C3', to: '#A16207' } },
  { key: 'extraversion',      layer: 'L2', color: { primary: '#F43F5E', from: '#FECDD3', to: '#BE123C' } },
  { key: 'agreeableness',     layer: 'L2', color: { primary: '#FB923C', from: '#FFEDD5', to: '#EA580C' } },
  { key: 'neuroticism',       layer: 'L2', color: { primary: '#D97706', from: '#FDE68A', to: '#92400E' } },

  // ── L3 Narrative Drive (4D) — 어두운/깊은 계열 ──
  { key: 'lack',         layer: 'L3', color: { primary: '#7C3AED', from: '#EDE9FE', to: '#4C1D95' } },
  { key: 'moralCompass', layer: 'L3', color: { primary: '#6D28D9', from: '#DDD6FE', to: '#3B0764' } },
  { key: 'volatility',   layer: 'L3', color: { primary: '#A855F7', from: '#F3E8FF', to: '#7E22CE' } },
  { key: 'growthArc',    layer: 'L3', color: { primary: '#9333EA', from: '#E9D5FF', to: '#581C87' } },
]

/** key로 차원 색상 조회 */
export function getDimensionColor(key: string): DimensionColor | undefined {
  return DIMENSION_COLORS.find(d => d.key === key)?.color
}

/** 레이어별 차원 색상 필터 */
export function getDimensionColorsByLayer(layer: 'L1' | 'L2' | 'L3'): DimensionColorConfig[] {
  return DIMENSION_COLORS.filter(d => d.layer === layer)
}
```

#### 14.4.3 `cross-axis-colors.ts` — 교차축 색상

```typescript
export interface CrossAxisColor {
  /** 히트맵/상관 차트 대표색 */
  primary: string
  /** 역설 강도 그라디언트 (0→1) */
  gradient: [string, string, string]  // [low, mid, high]
}

// ── L1↔L2 역설 페어 색상 (7개) ──
// 두 차원의 색상을 혼합한 고유 색상
export const PARADOX_PAIR_COLORS: Record<string, CrossAxisColor> = {
  'depth_openness':              { primary: '#7C5BF0', gradient: ['#EFF6FF', '#7C5BF0', '#4C1D95'] },
  'lens_neuroticism':            { primary: '#A3884D', gradient: ['#FEF3C7', '#A3884D', '#78350F'] },
  'stance_agreeableness':        { primary: '#E8783B', gradient: ['#FFEDD5', '#E8783B', '#9A3412'] },
  'scope_conscientiousness':     { primary: '#D4A017', gradient: ['#FEF9C3', '#D4A017', '#713F12'] },
  'taste_openness':              { primary: '#C865D9', gradient: ['#F3E8FF', '#C865D9', '#701A75'] },
  'purpose_conscientiousness':   { primary: '#D4871F', gradient: ['#FEF3C7', '#D4871F', '#78350F'] },
  'sociability_extraversion':    { primary: '#E05287', gradient: ['#FECDD3', '#E05287', '#881337'] },
}

// ── 교차 관계 유형별 색상 ──
export const RELATIONSHIP_TYPE_COLORS: Record<string, string> = {
  paradox: '#EF4444',       // 역설 — 빨강
  reinforcing: '#22C55E',   // 강화 — 초록
  modulating: '#F59E0B',    // 변조 — 앰버
  neutral: '#94A3B8',       // 중립 — 슬레이트
}

// ── 히트맵용 교차축 색상 스케일 ──
// L1×L2(35), L1×L3(28), L2×L3(20) 히트맵에서 사용
export const CROSS_LAYER_HEATMAP_SCALES = {
  L1xL2: { cold: '#DBEAFE', neutral: '#FEF3C7', hot: '#EF4444' },  // 블루→앰버→레드
  L1xL3: { cold: '#DBEAFE', neutral: '#EDE9FE', hot: '#7C3AED' },  // 블루→바이올렛→딥퍼플
  L2xL3: { cold: '#FFFBEB', neutral: '#F3E8FF', hot: '#581C87' },  // 앰버→라벤더→딥바이올렛
} as const
```

#### 14.4.4 `engine-meta-colors.ts` — 엔진 메타 개념 색상

```typescript
export const ENGINE_META_COLORS = {
  /** 역설 점수 (Paradox Score) — 빨강 계열 */
  paradoxScore: {
    primary: '#EF4444',
    scale: ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C'],
    //        0-15%     15-30%    30-45%    45-60%    60-75%    75-90%    90-100%
  },
  /** 압력 계수 (Pressure P) — 오렌지 게이지 */
  pressure: {
    primary: '#F97316',
    scale: ['#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#C2410C'],
    //        P=0       P=0.2     P=0.4     P=0.6     P=0.8     P=1.0
  },
  /** V_Final 벡터 — 그린 계열 (최종 결과) */
  vFinal: {
    primary: '#22C55E',
    bg: '#F0FDF4',
    border: '#86EFAC',
  },
  /** α 가중치 (L2 본성) — 앰버 */
  alpha: {
    primary: '#F59E0B',
    range: ['#FEF3C7', '#F59E0B'],
  },
  /** β 가중치 (L3 서사) — 바이올렛 */
  beta: {
    primary: '#8B5CF6',
    range: ['#EDE9FE', '#8B5CF6'],
  },
  /** 차원성 점수 (Dimensionality) — 시안 계열 */
  dimensionality: {
    primary: '#06B6D4',
    scale: ['#CFFAFE', '#67E8F9', '#22D3EE', '#06B6D4', '#0891B2'],
  },
} as const
```

#### 14.4.5 `archetype-colors.ts` — 아키타입별 색상

```typescript
export interface ArchetypeColorScheme {
  id: string
  primary: string
  bg: string
  accent: string
}

// 확장 가능한 배열 구조 — 새 아키타입 추가 시 항목만 추가
export const ARCHETYPE_COLORS: ArchetypeColorScheme[] = [
  { id: 'gentle-critic',      primary: '#6366F1', bg: '#EEF2FF', accent: '#818CF8' },
  { id: 'passionate-explorer', primary: '#EC4899', bg: '#FDF2F8', accent: '#F472B6' },
  { id: 'cold-analyst',       primary: '#0EA5E9', bg: '#F0F9FF', accent: '#38BDF8' },
  { id: 'warm-nostalgic',     primary: '#F97316', bg: '#FFF7ED', accent: '#FB923C' },
  { id: 'social-butterfly',   primary: '#A855F7', bg: '#FAF5FF', accent: '#C084FC' },
  { id: 'lonely-snob',        primary: '#1E293B', bg: '#F8FAFC', accent: '#475569' },
  { id: 'conservative-hipster', primary: '#84CC16', bg: '#F7FEE7', accent: '#A3E635' },
  { id: 'lazy-perfectionist', primary: '#EAB308', bg: '#FEFCE8', accent: '#FACC15' },
  { id: 'kind-contrarian',    primary: '#14B8A6', bg: '#F0FDFA', accent: '#2DD4BF' },
  { id: 'anxious-leader',     primary: '#F43F5E', bg: '#FFF1F2', accent: '#FB7185' },
  { id: 'quiet-revolutionary', primary: '#7C3AED', bg: '#F5F3FF', accent: '#A78BFA' },
  { id: 'hedonist-philosopher', primary: '#D946EF', bg: '#FDF4FF', accent: '#E879F9' },
]

/** 아키타입 ID로 색상 조회. 미등록 아키타입은 기본 회색 반환 */
export function getArchetypeColor(id: string): ArchetypeColorScheme {
  return ARCHETYPE_COLORS.find(a => a.id === id) ?? {
    id, primary: '#64748B', bg: '#F8FAFC', accent: '#94A3B8',
  }
}
```

#### 14.4.6 `index.ts` — 통합 조회 유틸

```typescript
export * from './dimension-colors'
export * from './layer-colors'
export * from './cross-axis-colors'
export * from './engine-meta-colors'
export * from './archetype-colors'

import { DIMENSION_COLORS, type DimensionColor } from './dimension-colors'
import { LAYER_COLORS, type LayerColorScheme } from './layer-colors'
import { PARADOX_PAIR_COLORS, RELATIONSHIP_TYPE_COLORS } from './cross-axis-colors'
import { ENGINE_META_COLORS } from './engine-meta-colors'
import { getArchetypeColor } from './archetype-colors'

/**
 * 만능 색상 조회 — key 하나로 어떤 색상이든 찾아줌
 *
 * @example
 * resolveColor('depth')           → L1 차원 색상
 * resolveColor('openness')        → L2 차원 색상
 * resolveColor('L1')              → 레이어 그룹 색상
 * resolveColor('depth_openness')  → 역설 페어 색상
 * resolveColor('paradoxScore')    → 엔진 메타 색상
 * resolveColor('@gentle-critic')  → 아키타입 색상 (@ prefix)
 */
export function resolveColor(key: string): { primary: string; type: string } {
  // 1. 레이어 그룹
  if (key in LAYER_COLORS) {
    return { primary: LAYER_COLORS[key as keyof typeof LAYER_COLORS].primary, type: 'layer' }
  }
  // 2. 개별 차원
  const dim = DIMENSION_COLORS.find(d => d.key === key)
  if (dim) return { primary: dim.color.primary, type: 'dimension' }
  // 3. 역설 페어
  if (key in PARADOX_PAIR_COLORS) {
    return { primary: PARADOX_PAIR_COLORS[key].primary, type: 'paradox-pair' }
  }
  // 4. 관계 유형
  if (key in RELATIONSHIP_TYPE_COLORS) {
    return { primary: RELATIONSHIP_TYPE_COLORS[key], type: 'relationship' }
  }
  // 5. 엔진 메타
  if (key in ENGINE_META_COLORS) {
    return { primary: (ENGINE_META_COLORS as Record<string, { primary: string }>)[key].primary, type: 'engine' }
  }
  // 6. 아키타입 (@prefix)
  if (key.startsWith('@')) {
    return { primary: getArchetypeColor(key.slice(1)).primary, type: 'archetype' }
  }
  // fallback
  return { primary: '#94A3B8', type: 'unknown' }
}
```

### 14.5 `paradox-mappings.ts` — 역설 매핑 테이블

기존 계획서 내용 유지. 14.3의 교차축 정의와 함께 사용.

```typescript
export const L1_L2_PARADOX_MAPPINGS = [
  { l1: 'depth',       l2: 'openness',          type: 'primary',   invert: false },
  { l1: 'lens',        l2: 'neuroticism',       type: 'primary',   invert: true  },
  { l1: 'stance',      l2: 'agreeableness',     type: 'primary',   invert: true  },
  { l1: 'scope',       l2: 'conscientiousness', type: 'secondary', invert: false },
  { l1: 'taste',       l2: 'openness',          type: 'secondary', invert: false },
  { l1: 'purpose',     l2: 'conscientiousness', type: 'primary',   invert: false },
  { l1: 'sociability', l2: 'extraversion',      type: 'primary',   invert: false },
] as const
```

### 14.6 `projection-coefficients.ts` — 투영 계수

기존 계획서 내용 유지.

### 14.7 `dynamics-defaults.ts` / `interpretation-tables.ts`

기존 계획서 내용 유지.

---

## 15. PersonaWorld RAG 구현

> 설계서 Section 15 (PersonaWorld RAG — 페르소나의 장기 기억) 참조.
> 이 섹션은 "어떻게 구현할 것인가"에 집중한다.

### 15.1 아키텍처 개요

```
LLM 호출 시 프롬프트 구성:
┌─────────────────────────────────────────┐
│ [A] 시스템 프롬프트 (고정, 캐시 대상)       │
│     벡터/역설/Voice 정의 (~2,000 tok)      │
├─────────────────────────────────────────┤
│ [B] Voice 앵커 (PersonaWorld 검색)        │
│     최근 포스트/댓글 5~10개 (~500 tok)     │
├─────────────────────────────────────────┤
│ [C] 관계 기억 (조건부 검색)                │
│     상호작용 대상과의 최근 대화 (~800 tok)  │
├─────────────────────────────────────────┤
│ [D] 관심사 연속성 (검색)                   │
│     최근 좋아요/리포스트 주제 (~100 tok)    │
├─────────────────────────────────────────┤
│ [E] 현재 컨텍스트 + 유저 입력 (~500 tok)   │
└─────────────────────────────────────────┘
총: ~3,900 tok (기존 2,500 대비 +55%)
```

### 15.2 컨텍스트 빌더

```typescript
// src/lib/rag/context-builder.ts

interface RAGContext {
  voiceAnchor: string       // [B] 최근 글에서 추출한 Voice 앵커
  relationMemory: string    // [C] 관계 기억 (대화 상대 있을 때)
  interestContinuity: string // [D] 최근 관심사 요약
  totalTokens: number        // 토큰 예상치
}

interface ContextBuilderOptions {
  personaId: string
  interactionTargetId?: string  // 대화 상대 (있으면 관계 기억 검색)
  maxVoiceAnchors: number       // default: 5
  maxInteractions: number       // default: 10
  maxLikes: number              // default: 10
}

/**
 * PersonaWorld DB에서 페르소나의 최근 활동을 검색하여
 * LLM 프롬프트에 주입할 RAG 컨텍스트를 구성한다.
 *
 * 핵심 원칙:
 * - Voice 앵커 = 페르소나가 "실제로 쓴 글" → few-shot 역할
 * - 관계 기억 = 특정 상대와의 최근 대화 이력 → 관계 톤 유지
 * - 관심사 연속성 = 최근 좋아요/리포스트 주제 → 화제 연속성
 */
async function buildPersonaContext(
  options: ContextBuilderOptions
): Promise<RAGContext>
```

### 15.3 Voice 앵커 검색 로직

```typescript
// src/lib/rag/voice-anchor.ts

/**
 * 페르소나의 최근 포스트/댓글에서 Voice 앵커를 추출한다.
 *
 * 검색 우선순위:
 * 1. 최근 포스트 (본인 작성) — Voice의 가장 강한 증거
 * 2. 최근 댓글 (본인 작성) — 대화 스타일 증거
 *
 * 포맷: "[{timeAgo}] {content.slice(0, 200)}"
 * → LLM에게 "이 페르소나가 실제로 이렇게 말한다"는 few-shot 앵커
 */
async function extractVoiceAnchors(
  personaId: string,
  limit: number
): Promise<string>
```

### 15.4 관계 기억 검색 로직

```typescript
// src/lib/rag/relation-memory.ts

/**
 * 두 페르소나 간 최근 상호작용 이력을 검색한다.
 *
 * 검색 범위:
 * - A가 B의 포스트에 단 댓글
 * - B가 A의 포스트에 단 댓글
 * - A/B 간 댓글 체인 (대화)
 *
 * 결과: 시간순 정렬된 상호작용 요약
 * → "어제 논쟁했음", "3일 전 칭찬함" 등 관계 톤 유지
 */
async function extractRelationMemory(
  personaId: string,
  targetId: string,
  limit: number
): Promise<string>
```

### 15.5 관심사 연속성 검색 로직

```typescript
// src/lib/rag/interest-continuity.ts

/**
 * 페르소나의 최근 좋아요/리포스트에서 관심 주제를 추출한다.
 *
 * 방법: 최근 좋아요한 콘텐츠의 태그/주제를 빈도순 정렬
 * 결과: "이번 주 관심사: 독립영화, 재즈, 도시 건축"
 */
async function extractInterestContinuity(
  personaId: string,
  limit: number
): Promise<string>
```

### 15.6 캐싱 전략

```typescript
// 호출당 DB 쿼리 3~4회 → 캐싱 필수

interface RAGCacheConfig {
  voiceAnchorTTL: 300        // 5분 — 포스트는 자주 안 바뀜
  relationMemoryTTL: 60      // 1분 — 대화 중에는 빠르게 갱신
  interestTTL: 600           // 10분 — 관심사는 천천히 변함
}

/**
 * 캐시 키 규칙:
 * - voice:{personaId}      → voiceAnchor
 * - relation:{personaId}:{targetId} → relationMemory
 * - interest:{personaId}   → interestContinuity
 *
 * 구현: 인메모리 LRU 캐시 (Phase 9에서 Redis 전환 가능)
 */
```

---

## 16. 품질 피드백 루프 구현

> 설계서 Section 16 (품질 피드백 루프) 참조.
> 이 섹션은 4대 측정 엔진의 구체적 구현 명세에 집중한다.

### 16.1 품질 측정 엔진 인터페이스

```typescript
// src/lib/quality/types.ts

interface QualityMetrics {
  paradoxExpression: number   // 0.0~1.0 — 역설이 표현되었는가
  voiceConsistency: number    // 0.0~1.0 — 과거 글과 일관적인가
  pressureResponse: number    // 0.0~1.0 — P 변화에 자연스러운가
  userSatisfaction: number    // 0.0~1.0 — 유저가 만족하는가
  overall: number             // 4개의 가중 평균
}

interface QualityEvalInput {
  personaId: string
  generatedText: string
  task: 'post' | 'comment' | 'review' | 'chat'
  pressure?: number
  interactionTargetId?: string
}

/**
 * 메인 품질 측정 함수.
 * 생성된 텍스트를 4대 지표로 자동 평가한다.
 */
async function evaluateQuality(
  input: QualityEvalInput
): Promise<QualityMetrics>
```

### 16.2 역설 표현 스코어 (Paradox Expression Score)

```typescript
// src/lib/quality/paradox-expression.ts

/**
 * 측정 파이프라인:
 * 1. 페르소나의 L1↔L2 역설 쌍 중 상위 3개 추출
 * 2. 각 역설을 자연어로 변환:
 *    stance(0.8)↔agreeableness(0.9) → "비판적이면서 공감적인"
 * 3. 경량 모델(GPT-4o mini)로 텍스트 분석:
 *    "이 텍스트에서 '{역설 자연어}'가 표현되었는가?"
 *    → 0.0~1.0 스코어
 * 4. 상위 3개 역설의 스코어 평균
 *
 * 비용: ~3원/평가 (mini 1회 호출)
 * 빈도: 전수 평가 아님 — 샘플링 (10% 또는 Heavy tier 호출만)
 */
async function measureParadoxExpression(
  personaId: string,
  generatedText: string
): Promise<number>
```

### 16.3 Voice 일관성 스코어 (Voice Consistency Score)

```typescript
// src/lib/quality/voice-consistency.ts

/**
 * LLM 없이 규칙 기반으로 측정 (비용 0원):
 *
 * 1. 페르소나의 최근 글 10개에서 특징 추출:
 *    - avgSentenceLength: 평균 문장 길이
 *    - exclamationRate: 감탄사 비율
 *    - questionRate: 의문문 비율
 *    - vocabLevel: 어휘 수준 (고유 어휘 / 전체 단어)
 *    - speechPatternHits: 말버릇 출현 횟수
 *
 * 2. 새로 생성된 글에서 동일 특징 추출
 *
 * 3. 코사인 유사도 계산
 *    유사도 < 0.6 → Voice drift 경고
 *    유사도 < 0.4 → Voice 심각 이탈
 */
interface VoiceFeatures {
  avgSentenceLength: number
  exclamationRate: number
  questionRate: number
  vocabLevel: number
  speechPatternHits: number
}

function extractVoiceFeatures(text: string, speechPatterns: string[]): VoiceFeatures
function cosineSimilarity(a: VoiceFeatures, b: VoiceFeatures): number
```

### 16.4 Pressure 반응 자연스러움 (Pressure Response Score)

```typescript
// src/lib/quality/pressure-response.ts

/**
 * 배치 테스트로 측정 (실시간 아님):
 *
 * 1. 같은 페르소나에게 P=0.1, 0.4, 0.7, 1.0으로 동일 질문
 * 2. 4개 응답의 감정 톤을 분석 (mini 모델):
 *    → sentimentScore: -1.0(극부정) ~ 1.0(극긍정)
 *    → intensityScore: 0.0(차분) ~ 1.0(격렬)
 * 3. 변화량이 단조 증가하는지 검증:
 *    - P↑ → intensity↑ (정상)
 *    - P↑ → intensity↓ (비정상 → 경고)
 *
 * 빈도: 아키타입별 주 1회 배치 실행
 * 비용: ~48원/아키타입/주 (mini 4회 × 12 아키타입)
 */
interface PressureTestResult {
  pressure: number
  sentimentScore: number
  intensityScore: number
}

async function runPressureTest(
  personaId: string,
  testPrompt: string
): Promise<PressureTestResult[]>
```

### 16.5 Few-shot 라이브러리 자동 수집

```typescript
// src/lib/quality/few-shot-collector.ts

/**
 * 품질 높은 응답을 자동 수집하여 Few-shot 예시 DB 구축.
 *
 * 수집 기준:
 * - paradoxExpression ≥ 0.8
 * - voiceConsistency ≥ 0.7
 * - 유저 LIKE 피드백
 *
 * 저장 구조:
 * - 역설 유형별 분류 (stance↔agreeableness, sociability↔extraversion 등)
 * - 유형당 최대 10개 유지 (FIFO로 교체)
 *
 * 활용:
 * - 동일 역설 유형 페르소나 생성 시 few-shot 2~3개 주입
 * - Voice 앵커와 함께 프롬프트에 포함
 */
interface FewShotExample {
  id: string
  paradoxType: string          // 예: 'stance_agreeableness'
  paradoxScore: number
  qualityScore: number
  generatedText: string
  context: string              // 어떤 상황에서 생성되었는지
  collectedAt: Date
}

interface FewShotLibrary {
  [paradoxType: string]: FewShotExample[]  // 최대 10개/유형
}
```

### 16.6 품질 대시보드 데이터

```typescript
// src/lib/quality/dashboard.ts

/**
 * 1단계 (v3 출시): 수동 확인용 대시보드 데이터 API
 *
 * 집계 단위:
 * - 아키타입별 평균 품질 지표
 * - 역설 유형별 표현 성공률
 * - Voice drift 발생 빈도 (턴 수 기준)
 * - Pressure 구간별 자연스러움
 *
 * 2단계 (v3.1): 문제 패턴 자동 감지 → 알림
 * 3단계 (v3.2): Few-shot 자동 교체, 프롬프트 A/B 자동 실행
 */
interface QualityDashboardData {
  archetypeMetrics: Record<string, QualityMetrics>
  paradoxTypeSuccess: Record<string, number>
  voiceDriftDistribution: { turnCount: number; driftRate: number }[]
  pressureCurveByArchetype: Record<string, PressureTestResult[]>
  fewShotLibrarySize: Record<string, number>
}
```

### 16.7 Auto-Interview 프로토콜 구현

```typescript
// src/lib/quality/auto-interview.ts

/**
 * Auto-Interview: 페르소나에게 20개 질문을 던져 행동 기반 벡터를 추론하고,
 * 설계된 벡터와 비교하여 일관성을 검증한다.
 *
 * 설계서 §16.6 참조.
 *
 * 실행 흐름:
 * 1. 질문 생성 (레이어별 분배: L1 7문항 + L2 5문항 + L3 4문항 + 역설 4문항)
 * 2. 페르소나 응답 수집 (LLM 호출 20회)
 * 3. 응답→벡터 추론 (LLM-as-Judge 1회)
 * 4. 설계 벡터 vs 행동 벡터 비교
 *
 * 비용: ~90원/persona (Sonnet 21회 + mini 1회)
 * 빈도: 생성 시 필수 1회, 이후 월간 샘플링
 */

// ── 질문 설계 ──
interface InterviewQuestion {
  id: string                       // "L1_depth_01"
  targetLayer: 'L1' | 'L2' | 'L3' | 'paradox'
  targetDimension: string          // "depth", "openness", "lack" 등
  questionText: string             // 실제 질문 텍스트
  scoringGuide: {                  // 채점 가이드
    lowSignals: string[]           // 0.0~0.3 응답 특성
    highSignals: string[]          // 0.7~1.0 응답 특성
  }
}

// ── 질문 풀 생성기 ──
function generateInterviewQuestions(
  personaProfile: {
    social: SocialPersonaVector
    temperament: CoreTemperamentVector
    narrative: NarrativeDriveVector
    backstory: string
  }
): InterviewQuestion[]

// ── 인터뷰 실행 결과 ──
interface InterviewResult {
  personaId: string
  executedAt: Date
  questions: InterviewQuestion[]
  responses: string[]                       // 페르소나의 20개 응답
  inferredVector: ThreeLayerVector          // LLM이 추론한 행동 기반 벡터
  designedVector: ThreeLayerVector          // 설계된 원본 벡터
  dimensionScores: Record<string, {         // 차원별 일치도
    designed: number
    inferred: number
    delta: number                           // |designed - inferred|
    pass: boolean                           // delta < 0.15
  }>
  overallScore: number                      // 전체 일치도 (0.0~1.0)
  verdict: 'pass' | 'warning' | 'fail'     // ≥0.85 pass, 0.70~0.85 warning, <0.70 fail
  failedDimensions: string[]                // delta ≥ 0.15인 차원 목록
}

// ── 메인 실행 함수 ──
async function runAutoInterview(
  personaId: string,
  options?: {
    questionCount?: number     // 기본 20
    passThreshold?: number     // 기본 0.85
    warningThreshold?: number  // 기본 0.70
  }
): Promise<InterviewResult>

// ── 벡터 추론 (LLM-as-Judge) ──
async function inferVectorFromResponses(
  questions: InterviewQuestion[],
  responses: string[]
): Promise<ThreeLayerVector>

// ── 차원별 비교 ──
function compareDimensionScores(
  designed: ThreeLayerVector,
  inferred: ThreeLayerVector,
  tolerance: number             // 기본 0.15
): InterviewResult['dimensionScores']
```

### 16.8 Persona Integrity Score 구현

```typescript
// src/lib/quality/integrity-score.ts

/**
 * Persona Integrity Score: 대화 로그에서 3가지 지표를 경량 측정.
 *
 * 설계서 §16.7 참조.
 *
 * PIS = CR(0.35) + SC(0.35) + CS(0.30)
 *   CR = Context Recall (배경 서사 반영도)
 *   SC = Setting Consistency (설정 사실 일관성)
 *   CS = Character Stability (Voice 특성 안정성)
 *
 * 비용: ~2원/20턴 (mini 2회 + 규칙 기반 1회)
 * 빈도: 세션 종료 후 자동 실행
 */

// ── 입력 데이터 ──
interface IntegrityInput {
  personaId: string
  sessionId: string
  conversationTurns: Array<{
    turnNumber: number
    userMessage: string
    personaResponse: string
  }>
  personaProfile: {
    backstory: string              // 배경 서사 텍스트
    backstoryElements: string[]    // 추출된 핵심 요소 (이름, 장소, 사건 등)
    voiceProfile: {
      speechPatterns: string[]
      vocabulary: { level: string; sentenceLength: string }
      quirks: string[]
    }
  }
}

// ── Context Recall (가중치 0.35) ──
/**
 * LLM-as-Judge: 배경 서사의 핵심 요소가 대화에 자연스럽게 반영되었는가?
 *
 * 방법:
 * 1. backstoryElements에서 5개 핵심 요소 추출
 * 2. 전체 대화에서 각 요소의 반영 여부를 LLM이 판단
 * 3. 반영된 요소 / 전체 요소 = recall 비율
 *
 * 주의: "반영"은 직접 언급이 아니라 행동/태도로 간접 드러나도 인정
 */
async function measureContextRecall(
  input: IntegrityInput
): Promise<{
  score: number                              // 0.0~1.0
  elementResults: Array<{
    element: string                          // "가문의 몰락"
    reflected: boolean                       // 반영 여부
    evidence: string                         // 근거 턴/문장
  }>
}>

// ── Setting Consistency (가중치 0.35) ──
/**
 * LLM-as-Judge: 대화 중 설정과 모순되는 사실이 없는가?
 *
 * 방법:
 * 1. 전체 대화에서 페르소나가 언급한 사실(fact) 추출
 * 2. 설정(배경서사, 시대정신)과 교차 검증
 * 3. 모순 개수에 따라 감점: score = max(0, 1 - contradictions × 0.2)
 *
 * 감지 대상:
 * - 시대 오류 (밀레니얼인데 1960년대 사건 직접 경험 언급)
 * - 성격 모순 (내향적 설정인데 "파티를 즐긴다" 발언)
 * - 사실 불일치 (배경과 맞지 않는 구체적 정보)
 */
async function measureSettingConsistency(
  input: IntegrityInput
): Promise<{
  score: number                              // 0.0~1.0
  contradictions: Array<{
    turn: number
    claim: string                            // 페르소나가 주장한 사실
    conflictsWith: string                    // 모순되는 설정
    severity: 'minor' | 'major'              // minor: -0.1, major: -0.2
  }>
}>

// ── Character Stability (가중치 0.30) ──
/**
 * 규칙 기반 (LLM 불필요): Voice 특성이 대화 전반에 걸쳐 안정적인가?
 *
 * 방법:
 * 1. 대화를 5턴 윈도우로 분할
 * 2. 각 윈도우에서 VoiceFeatures 추출 (voice-consistency.ts 재사용)
 * 3. 연속 윈도우 간 코사인 유사도 계산
 * 4. 최소 유사도 = stability score
 *    (급격한 드리프트 1회 = 전체 점수 하락)
 */
function measureCharacterStability(
  input: IntegrityInput
): {
  score: number                              // 0.0~1.0
  windowScores: Array<{
    windowStart: number
    windowEnd: number
    features: VoiceFeatures
    similarityWithPrevious: number | null    // 첫 윈도우는 null
  }>
  minSimilarity: number                      // 가장 낮은 윈도우 간 유사도
}

// ── 종합 Integrity Score ──
interface IntegrityScoreResult {
  personaId: string
  sessionId: string
  contextRecall: number          // 0.0~1.0
  settingConsistency: number     // 0.0~1.0
  characterStability: number     // 0.0~1.0
  overall: number                // CR×0.35 + SC×0.35 + CS×0.30
  verdict: 'excellent' | 'good' | 'caution' | 'critical'
  // ≥0.85 excellent, 0.70~0.85 good, 0.55~0.70 caution, <0.55 critical
  details: {
    contextRecallDetails: Awaited<ReturnType<typeof measureContextRecall>>
    settingConsistencyDetails: Awaited<ReturnType<typeof measureSettingConsistency>>
    characterStabilityDetails: ReturnType<typeof measureCharacterStability>
  }
}

async function computeIntegrityScore(
  input: IntegrityInput
): Promise<IntegrityScoreResult>
```

### 16.9 인터랙션 로그 수집기

```typescript
// src/lib/quality/interaction-logger.ts

/**
 * 인터랙션 로그 수집 — 모든 페르소나 대화를 구조화하여 기록.
 *
 * 설계서 §6.2 참조.
 * 구현 계획서 §3.4 InteractionLog/InteractionSession Prisma 모델 참조.
 *
 * 수집 시점:
 * - 세션 시작/종료: InteractionSession 생성/갱신
 * - 매 턴: InteractionLog 엔트리 추가
 * - 세션 종료: Integrity Score 자동 트리거 (비동기)
 */

interface LoggerContext {
  sessionId: string
  personaId: string
  userId: string
}

// ── 세션 관리 ──
async function startSession(
  personaId: string,
  userId: string
): Promise<LoggerContext>

async function endSession(
  context: LoggerContext,
  options?: { runIntegrityCheck?: boolean }  // 기본 true
): Promise<{
  session: InteractionSessionSummary
  integrityScore?: IntegrityScoreResult
}>

// ── 턴 로깅 ──
async function logTurn(
  context: LoggerContext,
  turn: {
    turnNumber: number
    userMessage: string
    personaResponse: string
    responseLengthTokens: number
    vectorSnapshot: {
      pressure: number
      activeLayer: 'L1' | 'L2'
      vFinalDrift: number
      paradoxActivation: number
    }
    behaviorTags: {
      userSentiment: 'supportive' | 'neutral' | 'challenging' | 'aggressive'
      personaTone: string
      triggerActivated: string | null
      quirkFired: string | null
      topicCategory: string
    }
  }
): Promise<void>

// ── 세션 메트릭 집계 ──
function aggregateSessionMetrics(
  logs: InteractionLogEntry[]
): {
  totalTurns: number
  avgPressure: number
  peakPressure: number
  dominantTopic: string
}
```

---

## 17. LLM 모델 전략 구현

> 설계서 Section 17 (LLM 모델 전략) 참조.
> 이 섹션은 3-Tier 라우터, Prompt Caching, Provider Adapter의 구체적 구현에 집중한다.

### 17.1 모델 설정

```typescript
// src/lib/llm/model-config.ts

const MODEL_TIERS = {
  heavy: {
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    costPerInputMToken: 3.0,    // $3/M input
    costPerOutputMToken: 15.0,  // $15/M output
  },
  medium: {
    provider: 'openai' as const,
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    costPerInputMToken: 0.15,   // $0.15/M input
    costPerOutputMToken: 0.60,  // $0.60/M output
  },
  light: {
    provider: 'rule-based' as const,
    model: null,                 // LLM 호출 없음
    maxTokens: 0,
    costPerInputMToken: 0,
    costPerOutputMToken: 0,
  },
} as const

type ModelTier = keyof typeof MODEL_TIERS
```

### 17.2 동적 Tier 라우터

```typescript
// src/lib/llm/tier-router.ts

interface TierRoutingInput {
  personaId: string
  paradoxScore: number
  task: 'persona-generation' | 'review' | 'post' | 'comment' | 'chat' | 'reaction'
  pressure?: number
  triggerDetected?: boolean
  conflictScore?: number
  expectedResponseLength?: number
}

/**
 * 동적 분기 로직 (설계서 17.3):
 *
 * Heavy (Sonnet):
 *   - paradoxScore > 0.5
 *   - pressure > 0.4
 *   - triggerDetected
 *   - conflictScore > 0.7
 *   - task == 'persona-generation'
 *   - task == 'review'
 *
 * Light (규칙 기반):
 *   - expectedResponseLength < 50
 *   - task == 'reaction'
 *
 * Medium (mini): 그 외 전부
 */
function routeToTier(input: TierRoutingInput): ModelTier
```

### 17.3 Provider Adapter

```typescript
// src/lib/llm/provider-adapter.ts

interface LLMRequest {
  systemPrompt: string
  ragContext?: string         // PersonaWorld RAG
  messages: { role: 'user' | 'assistant'; content: string }[]
  tier: ModelTier
  enableCaching?: boolean     // Prompt Caching 활성화
}

interface LLMResponse {
  content: string
  tier: ModelTier
  inputTokens: number
  outputTokens: number
  cached: boolean             // 캐시 히트 여부
  latencyMs: number
}

/**
 * Provider별 분기 + Prompt Caching 적용.
 *
 * Anthropic (Heavy tier):
 *   - cache_control: { type: 'ephemeral' } 적용
 *   - 시스템 프롬프트 + 벡터/역설 정의를 캐시 블록으로
 *   - RAG 컨텍스트는 변동이므로 별도 블록
 *
 * OpenAI (Medium tier):
 *   - 자동 prefix caching (별도 설정 불필요)
 *
 * Rule-based (Light tier):
 *   - LLM 호출 없음 → Voice 템플릿에서 랜덤 선택
 */
async function callLLM(request: LLMRequest): Promise<LLMResponse>
```

### 17.4 Prompt Caching 구현 (Anthropic)

```typescript
// src/lib/llm/providers/anthropic.ts

/**
 * Anthropic cache_control 구조:
 *
 * system: [
 *   {
 *     type: 'text',
 *     text: systemPrompt + personaVectorDef,  // ~2,000 tok (고정)
 *     cache_control: { type: 'ephemeral' }    // 5분 TTL
 *   },
 *   {
 *     type: 'text',
 *     text: ragContext                         // ~1,900 tok (변동)
 *   }
 * ]
 *
 * 캐시 적중 시:
 * - input 비용 82% 절감 (고정부분)
 * - 같은 페르소나의 연속 대화에서 효과 극대
 *
 * 주의: cache_control 블록 최소 1,024 tok 필요
 *       → 시스템 프롬프트 2,000 tok이므로 조건 충족
 */
```

### 17.5 Light Tier: 규칙 기반 생성기

```typescript
// src/lib/llm/providers/rule-based.ts

/**
 * LLM 호출 없이 생성하는 경량 응답.
 *
 * 용도: 좋아요, 짧은 반응 ("ㅋㅋ", "와 대박"), 리포스트 코멘트
 *
 * 로직:
 * 1. persona.voice.speechPatterns에서 패턴 추출
 * 2. persona.voice.exclamations에서 감탄사 추출
 * 3. 현재 감정 상태 (pressure 기반)에 맞는 템플릿 선택
 * 4. 변형: speechPattern + 감탄사 + 약간의 랜덤성
 *
 * 비용: 0원
 * 품질: 단문 반응에서는 LLM과 구분 불가능
 */
function generateLightResponse(
  persona: PersonaProfile,
  context: InteractionContext
): string
```

---

## 18. 구현 Phase 및 태스크

### Phase 0: 기반 인프라 (타입 + DB + 상수 + 색상 + 인터랙션 로그 스키마)

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 0-1 | v3 공유 타입 정의 | `packages/shared-types/src/persona-v3.ts` | **신규** |
| 0-2 | 공유 타입 re-export | `packages/shared-types/src/index.ts` | 수정 |
| 0-3 | 앱 타입 정의 | `apps/engine-studio/src/types/persona-v3.ts` | **신규** |
| 0-4 | 앱 타입 re-export | `apps/engine-studio/src/types/index.ts` | 수정 |
| 0-5 | Prisma 스키마 확장 | `apps/engine-studio/prisma/schema.prisma` | 수정 |
| 0-6 | DB 마이그레이션 | `prisma migrate dev` | 실행 |
| 0-7 | v3 상수 모듈 — dimensions.ts | `src/constants/v3/dimensions.ts` | **신규** |
| 0-8 | v3 상수 모듈 — paradox-mappings.ts | `src/constants/v3/paradox-mappings.ts` | **신규** |
| 0-9 | v3 상수 모듈 — projection-coefficients.ts | `src/constants/v3/projection-coefficients.ts` | **신규** |
| 0-10 | v3 상수 모듈 — cross-layer-axes.ts (83개+) | `src/constants/v3/cross-layer-axes.ts` | **신규** |
| 0-11 | v3 상수 모듈 — dynamics/interpretation | `src/constants/v3/dynamics-defaults.ts`, `interpretation-tables.ts` | **신규** |
| 0-12 | v3 상수 모듈 — index.ts | `src/constants/v3/index.ts` | **신규** |
| 0-13 | 색상 모듈 — dimension-colors.ts (106D+) | `src/lib/colors/dimension-colors.ts` | **신규** |
| 0-14 | 색상 모듈 — layer-colors.ts (3 레이어) | `src/lib/colors/layer-colors.ts` | **신규** |
| 0-15 | 색상 모듈 — cross-axis-colors.ts (역설+히트맵) | `src/lib/colors/cross-axis-colors.ts` | **신규** |
| 0-16 | 색상 모듈 — engine-meta-colors.ts | `src/lib/colors/engine-meta-colors.ts` | **신규** |
| 0-17 | 색상 모듈 — archetype-colors.ts (12+) | `src/lib/colors/archetype-colors.ts` | **신규** |
| 0-18 | 색상 모듈 — index.ts + resolveColor 유틸 | `src/lib/colors/index.ts` | **신규** |
| 0-19 | 기존 trait-colors.ts 호환 래퍼 | `src/lib/trait-colors.ts` | 수정 (새 모듈 re-export) |
| 0-20 | 기존 Vector6D 중복 정리 | 여러 파일 (6곳) | 수정 |
| 0-21 | InteractionLog / InteractionSession Prisma 모델 추가 | `prisma/schema.prisma` | 수정 |
| 0-22 | InteractionLog DB 마이그레이션 | `prisma migrate dev` | 실행 |

### Phase 1: 핵심 벡터 엔진

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 1-1 | 벡터 유틸리티 (clamp, validate 등) | `src/lib/vector/utils.ts` | 수정 |
| 1-2 | L2→L1 투영 | `src/lib/vector/projection.ts` | **신규** |
| 1-3 | L3→L1 투영 | `src/lib/vector/projection.ts` | **신규** (같은 파일) |
| 1-4 | 교차축 계산 엔진 (83축 스코어) | `src/lib/vector/cross-axis.ts` | **신규** |
| 1-5 | 교차축 역방향 매핑 테이블 | `src/constants/v3/cross-axis-inversions.ts` | **신규** |
| 1-6 | Extended Paradox Score (L1↔L2 + L1↔L3 + L2↔L3) | `src/lib/vector/paradox.ts` | **신규** |
| 1-7 | V_Final 계산 엔진 (CrossAxisProfile 포함) | `src/lib/vector/v-final.ts` | **신규** |
| 1-8 | 벡터 모듈 re-export | `src/lib/vector/index.ts` | 수정 |
| 1-9 | 단위 테스트 (교차축 + 확장 Paradox 포함) | `src/lib/vector/__tests__/` | **신규** |

### Phase 2: 생성 파이프라인 재구성 + Auto-Interview 품질 게이트

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 2-1 | 아키타입 템플릿 정의 (12개) | `src/lib/persona-generation/archetypes.ts` | **신규** |
| 2-2 | 3-Layer 벡터 생성기 | `src/lib/persona-generation/vector-diversity.ts` | **전면 재작성** |
| 2-3 | 역설 설계 엔진 | `src/lib/persona-generation/paradox-designer.ts` | **신규** |
| 2-4 | 캐릭터 생성기 (3-Layer 기반) | `src/lib/persona-generation/character-generator.ts` | **전면 재작성** |
| 2-5 | 활동성 추론 (L1 sociability 연계) | `src/lib/persona-generation/activity-inference.ts` | 대폭 수정 |
| 2-6 | 콘텐츠/관계 설정 추론 | `src/lib/persona-generation/content-settings-inference.ts` | 대폭 수정 |
| 2-7 | 일관성 검증 엔진 (6-Category: 구조/L1↔L2/L2↔L3/정성↔정량/교차축/동적) | `src/lib/persona-generation/consistency-validator.ts` | **전면 재작성** |
| 2-8 | 프롬프트 빌더 (전체 레이어) | `src/lib/persona-generation/prompt-builder.ts` | **전면 재작성** |
| 2-9 | 메인 파이프라인 | `src/lib/persona-generation/index.ts` | **전면 재작성** |
| 2-10 | 샘플 콘텐츠 생성기 | `src/lib/persona-generation/sample-content-generator.ts` | 수정 |
| 2-11 | Auto-Interview 질문 생성기 (레이어별 20문항) | `src/lib/quality/auto-interview.ts` | **신규** |
| 2-12 | Auto-Interview 벡터 추론 + 품질 게이트 (pass/warning/fail) | `src/lib/quality/auto-interview.ts` | **신규** |
| 2-13 | Auto-Interview 단위 테스트 | `src/lib/quality/__tests__/auto-interview.test.ts` | **신규** |

### Phase 3: 정성적 차원

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 3-1 | Backstory 생성기 | `src/lib/persona-generation/backstory-generator.ts` | **신규** |
| 3-2 | Voice 프로필 생성기 | `src/lib/persona-generation/voice-generator.ts` | **신규** |
| 3-3 | Pressure Context 생성기 | `src/lib/persona-generation/pressure-generator.ts` | **신규** |
| 3-4 | Zeitgeist 프로필 생성기 | `src/lib/persona-generation/zeitgeist-generator.ts` | **신규** |

### Phase 4: 하이브리드 연결 메커니즘 (비정량↔정량 4대 알고리즘)

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 4-1 | 타입 정의 (ExtractedKeyword, TriggerRule, QuirkDefinition 등) | `src/lib/interaction/types.ts` | **신규** |
| 4-2 | 의미 카테고리 → 벡터 매핑 상수 테이블 | `src/constants/v3/keyword-mappings.ts` | **신규** |
| 4-3 | Init: LLM 키워드 추출 + 카테고리 매핑 + delta 적용 | `src/lib/interaction/initialization.ts` | **신규** |
| 4-4 | Override: 트리거 감지(2단계) + delta 적용 + 복귀 곡선(exp decay) | `src/lib/interaction/override.ts` | **신규** |
| 4-5 | Adapt: UIV 분석 + 차원별 α + 모멘텀 + 드리프트 클램프 | `src/lib/interaction/adaptation.ts` | **신규** |
| 4-6 | Express: 파생 상태값 계산 + sigmoid 확률 + 쿨다운 + 프롬프트 주입 | `src/lib/interaction/expression.ts` | **신규** |
| 4-7 | 태도 → delta 매핑 상수 (ATTITUDE_MAPPINGS) | `src/constants/v3/attitude-mappings.ts` | **신규** |
| 4-8 | 모듈 index + 통합 InteractionEngine | `src/lib/interaction/index.ts` | **신규** |
| 4-9 | 상호작용 모듈 단위 테스트 | `src/lib/interaction/__tests__/` | **신규** |

### Phase 5: 매칭 알고리즘 재구성 (3-Tier 다층 매칭)

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 5-1 | 매칭 타입 정의 (MatchingInput, MatchingResult, MatchingTier) | `src/lib/matching/types.ts` | **신규** |
| 5-2 | Tier 1 Basic 매칭 (V_Final 70% + 교차축 유사도 30%) | `src/lib/matching/basic-matching.ts` | **신규** |
| 5-3 | Tier 2 Advanced 매칭 (V_Final 50% + 교차축 30% + Paradox 호환 20%) | `src/lib/matching/advanced-matching.ts` | **신규** |
| 5-4 | Tier 3 Exploration 매칭 (Paradox 다양성 40% + 교차축 발산 40% + 아키타입 신선도 20%) | `src/lib/matching/exploration-matching.ts` | **신규** |
| 5-5 | 비정량적 매칭 보정 (Voice 유사도 + 서사 호환성 → ±0.1) | `src/lib/matching/qualitative-matching.ts` | **신규** |
| 5-6 | 통합 매칭 엔진 + 피드 믹싱 (60/30/10) | `src/lib/matching/engine.ts` | **신규** |
| 5-7 | 기존 알고리즘 V_Final+교차축 통합 재작성 | `src/lib/matching/algorithms.ts` | **전면 재작성** |

### Phase 6: 컬러지문 데이터 엔진

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 6-1 | 지문 스키마 TS 타입 생성 | `src/types/fingerprint.ts` | **신규** |
| 6-2 | 스키마 런타임 검증기 | `src/lib/fingerprint/schema-validator.ts` | **신규** |
| 6-3 | 색공간 변환 유틸 (CIELAB↔OKLCH↔sRGB) | `src/lib/fingerprint/color-space.ts` | **신규** |
| 6-4 | 색상 인코딩 엔진 (릿지별 색 할당, ΔE00 검증) | `src/lib/fingerprint/color-encoder.ts` | **신규** |
| 6-5 | 릿지 생성기 (패턴 타입, core/delta, 곡률) | `src/lib/fingerprint/ridge-generator.ts` | **신규** |
| 6-6 | 고유성 엔진 (시드 해싱, 결정론적 PRNG) | `src/lib/fingerprint/uniqueness-engine.ts` | **신규** |
| 6-7 | 충돌 검사기 (pHash, SSIM, curve distance) | `src/lib/fingerprint/collision-checker.ts` | **신규** |
| 6-8 | canonical SVG 렌더러 (이펙트 없음) | `src/lib/fingerprint/svg-renderer.ts` | **신규** |
| 6-9 | 지문 모듈 index | `src/lib/fingerprint/index.ts` | **신규** |
| 6-10 | 단위 테스트 | `src/lib/fingerprint/__tests__/` | **신규** |

### Phase 7: UI 개편

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 7-1 | 3-Layer 벡터 에디터 | `src/components/node-editor/nodes/vector-node.tsx` | **전면 재작성** |
| 7-2 | 역설 시각화 차트 | `src/components/charts/paradox-chart.tsx` | **신규** |
| 7-3 | V_Final 시뮬레이터 | `src/components/charts/v-final-simulator.tsx` | **신규** |
| 7-4 | 정성적 차원 에디터 | `src/components/persona/qualitative-editor.tsx` | **신규** |
| 7-5 | 컬러지문 UI 공통 타입/유틸 | `src/components/charts/fingerprint-types.ts`, `fingerprint-utils.ts` | **신규** |
| 7-6 | TraitColorFingerprint v3 (다층 레이더) | `src/components/charts/trait-color-fingerprint.tsx` | **전면 재작성** |
| 7-7 | PingerPrint2D v3 (다층 지문 패턴, display 모드) | `src/components/charts/p-inger-print-2d.tsx` | **전면 재작성** |
| 7-8 | PingerPrint3D v3 (다층 Jacks) | `src/components/charts/p-inger-print-3d.tsx` | **전면 재작성** |
| 7-9 | 컬러지문 하위 호환 래퍼 | `src/components/charts/fingerprint-compat.tsx` | **신규** |
| 7-10 | 트레이트 색상 반영 | 여러 UI 파일 | 수정 |

### Phase 8: 노드 에디터 재구축 (ComfyUI 스타일)

> Phase 7(UI 개편) 이후 진행. DAG 엔진은 Phase 1-5 벡터/생성 엔진에 의존.
> Section 13 (노드 에디터 아키텍처) 참조.

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 8-1 | 포트 타입 시스템 정의 | `src/lib/node-graph/port-types.ts` | **신규** |
| 8-2 | 노드 레지스트리 (카테고리별 노드 등록) | `src/lib/node-graph/node-registry.ts` | **신규** |
| 8-3 | 위상 정렬 (Kahn's algorithm) | `src/lib/node-graph/topological-sort.ts` | **신규** |
| 8-4 | 순환 감지 (DFS 기반) | `src/lib/node-graph/cycle-detection.ts` | **신규** |
| 8-5 | DAG 평가 엔진 (evaluateGraph, propagation) | `src/lib/node-graph/dag-engine.ts` | **신규** |
| 8-6 | 그래프 검증기 (완전성, 필수 노드, 타입 호환) | `src/lib/node-graph/graph-validator.ts` | **신규** |
| 8-7 | 직렬화/역직렬화 (JSON ↔ GraphState) | `src/lib/node-graph/serializer.ts` | **신규** |
| 8-8 | v2→v3 마이그레이션 (선형→DAG 변환) | `src/lib/node-graph/v2-migration.ts` | **신규** |
| 8-9 | DAG 엔진 모듈 index | `src/lib/node-graph/index.ts` | **신규** |
| 8-10 | DAG 엔진 단위 테스트 | `src/lib/node-graph/__tests__/` | **신규** |
| 8-11 | Zustand 노드 에디터 스토어 | `src/stores/node-editor-store.ts` | **신규** |
| 8-12 | 플로우 프리셋 상수 (4종) | `src/constants/flow-presets.ts` | **신규** |
| 8-13 | 노드 타입 전면 재정의 (v3 포트 시스템) | `src/components/node-editor/types.ts` | **전면 재작성** |
| 8-14 | 에디터 훅 → 스토어 어댑터 | `src/components/node-editor/use-persona-editor.ts` | **전면 재작성** |
| 8-15 | 메인 에디터 (DAG 캔버스 + 레이아웃) | `src/components/node-editor/persona-node-editor.tsx` | **전면 재작성** |
| 8-16 | 노드 래퍼 (v3 포트 핸들 시스템) | `src/components/node-editor/node-wrapper.tsx` | 대폭 수정 |
| 8-17 | 기존 7개 노드 v3 포트 적용 | `src/components/node-editor/nodes/*.tsx` | **전면 재작성** |
| 8-18 | v3 Engine/Gen/Assembly 신규 노드 | `src/components/node-editor/nodes/v3/*.tsx` | **신규** |
| 8-19 | 노드 팔레트 UI (드래그 & 드롭) | `src/components/node-editor/node-palette.tsx` | **신규** |
| 8-20 | 노드 설정 패널 (선택된 노드 상세) | `src/components/node-editor/node-settings-panel.tsx` | **신규** |
| 8-21 | 에디터 툴바 (프리셋/실행/검증) | `src/components/node-editor/editor-toolbar.tsx` | **신규** |
| 8-22 | 에디터 상태바 (노드 카운트/검증 상태) | `src/components/node-editor/editor-status-bar.tsx` | **신규** |
| 8-23 | 노드 실행 디스패처 (22개 executeNode) | `src/lib/node-graph/node-executor.ts` | **신규** |
| 8-24 | 실행 헬퍼 (교차축 계산, Init delta, 투영) | `src/lib/node-graph/node-executor-helpers.ts` | **신규** |
| 8-25 | Generation 노드 LLM 프롬프트 템플릿 | `src/lib/node-graph/llm-prompts/` | **신규** |
| 8-26 | 노드 실행 함수 단위 테스트 | `src/lib/node-graph/__tests__/node-executor.test.ts` | **신규** |

### Phase 9: PersonaWorld RAG + 품질 피드백 + 모델 전략

> Phase 2(생성 파이프라인) 이후 진행 가능. Phase 8(노드 에디터)과 병렬 가능.
> Section 15 (RAG), Section 16 (피드백 루프), Section 17 (모델 전략) 참조.

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 9-1 | Voice 앵커 검색 로직 | `src/lib/rag/voice-anchor.ts` | **신규** |
| 9-2 | 관계 기억 검색 로직 | `src/lib/rag/relation-memory.ts` | **신규** |
| 9-3 | 관심사 연속성 검색 로직 | `src/lib/rag/interest-continuity.ts` | **신규** |
| 9-4 | RAG 컨텍스트 빌더 (통합) | `src/lib/rag/context-builder.ts` | **신규** |
| 9-5 | RAG 캐시 매니저 (LRU) | `src/lib/rag/cache-manager.ts` | **신규** |
| 9-6 | RAG 모듈 index | `src/lib/rag/index.ts` | **신규** |
| 9-7 | RAG 단위 테스트 | `src/lib/rag/__tests__/` | **신규** |
| 9-8 | LLM 모델 설정 (3-Tier) | `src/lib/llm/model-config.ts` | **신규** |
| 9-9 | 동적 Tier 라우터 | `src/lib/llm/tier-router.ts` | **신규** |
| 9-10 | Provider Adapter (통합) | `src/lib/llm/provider-adapter.ts` | **신규** |
| 9-11 | Anthropic Provider + Prompt Caching | `src/lib/llm/providers/anthropic.ts` | **신규** |
| 9-12 | OpenAI Provider | `src/lib/llm/providers/openai.ts` | **신규** |
| 9-13 | Light Provider (규칙 기반) | `src/lib/llm/providers/rule-based.ts` | **신규** |
| 9-14 | LLM 모듈 index | `src/lib/llm/index.ts` | **신규** |
| 9-15 | 품질 측정 타입 | `src/lib/quality/types.ts` | **신규** |
| 9-16 | 역설 표현 스코어 측정기 | `src/lib/quality/paradox-expression.ts` | **신규** |
| 9-17 | Voice 일관성 스코어 측정기 | `src/lib/quality/voice-consistency.ts` | **신규** |
| 9-18 | Pressure 반응 테스트기 | `src/lib/quality/pressure-response.ts` | **신규** |
| 9-19 | Few-shot 라이브러리 수집기 | `src/lib/quality/few-shot-collector.ts` | **신규** |
| 9-20 | 품질 대시보드 데이터 API | `src/lib/quality/dashboard.ts` | **신규** |
| 9-21 | 품질 모듈 index | `src/lib/quality/index.ts` | **신규** |
| 9-22 | 품질 측정 단위 테스트 | `src/lib/quality/__tests__/` | **신규** |
| 9-23 | Persona Integrity Score — Context Recall | `src/lib/quality/integrity-score.ts` | **신규** |
| 9-24 | Persona Integrity Score — Setting Consistency | `src/lib/quality/integrity-score.ts` | **신규** |
| 9-25 | Persona Integrity Score — Character Stability | `src/lib/quality/integrity-score.ts` | **신규** |
| 9-26 | 인터랙션 로그 수집기 (세션 관리 + 턴 로깅) | `src/lib/quality/interaction-logger.ts` | **신규** |
| 9-27 | Integrity Score + Logger 단위 테스트 | `src/lib/quality/__tests__/` | **신규** |
| 9-28 | 기존 프롬프트 빌더에 RAG 통합 | `src/lib/persona-generation/prompt-builder.ts` | 수정 |
| 9-29 | 기존 생성 파이프라인에 Tier 라우터 통합 | `src/lib/persona-generation/index.ts` | 수정 |

---

## 19. 파일 변경 맵

### 신규 파일

```
# ── 타입 ──
packages/shared-types/src/persona-v3.ts          ← v3 공유 타입
apps/engine-studio/src/types/persona-v3.ts        ← 앱 레벨 v3 타입

# ── 상수 모듈 (v3/) ──
apps/engine-studio/src/constants/v3/index.ts                 ← 통합 re-export
apps/engine-studio/src/constants/v3/dimensions.ts            ← 106D+ 차원 정의 + 기본값
apps/engine-studio/src/constants/v3/paradox-mappings.ts      ← L1↔L2 역설 매핑 (7개)
apps/engine-studio/src/constants/v3/projection-coefficients.ts ← L2→L1, L3→L1 투영 계수
apps/engine-studio/src/constants/v3/cross-layer-axes.ts      ← 교차축 정의 (83개+ 관계축)
apps/engine-studio/src/constants/v3/dynamics-defaults.ts     ← 동적 설정 기본값
apps/engine-studio/src/constants/v3/interpretation-tables.ts ← 점수 해석 테이블

# ── 색상 모듈 (colors/) ──
apps/engine-studio/src/lib/colors/index.ts              ← 통합 re-export + resolveColor()
apps/engine-studio/src/lib/colors/dimension-colors.ts   ← 106D+ 개별 차원 색상
apps/engine-studio/src/lib/colors/layer-colors.ts       ← 3개 레이어 그룹 색상
apps/engine-studio/src/lib/colors/cross-axis-colors.ts  ← 역설 페어(7) + 히트맵 스케일
apps/engine-studio/src/lib/colors/engine-meta-colors.ts ← P, V_Final, α/β, Paradox Score
apps/engine-studio/src/lib/colors/archetype-colors.ts   ← 아키타입별 색상 (12+, 확장 가능)

# ── 벡터 엔진 ──
apps/engine-studio/src/lib/vector/projection.ts    ← L2→L1, L3→L1 투영
apps/engine-studio/src/lib/vector/cross-axis.ts    ← 교차축 계산 엔진 (83축 스코어)
apps/engine-studio/src/lib/vector/paradox.ts       ← Extended Paradox Score (3-Layer)
apps/engine-studio/src/lib/vector/v-final.ts       ← V_Final 계산 엔진 (CrossAxisProfile 포함)
apps/engine-studio/src/lib/vector/__tests__/       ← 벡터 엔진 테스트

# ── 교차축 상수 ──
apps/engine-studio/src/constants/v3/cross-axis-inversions.ts  ← 역방향 매핑 테이블

# ── 생성 파이프라인 ──
apps/engine-studio/src/lib/persona-generation/archetypes.ts       ← 아키타입 템플릿
apps/engine-studio/src/lib/persona-generation/paradox-designer.ts ← 역설 설계 엔진
apps/engine-studio/src/lib/persona-generation/backstory-generator.ts
apps/engine-studio/src/lib/persona-generation/voice-generator.ts
apps/engine-studio/src/lib/persona-generation/pressure-generator.ts
apps/engine-studio/src/lib/persona-generation/zeitgeist-generator.ts

# ── 상호작용 (비정량↔정량 4대 알고리즘) ──
apps/engine-studio/src/lib/interaction/types.ts               ← 상호작용 타입 (ExtractedKeyword, TriggerRule, QuirkDefinition 등)
apps/engine-studio/src/lib/interaction/initialization.ts      ← Init: LLM 키워드 추출 + 카테고리 매핑 + delta 적용
apps/engine-studio/src/lib/interaction/override.ts            ← Override: 트리거 감지 + delta + 복귀 곡선 (exp decay)
apps/engine-studio/src/lib/interaction/adaptation.ts          ← Adapt: UIV + 차원별 α + 모멘텀 + 드리프트 클램프
apps/engine-studio/src/lib/interaction/expression.ts          ← Express: 파생 상태값 + sigmoid 확률 + 쿨다운
apps/engine-studio/src/lib/interaction/index.ts               ← 통합 InteractionEngine
apps/engine-studio/src/lib/interaction/__tests__/             ← 상호작용 단위 테스트
apps/engine-studio/src/constants/v3/keyword-mappings.ts       ← 의미 카테고리→벡터 매핑 테이블
apps/engine-studio/src/constants/v3/attitude-mappings.ts      ← 태도→delta 매핑 상수

# ── 매칭 (3-Tier 다층 매칭) ──
apps/engine-studio/src/lib/matching/types.ts                  ← 매칭 타입 (MatchingInput, MatchingResult, MatchingTier)
apps/engine-studio/src/lib/matching/basic-matching.ts         ← Tier 1 Basic (V_Final + 교차축 유사도)
apps/engine-studio/src/lib/matching/advanced-matching.ts      ← Tier 2 Advanced (+ Paradox 호환)
apps/engine-studio/src/lib/matching/exploration-matching.ts   ← Tier 3 Exploration (다양성 극대화)
apps/engine-studio/src/lib/matching/qualitative-matching.ts   ← 비정량적 보정 (Voice + 서사)
apps/engine-studio/src/lib/matching/engine.ts                 ← 통합 매칭 엔진 + 피드 믹싱

# ── UI ──
apps/engine-studio/src/components/charts/paradox-chart.tsx
apps/engine-studio/src/components/charts/v-final-simulator.tsx
apps/engine-studio/src/components/persona/qualitative-editor.tsx

# ── 컬러지문 데이터 엔진 ──
docs/schemas/fingerprint-v1.json                                   ← 지문 스키마 (Pantone-free, 확정)
apps/engine-studio/src/types/fingerprint.ts                       ← 스키마 TS 타입
apps/engine-studio/src/lib/fingerprint/index.ts                   ← 모듈 index
apps/engine-studio/src/lib/fingerprint/schema-validator.ts        ← 스키마 런타임 검증
apps/engine-studio/src/lib/fingerprint/color-space.ts             ← CIELAB↔OKLCH↔sRGB 변환
apps/engine-studio/src/lib/fingerprint/color-encoder.ts           ← 릿지별 색상 할당 + ΔE00
apps/engine-studio/src/lib/fingerprint/ridge-generator.ts         ← 릿지 생성 (패턴/곡률/core/delta)
apps/engine-studio/src/lib/fingerprint/uniqueness-engine.ts       ← 시드 해싱 + 결정론적 PRNG
apps/engine-studio/src/lib/fingerprint/collision-checker.ts       ← pHash/SSIM/curve/histogram 검사
apps/engine-studio/src/lib/fingerprint/svg-renderer.ts            ← canonical SVG 렌더러
apps/engine-studio/src/lib/fingerprint/__tests__/                 ← 단위 테스트

# ── 컬러지문 UI ──
apps/engine-studio/src/components/charts/fingerprint-types.ts    ← UI 공통 타입
apps/engine-studio/src/components/charts/fingerprint-utils.ts    ← UI 공통 유틸 (좌표, 스플라인)
apps/engine-studio/src/components/charts/fingerprint-compat.tsx  ← 6D 하위 호환 래퍼

# ── 노드 에디터 DAG 엔진 ──
apps/engine-studio/src/lib/node-graph/index.ts                  ← 모듈 index
apps/engine-studio/src/lib/node-graph/port-types.ts             ← 포트 타입 시스템 (21종)
apps/engine-studio/src/lib/node-graph/node-registry.ts          ← 노드 카테고리/레지스트리
apps/engine-studio/src/lib/node-graph/topological-sort.ts       ← 위상 정렬 (Kahn's)
apps/engine-studio/src/lib/node-graph/cycle-detection.ts        ← 순환 감지 (DFS)
apps/engine-studio/src/lib/node-graph/dag-engine.ts             ← DAG 평가 엔진
apps/engine-studio/src/lib/node-graph/graph-validator.ts        ← 그래프 완전성 검증
apps/engine-studio/src/lib/node-graph/serializer.ts             ← JSON ↔ GraphState
apps/engine-studio/src/lib/node-graph/v2-migration.ts           ← v2 선형→v3 DAG 변환
apps/engine-studio/src/lib/node-graph/__tests__/                ← DAG 엔진 테스트

# ── RAG 모듈 ──
apps/engine-studio/src/lib/rag/index.ts                    ← 모듈 index
apps/engine-studio/src/lib/rag/context-builder.ts          ← RAG 컨텍스트 빌더 (통합)
apps/engine-studio/src/lib/rag/voice-anchor.ts             ← Voice 앵커 검색
apps/engine-studio/src/lib/rag/relation-memory.ts          ← 관계 기억 검색
apps/engine-studio/src/lib/rag/interest-continuity.ts      ← 관심사 연속성 검색
apps/engine-studio/src/lib/rag/cache-manager.ts            ← LRU 캐시 매니저
apps/engine-studio/src/lib/rag/__tests__/                  ← RAG 단위 테스트

# ── LLM 모듈 ──
apps/engine-studio/src/lib/llm/index.ts                    ← 모듈 index
apps/engine-studio/src/lib/llm/model-config.ts             ← 3-Tier 모델 설정
apps/engine-studio/src/lib/llm/tier-router.ts              ← 동적 Tier 라우터
apps/engine-studio/src/lib/llm/provider-adapter.ts         ← Provider 통합 어댑터
apps/engine-studio/src/lib/llm/providers/anthropic.ts      ← Anthropic + Prompt Caching
apps/engine-studio/src/lib/llm/providers/openai.ts         ← OpenAI Provider
apps/engine-studio/src/lib/llm/providers/rule-based.ts     ← 규칙 기반 경량 생성기

# ── 품질 측정 모듈 ──
apps/engine-studio/src/lib/quality/index.ts                ← 모듈 index
apps/engine-studio/src/lib/quality/types.ts                ← 품질 지표 타입
apps/engine-studio/src/lib/quality/paradox-expression.ts   ← 역설 표현 스코어
apps/engine-studio/src/lib/quality/voice-consistency.ts    ← Voice 일관성 스코어
apps/engine-studio/src/lib/quality/pressure-response.ts    ← Pressure 반응 테스트
apps/engine-studio/src/lib/quality/few-shot-collector.ts   ← Few-shot 자동 수집기
apps/engine-studio/src/lib/quality/dashboard.ts            ← 품질 대시보드 데이터
apps/engine-studio/src/lib/quality/auto-interview.ts       ← Auto-Interview 프로토콜 (질문 생성 + 벡터 추론)
apps/engine-studio/src/lib/quality/integrity-score.ts      ← Persona Integrity Score (CR + SC + CS)
apps/engine-studio/src/lib/quality/interaction-logger.ts   ← 인터랙션 로그 수집기 (세션 관리 + 턴 로깅)
apps/engine-studio/src/lib/quality/__tests__/              ← 품질 측정 테스트

# ── 노드 에디터 스토어/상수 ──
apps/engine-studio/src/stores/node-editor-store.ts              ← Zustand 노드 그래프 스토어
apps/engine-studio/src/constants/flow-presets.ts                ← 4종 플로우 프리셋

# ── 노드 에디터 UI (신규) ──
apps/engine-studio/src/components/node-editor/node-palette.tsx          ← 드래그&드롭 노드 팔레트
apps/engine-studio/src/components/node-editor/node-settings-panel.tsx   ← 선택 노드 설정 패널
apps/engine-studio/src/components/node-editor/editor-toolbar.tsx        ← 프리셋/실행/검증 툴바
apps/engine-studio/src/components/node-editor/editor-status-bar.tsx     ← 상태바 (카운트/검증)
apps/engine-studio/src/components/node-editor/nodes/v3/                 ← Engine/Gen/Assembly 신규 노드
```

### 전면 재작성 파일

```
apps/engine-studio/src/lib/persona-generation/vector-diversity.ts
apps/engine-studio/src/lib/persona-generation/character-generator.ts
apps/engine-studio/src/lib/persona-generation/consistency-validator.ts
apps/engine-studio/src/lib/persona-generation/prompt-builder.ts
apps/engine-studio/src/lib/persona-generation/index.ts
apps/engine-studio/src/lib/matching/algorithms.ts
apps/engine-studio/src/components/node-editor/nodes/vector-node.tsx
apps/engine-studio/src/components/charts/trait-color-fingerprint.tsx  ← v3 다층 레이더
apps/engine-studio/src/components/charts/p-inger-print-2d.tsx         ← v3 다층 지문 패턴
apps/engine-studio/src/components/charts/p-inger-print-3d.tsx         ← v3 다층 Jacks (landing)

# ── 노드 에디터 (전면 재작성) ──
apps/engine-studio/src/components/node-editor/types.ts                ← v3 포트 시스템 타입
apps/engine-studio/src/components/node-editor/use-persona-editor.ts   ← 스토어 어댑터
apps/engine-studio/src/components/node-editor/persona-node-editor.tsx ← DAG 캔버스 + 레이아웃
apps/engine-studio/src/components/node-editor/nodes/*.tsx             ← 기존 7개 노드 v3 포트 적용
```

### 수정 파일

```
packages/shared-types/src/index.ts                ← re-export 추가
apps/engine-studio/src/types/index.ts             ← re-export 추가
apps/engine-studio/prisma/schema.prisma           ← 모델/필드 추가
apps/engine-studio/src/constants/index.ts         ← v3 상수 모듈 re-export
apps/engine-studio/src/lib/trait-colors.ts        ← 새 colors/ 모듈 re-export 래퍼로 변경
apps/engine-studio/src/lib/vector/index.ts        ← re-export 추가
apps/engine-studio/src/lib/vector/utils.ts        ← clamp 등 범용 유틸
apps/engine-studio/src/lib/persona-generation/activity-inference.ts  ← sociability 연계
apps/engine-studio/src/lib/persona-generation/content-settings-inference.ts
apps/engine-studio/src/lib/persona-generation/sample-content-generator.ts
apps/engine-studio/src/lib/persona-generation/prompt-builder.ts  ← RAG 컨텍스트 통합
apps/engine-studio/src/lib/persona-generation/index.ts           ← Tier 라우터 통합
apps/engine-studio/src/components/node-editor/node-wrapper.tsx    ← v3 포트 핸들 시스템 적용
```

---

> **이 문서는 확정된 구현 계획입니다. 모든 아키텍처 결정이 합의되었으며, Phase 0부터 순서대로 구현을 시작할 수 있습니다.**
