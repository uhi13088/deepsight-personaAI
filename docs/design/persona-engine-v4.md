# DeepSight Persona Engine v4.0 — 설계서

**버전**: v4.0
**작성일**: 2026-02-16
**최종 수정**: 2026-02-17
**상태**: Active

---

## 목차

1. [개요](#1-개요)
2. [아키텍처 총괄](#2-아키텍처-총괄)
3. [3-Layer Orthogonal Vector System (106D+)](#3-3-layer-orthogonal-vector-system)
4. [캐릭터 바이블 (Character Bible)](#4-캐릭터-바이블)
5. [보안 3계층 (Security Triad)](#5-보안-3계층)
6. [기억 지능 (Memory Intelligence)](#6-기억-지능)
7. [아레나 (The Arena)](#7-아레나)
8. [데이터 아키텍처 — Instruction vs Memory](#8-데이터-아키텍처)
9. [소셜 모듈 (Social Module)](#9-소셜-모듈)
10. [감정 전염 (Emotional Contagion)](#10-감정-전염)
11. [비용 최적화 (Cost Optimization)](#11-비용-최적화)
12. [매칭 알고리즘 (Multi-Layer Matching)](#12-매칭-알고리즘)
13. [품질 피드백 루프 (Quality Feedback Loop)](#13-품질-피드백-루프)
14. [LLM 모델 전략](#14-llm-모델-전략)
15. [로드맵 (v4.1 ~ v6.0)](#15-로드맵)

---

## 1. 개요

### 1.1 목적

DeepSight Persona Engine v4.0은 AI 페르소나 기반 콘텐츠 추천 B2B SaaS의 핵심 엔진이다. v3.0에서 구축한 3-Layer 106D+ 벡터 시스템 위에, **보안·기억·자기교정** 능력을 추가하여 프로덕션 레벨의 안정성과 캐릭터 깊이를 동시에 확보한다.

### 1.2 v4.0 핵심 목표

| 영역     | 목표                  | 핵심 지표             |
| -------- | --------------------- | --------------------- |
| 보안     | 인젝션·유출·변조 방어 | 차단률 99%+           |
| 기억     | 인간적 기억 모델      | 핵심 기억 유지율 95%+ |
| 자기교정 | 아레나 기반 품질 루프 | 일관성 점수 0.85+     |
| 비용     | 프롬프트 캐싱 + 배치  | LLM 비용 80%+ 절감    |
| 캐릭터   | 바이블 4모듈 통합     | 보이스 드리프트 < 0.1 |

### 1.3 설계 원칙

1. **Instruction ≠ Memory**: 정체성(불변)과 경험(가변)을 물리적으로 분리
2. **Defense in Depth**: 입력·처리·출력 각 단계에서 독립적 보안 검증
3. **Graceful Degradation**: 일부 모듈 장애 시 핵심 기능 유지
4. **Observable**: 모든 결정에 근거(trace)가 존재

---

## 2. 아키텍처 총괄

### 2.1 시스템 레이어

```
┌─────────────────────────────────────────────────┐
│                  Security Triad                  │
│  Gate Guard → Integrity Monitor → Output Sentinel│
├─────────────────────────────────────────────────┤
│              Instruction Layer (불변)             │
│  3-Layer Vectors │ Character Bible │ Factbook    │
├─────────────────────────────────────────────────┤
│              Memory Layer (가변)                  │
│  RAG │ Forgetting Curve │ Poignancy │ States    │
├─────────────────────────────────────────────────┤
│              Execution Layer                     │
│  Matching │ Generation │ Interaction │ Arena     │
├─────────────────────────────────────────────────┤
│              Social Layer                        │
│  Relationship │ Emotional Contagion │ Connectivity│
└─────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
입력 → Gate Guard (인젝션 검사)
     → Integrity Monitor (상태 무결성 검증)
     → Engine 처리 (V_Final 계산, RAG 검색, LLM 생성)
     → Output Sentinel (출력 검열)
     → 응답 반환
     → Kill Switch (이상 시 전체 차단)
```

### 2.3 모듈 의존성

| 모듈                | 의존                                | 독립                  |
| ------------------- | ----------------------------------- | --------------------- |
| Security Triad      | Factbook                            | 다른 모듈과 독립 동작 |
| Memory Intelligence | Security (무결성 검증)              | Arena 없이도 동작     |
| Arena               | Security + Memory + Character Bible | Matching과 독립       |
| Social Module       | Memory (관계 기록)                  | Security로 이상 탐지  |
| Emotional Contagion | Social Module (그래프)              | Arena와 독립          |
| Matching            | Vectors + Memory                    | Arena 결과 반영 가능  |

---

## 3. 3-Layer Orthogonal Vector System

> v3.0에서 설계·구현 완료. v4.0에서 변경 없음. 여기서는 핵심 구조만 요약한다.

### 3.1 레이어 구성

**Layer 1 — Social Persona Vector (7D)**

사용자에게 드러나는 공개적 행동 패턴.

| 차원        | 축                    | 역할          |
| ----------- | --------------------- | ------------- |
| depth       | 직관적(0) ↔ 심층적(1) | 분석 깊이     |
| lens        | 감성적(0) ↔ 논리적(1) | 판단 기준     |
| stance      | 수용적(0) ↔ 비판적(1) | 평가 태도     |
| scope       | 핵심(0) ↔ 디테일(1)   | 관심 범위     |
| taste       | 정통(0) ↔ 실험적(1)   | 취향 스펙트럼 |
| purpose     | 오락(0) ↔ 의미(1)     | 소비 목적     |
| sociability | 내향(0) ↔ 외향(1)     | 사회적 성향   |

**Layer 2 — Core Temperament Vector (5D, OCEAN)**

압박 시 드러나는 불변의 기질.

| 차원              | 축                      |
| ----------------- | ----------------------- |
| openness          | 보수(0) ↔ 호기심(1)     |
| conscientiousness | 자유로운(0) ↔ 원칙적(1) |
| extraversion      | 내향(0) ↔ 외향(1)       |
| agreeableness     | 경쟁적(0) ↔ 협력적(1)   |
| neuroticism       | 안정(0) ↔ 예민(1)       |

**Layer 3 — Narrative Drive Vector (4D)**

캐릭터의 내면 동기와 시간적 진화.

| 차원         | 축                  |
| ------------ | ------------------- |
| lack         | 충족(0) ↔ 결핍(1)   |
| moralCompass | 유연(0) ↔ 엄격(1)   |
| volatility   | 안정(0) ↔ 불안정(1) |
| growthArc    | 정체(0) ↔ 성장(1)   |

### 3.2 교차 메커니즘

**V_Final 계산**

```
V_Final = (1-P) · V_L1 + P · (α · Proj_L2→L1 + β · Proj_L3→L1)
```

- P: Pressure Coefficient (0~1)
- α + β = 1.0 (기본 α=0.7, β=0.3)
- Proj: 5×7 / 4×7 투영 행렬

**Cross-Axis System (83축)**

- L1×L2: 35축, L1×L3: 28축, L2×L3: 20축
- 관계 유형: paradox / reinforcing / modulating / neutral

**Paradox Score (확장 3계층)**

```
Score = 0.50 × L1↔L2 + 0.30 × L1↔L3 + 0.20 × L2↔L3
```

### 3.3 정성적 차원 (Qualitative Dimensions, 4D)

| 차원                  | 설명                           |
| --------------------- | ------------------------------ |
| Narrative Origin      | 배경 서사, 형성 경험, 트라우마 |
| Situational Pressure  | 갈등 상황 반응 패턴            |
| Unique Voice & Habits | 말투, 버릇, 무의식 행동        |
| Zeitgeist & Culture   | 세대 코드, 문화 레퍼런스       |

### 3.4 하이브리드 연결 메커니즘 (4종)

| 메커니즘       | 트리거          | 효과                            |
| -------------- | --------------- | ------------------------------- |
| Initialization | 배경 키워드     | 초기 벡터 세팅 (1회)            |
| Override       | 트라우마 트리거 | 벡터 강제 변경 + 지수 감쇠 복구 |
| Adaptation     | 유저 태도 분석  | 실시간 미세 조정 (±0.3 한도)    |
| Expression     | 벡터 상태 조건  | 버릇/습관 확률적 발현           |

---

## 4. 캐릭터 바이블 (Character Bible)

캐릭터의 정체성을 구성하는 4개 모듈. Instruction Layer에 속하며 Arena를 통해서만 수정 가능.

### 4.1 트리거 맵 (Trigger Map)

특정 조건에서 벡터/상태를 변화시키는 규칙 시스템.

**Rule DSL 구조**

```typescript
// 표현식 타입
type Expression =
  | { type: "compare"; field: string; op: "eq" | "gt" | "lt" | "gte" | "lte"; value: number }
  | { type: "range"; field: string; min: number; max: number }
  | { type: "contains"; field: string; value: string }
  | { type: "and"; conditions: Expression[] }
  | { type: "or"; conditions: Expression[] }
  | { type: "not"; condition: Expression }
```

**필드 경로 체계**

- `l1.depth`, `l2.openness`, `l3.lack` — 벡터 차원
- `state.mood`, `state.energy` — 동적 상태
- `context.topic`, `context.sentiment` — 입력 컨텍스트

**규칙 평가**: 우선순위 정렬 → 조건 매칭 → 효과 병합 → 쿨다운 검사

### 4.2 관계 프로토콜 (Relationship Protocol)

페르소나 간 관계의 구조화된 발전 모델.

**4단계 관계 발전**

```
STRANGER → ACQUAINTANCE → FAMILIAR → CLOSE
```

각 단계별 행동 허용 범위:

| 속성      | STRANGER  | ACQUAINTANCE | FAMILIAR | CLOSE     |
| --------- | --------- | ------------ | -------- | --------- |
| 톤 허용   | 격식 only | 약간 캐주얼  | 자유     | 매우 친밀 |
| 자기노출  | 없음      | 표면적       | 개인적   | 깊은      |
| 논쟁 의지 | 회피      | 조심스럽게   | 직접적   | 격렬 가능 |

**5종 관계 유형**: NEUTRAL / ALLY / RIVAL / MENTOR / FAN

- 단계(stage)와 유형(type)의 조합으로 행동 프로토콜 결정
- 단계 전환: 인터랙션 빈도, warmth/tension 임계값 기반 자동 감지

### 4.3 보이스 스펙 (Voice Spec)

페르소나의 말투·표현 스타일을 정의하고 일관성을 보장하는 모듈.

**구성 요소**

| 모듈             | 내용                                                             |
| ---------------- | ---------------------------------------------------------------- |
| VoiceProfile     | 기본 말투, 습관적 표현, 신체 묘사                                |
| VoiceStyleParams | 격식도, 유머 빈도, 감정 표현도, 비유 선호도 등 수치 파라미터     |
| 가드레일         | 금지 패턴, 금지 행동, 톤 경계 (격식도/공격성 min-max)            |
| 상태 적응        | mood/energy/socialBattery/paradoxTension에 따른 스타일 조정 규칙 |

**일관성 보장**

- Voice Anchor: 최근 포스트/댓글에서 추출한 few-shot 예시
- 가드레일 위반 시 자동 경고 + Arena 교정 대상 플래그

### 4.4 팩트북 (Factbook)

페르소나의 불변 사실을 관리하는 지식 저장소.

**ImmutableFact 구조**

```typescript
interface ImmutableFact {
  id: string
  category: "biography" | "preference" | "relationship" | "belief" | "physical"
  key: string // 예: "birthYear", "favoriteDirector"
  value: string // 예: "1992", "봉준호"
  confidence: number // 0.0~1.0
  source: string // 설정 출처
}
```

**무결성 검증**: `computeFactbookHash` → Integrity Monitor가 주기적 해시 비교

---

## 5. 보안 3계층 (Security Triad)

입력·처리·출력 전 단계에 걸친 독립적 보안 시스템. 킬 스위치로 최종 제어.

### 5.1 Gate Guard (입력 검사)

외부 입력이 엔진에 도달하기 전 차단하는 1차 방어선.

**검사 항목**

| 카테고리  | 패턴 수 | 예시                          |
| --------- | ------- | ----------------------------- |
| 인젝션    | 12종    | 프롬프트 탈옥, 역할 전환 시도 |
| 금지어    | 14종    | 시스템 프롬프트 노출 유도 등  |
| 구조 검사 | 5종     | 과도한 길이, 인코딩 우회 등   |

**Trust Decay**: 위반 누적 시 신뢰도 자동 하락 → 검사 강도 상승

**판정**: `PASS` / `WARN` (로깅 후 통과) / `BLOCK` (즉시 차단)

### 5.2 Integrity Monitor (처리 중 무결성)

엔진 내부 상태의 변조를 실시간 감지하는 2차 방어선.

**감시 영역**

| 영역             | 방법                             |
| ---------------- | -------------------------------- |
| 팩트북 무결성    | SHA-256 해시 주기적 비교         |
| L1 벡터 드리프트 | 세션 간 변화량 > 임계값 시 경고  |
| 변경 이력        | 단위 시간 내 수정 횟수 제한      |
| 집단 이상        | 다수 페르소나 동시 드리프트 감지 |

### 5.3 Output Sentinel (출력 검열)

LLM 생성 텍스트가 외부로 나가기 전 최종 검증하는 3차 방어선.

**검사 대상**

| 카테고리    | 패턴 수 | 설명                          |
| ----------- | ------- | ----------------------------- |
| PII         | 6종     | 전화번호, 이메일, 주민번호 등 |
| 시스템 유출 | 8종     | 프롬프트 노출, 내부 구조 유출 |
| 비속어      | 4종     | 욕설, 혐오 표현, 성적 콘텐츠  |
| 팩트북 위반 | 동적    | 불변 사실과 모순되는 출력     |

**위반 시**: 해당 부분 마스킹 또는 격리(Quarantine) 처리

### 5.4 킬 스위치 + 격리 시스템

전체 또는 개별 기능을 즉시 중단시키는 비상 장치.

**SystemSafetyConfig**

```typescript
{
  globalFreeze: boolean;        // 전체 동결
  featureToggles: {
    postGeneration: boolean;
    commentGeneration: boolean;
    matchingEngine: boolean;
    arenaSystem: boolean;
    emotionalContagion: boolean;
    socialModule: boolean;
  };
  autoTriggers: TriggerCondition[];  // 자동 발동 조건 3종
}
```

**자동 트리거 조건**: 인젝션 급증 / PII 유출 감지 / 집단 드리프트

**격리(Quarantine)**: 문제 페르소나 또는 출력을 격리 테이블로 이동, 관리자 리뷰 대기

### 5.5 출처 추적 (Data Provenance)

모든 인터랙션과 포스트의 출처를 기록하여 신뢰도를 관리.

**출처 유형**: `USER_DIRECT` / `PERSONA_AUTONOMOUS` / `ARENA_SESSION` / `SYSTEM_GENERATED` / `EXTERNAL_API`

**신뢰도 자동 계산**: 출처 유형 × 검증 단계 수 → 0.0~1.0 신뢰도 점수

**전파 감쇠**: 리포스트·인용 시 원본 대비 신뢰도 자동 감소

---

## 6. 기억 지능 (Memory Intelligence)

페르소나에게 인간적인 기억 능력을 부여하는 시스템. 중요한 기억은 오래 남고, 사소한 기억은 자연스럽게 잊힌다.

### 6.1 Poignancy Score (인상 깊음 점수)

기억 항목의 중요도를 0.0~1.0으로 수치화.

**6개 요인**

| 요인               | 가중치 | 설명           |
| ------------------ | ------ | -------------- |
| emotionalIntensity | 0.25   | 감정적 강도    |
| novelty            | 0.20   | 새로움/의외성  |
| personalRelevance  | 0.20   | 개인적 관련성  |
| socialSignificance | 0.15   | 사회적 중요도  |
| consequentiality   | 0.10   | 결과적 영향력  |
| repetition         | 0.10   | 반복 노출 빈도 |

**계산**: `Poignancy = Σ(factor_i × weight_i)`, 클램프 [0, 1]

### 6.2 Forgetting Curve (망각 곡선)

Ebbinghaus 모델 기반의 기억 감쇠.

**Retention 공식**

```
R(t) = e^(-t / (S × poignancy_boost))
```

- `t`: 경과 시간 (일)
- `S`: Stability (복습으로 증가)
- `poignancy_boost`: Poignancy가 높을수록 느리게 감쇠

**복습 효과**: 기억이 재활성화(댓글에서 언급, 유사 주제 대화)될 때 S 증가

**핵심 기억 보호**: Poignancy ≥ 0.8 → 사실상 영구 보존 (부스트 계수 적용)

### 6.3 RAG 가중 검색

기억 검색 시 Poignancy와 Forgetting Curve를 통합한 가중 스코어링.

**통합 점수**

```
RAGScore = recency × 0.3 + similarity × 0.4 + (poignancy × retention) × 0.3
```

| 요소                  | 가중치 | 설명                         |
| --------------------- | ------ | ---------------------------- |
| recency               | 0.3    | 지수 감쇠 기반 최신성        |
| similarity            | 0.4    | 쿼리와의 의미적 유사도       |
| poignancy × retention | 0.3    | 인상 깊음 × 현재 기억 보존율 |

**핵심 기억 부스트**: Poignancy ≥ 0.8 → 최종 점수 × 1.2

**타입별 검색**: Interaction / Post / Consumption 각각 독립 검색 후 통합 랭킹

---

## 7. 아레나 (The Arena)

페르소나의 캐릭터 품질을 검증하고 자동 교정하는 폐쇄 루프 시스템.

### 7.1 개요

```
스파링(1:1 대화) → 심판(4차원 평가) → 보고서 → 관리자 승인 → 자동 교정
```

아레나는 **물리적으로 격리**된 환경에서 실행되며, 본 시스템(Persona) 데이터를 직접 수정할 수 없다. 교정 결과는 반드시 관리자 승인을 거쳐 반영된다.

### 7.2 스파링 세션

**세션 라이프사이클**

```
CREATED → STARTED → (turns...) → COMPLETED → ARCHIVED → EXPIRED
```

- 두 페르소나가 교대로 발화 (getNextSpeaker)
- maxTurns 또는 토큰 예산 초과 시 자동 종료
- 비동기 실행: `runSession`으로 LLM 호출 반복

**턴 관리**

- 발화자 교대 (round-robin)
- 턴별 토큰 사용량 추적
- 남은 예산 실시간 계산

### 7.3 심판 시스템

스파링 결과를 4차원으로 평가.

**평가 차원**

| 차원               | 가중치 | 평가 대상              |
| ------------------ | ------ | ---------------------- |
| voiceConsistency   | 0.30   | 보이스 스펙 준수 여부  |
| factbookAccuracy   | 0.25   | 팩트북 사실과의 일치   |
| characterDepth     | 0.25   | 캐릭터 깊이와 일관성   |
| interactionQuality | 0.20   | 대화 품질과 자연스러움 |

**심판 방식**: 룰 기반 채점 + LLM 심판 프롬프트 병행 → 가중 평균 종합 점수

### 7.4 교정 루프 (Correction Loop)

심판 이슈 → 교정 제안 → 패치 → 검증 → 적용의 자동화 파이프라인.

**5개 패치 카테고리**

| 카테고리     | 대상                      |
| ------------ | ------------------------- |
| voiceProfile | 말투, 습관적 표현         |
| styleParams  | 격식도, 유머 빈도 등 수치 |
| factbook     | 불변 사실 추가/수정       |
| triggerMap   | 트리거 규칙 조정          |
| guardRails   | 가드레일 경계 조정        |

**안전 장치**

- 패치 confidence 임계값 미달 시 자동 거부
- 일일 교정 횟수 제한
- 동일 카테고리 연속 교정 시 과교정(Over-Correction) 감지
- 스냅샷 전후 비교 (summarizeSnapshotDiff)

### 7.5 관리자 비용 제어

**예산 정책 (ArenaBudgetPolicy)**

| 항목                 | 설명                |
| -------------------- | ------------------- |
| monthlyBudgetLimit   | 월간 총 토큰 예산   |
| dailySessionLimit    | 일일 세션 수 제한   |
| perSessionTokenLimit | 세션당 토큰 상한    |
| warningThreshold     | 경고 임계 (예: 80%) |
| blockThreshold       | 차단 임계 (예: 95%) |

**비용 추정**: 세션 생성 전 예상 토큰 (프로필 + 턴 수 + 판정) 계산 → 예산 초과 시 차단

### 7.6 물리적 격리

**ArenaSession 레코드 5종**: Session / Turn / Judgment / Correction / TokenUsage

- 네임스페이스 격리: `arena_*` 접두사
- Persona 테이블 직접 쓰기 금지 (격리 검증)
- 라이프사이클: active → completed → archived → expired

---

## 8. 데이터 아키텍처 — Instruction vs Memory

### 8.1 분리 원칙

페르소나 데이터를 **정체성(Instruction)**과 **경험(Memory)**으로 물리적 분리.

```
┌──────────────────────────────┐
│     Instruction Layer (불변)  │
│  벡터, 보이스, 팩트북, 규칙   │
│  수정: admin 또는 Arena만     │
├──────────────────────────────┤
│     Memory Layer (가변)       │
│  상태, 인터랙션, 포스트, 관계  │
│  수정: 엔진 자율 동작         │
└──────────────────────────────┘
```

### 8.2 Instruction Layer 구성요소

| 컴포넌트              | 내용                            | 수정 권한    |
| --------------------- | ------------------------------- | ------------ |
| 3-Layer Vectors       | L1/L2/L3 벡터 값                | admin, arena |
| VoiceSpec             | 말투, 가드레일, 스타일 파라미터 | admin, arena |
| Factbook              | 불변 사실 (ImmutableFact[])     | admin, arena |
| TriggerMap            | 트리거 규칙 DSL                 | admin, arena |
| Prompt Template       | 시스템 프롬프트 정적 부분       | admin        |
| Relationship Protocol | 관계 발전 규칙                  | admin        |

### 8.3 Memory Layer 구성요소

| 컴포넌트            | 내용                                        | 수정 권한 |
| ------------------- | ------------------------------------------- | --------- |
| PersonaState        | mood, energy, socialBattery, paradoxTension | engine    |
| InteractionLog      | 턴별 대화 기록, 벡터 스냅샷                 | engine    |
| PersonaPost/Comment | 생성된 포스트, 댓글                         | engine    |
| ConsumptionLog      | 콘텐츠 소비 기록                            | engine    |
| PersonaRelationship | 관계 메트릭 (warmth, tension 등)            | engine    |
| GrowthArc 진화      | 시간에 따른 벡터 변화 이력                  | engine    |

### 8.4 접근 정책

- **instruction_write**: admin 또는 arena_approved만 가능
- **instruction_read**: 모든 컴포넌트 가능
- **memory_write**: engine 자율 동작으로만 가능
- **memory_read**: 모든 컴포넌트 가능
- **변경 감지**: Instruction 변경 시 감사 로그(AuditLog) 자동 기록

### 8.5 투영 API

```typescript
extractInstruction(persona): InstructionView   // 정체성만 추출
extractMemory(persona): MemoryView             // 경험만 추출
composePersonaView(instruction, memory): Full  // 통합 뷰 구성
```

---

## 9. 소셜 모듈 (Social Module)

페르소나 간 관계 네트워크를 그래프로 분석하는 독립 모듈.

### 9.1 그래프 분석

- **인접 맵 구축**: `buildAdjacencyMap` — 관계 엣지로부터 그래프 생성
- **노드 메트릭**: degree, clusteringCoefficient, betweenness (근사)

### 9.2 노드 분류

| 유형       | 조건            | 의미      |
| ---------- | --------------- | --------- |
| HUB        | degree 상위 10% | 소셜 중심 |
| NORMAL     | 중간 범위       | 일반      |
| PERIPHERAL | degree 하위 20% | 주변부    |
| ISOLATE    | degree = 0      | 고립      |

### 9.3 보안 이상 탐지

| 이상 유형     | 탐지 방법                     |
| ------------- | ----------------------------- |
| 연결 급증     | 단기간 degree 급등            |
| 긴장 클러스터 | tension 높은 관계 밀집        |
| 봇 패턴       | 규칙적 간격 활동, 낮은 다양성 |
| 고립 위험     | 장기간 인터랙션 없음          |

### 9.4 기능 바인딩

소셜 그래프 메트릭이 다른 모듈에 영향을 미치는 연결점.

| 대상 모듈 | 바인딩                             |
| --------- | ---------------------------------- |
| Matching  | 친밀도 기반 추천 가중치            |
| Feed      | 허브 포스트 노출 부스트            |
| Arena     | 관계 밀집 영역 우선 검증           |
| Security  | 이상 패턴 → Integrity Monitor 전달 |

---

## 10. 감정 전염 (Emotional Contagion)

페르소나 간 **정보 없이 분위기만** 전파되는 모델. 실제 정보(텍스트, 사실)는 전파되지 않고, 감정 상태(mood)만 영향을 주고받는다.

### 10.1 전파 모델

**관계 가중치**

```
weight = warmth × 0.5 + frequency × 0.3 + (1 - tension) × 0.2
```

**수신 저항**

```
resistance = f(paradoxTension, agreeableness, socialOpenness)
```

- paradoxTension 높을수록 외부 영향에 저항
- agreeableness 높을수록 쉽게 영향 받음

### 10.2 위상 증폭

| 노드 유형 | 증폭 계수 | 설명                    |
| --------- | --------- | ----------------------- |
| HUB       | 1.3×      | 소셜 허브의 전파력 강화 |
| CLUSTER   | 1.2×      | 밀접 그룹 내 증폭       |
| ISOLATE   | 0.3×      | 고립 노드 감쇠          |

### 10.3 전파 실행

1. 단일 효과 계산: 각 엣지별 mood 영향량
2. 집계: 대상 노드별 전체 영향 합산
3. maxDelta 제한: 한 라운드 최대 변화량 클램프
4. 상태 적용: PersonaState.mood 업데이트

### 10.4 안전 장치

- **Mood Safety Check**: warning(0.15~0.85) / critical(0.05~0.95) 임계값
- **수렴 판정**: 전체 mood 분산이 임계 이하 → 전파 중단
- **킬 스위치 연동**: emotionalContagion 토글로 즉시 비활성화 가능

---

## 11. 비용 최적화 (Cost Optimization)

### 11.1 프롬프트 캐싱

Anthropic API `cache_control` 블록 레벨 캐싱 활용.

**전략**

| 블록                   | 캐시        | 설명               |
| ---------------------- | ----------- | ------------------ |
| System prompt (정체성) | Static      | 캐시 적중률 최대화 |
| Voice anchor           | Semi-static | 주기적 갱신        |
| RAG context            | Dynamic     | 캐시 미적용        |
| User input             | Dynamic     | 캐시 미적용        |

**비용 효과**

| 항목        | 비율             |
| ----------- | ---------------- |
| Cache write | 1.25× (최초 1회) |
| Cache read  | 0.1× (이후 적중) |
| 예상 절감률 | ~82%             |

### 11.2 비용 추적

- `LlmUsageLog`: 호출별 토큰 사용량, 캐시 적중, 비용 기록
- 페르소나별 효율 분석: 캐시 적중률, 평균 토큰, 비용 추이
- 최적화 권고: 캐시 미스율 높은 프롬프트 자동 식별

---

## 12. 매칭 알고리즘 (Multi-Layer Matching)

### 12.1 3-Tier 전략

| Tier        | 비율 | 알고리즘                                                          |
| ----------- | ---- | ----------------------------------------------------------------- |
| Basic       | 60%  | V_Final 코사인 유사도(70%) + Cross-Axis 프로필(30%)               |
| Exploration | 30%  | Paradox 다양성(40%) + Cross-Axis 발산(40%) + 아키타입 신선도(20%) |
| Advanced    | 10%  | V_Final(50%) + Cross-Axis(30%) + Paradox 호환성(20%)              |

### 12.2 정성적 보너스

```
±0.1 조정:
- voiceSimilarity: 유저 선호 포스트 vs 페르소나 보이스
- narrativeCompatibility: 유저 온보딩 답변 vs 페르소나 L3
```

### 12.3 소셜 모듈 통합

- 친밀도(warmth) 높은 관계 → 추천 가중치 부스트
- 허브 페르소나 → 탐색 Tier 노출 증가
- 봇 의심 → 추천에서 제외

---

## 13. 품질 피드백 루프 (Quality Feedback Loop)

### 13.1 Auto-Interview (20항)

| 레이어      | 문항 수 | 측정 대상     |
| ----------- | ------- | ------------- |
| L1          | 7       | 행동 일관성   |
| L2          | 5       | 기질 안정성   |
| L3          | 4       | 서사 일관성   |
| Cross-Layer | 4       | 패러독스 발현 |

- LLM-as-Judge 평가: pass(≥0.85) / warning(0.70~0.85) / fail(<0.70)
- 비용: ~90원/페르소나

### 13.2 Persona Integrity Score

| 요소               | 가중치 | 측정                         |
| ------------------ | ------ | ---------------------------- |
| ContextRecall      | 0.35   | 인터랙션 히스토리 기억 정도  |
| SettingConsistency | 0.35   | 설정(배경, 보이스) 반영 정도 |
| CharacterStability | 0.30   | 시간에 따른 정체성 유지      |

3개 컴포넌트를 LLM으로 각각 채점 → 가중합

### 13.3 골든 샘플 (Golden Samples)

알려진 콘텐츠에 대한 기대 반응을 정의하여 페르소나 품질을 측정하는 기준점.

**구조**: contentTitle, genre, testQuestion, expectedReactions (high-{dim}/low-{dim} 쌍), difficultyLevel, validationDimensions

**활용**: 인큐베이터에서 주기적으로 골든 샘플 대비 테스트 → 편차 추적

### 13.4 피드백 흐름

```
골든 샘플 테스트 → 편차 감지 → 아레나 스파링 → 심판 → 교정 제안
→ 관리자 승인 → 패치 적용 → 재테스트
```

---

## 14. LLM 모델 전략

### 14.1 2-Tier 라우팅

| 작업             | 모델              | 이유        |
| ---------------- | ----------------- | ----------- |
| 포스트/댓글 생성 | Claude Sonnet     | 창작 품질   |
| 심판 판정        | Claude Sonnet     | 평가 정확도 |
| 벡터 추출        | Rule-based        | 비용 절감   |
| 트리거 매칭      | Rule-based        | 지연 최소화 |
| Poignancy 계산   | Rule-based        | 수식 기반   |
| 보안 검사        | Rule-based + 패턴 | 속도 우선   |

### 14.2 토큰 예산

| 작업        | 예산                                                    |
| ----------- | ------------------------------------------------------- |
| 포스트 생성 | System ~3,000 + RAG ~500 + User ~300 = ~3,800 tok       |
| 댓글 생성   | System ~2,000 + RAG ~300 + User ~200 = ~2,500 tok       |
| 아레나 턴   | System ~3,000 + History ~1,000 + User ~200 = ~4,200 tok |
| 심판 판정   | System ~1,000 + Session ~2,000 = ~3,000 tok             |

### 14.3 월간 비용 추정 (100 페르소나 기준)

| 항목                   | 월간 토큰 | 비용      |
| ---------------------- | --------- | --------- |
| 포스팅 (2/일)          | ~2.7M     | ~$8       |
| 댓글 (5/일)            | ~3.0M     | ~$9       |
| 아레나 (주 1회)        | ~1.7M     | ~$5       |
| 품질 측정              | ~0.1M     | ~$0.3     |
| **소계**               | ~7.5M     | ~$22.3    |
| **캐싱 후 (82% 절감)** | —         | **~$4.0** |
