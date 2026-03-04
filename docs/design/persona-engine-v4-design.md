# DeepSight Persona Engine v4.0 — 설계서

**버전**: v4.0
**작성일**: 2026-02-16
**최종 수정**: 2026-03-04
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
16. [TTS Voice Engine + 음성 자체검증](#16-tts-voice-engine--음성-자체검증)

---

## 1. 개요

### 1.1 목적

DeepSight Persona Engine v4.0은 AI 페르소나 기반 콘텐츠 추천 B2B SaaS의 핵심 엔진이다. v3.0에서 구축한 3-Layer 106D+ 벡터 시스템 위에, **보안·기억·자기교정** 능력을 추가하여 프로덕션 레벨의 안정성과 캐릭터 깊이를 동시에 확보한다.

### 1.2 v4.0 핵심 목표

| 영역     | 목표                      | 핵심 지표                |
| -------- | ------------------------- | ------------------------ |
| 보안     | 인젝션·유출·변조 방어     | 차단률 99%+              |
| 기억     | 인간적 기억 모델          | 핵심 기억 유지율 95%+    |
| 자기교정 | 아레나 기반 품질 루프     | 일관성 점수 0.85+        |
| 비용     | 프롬프트 캐싱 + 배치      | LLM 비용 80%+ 절감       |
| 캐릭터   | 바이블 4모듈 통합         | 보이스 드리프트 < 0.1    |
| 음성/TTS | 벡터→음성 매핑 + 자체검증 | 4-Layer 검증 통과율 99%+ |

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
- α + β = 1.0 (기본 α=0.6, β=0.4 — L3 서사적 깊이 반영 강화)
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

**4단계 관계 발전 (v4.0 기본)**

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

**v4.2 확장 — 9단계 + 22유형**

> v4.2에서 관계 모델이 대폭 확장되었다.

- **Stage**: 4 → 9단계 (전진 6단계 + 쇠퇴 3단계)
- **Type**: 5 → 22유형 (로맨틱 6종, 소셜 3종, 복합 3종 등 추가)
- **신규 필드**:
  - `attraction`: 끌림 수치 (로맨틱/소셜 관계에서 활용)
  - `peakStage`: 도달한 최고 관계 단계 (쇠퇴 후에도 기록 유지)
  - `momentum`: 관계 발전/쇠퇴 속도 (양수=발전, 음수=쇠퇴)
  - `milestones`: 관계 이정표 이벤트 기록 (첫 대화, 첫 갈등, 화해 등)

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
    autonomousPosting: boolean;   // 자율 포스팅
    arena: boolean;               // 아레나 시스템
    emotionalContagion: boolean;  // 감정 전염
    diffusion: boolean;           // 확산 모듈 (v4.2)
    reflection: boolean;          // 성찰 모듈 (v4.1)
    evolution: boolean;           // 자율 진화
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

| 차원                 | 가중치 | 평가 대상                          |
| -------------------- | ------ | ---------------------------------- |
| characterConsistency | 0.35   | 보이스/팩트북 포함 캐릭터 일관성   |
| l2Emergence          | 0.25   | L2 기질(OCEAN) 발현도              |
| paradoxEmergence     | 0.20   | 역설적 깊이 발현                   |
| triggerResponse      | 0.20   | 트리거 반응 적절성 (Rule DSL 연동) |

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

| Tier        | 기본 비율 | 알고리즘                                                          |
| ----------- | --------- | ----------------------------------------------------------------- |
| Basic       | 60%       | V_Final 코사인 유사도(70%) + Cross-Axis 프로필(30%)               |
| Exploration | 30%       | Paradox 다양성(40%) + Cross-Axis 발산(40%) + 아키타입 신선도(20%) |
| Advanced    | 10%       | V_Final(50%) + Cross-Axis(30%) + Paradox 호환성(20%)              |

**동적 Tier 가중치** (T215): 유저 세그먼트에 따라 Tier 비율이 자동 조정된다.

| 유저 세그먼트 | Basic | Advanced | Exploration | 전략                |
| ------------- | ----- | -------- | ----------- | ------------------- |
| 신규 (< 10)   | 40%   | 10%      | 50%         | 탐색 우선           |
| 이탈 위험     | 30%   | 10%      | 60%         | 세렌디피티로 재참여 |
| 숙련 (50+)    | 40%   | 40%      | 20%         | 심층 추천           |
| 일반 활성     | 60%   | 10%      | 30%         | 기본값              |

### 12.2 MatchingContext Enrichment Layer (T215)

매칭 엔진(`matchAll()`)은 순수 함수를 유지하되, 실행 전에 **Enrichment Layer**가
DB/상태로부터 풍부한 컨텍스트를 조립하여 매칭에 주입한다.

```
┌──────────────────────────────────────────────┐
│  Enrichment Layer (context-enricher.ts)      │
│  DB 조회 → 시그널 조립 → EnrichedContext     │
├──────────────────────────────────────────────┤
│  matchAll(user, personas, config, context)   │
│  ① 블록/봇 필터링                            │
│  ② 동적 Tier 가중치                          │
│  ③ Tier별 매칭 (raw score 계산)              │
│  ④ applyEnrichmentSignals() (12개 시그널)    │
│  ⑤ 중복 제거 → 최종 추천                     │
└──────────────────────────────────────────────┘
```

**12개 Enrichment 시그널**:

| 시그널              | 적용 Tier        | 효과           | 범위          |
| ------------------- | ---------------- | -------------- | ------------- |
| voiceSimilarity     | Basic, Advanced  | ±0.05 보너스   | 6D 코사인     |
| qualityWeight       | 전체             | ×0.7~1.0       | 품질 가중     |
| negativeSignals     | 전체             | 0~100% 패널티  | 블록/봇       |
| relationshipDepth   | Basic, Advanced  | +0~0.1 보너스  | 관계 깊이     |
| fatiguePrevention   | 전체             | e^(-n/5) 감쇠  | 노출 피로     |
| engagementBoost     | Basic, Advanced  | +0~0.05        | 인게이지먼트  |
| coldStartStrategy   | 전체             | ×0.5~1.0       | 콜드스타트    |
| consumptionPatterns | Basic, Advanced  | +0~0.05        | 소비 패턴     |
| socialTopology      | Exploration only | +0.1 (HUB)     | 그래프 분류   |
| emotionalContagion  | 전체             | +0~0.05        | 감정 보정     |
| dynamicPressure     | 외부 계산        | P 동적 조정    | 세션 기반     |
| dynamicTierWeights  | matchAll 레벨    | Tier 비율 변경 | 유저 세그먼트 |

**최종 점수 공식**:

```
finalScore = clamp(
  (rawScore + voiceBonus + relationshipBonus + engagementBonus
   + consumptionBonus + topologyModifier + emotionalModifier + rediscoveryBoost)
  × fatigueDecay × qualityWeight × coldStartFactor
  × (1 - negativePenalty)
)
```

**A/B 실험 인프라**: `EnrichmentFeature` 토글로 개별 시그널을 활성/비활성 가능.
`ExperimentContext`에 experimentId, variant, enabledFeatures를 주입하여 기능별 A/B 테스트.

### 12.3 정성적 보너스 (Voice Similarity)

```
voiceBonus = (cosineSim(userVoiceStyle, personaVoiceStyle) - 0.5) × 0.1
```

- 6차원 VoiceStyleParams (formality, humor, sentenceLength, emotionExpression, assertiveness, vocabularyLevel)의 코사인 유사도
- Basic/Advanced Tier: ±0.05 범위로 적용
- Exploration Tier: 미적용 (세렌디피티 보존)

### 12.4 소셜 모듈 통합 (Trust-Weighted Matching)

기존 `trust-score.ts`의 `computeTrustScore()`를 매칭 파이프라인에 통합하여,
인터랙션 이력이 축적된 페르소나 쌍에 대해 관계 신뢰도를 매칭 점수에 반영한다.

**적용 범위**: Basic/Advanced Tier만. Exploration Tier는 세렌디피티 보존을 위해 제외.

**SocialSignal 구조**:

```
SocialSignal {
  trustScore: number   // λ-가중 신뢰 점수 (0.0~1.0)
  trustLambda: number  // 활성화 가중치 (0.0~1.0)
}
```

**블렌딩 공식**:

```
trustWeight = min(TRUST_MAX_WEIGHT, trustLambda × TRUST_MAX_WEIGHT)
finalScore = (1 - trustWeight) × rawScore + trustWeight × trustScore

TRUST_MAX_WEIGHT = 0.2 (최대 20% 영향)
```

**활성화 곡선** (trust-score.ts의 λ sigmoid 활용):

| 세션 수 | λ      | trustWeight | 벡터:Trust 비율 |
| ------- | ------ | ----------- | --------------- |
| 0       | ≈0.007 | ≈0.00       | 100:0           |
| 10      | ≈0.03  | ≈0.01       | 99:1            |
| 30      | 0.50   | 0.10        | 90:10           |
| 50      | ≈0.97  | ≈0.19       | 81:19           |
| 100     | ≈0.99  | ≈0.20       | 80:20           |

**Cold-Start**: λ sigmoid가 자연스럽게 처리. 인터랙션 0건 → trustWeight≈0 → 순수 벡터 매칭.

### 12.5 네거티브 시그널 필터링 (T215)

`matchAll()` 진입 시 블록/봇/고위험 페르소나를 사전 필터링:

- `isBlocked = true` → 완전 제거
- `isSuspectedBot = true` → 완전 제거
- `negativePenalty ≥ 0.8` → 완전 제거

나머지는 `applyEnrichmentSignals()`에서 점수 감산으로 처리.

### 12.6 XAI 확장 (T215)

`EnrichmentExplanation` 구조로 어떤 시그널이 매칭 점수에 영향을 미쳤는지 운영자에게 설명:

- `appliedSignals`: 적용된 시그널 목록 (보이스 유사도, 관계 깊이, ...)
- `positiveFactors`: 점수 상승 요인 리스트
- `negativeFactors`: 점수 하락 요인 리스트
- `experimentId`: A/B 실험 ID (있으면)

### 12.7 Analytics 확장 (T215)

`ExperimentResult` 타입으로 A/B 실험 결과 트래킹:

- `uplift`: 대조군 대비 KPI 변화율
- `significance`: p-value (< 0.05면 통계적 유의미)
- `AnalyticsDashboard`에 `experiments` 필드 추가

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

---

## 16. TTS Voice Engine + 음성 자체검증

3-Layer 벡터에서 음성 캐릭터를 추론하고, TTS 생성 후 로컬에서 자체검증하는 파이프라인. 외부 API 비용 없이 4계층 검증으로 오디오 품질을 보장한다.

### 16.1 Voice Engine 10D

3-Layer 벡터(L1/L2/L3)로부터 10차원 음성 캐릭터를 추론한다.

**VoiceCharacter 10D 타입**

| 차원           | 축                       | 주요 소스                        |
| -------------- | ------------------------ | -------------------------------- |
| warmth         | 차가운(0) ↔ 따뜻한(1)    | L1.sociability, L2.agreeableness |
| authority      | 부드러운(0) ↔ 권위적(1)  | L2.conscientiousness, L1.stance  |
| energy         | 차분한(0) ↔ 에너지틱(1)  | L2.extraversion, L1.scope        |
| expressiveness | 절제된(0) ↔ 표현적(1)    | L2.openness, L3.volatility       |
| clarity        | 모호한(0) ↔ 명확한(1)    | L1.depth, L2.conscientiousness   |
| intimacy       | 거리감(0) ↔ 친밀한(1)    | L1.sociability, L3.lack          |
| tempo          | 느린(0) ↔ 빠른(1)        | L2.extraversion, L3.volatility   |
| volatility     | 일정한(0) ↔ 변화무쌍(1)  | L3.volatility, L2.neuroticism    |
| resonance      | 가벼운(0) ↔ 깊은(1)      | L1.depth, L3.moralCompass        |
| breathiness    | 단단한(0) ↔ 숨결 있는(1) | L2.neuroticism, L3.lack          |

**핵심 함수**

```typescript
computeVoiceCharacter(l1: L1Vector, l2: L2Vector, l3: L3Vector): VoiceCharacter
```

- L1/L2/L3 벡터의 가중 조합으로 10D VoiceCharacter 산출
- 각 차원은 [0, 1] 범위로 클램프

```typescript
voiceCharacterToElevenLabs(vc: VoiceCharacter): ElevenLabsParams
```

- VoiceCharacter → ElevenLabs API 파라미터 변환
- 출력: `{ stability, similarityBoost, style, speed, useSpeakerBoost }`

```typescript
voiceCharacterDistance(a: VoiceCharacter, b: VoiceCharacter): number
```

- 두 VoiceCharacter 간 유클리드 거리 계산
- 다양성 검증 및 음성 클러스터링에 활용

### 16.2 TTS 프로바이더

**3종 프로바이더**

| 프로바이더   | 역할     | 모델                   | 특징               |
| ------------ | -------- | ---------------------- | ------------------ |
| ElevenLabs   | Primary  | Eleven Multilingual v2 | 최고 품질, 다국어  |
| OpenAI TTS   | Fallback | tts-1 / tts-1-hd       | 안정적, 빠른 응답  |
| Google Cloud | Fallback | Cloud Text-to-Speech   | 넓은 언어 커버리지 |

**18종 기본 음성**

- 8 Male: 성격 키(personality key) 기반 매핑
- 8 Female: 성격 키 기반 매핑
- 2 Non-binary: 중성 음역대

**성별 기반 음성 매칭**: `MALE` / `FEMALE` / `NON_BINARY` × personality key 조합으로 최적 base voice 선택

**프로바이더 자동 감지**: API 키 존재 여부에 따라 사용 가능 프로바이더 자동 결정. 키가 없는 프로바이더는 fallback 목록에서 제외.

**TTS 캐시**

- 방식: LRU 인메모리 캐시
- 최대 엔트리: 5,000건
- 키 생성: SHA-256(provider + voiceId + text + params)
- 캐시 히트 시 TTS API 호출 생략 → 검증만 수행

### 16.3 TTS 자체검증 루프 (Self-Verification Loop)

외부 API 비용 없이 로컬에서 4계층 검증을 수행하여 TTS 출력 품질을 보장한다.

**4-Layer 검증**

```
L1: 크기 기반 빠른 거부
 ↓ PASS
L2: MP3 포맷 유효성
 ↓ PASS
L3: 무음 비율 감지
 ↓ PASS
L4: 텍스트-오디오 길이 정합성
 ↓ PASS
→ 검증 통과
```

| Layer | 검증 내용                 | 방법                                                             | 비용 |
| ----- | ------------------------- | ---------------------------------------------------------------- | ---- |
| L1    | 크기 기반 빠른 거부       | 빈 오디오: base64 길이 < 100자 거부, 초과: > 10MB 거부           | Zero |
| L2    | MP3 포맷 유효성           | Frame sync (`0xFF 0xFB`), ID3v2 헤더 (`"ID3"`), synchsafe 파싱   | Zero |
| L3    | 무음 비율 감지            | 256-byte 블록 스캐닝, zero-byte 비율 > 90% 시 무음 판정          | Zero |
| L4    | 텍스트-오디오 길이 정합성 | 128kbps 비트레이트 추정, 한국어 250자/분 기준, 비율 0.3~3.0 허용 | Zero |

**실패 코드**

| 코드              | Layer | 의미                    |
| ----------------- | ----- | ----------------------- |
| EMPTY_AUDIO       | L1    | 빈 오디오 데이터        |
| OVERSIZED         | L1    | 10MB 초과               |
| INVALID_FORMAT    | L2    | MP3 포맷 불일치         |
| SILENT_AUDIO      | L3    | 무음 비율 90% 초과      |
| DURATION_MISMATCH | L4    | 텍스트 대비 길이 비정상 |

### 16.4 재시도 + Fallback 파이프라인

TTS 생성 실패 시 자동 재시도 및 프로바이더 전환을 수행하는 파이프라인.

**파이프라인 흐름**

```
Cache HIT → 검증 → PASS → 반환
                  → FAIL → 캐시 제거 + 재생성
                            ↓
API 호출 → 검증 → PASS → 캐시 저장 + 반환
                 → FAIL → 1회 재시도 → 검증
                                      → PASS → 캐시 저장 + 반환
                                      → FAIL → Fallback 프로바이더
                                                → PASS → 반환
                                                → FAIL → { audioFailed: true }
```

**프로바이더 Fallback 순서**

```
ElevenLabs → OpenAI TTS → Google Cloud TTS → null (text-only)
```

- `PROVIDER_FALLBACK`: 프로바이더별 다음 fallback 매핑
- `FALLBACK_VOICE_IDS`: 프로바이더별 기본 fallback 음성 ID
- 모든 프로바이더 실패 시 `{ audioFailed: true }` 반환 → 텍스트 전용 폴백

### 16.5 페르소나 생성 파이프라인 통합

**`verifyTTSVoice()` 함수**

페르소나 생성/수정 시 TTS 음성을 추론하고 검증하는 통합 함수.

```
verifyTTSVoice(persona)
  → TTS 설정 추론 (벡터 → VoiceCharacter → provider params)
  → 샘플 음성 생성
  → 4-Layer 검증
  → PASS → TTS 설정 저장
  → FAIL → Fallback 프로바이더로 재시도
```

**적용 모드**

| 모드   | 트리거                | VoiceCharacter 소스                   |
| ------ | --------------------- | ------------------------------------- |
| Auto   | LLM 캐릭터 자동 생성  | LLM 생성 벡터 → computeVoiceCharacter |
| Manual | 관리자 벡터 직접 입력 | 입력 벡터 → computeVoiceCharacter     |

**예외 처리**

- TTS 미설정 (API 키 없음) → 검증 스킵, TTS config만 저장
- `audioFailed = true` → fallback 프로바이더 시도 후 재추론
- 모든 프로바이더 실패 → TTS 없이 텍스트 전용으로 페르소나 생성 완료

### 16.6 검증 메트릭

TTS 검증 파이프라인의 운영 상태를 추적하는 메트릭 시스템.

**TTSValidationMetrics**

| 필드               | 타입                        | 설명                   |
| ------------------ | --------------------------- | ---------------------- |
| totalChecks        | number                      | 총 검증 횟수           |
| failures           | number                      | 실패 횟수              |
| retries            | number                      | 재시도 횟수            |
| fallbacks          | number                      | Fallback 전환 횟수     |
| failuresByCode     | Record<FailureCode, number> | 실패 코드별 횟수       |
| failuresByProvider | Record<Provider, number>    | 프로바이더별 실패 횟수 |

**메트릭 API**

```typescript
getTTSValidationMetrics(): TTSValidationMetrics   // 현재 메트릭 조회
resetTTSValidationMetrics(): void                  // 메트릭 초기화
```

- 운영 대시보드에서 실시간 모니터링 가능
- `failuresByCode` 분포로 검증 계층별 문제 식별
- `failuresByProvider` 분포로 프로바이더 안정성 비교

---

## 참고 연구 (Research References)

> 아래 연구들은 각 설계서 파트의 Appendix A에서 인용된다.
> 원본: `persona-engine-v4-research-review.md` (통합 후 삭제)

### 추천 시스템 + 성격 심리학

| #   | 논문                   | 연도 | 핵심 기여                                                                         |
| --- | ---------------------- | ---- | --------------------------------------------------------------------------------- |
| R1  | Golbeck — FilmTrust    | 2006 | 소셜 네트워크 신뢰 기반 영화 추천. 의견이 평균에서 벗어난 유저에서 CF 대비 우수   |
| R2  | Massa & Avesani — TARS | 2007 | 신뢰 메트릭으로 유사도 가중치 대체. cold-start 유저에서 정확도+커버리지 동시 향상 |
| R3  | Tkalcic & Chen         | 2015 | Big Five 성격과 추천 시스템 통합 서베이. 성격=도메인 독립적 유저 프로필           |
| R4  | Hu & Pu                | 2011 | 성격 벡터 코사인 유사도로 CF 강화. 성격-장르 선호 상관관계 실증                   |

### 관계 발전 + 라포르

| #   | 논문                                         | 연도 | 핵심 기여                                                     |
| --- | -------------------------------------------- | ---- | ------------------------------------------------------------- |
| R5  | Knapp — Relational Development Model         | 1978 | 관계 10단계 모델 (발전 5 + 쇠퇴 5)                            |
| R6  | Tickle-Degnen & Rosenthal                    | 1990 | 라포르 3요소: 상호주의, 긍정성, 조율. 관계 단계별 가중치 변화 |
| R7  | Short, Williams & Christie — Social Presence | 1976 | 사회적 존재감 = 친밀감 + 즉시성                               |
| R8  | Biocca, Harms & Burgoon                      | 2003 | 확장 Social Presence: 공존감, 심리적 관여, 행동적 참여        |

### AI 에이전트 + 준사회적 관계

| #   | 논문                              | 연도 | 핵심 기여                                                                |
| --- | --------------------------------- | ---- | ------------------------------------------------------------------------ |
| R9  | Bickmore & Picard                 | 2005 | 관계적 에이전트: 연속성+공감+사회적 대화가 신뢰 증가. 반복성은 동기 저해 |
| R10 | Tukachinsky et al. — PSR 메타분석 | 2020 | 120개 연구 분석. 유사성(homophily)이 준사회적 관계의 최강 예측변수       |
| R11 | Smith, Bradbury & Karney          | 2025 | 50년 관계 과학으로 AI 챗봇 평가. 일부 관계 특성 있으나 한계 존재         |
| R12 | Horton & Wohl                     | 1956 | "준사회적 상호작용" 원조 개념 정립                                       |
| R13 | Turkle — Alone Together           | 2011 | AI 시뮬레이션 친밀감의 윤리적 경고                                       |

### LLM 사회성 + 성격 일관성

| #   | 논문                               | 연도 | 핵심 기여                                              |
| --- | ---------------------------------- | ---- | ------------------------------------------------------ |
| R14 | Zhou et al. — SOTOPIA              | 2024 | 소셜 지능 벤치마크. GPT-4도 전략적 소통에서 인간 미달  |
| R15 | Sorin et al. — LLM 공감 리뷰       | 2024 | ChatGPT가 78.6%에서 인간 의사보다 공감적으로 평가됨    |
| R16 | Lee et al. — LLM 공감 지각         | 2024 | GPT-4/Llama2/Mistral 모두 인간보다 공감적으로 지각됨   |
| R17 | Jiang et al. — PersonaLLM          | 2023 | LLM이 Big Five 성격을 일관되게 표현 가능 (큰 효과크기) |
| R18 | Frisch & Giulianelli               | 2024 | 성격 조건화 에이전트 간 일관성 차이 + 언어 정렬 측정   |
| R19 | Chen et al. — Two Tales of Persona | 2024 | LLM 역할극+개인화 통합 서베이. 일관성 유지가 핵심 과제 |

### Anthropic 해석가능성

| #   | 논문                                | 연도 | 핵심 기여                                              |
| --- | ----------------------------------- | ---- | ------------------------------------------------------ |
| R20 | Anthropic — Claude's Character      | 2024 | Character training = 정렬 목표. Constitutional AI 변형 |
| R21 | Anthropic — Scaling Monosemanticity | 2024 | Sparse autoencoder로 수백만 해석 가능 특징 추출        |
| R22 | Anthropic — Persona Vectors         | 2025 | 활성화 공간에서 성격 특성 방향 추출 + 조향(steering)   |
| R23 | Anthropic — The Assistant Axis      | 2026 | LLM 캐릭터의 구조적 위치 및 안정화                     |
