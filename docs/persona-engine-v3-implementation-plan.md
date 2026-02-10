# DeepSight Persona Engine v3.0 — 구현 계획서

## 3-Layer Orthogonal Multi-Vector Architecture Implementation Plan

> **문서 정보**
>
> - 작성일: 2026-02-10
> - 버전: v1.0
> - 상태: 확정 — 구현 대기
> - 관련 문서: `docs/persona-engine-v3-design.md` (설계서)
> - 목적: 설계서의 "무엇을"에 대응하는 "어떻게" — 이 문서만 보고 구현 가능

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| v1.0 | 2026-02-10 | 초판 작성 — 전체 아키텍처 결정사항, 데이터 모델, 타입 시스템, 구현 태스크 |

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
12. [상수 및 설정](#12-상수-및-설정)
13. [구현 Phase 및 태스크](#13-구현-phase-및-태스크)
14. [파일 변경 맵](#14-파일-변경-맵)

---

## 1. 확정된 아키텍처 결정사항

모든 결정은 합의 완료. 구현 시 재논의 없이 적용한다.

### 1.1 벡터 구조

| 결정 | 내용 |
|------|------|
| 구조 | 3-Layer Orthogonal Vector System (7D + 5D + 4D = 16D) |
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

## 6. Paradox Score 계산

### 6.1 공식 (L2 균등 가중 방식)

```
paradoxScore = (
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

### 6.2 구현 파일

`apps/engine-studio/src/lib/vector/paradox.ts`

```typescript
import type { SocialPersonaVector, CoreTemperamentVector, ParadoxConfig } from '@deepsight/shared-types'

export function calculateParadoxScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
): number {
  // Openness 그룹 (depth + taste)
  const opennessParadox = (
    Math.abs(l1.depth - l2.openness) +
    Math.abs(l1.taste - l2.openness)
  ) / 2

  // Neuroticism (역방향)
  const neuroticismParadox = Math.abs(l1.lens - (1 - l2.neuroticism))

  // Agreeableness (역방향)
  const agreeablenessParadox = Math.abs(l1.stance - (1 - l2.agreeableness))

  // Extraversion
  const extraversionParadox = Math.abs(l1.sociability - l2.extraversion)

  // Conscientiousness 그룹 (purpose + scope)
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

export function buildParadoxConfig(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
): ParadoxConfig {
  const score = calculateParadoxScore(l1, l2)

  // 개별 매핑 점수 계산
  const mappings = buildParadoxMappings(l1, l2)

  // 가장 큰 역설 찾기
  const dominant = mappings.reduce((max, m) =>
    m.tensionScore > max.tensionScore ? m : max
  )

  return {
    mappings,
    overallParadoxScore: score,
    dimensionalityScore: calculateDimensionality(score),
    dominantParadox: {
      l1: dominant.l1Dimension,
      l2: dominant.l2Dimension,
      score: dominant.tensionScore,
    },
  }
}

function calculateDimensionality(paradoxScore: number): number {
  // 역설 점수 0.2~0.5 범위가 가장 높은 차원성 (너무 낮으면 평면적, 너무 높으면 비일관)
  // 0.35 근처에서 최대값 1.0, 양 극단에서 감소하는 종형 곡선
  const optimal = 0.35
  const sigma = 0.2
  return Math.exp(-Math.pow(paradoxScore - optimal, 2) / (2 * sigma * sigma))
}
```

### 6.3 역설 점수 해석

| 점수 범위 | 해석 | 캐릭터 느낌 |
|-----------|------|-------------|
| 0.00~0.10 | 극히 낮음 | "보이는 그대로" — 평면적이지만 신뢰감 |
| 0.10~0.25 | 낮음 | 약간의 깊이가 있는 일관된 캐릭터 |
| 0.25~0.45 | **최적 (높은 차원성)** | 풍부한 내면 — "알수록 새로운 면이 보이는 사람" |
| 0.45~0.65 | 높음 | 극적인 캐릭터 — 겉과 속이 많이 다름 |
| 0.65~1.00 | 극히 높음 | 주의 필요 — L3 서사로 잘 설명되지 않으면 비일관적으로 느껴짐 |

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

16D 벡터 공간에서의 랜덤 생성은 비일관적 캐릭터를 만들 위험이 높다.
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

---

## 10. 매칭 알고리즘

### 10.1 v3 매칭 전략

```
기본 매칭: 유저 L1(7D) vs 페르소나 V_Final(P=상황별)
심화 매칭: 유저 L1+L2 vs 페르소나 V_Final (유저 L2가 있을 때)
탐색 매칭: 높은 Paradox Score 페르소나 우선 추천 (다양성)
```

### 10.2 매칭 점수 계산

```typescript
export function calculateV3MatchingScore(
  userL1: SocialPersonaVector,
  persona: {
    social: SocialPersonaVector,
    temperament: CoreTemperamentVector,
    narrative: NarrativeDriveVector,
    dynamics: DynamicsConfig,
  },
  context: { pressure: number; algorithm: AlgorithmType },
): MatchingResult {

  // 1. 페르소나의 V_Final 계산 (현재 상황의 압력 수준)
  const vFinal = calculateVFinal(
    persona.social,
    persona.temperament,
    persona.narrative,
    persona.dynamics,
    context.pressure,
  )

  // 2. 유저 L1과 V_Final 비교 (7D)
  const userArr = socialVectorToArray(userL1)
  const score = hybridSimilarity(userArr, vFinal.vector, weights, 0.6)

  return { score, vFinal, breakdown: getDimensionBreakdown(userArr, vFinal.vector) }
}
```

---

## 11. 일관성 검증

### 11.1 v3 검증 항목

| 검증 | 내용 | 가중치 |
|------|------|--------|
| L1↔L2 역설 타당성 | 역설 점수가 아키타입 기대 범위 내인지 | 25% |
| L2↔L3 서사 정합성 | L3가 L1-L2 역설을 설명 가능한지 (예: lack 높은데 역설 없음 → 이상) | 25% |
| 정성적↔정량적 | backstory의 nlpKeywords가 벡터 방향과 일치하는지 | 20% |
| 캐릭터↔벡터 | 기존 검증 유지 (warmth↔stance 등) | 15% |
| 동적 설정 검증 | α+β=1.0, pressureRange 유효성 등 | 15% |

### 11.2 구현 파일

`apps/engine-studio/src/lib/persona-generation/consistency-validator.ts` (전면 재작성)

---

## 12. 상수 및 설정

### 12.1 새 상수 파일

`apps/engine-studio/src/constants/vector-v3.ts`

포함 내용:
- `L1_DIMENSIONS`: L1 차원 정보 (key, name, label, low, high, description, color)
- `L2_DIMENSIONS`: L2 차원 정보
- `L3_DIMENSIONS`: L3 차원 정보
- `L1_L2_PARADOX_MAPPINGS`: 역설 매핑 테이블 (7개)
- `L3_PROJECTION_COEFFICIENTS`: L3→L1 투영 계수 (Beta v1)
- `DEFAULT_DYNAMICS_CONFIG`: 기본 동적 설정
- `PARADOX_SCORE_INTERPRETATION`: 역설 점수 해석 테이블
- `DEFAULT_L1_VECTOR`: 기본 L1 벡터 (모든 차원 0.5)
- `DEFAULT_L2_VECTOR`: 기본 L2 벡터 (모든 차원 0.5)
- `DEFAULT_L3_VECTOR`: 기본 L3 벡터 (모든 차원 0.0 — 서사 없음)

### 12.2 트레이트 색상 확장

`apps/engine-studio/src/lib/trait-colors.ts` → 16D로 확장

레이어별 색상 그룹:
- L1 (Social): 기존 6개 색상 유지 + sociability 추가 (보라 계열)
- L2 (OCEAN): 새 색상 5개 (따뜻한 계열 — 주황/산호/골드 등)
- L3 (Narrative): 새 색상 4개 (어두운 계열 — 남색/자주/진녹 등)

---

## 13. 구현 Phase 및 태스크

### Phase 0: 기반 인프라 (타입 + DB + 상수)

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 0-1 | v3 공유 타입 정의 | `packages/shared-types/src/persona-v3.ts` | **신규** |
| 0-2 | 공유 타입 re-export | `packages/shared-types/src/index.ts` | 수정 |
| 0-3 | 앱 타입 정의 | `apps/engine-studio/src/types/persona-v3.ts` | **신규** |
| 0-4 | 앱 타입 re-export | `apps/engine-studio/src/types/index.ts` | 수정 |
| 0-5 | Prisma 스키마 확장 | `apps/engine-studio/prisma/schema.prisma` | 수정 |
| 0-6 | DB 마이그레이션 | `prisma migrate dev` | 실행 |
| 0-7 | v3 상수 파일 생성 | `apps/engine-studio/src/constants/vector-v3.ts` | **신규** |
| 0-8 | 트레이트 색상 16D 확장 | `apps/engine-studio/src/lib/trait-colors.ts` | 수정 |
| 0-9 | 기존 Vector6D 중복 정리 | 여러 파일 (6곳) | 수정 |

### Phase 1: 핵심 벡터 엔진

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 1-1 | 벡터 유틸리티 (clamp, validate 등) | `src/lib/vector/utils.ts` | 수정 |
| 1-2 | L2→L1 투영 | `src/lib/vector/projection.ts` | **신규** |
| 1-3 | L3→L1 투영 | `src/lib/vector/projection.ts` | **신규** (같은 파일) |
| 1-4 | Paradox Score 계산기 | `src/lib/vector/paradox.ts` | **신규** |
| 1-5 | V_Final 계산 엔진 | `src/lib/vector/v-final.ts` | **신규** |
| 1-6 | 벡터 모듈 re-export | `src/lib/vector/index.ts` | 수정 |
| 1-7 | 단위 테스트 | `src/lib/vector/__tests__/` | **신규** |

### Phase 2: 생성 파이프라인 재구성

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 2-1 | 아키타입 템플릿 정의 (12개) | `src/lib/persona-generation/archetypes.ts` | **신규** |
| 2-2 | 3-Layer 벡터 생성기 | `src/lib/persona-generation/vector-diversity.ts` | **전면 재작성** |
| 2-3 | 역설 설계 엔진 | `src/lib/persona-generation/paradox-designer.ts` | **신규** |
| 2-4 | 캐릭터 생성기 (3-Layer 기반) | `src/lib/persona-generation/character-generator.ts` | **전면 재작성** |
| 2-5 | 활동성 추론 (L1 sociability 연계) | `src/lib/persona-generation/activity-inference.ts` | 대폭 수정 |
| 2-6 | 콘텐츠/관계 설정 추론 | `src/lib/persona-generation/content-settings-inference.ts` | 대폭 수정 |
| 2-7 | 일관성 검증기 (3-Layer) | `src/lib/persona-generation/consistency-validator.ts` | **전면 재작성** |
| 2-8 | 프롬프트 빌더 (전체 레이어) | `src/lib/persona-generation/prompt-builder.ts` | **전면 재작성** |
| 2-9 | 메인 파이프라인 | `src/lib/persona-generation/index.ts` | **전면 재작성** |
| 2-10 | 샘플 콘텐츠 생성기 | `src/lib/persona-generation/sample-content-generator.ts` | 수정 |

### Phase 3: 정성적 차원

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 3-1 | Backstory 생성기 | `src/lib/persona-generation/backstory-generator.ts` | **신규** |
| 3-2 | Voice 프로필 생성기 | `src/lib/persona-generation/voice-generator.ts` | **신규** |
| 3-3 | Pressure Context 생성기 | `src/lib/persona-generation/pressure-generator.ts` | **신규** |
| 3-4 | Zeitgeist 프로필 생성기 | `src/lib/persona-generation/zeitgeist-generator.ts` | **신규** |

### Phase 4: 하이브리드 연결 메커니즘

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 4-1 | 초기화 로직 | `src/lib/interaction/initialization.ts` | **신규** |
| 4-2 | 오버라이드 로직 | `src/lib/interaction/override.ts` | **신규** |
| 4-3 | 적응 로직 | `src/lib/interaction/adaptation.ts` | **신규** |
| 4-4 | 표현 로직 | `src/lib/interaction/expression.ts` | **신규** |
| 4-5 | 모듈 index | `src/lib/interaction/index.ts` | **신규** |

### Phase 5: 매칭 알고리즘 재구성

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 5-1 | V_Final 기반 매칭 | `src/lib/matching/algorithms.ts` | **전면 재작성** |
| 5-2 | 다양성 매칭 (Paradox 고려) | `src/lib/matching/diversity.ts` | **신규** |

### Phase 6: UI 개편

| # | 태스크 | 파일 | 변경 수준 |
|---|--------|------|-----------|
| 6-1 | 3-Layer 벡터 에디터 | `src/components/node-editor/nodes/vector-node.tsx` | **전면 재작성** |
| 6-2 | 역설 시각화 차트 | `src/components/charts/paradox-chart.tsx` | **신규** |
| 6-3 | V_Final 시뮬레이터 | `src/components/charts/v-final-simulator.tsx` | **신규** |
| 6-4 | 정성적 차원 에디터 | `src/components/persona/qualitative-editor.tsx` | **신규** |
| 6-5 | 레이더 차트 확장 | `src/components/charts/` | 수정 |
| 6-6 | 트레이트 색상 반영 | 여러 UI 파일 | 수정 |

---

## 14. 파일 변경 맵

### 신규 파일

```
packages/shared-types/src/persona-v3.ts          ← v3 공유 타입
apps/engine-studio/src/types/persona-v3.ts        ← 앱 레벨 v3 타입
apps/engine-studio/src/constants/vector-v3.ts     ← v3 상수 (투영 계수, 매핑 테이블 등)
apps/engine-studio/src/lib/vector/projection.ts   ← L2→L1, L3→L1 투영
apps/engine-studio/src/lib/vector/paradox.ts      ← Paradox Score 계산
apps/engine-studio/src/lib/vector/v-final.ts      ← V_Final 계산 엔진
apps/engine-studio/src/lib/vector/__tests__/      ← 벡터 엔진 테스트
apps/engine-studio/src/lib/persona-generation/archetypes.ts       ← 아키타입 템플릿
apps/engine-studio/src/lib/persona-generation/paradox-designer.ts ← 역설 설계 엔진
apps/engine-studio/src/lib/persona-generation/backstory-generator.ts
apps/engine-studio/src/lib/persona-generation/voice-generator.ts
apps/engine-studio/src/lib/persona-generation/pressure-generator.ts
apps/engine-studio/src/lib/persona-generation/zeitgeist-generator.ts
apps/engine-studio/src/lib/interaction/initialization.ts
apps/engine-studio/src/lib/interaction/override.ts
apps/engine-studio/src/lib/interaction/adaptation.ts
apps/engine-studio/src/lib/interaction/expression.ts
apps/engine-studio/src/lib/interaction/index.ts
apps/engine-studio/src/lib/matching/diversity.ts
apps/engine-studio/src/components/charts/paradox-chart.tsx
apps/engine-studio/src/components/charts/v-final-simulator.tsx
apps/engine-studio/src/components/persona/qualitative-editor.tsx
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
```

### 수정 파일

```
packages/shared-types/src/index.ts                ← re-export 추가
apps/engine-studio/src/types/index.ts             ← re-export 추가
apps/engine-studio/prisma/schema.prisma           ← 모델/필드 추가
apps/engine-studio/src/constants/index.ts         ← v3 상수 re-export
apps/engine-studio/src/lib/trait-colors.ts        ← 16D 확장
apps/engine-studio/src/lib/vector/index.ts        ← re-export 추가
apps/engine-studio/src/lib/vector/utils.ts        ← clamp 등 범용 유틸
apps/engine-studio/src/lib/persona-generation/activity-inference.ts  ← sociability 연계
apps/engine-studio/src/lib/persona-generation/content-settings-inference.ts
apps/engine-studio/src/lib/persona-generation/sample-content-generator.ts
```

---

> **이 문서는 확정된 구현 계획입니다. 모든 아키텍처 결정이 합의되었으며, Phase 0부터 순서대로 구현을 시작할 수 있습니다.**
