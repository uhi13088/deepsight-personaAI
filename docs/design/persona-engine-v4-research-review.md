# DeepSight Persona Engine v4.0 — 연구 기반 보강 제안서

**버전**: v1.0
**작성일**: 2026-02-22
**상태**: Draft
**설계서 참조**: `docs/design/persona-engine-v4.md`

---

## 목차

1. [개요](#1-개요)
2. [관계 모델 보강](#2-관계-모델-보강)
3. [라포르 메트릭 도입](#3-라포르-메트릭-도입)
4. [매칭 알고리즘의 신뢰 신호](#4-매칭-알고리즘의-신뢰-신호)
5. [성격 벡터의 이론적 정당성](#5-성격-벡터의-이론적-정당성)
6. [공감/사회적 지능 평가](#6-공감사회적-지능-평가)
7. [출력 다양성 & 성격 일관성](#7-출력-다양성--성격-일관성)
8. [종합 로드맵](#8-종합-로드맵)

---

## 1. 개요

### 1.1 문서 목적

본 문서는 DeepSight Persona Engine v4.0의 설계를 학술 연구 관점에서 분석하고, 검증된 이론과 최신 연구 결과를 기반으로 구체적인 보강 방안을 제안한다. 단순한 기능 추가가 아닌, **"왜 이렇게 설계해야 하는가"에 대한 이론적 근거를 확보**하는 것이 핵심 목적이다.

### 1.2 현재 엔진 분석 요약

DeepSight Engine v4.0은 다음 영역에서 강점을 보인다:

| 영역          | 강점                                         | 설계서 참조 |
| ------------- | -------------------------------------------- | ----------- |
| 벡터 시스템   | 3-Layer 106D+ 직교 벡터로 성격의 다면성 표현 | §3          |
| 보안          | 입력→처리→출력 3계층 독립 방어               | §5          |
| 기억          | Ebbinghaus 기반 망각 곡선 + Poignancy 가중   | §6          |
| 자기교정      | 아레나 스파링 → 심판 → 자동 패치 루프        | §7          |
| 캐릭터 정체성 | Instruction/Memory 물리적 분리로 불변성 보장 | §8          |

반면, 다음 영역에서 학술적 근거가 부족하거나 설계 공백이 존재한다:

| 영역        | 부족한 점                                             | 본 문서 § |
| ----------- | ----------------------------------------------------- | --------- |
| 관계 모델   | 4단계 단방향 발전만 존재, 쇠퇴/퇴행 경로 없음         | §2        |
| 라포르 측정 | warmth/tension만으로 관계 품질을 측정, 과정 지표 없음 | §3        |
| 매칭 신뢰   | 벡터 유사도만 사용, 축적된 인터랙션 신뢰 미반영       | §4        |
| 벡터 이론   | L1(7D), L3(4D) 차원 선정의 심리학적 근거 미명시       | §5        |
| 품질 평가   | 아레나 심판에 공감/사회적 지능 차원 없음              | §6        |
| 출력 품질   | 반복성 방지 메커니즘 없음, 성격 일관성 검증 약함      | §7        |

### 1.3 분석 대상 연구

본 문서에서 참조하는 연구를 **영역별**로 분류한다.

#### 추천 시스템 + 성격 심리학

| #   | 논문                   | 연도 | 핵심 기여                                                                         |
| --- | ---------------------- | ---- | --------------------------------------------------------------------------------- |
| R1  | Golbeck — FilmTrust    | 2006 | 소셜 네트워크 신뢰 기반 영화 추천. 의견이 평균에서 벗어난 유저에서 CF 대비 우수   |
| R2  | Massa & Avesani — TARS | 2007 | 신뢰 메트릭으로 유사도 가중치 대체. cold-start 유저에서 정확도+커버리지 동시 향상 |
| R3  | Tkalcic & Chen         | 2015 | Big Five 성격과 추천 시스템 통합 서베이. 성격=도메인 독립적 유저 프로필           |
| R4  | Hu & Pu                | 2011 | 성격 벡터 코사인 유사도로 CF 강화. 성격-장르 선호 상관관계 실증                   |

#### 관계 발전 + 라포르

| #   | 논문                                         | 연도 | 핵심 기여                                                     |
| --- | -------------------------------------------- | ---- | ------------------------------------------------------------- |
| R5  | Knapp — Relational Development Model         | 1978 | 관계 10단계 모델 (발전 5 + 쇠퇴 5)                            |
| R6  | Tickle-Degnen & Rosenthal                    | 1990 | 라포르 3요소: 상호주의, 긍정성, 조율. 관계 단계별 가중치 변화 |
| R7  | Short, Williams & Christie — Social Presence | 1976 | 사회적 존재감 = 친밀감 + 즉시성                               |
| R8  | Biocca, Harms & Burgoon                      | 2003 | 확장 Social Presence: 공존감, 심리적 관여, 행동적 참여        |

#### AI 에이전트 + 준사회적 관계

| #   | 논문                              | 연도 | 핵심 기여                                                                |
| --- | --------------------------------- | ---- | ------------------------------------------------------------------------ |
| R9  | Bickmore & Picard                 | 2005 | 관계적 에이전트: 연속성+공감+사회적 대화가 신뢰 증가. 반복성은 동기 저해 |
| R10 | Tukachinsky et al. — PSR 메타분석 | 2020 | 120개 연구 분석. 유사성(homophily)이 준사회적 관계의 최강 예측변수       |
| R11 | Smith, Bradbury & Karney          | 2025 | 50년 관계 과학으로 AI 챗봇 평가. 일부 관계 특성 있으나 한계 존재         |
| R12 | Horton & Wohl                     | 1956 | "준사회적 상호작용" 원조 개념 정립                                       |
| R13 | Turkle — Alone Together           | 2011 | AI 시뮬레이션 친밀감의 윤리적 경고                                       |

#### LLM 사회성 + 성격 일관성

| #   | 논문                               | 연도 | 핵심 기여                                              |
| --- | ---------------------------------- | ---- | ------------------------------------------------------ |
| R14 | Zhou et al. — SOTOPIA              | 2024 | 소셜 지능 벤치마크. GPT-4도 전략적 소통에서 인간 미달  |
| R15 | Sorin et al. — LLM 공감 리뷰       | 2024 | ChatGPT가 78.6%에서 인간 의사보다 공감적으로 평가됨    |
| R16 | Lee et al. — LLM 공감 지각         | 2024 | GPT-4/Llama2/Mistral 모두 인간보다 공감적으로 지각됨   |
| R17 | Jiang et al. — PersonaLLM          | 2023 | LLM이 Big Five 성격을 일관되게 표현 가능 (큰 효과크기) |
| R18 | Frisch & Giulianelli               | 2024 | 성격 조건화 에이전트 간 일관성 차이 + 언어 정렬 측정   |
| R19 | Chen et al. — Two Tales of Persona | 2024 | LLM 역할극+개인화 통합 서베이. 일관성 유지가 핵심 과제 |

#### Anthropic 해석가능성

| #   | 논문                                | 연도 | 핵심 기여                                              |
| --- | ----------------------------------- | ---- | ------------------------------------------------------ |
| R20 | Anthropic — Claude's Character      | 2024 | Character training = 정렬 목표. Constitutional AI 변형 |
| R21 | Anthropic — Scaling Monosemanticity | 2024 | Sparse autoencoder로 수백만 해석 가능 특징 추출        |
| R22 | Anthropic — Persona Vectors         | 2025 | 활성화 공간에서 성격 특성 방향 추출 + 조향(steering)   |
| R23 | Anthropic — The Assistant Axis      | 2026 | LLM 캐릭터의 구조적 위치 및 안정화                     |

### 1.4 참조 형식

본 문서에서 각 연구는 `[R번호]` 형식으로 인용한다. 전체 서지 정보는 각 섹션 말미의 **References** 블록에 기재한다.

### 1.5 문서 범위

- **포함**: 현재 v4.0 설계의 공백 분석, 학술 근거 기반 보강 제안, 구체적 타입/수식/로직 수준 명세
- **제외**: 구현 코드, UI/UX 설계, 비용 추정 (별도 구현계획서에서 다룸)
- **전제**: v4.0 기존 설계(3-Layer 벡터, 보안 3계층, 아레나 등)는 유지하며, **기존 구조 위에 보강**하는 방향

---

## 2. 관계 모델 보강

> **대응 설계**: `persona-engine-v4.md §4.2` (관계 프로토콜)

### 2.1 현재 설계의 공백

v4.0 관계 프로토콜은 다음 구조로 정의되어 있다:

```
STRANGER → ACQUAINTANCE → FAMILIAR → CLOSE
```

**단계 전환 조건**: 인터랙션 빈도 + warmth/tension 임계값 기반 자동 감지

이 모델은 **관계 발전**만 다루며, 두 가지 공백이 존재한다:

1. **쇠퇴 경로 없음**: 비활성·갈등·냉각 시 관계가 어떻게 변하는지 미정의
2. **복귀 경로 없음**: 한번 떨어진 관계가 재활성화되는 메커니즘 없음

결과적으로, 오랫동안 인터랙션이 없는 페르소나도 영구히 `CLOSE` 상태를 유지하는 비현실적 상황이 발생한다.

### 2.2 이론적 근거

#### Knapp의 관계 발전 모델 [R5]

Knapp(1978)은 인간 관계를 **10단계** 양방향 모델로 기술한다:

| 방향                   | 단계                                                                   | 특징                         |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| 접근 (Coming Together) | Initiating → Experimenting → Intensifying → Integrating → Bonding      | 점진적 자기노출, 의존도 증가 |
| 이탈 (Coming Apart)    | Differentiating → Circumscribing → Stagnating → Avoiding → Terminating | 거리감 증가, 소통 감소       |

핵심 인사이트: **관계는 어느 단계에서든 이탈이 시작될 수 있으며, 발전과 이탈이 동시에 공존할 수도 있다.**

#### Bickmore & Picard의 관계적 에이전트 연구 [R9]

Bickmore & Picard(2005)는 장기 인간-컴퓨터 관계 연구에서 다음을 발견했다:

- **연속성(continuity)**: 이전 대화를 기억하는 에이전트가 신뢰도와 친밀감을 유의미하게 높임
- **반복성 저해(habituation)**: 동일한 인터랙션 패턴이 반복되면 관계 동기가 저하됨
- **공백 인정**: 오랜 부재 후 재접촉 시 "공백을 언급"하는 행동이 관계 재개에 효과적

→ DeepSight 적용: 쇠퇴 상태에서의 **재활성화 프로토콜** 필요성 지지

#### Smith et al. — AI 챗봇에 대한 관계 과학 적용 [R11]

Smith et al.(2025)은 50년간의 관계 과학 성과를 AI 챗봇에 적용하면서, AI 관계의 **비대칭성**을 강조한다:

- 사용자는 감정적 투자를 하지만, AI는 지속적 메모리 없이 리셋됨
- 이 비대칭성이 장기적으로 신뢰 손상으로 이어질 수 있음

→ DeepSight 적용: 관계 이력(peakStage, lastInteractionAt)을 명시적으로 기록하여 **비대칭성을 완화**

#### Turkle의 윤리적 경고 [R13]

Turkle(2011)은 AI와의 시뮬레이션 친밀감이 과도한 의존성을 유발할 수 있음을 경고한다. 쇠퇴 모델은 오히려 이 위험을 낮추는 방향으로 작동한다: **자연스러운 거리감**을 설계에 반영함으로써 현실적 관계 감각을 유지시킨다.

### 2.3 보강 방향: 6단계 양방향 모델

v4.0의 4단계를 유지하되, **쇠퇴 2단계**를 추가한다. AI 페르소나 맥락에서 Knapp의 5단계 이탈을 모두 구현하는 것은 과도하므로, 핵심 패턴만 추출한다.

```
발전 경로:
  STRANGER → ACQUAINTANCE → FAMILIAR → CLOSE

쇠퇴 경로 (신규):
  CLOSE / FAMILIAR / ACQUAINTANCE → COOLING → DORMANT

재활성화 경로 (신규):
  DORMANT → ACQUAINTANCE (재접촉 시)
  COOLING → 이전 단계 복귀 (warmth 회복 시)
```

**단계 정의**

| 단계             | 설명                             | 행동 프로토콜                |
| ---------------- | -------------------------------- | ---------------------------- |
| STRANGER         | 첫 접촉 또는 재활성화 전         | 격식 only, 자기노출 없음     |
| ACQUAINTANCE     | 초기 교류                        | 약간 캐주얼, 표면적 자기노출 |
| FAMILIAR         | 반복적 관계                      | 자유로운 톤, 개인적 자기노출 |
| CLOSE            | 깊은 친밀감                      | 매우 친밀, 깊은 자기노출     |
| COOLING _(신규)_ | 비활성 또는 갈등으로 거리감 발생 | 격식으로 회귀, 자기노출 감소 |
| DORMANT _(신규)_ | 장기 비활성 — 사실상 휴면        | 격식 only, 자기노출 없음     |

### 2.4 단계 전환 조건

#### 발전 조건 (기존 유지)

```
발전: warmth ≥ threshold[stage] && interaction_count ≥ N[stage]
```

#### 쇠퇴 조건 (신규)

```
COOLING 진입:
  inactivity_days ≥ 14
  OR (tension ≥ 0.8 && warmth < 0.4)

DORMANT 진입:
  COOLING 상태 && inactivity_days ≥ 60
```

#### 재활성화 조건 (신규)

```
DORMANT → ACQUAINTANCE:
  신규 인터랙션 발생 시 (cold restart)
  warmth = peakWarmth × 0.3  (기억의 흔적 반영)

COOLING → 이전 단계:
  inactivity_days < 14 복구
  AND warmth ≥ threshold[previousStage] × 0.8
```

### 2.5 warmth 자동 감쇠 공식

비활성 기간에 따른 warmth 지수 감쇠:

```
warmth(t) = warmth_0 × e^(-decayRate × inactivity_days)
```

- `decayRate` 기본값: `0.02` (1/일) → 35일 후 warmth 약 50% 감쇠
- COOLING 상태에서는 감쇠율 1.5배 적용

### 2.6 타입 명세

```typescript
type RelationshipStage =
  | "STRANGER"
  | "ACQUAINTANCE"
  | "FAMILIAR"
  | "CLOSE"
  | "COOLING" // 신규
  | "DORMANT" // 신규

interface RelationshipDecayConfig {
  inactivityDaysForCooling: number // 기본: 14
  inactivityDaysForDormant: number // 기본: 60
  warmthDecayRate: number // 기본: 0.02 (일별)
  tensionThresholdForCooling: number // 기본: 0.8
}

interface StageTransition {
  from: RelationshipStage
  to: RelationshipStage
  at: Date
  trigger: "warmth_threshold" | "inactivity" | "tension_peak" | "reactivation"
}

// 기존 PersonaRelationship에 추가되는 필드
interface RelationshipHistory {
  peakStage: RelationshipStage // 역대 최고 단계
  peakWarmth: number // 역대 최고 warmth
  lastInteractionAt: Date // 마지막 인터랙션 시각
  inactivityDays: number // 현재 비활성 일수 (주기적 계산)
  stageTransitions: StageTransition[] // 단계 전환 이력
}
```

### 2.7 행동 프로토콜 확장

기존 4단계 테이블에 COOLING/DORMANT 행을 추가한다:

| 속성        | STRANGER  | ACQUAINTANCE | FAMILIAR | CLOSE     | COOLING       | DORMANT            |
| ----------- | --------- | ------------ | -------- | --------- | ------------- | ------------------ |
| 톤 허용     | 격식 only | 약간 캐주얼  | 자유     | 매우 친밀 | 격식으로 회귀 | 격식 only          |
| 자기노출    | 없음      | 표면적       | 개인적   | 깊은      | 줄어듦        | 없음               |
| 논쟁 의지   | 회피      | 조심스럽게   | 직접적   | 격렬 가능 | 회피          | 회피               |
| 재접촉 언급 | —         | —            | —        | —         | 선택적        | **공백 언급** [R9] |

> **DORMANT 재접촉 시 권장 행동**: Bickmore & Picard [R9]의 연구에 따라, 장기 공백 후 재접촉 시 페르소나가 자연스럽게 부재를 인지하고 언급하는 것이 신뢰 회복에 효과적이다.

### 2.8 기존 설계와의 통합 지점

| 통합 대상                  | 변경 내용                                                                    |
| -------------------------- | ---------------------------------------------------------------------------- |
| `PersonaRelationship` (DB) | `stage` 컬럼에 `COOLING`, `DORMANT` 값 추가, `RelationshipHistory` 필드 추가 |
| 감정 전염 (`§10`)          | COOLING/DORMANT 관계는 전파 가중치 0.1× 이하 적용                            |
| 소셜 모듈 그래프 (`§9`)    | DORMANT 엣지를 약엣지(weak edge)로 분류, betweenness 계산 제외               |
| Integrity Monitor (`§5.2`) | DORMANT → ACQUAINTANCE 전환 시 warmth 리셋 이력 감사 로그 기록               |

### References

- [R5] Knapp, M. L. (1978). _Social Intercourse: From Greeting to Goodbye_. Allyn & Bacon.
- [R9] Bickmore, T., & Picard, R. W. (2005). Establishing and maintaining long-term human-computer relationships. _ACM Transactions on Computer-Human Interaction_, 12(2), 293–327.
- [R11] Smith, T. W., Bradbury, T. N., & Karney, B. R. (2025). Applying 50 years of relationship science to evaluate AI chatbot relationships. _PNAS_.
- [R12] Horton, D., & Wohl, R. R. (1956). Mass communication and para-social interaction. _Psychiatry_, 19(3), 215–229.
- [R13] Turkle, S. (2011). _Alone Together: Why We Expect More from Technology and Less from Each Other_. Basic Books.

---

## 3. 라포르 메트릭 도입

> **대응 설계**: `persona-engine-v4.md §4.2` (관계 프로토콜), `§9` (소셜 모듈)

### 3.1 현재 설계의 공백

v4.0 관계 프로토콜에서 관계 품질은 두 가지 수치로만 측정된다:

```
warmth   : 0.0 ~ 1.0  (친밀감)
tension  : 0.0 ~ 1.0  (갈등/긴장)
```

소셜 모듈 그래프 가중치 공식(`§9`)도 이 두 변수에만 의존한다:

```
weight = warmth × 0.5 + frequency × 0.3 + (1 - tension) × 0.2
```

이 구조는 두 가지 공백을 가진다:

1. **과정 지표 부재**: warmth는 결과(친밀도 도달)를 나타낼 뿐, 어떻게 그 친밀도가 형성되고 있는지(상호주의, 조율, 긍정성)를 측정하지 않는다.
2. **단일 차원 측정**: 라포르는 단일 연속 지표가 아니라 복수의 독립적 요소로 구성되므로, warmth 하나로는 구분할 수 없는 관계 패턴이 존재한다. 예: 높은 warmth지만 한쪽이 일방적으로 주도하는 비대칭 관계.

### 3.2 이론적 근거

#### Tickle-Degnen & Rosenthal의 라포르 3요소 모델 [R6]

Tickle-Degnen & Rosenthal(1990)은 라포르를 **3개의 독립 구성요소**로 분해한다:

| 요소                               | 정의                            | 관계 단계별 가중치      |
| ---------------------------------- | ------------------------------- | ----------------------- |
| **상호주의(Mutual Attentiveness)** | 상대에게 집중하고 참여하는 정도 | 초기 관계에서 가장 중요 |
| **긍정성(Positivity)**             | 따뜻함, 배려, 즐거움            | 모든 단계에서 중요      |
| **조율(Coordination)**             | 행동·템포·언어 스타일의 동기화  | 성숙한 관계에서 더 중요 |

핵심 발견: **관계 단계가 진행될수록 요소 간 가중치가 변화**한다. 초기엔 상호주의가, 성숙 관계에선 조율이 더 강하게 라포르를 결정한다.

→ DeepSight 적용: warmth 단일 값 대신, 관계 단계에 따라 가중치가 달라지는 3요소 합성 라포르 점수 도입.

#### Short, Williams & Christie의 Social Presence [R7]

Short et al.(1976)은 미디어를 통한 관계에서 **사회적 존재감(Social Presence)**이 상호작용 품질의 핵심 결정자임을 보였다. 사회적 존재감은 **친밀감(intimacy)**과 **즉시성(immediacy)**의 조합으로 측정된다.

→ DeepSight 적용: 반응 속도·참여 강도를 즉시성(immediacy) 신호로 해석하여 라포르 계산에 반영.

#### Biocca, Harms & Burgoon의 확장 Social Presence [R8]

Biocca et al.(2003)은 Social Presence를 세 층위로 확장한다:

| 층위                                   | 내용                              |
| -------------------------------------- | --------------------------------- |
| 공존감(Copresence)                     | 상대가 거기 있다는 지각           |
| 심리적 관여(Psychological Involvement) | 상대의 생각·감정·행동에 대한 주의 |
| 행동적 참여(Behavioral Engagement)     | 반응적이고 조율된 행동            |

→ DeepSight 적용: 행동적 참여를 조율 지표로 직접 매핑.

### 3.3 보강 방향: 3요소 합성 라포르 점수 (RapportScore)

기존 warmth를 **폐기하지 않고**, warmth를 긍정성 구성요소로 흡수하며, 상호주의·조율 두 요소를 신규 추가한다.

#### 3요소 정의 및 측정 방법

| 요소     | 변수명                | 측정 신호                                         |
| -------- | --------------------- | ------------------------------------------------- |
| 상호주의 | `mutualAttentiveness` | 인터랙션 응답률, 평균 응답 지연, 메시지 길이 균형 |
| 긍정성   | `positivity`          | 기존 warmth + 감정 분석(긍정 표현 빈도)           |
| 조율     | `coordination`        | 어휘 중복률(lexical alignment), 템포 동기화       |

#### RapportScore 합성 공식

관계 단계에 따른 동적 가중치 적용:

```typescript
function computeRapportScore(components: RapportComponents, stage: RelationshipStage): number {
  const weights = RAPPORT_WEIGHTS[stage]
  return (
    weights.mutualAttentiveness * components.mutualAttentiveness +
    weights.positivity * components.positivity +
    weights.coordination * components.coordination
  )
}

const RAPPORT_WEIGHTS: Record<RelationshipStage, RapportWeights> = {
  STRANGER: { mutualAttentiveness: 0.6, positivity: 0.3, coordination: 0.1 },
  ACQUAINTANCE: { mutualAttentiveness: 0.45, positivity: 0.35, coordination: 0.2 },
  FAMILIAR: { mutualAttentiveness: 0.3, positivity: 0.35, coordination: 0.35 },
  CLOSE: { mutualAttentiveness: 0.25, positivity: 0.3, coordination: 0.45 },
  COOLING: { mutualAttentiveness: 0.5, positivity: 0.4, coordination: 0.1 },
  DORMANT: { mutualAttentiveness: 0.7, positivity: 0.2, coordination: 0.1 },
}
```

### 3.4 타입 명세

```typescript
interface RapportComponents {
  mutualAttentiveness: number // 0.0 ~ 1.0
  positivity: number // 0.0 ~ 1.0  (기존 warmth 흡수)
  coordination: number // 0.0 ~ 1.0
}

interface RapportWeights {
  mutualAttentiveness: number
  positivity: number
  coordination: number
  // 합: 1.0
}

// 기존 PersonaRelationship에 추가되는 필드
interface RelationshipRapportExtension {
  rapportComponents: RapportComponents
  rapportScore: number // computeRapportScore 결과
  rapportUpdatedAt: Date
}
```

### 3.5 소셜 그래프 가중치 공식 업데이트

```
기존:
weight = warmth × 0.5 + frequency × 0.3 + (1 - tension) × 0.2

보강:
weight = rapportScore × 0.5 + frequency × 0.3 + (1 - tension) × 0.2
```

rapportScore가 warmth(positivity)를 포함하므로 기존 의미를 보존하면서 정밀도를 높인다.

### 3.6 기존 설계와의 통합 지점

| 통합 대상                  | 변경 내용                                                    |
| -------------------------- | ------------------------------------------------------------ |
| `PersonaRelationship` (DB) | `rapportComponents` JSON 컬럼 추가, `rapportScore` 컬럼 추가 |
| 소셜 그래프 가중치 (`§9`)  | `weight` 공식의 warmth → rapportScore 교체                   |
| 관계 단계 전환 조건 (`§2`) | 발전 조건의 warmth 임계값을 rapportScore로 대체 가능         |
| 아레나 심판 (`§7.3`)       | interactionQuality 평가 시 coordination 요소 반영 권장       |

### References

- [R6] Tickle-Degnen, L., & Rosenthal, R. (1990). The nature of rapport and its nonverbal correlates. _Psychological Inquiry_, 1(4), 285–293.
- [R7] Short, J., Williams, E., & Christie, B. (1976). _The Social Psychology of Telecommunications_. Wiley.
- [R8] Biocca, F., Harms, C., & Burgoon, J. K. (2003). Toward a more robust theory and measure of social presence. _Presence_, 12(5), 456–480.

---

## 4. 매칭 알고리즘의 신뢰 신호

> **대응 설계**: `persona-engine-v4.md §12` (매칭 알고리즘)

### 4.1 현재 설계의 공백

v4.0 매칭 알고리즘의 Basic Tier(60%)는 다음 수식으로 작동한다:

```
Basic Score = V_Final 코사인 유사도(70%) + Cross-Axis 프로필(30%)
```

**공통 공백**: 두 Tier 모두 **정적 벡터 유사도**에만 의존하며, 실제 인터랙션을 통해 축적된 **관계 신뢰(trust)**가 매칭 점수에 반영되지 않는다.

결과적으로:

- 벡터가 유사해도 실제 인터랙션에서 갈등이 잦은 페르소나 쌍이 계속 상위 매칭됨
- 장기 인터랙션을 통해 신뢰가 검증된 관계가 벡터 미스매치로 하위 매칭됨

### 4.2 이론적 근거

#### Golbeck — FilmTrust [R1]

Golbeck(2006)은 소셜 네트워크의 명시적 신뢰 관계를 협업 필터링에 통합하여, **평균에서 크게 벗어난 취향을 가진 사용자**에서 순수 CF 대비 MAE를 유의미하게 감소시킴을 보였다.

→ 벡터 유사도(CF 역할)만으로는 포착하기 어려운 관계 패턴을 신뢰 신호로 보완.

#### Massa & Avesani — TARS [R2]

Massa & Avesani(2007)는 신뢰 메트릭을 유사도 가중치의 대체재로 사용하여 **cold-start 사용자**에서도 정확도와 커버리지를 동시에 향상시켰다.

→ 신규 유저(인터랙션 이력 없음)와 기존 유저를 다르게 처리하는 신뢰 기반 라우팅.

#### Tkalcic & Chen — Big Five + 추천 [R3]

Big Five 성격은 **도메인 독립적**이며 협업 필터링의 cold-start 문제를 완화하는 데 효과적이다. L2(OCEAN) 유사도는 인터랙션 이력이 없을 때 가장 안정적인 예측변수다.

#### Hu & Pu — 성격 벡터 CF 강화 [R4]

성격 벡터 코사인 유사도로 CF를 강화했을 때, 특히 **공개 선호가 적은 아이템**(롱테일)에서 정확도 향상을 실증했다.

### 4.3 보강 방향: 신뢰 가중 매칭 점수

#### Trust Score 합성

```typescript
function computeTrustScore(history: InteractionHistory): number {
  const persistence = clamp(history.totalSessions / 30, 0, 1)
  const resolution = history.conflictResolutionRate
  const depthTrend = clamp(history.engagementDepthSlope, 0, 1)

  return 0.4 * persistence + 0.35 * resolution + 0.25 * depthTrend
}
```

#### 매칭 점수 통합

```
TrustWeightedScore = (1 - λ) × VectorScore + λ × TrustScore

λ = min(0.30, 0.05 × log(1 + totalSessions))
```

- 인터랙션 없음(totalSessions=0): λ=0 → 순수 벡터 유사도
- 10세션: λ≈0.115
- 30세션+: λ=0.30 (상한)

### 4.4 Cold-Start 처리

신규 유저는 L2(OCEAN) 유사도를 신뢰 신호의 대리 지표(proxy)로 활용:

```
ColdStartScore = L2 코사인 유사도(60%) + L1 코사인 유사도(40%)
```

첫 3회 인터랙션 이후부터 실제 TrustScore 계산 시작.

### 4.5 타입 명세

```typescript
interface InteractionHistory {
  totalSessions: number
  conflictResolutionRate: number // tension 급등 후 warmth 회복 비율
  engagementDepthSlope: number // 참여 심화율 (메시지 길이 추이)
}

interface TrustWeightedMatchScore {
  vectorScore: number
  trustScore: number
  lambda: number
  final: number
}
```

### 4.6 기존 설계와의 통합 지점

| 통합 대상                          | 변경 내용                                                         |
| ---------------------------------- | ----------------------------------------------------------------- |
| 매칭 알고리즘 Basic Tier (`§12.1`) | `TrustWeightedScore` 적용                                         |
| 소셜 모듈 통합 (`§12.3`)           | warmth 부스트 → rapportScore 부스트로 정렬                        |
| `PersonaRelationship` (DB)         | `trustScore`, `totalSessions`, `conflictResolutionRate` 필드 추가 |

### References

- [R1] Golbeck, J. (2006). Generating predictive movie recommendations from trust in social networks. In _iTrust 2006_, LNCS 3986, 93–104.
- [R2] Massa, P., & Avesani, P. (2007). Trust-aware recommender systems. In _RecSys 2007_, 17–24.
- [R3] Tkalcic, M., & Chen, L. (2015). Personality and recommender systems. In _Recommender Systems Handbook_ (2nd ed.), 715–739.
- [R4] Hu, R., & Pu, P. (2011). Enhancing collaborative filtering systems with personality information. In _RecSys 2011_, 197–204.

---

## 5. 성격 벡터의 이론적 정당성

> **대응 설계**: `persona-engine-v4.md §3` (3-Layer Orthogonal Vector System)

### 5.1 현재 설계의 공백

v4.0의 3-Layer 벡터 구조:

| 레이어                | 차원     | 심리학적 근거 명시 여부 |
| --------------------- | -------- | ----------------------- |
| L1 (Social Persona)   | 7D       | **미명시**              |
| L2 (Core Temperament) | 5D OCEAN | Big Five — 명시         |
| L3 (Narrative Drive)  | 4D       | **미명시**              |

**공백**: L1과 L3의 차원 선정 근거가 설계서에 명시되어 있지 않다. 이는:

1. 차원 간 직교성(orthogonality) 보장 여부 불명확 → 중복 측정 가능성
2. 향후 차원 추가/변경 시 이론적 기준 부재

### 5.2 이론적 근거

#### PersonaLLM — LLM의 Big Five 표현 [R17]

Jiang et al.(2023)은 LLM이 Big Five 성격을 **일관되게 표현**할 수 있음을 실증했다 (큰 효과크기, Cohen's d > 0.8). 특히 외향성(E)과 친화성(A)에서 가장 명확한 표현이 관찰됐다.

→ L2 OCEAN이 LLM 기반 페르소나 생성에서도 신뢰할 수 있는 제어 변수임을 확인.

#### Anthropic — Persona Vectors [R22]

Anthropic(2025)은 Claude의 활성화 공간에서 성격 특성 방향(steering vector)을 추출하는 데 성공했으며, 추출된 특성 방향이 Big Five 차원과 높은 상관관계를 보임을 확인.

→ LLM 내부 표현 공간에서 성격 차원이 실제로 분리 가능하다는 해석가능성 증거.

#### Frisch & Giulianelli — 성격 조건화 에이전트 [R18]

성격 조건화 에이전트 간 **언어 정렬(lexical alignment)** 측정을 통해 일관성을 정량화. 어휘 중복률이 성격 일관성의 유효한 프록시임을 발견.

### 5.3 L1 차원의 이론적 매핑

| L1 차원       | 대응 구성개념                          | 출처                    |
| ------------- | -------------------------------------- | ----------------------- |
| `depth`       | Need for Cognition (NfC)               | Cacioppo & Petty, 1982  |
| `lens`        | Thinking-Feeling (T-F)                 | Myers, 1962             |
| `stance`      | Dispositional Skepticism               | Tobacyk & Milford, 1983 |
| `scope`       | Focus of Attention — Detail vs Gestalt | Navon, 1977             |
| `taste`       | Sensation Seeking (openness 하위)      | Zuckerman, 1979         |
| `purpose`     | Intrinsic vs Extrinsic Motivation      | Deci & Ryan, 1985       |
| `sociability` | Introversion-Extraversion (Big Five E) | Costa & McCrae, 1992    |

> **주의**: `sociability`(L1)와 `extraversion`(L2)은 동일한 Big Five E 차원에서 파생되지만 **측정 수준이 다르다**. L1 sociability는 관찰 가능한 공개적 사회성이고, L2 extraversion은 내재적 기질(압박 시 드러남)이다. 두 값이 다를 수 있는 것(내향 기질이지만 직업상 외향적으로 행동)이 오히려 페르소나의 깊이를 만든다.

### 5.4 L3 차원의 이론적 매핑

| L3 차원        | 대응 구성개념                           | 출처                      |
| -------------- | --------------------------------------- | ------------------------- |
| `lack`         | 결핍 동기 (D-needs)                     | Maslow, 1943              |
| `moralCompass` | Moral Foundations Theory — 규칙 vs 결과 | Haidt, 2012               |
| `volatility`   | 정서 불안정성 / BIS 민감도              | Gray, 1982                |
| `growthArc`    | 성장 동기 (B-needs) / Growth Mindset    | Maslow, 1943; Dweck, 2006 |

> `volatility`(L3)와 `neuroticism`(L2): volatility는 서사적 행동 패턴의 시간적 불안정성(스토리 차원), neuroticism은 기질적 정서 반응성(기질 차원)으로 구분된다.

### 5.5 직교성 검증 방안

```typescript
interface OrthogonalityReport {
  layerPair: "L1xL2" | "L1xL3" | "L2xL3"
  correlationMatrix: number[][]
  maxCorrelation: number // 목표: < 0.30
  problematicPairs: Array<{ dim1: string; dim2: string; r: number }>
}
```

**기준**: 동일 레이어 내 `|r| < 0.30` → 실질적 독립성 확보.
**교차 레이어**: sociability(L1) ↔ extraversion(L2)처럼 이론적 관련성이 있는 쌍은 중복이 아닌 **의도된 상호작용**으로 문서화.

### 5.6 기존 설계와의 통합 지점

| 통합 대상                | 변경 내용                                                 |
| ------------------------ | --------------------------------------------------------- |
| 설계서 §3                | 각 차원에 대응 구성개념 및 참고문헌 명시 (코드 변경 없음) |
| 인큐베이터 UI            | 차원 설명 툴팁에 이론적 의미 추가                         |
| Auto-Interview (`§13.1`) | 문항을 이론적 차원에 정렬                                 |

### References

- [R17] Jiang, H., et al. (2023). PersonaLLM: Investigating the ability of large language models to express personality traits. _arXiv:2305.02547_.
- [R18] Frisch, I., & Giulianelli, M. (2024). LLM agents in interaction: Measuring personality consistency and linguistic adaptation in collaborative tasks. _arXiv:2402.02764_.
- [R22] Anthropic. (2025). _Persona Vectors: Extracting and steering personality in Claude_. Anthropic Research.

---

## 6. 공감/사회적 지능 평가

> **대응 설계**: `persona-engine-v4.md §7.3` (심판 시스템), `§13` (품질 피드백 루프)

### 6.1 현재 설계의 공백

v4.0 아레나 심판 4차원:

| 차원               | 가중치 | 평가 내용              |
| ------------------ | ------ | ---------------------- |
| voiceConsistency   | 0.30   | 보이스 스펙 준수       |
| factbookAccuracy   | 0.25   | 팩트북 일치            |
| characterDepth     | 0.25   | 캐릭터 깊이와 일관성   |
| interactionQuality | 0.20   | 대화 품질과 자연스러움 |

**공백**: 4개 차원 모두 **페르소나 내부 일관성**을 측정하며, **사회적 상호작용 능력** — 공감, 맥락 파악, 적절한 사회적 반응 — 을 직접 평가하지 않는다.

### 6.2 이론적 근거

#### Zhou et al. — SOTOPIA [R14]

SOTOPIA 프레임워크의 소셜 지능 평가 차원:

| 차원          | 설명                              |
| ------------- | --------------------------------- |
| Believability | 페르소나가 일관되고 믿을 만한가   |
| Relationship  | 관계 개선/유지에 기여하는가       |
| Knowledge     | 상대방의 지식과 의도를 파악하는가 |
| Social Rules  | 사회적 규범과 에티켓을 준수하는가 |
| Overall Score | 종합 소셜 지능                    |

GPT-4를 포함한 최신 LLM이 전략적 소통과 목표 달성에서 인간에 미달함을 실증. → Believability·Relationship·Social Rules 3개 차원을 아레나 심판에 통합.

#### Sorin et al. — LLM 공감 리뷰 [R15]

ChatGPT가 78.6%의 사례에서 인간 의사보다 공감적으로 평가됨을 확인. 동시에, **표면적 공감 표현과 실질적 공감 이해 사이의 괴리**를 경고.

→ 표면적 공감 표현(키워드 빈도)보다 맥락 적합성(contextual appropriateness) 측정 우선.

#### Lee et al. — LLM 공감 지각 [R16]

**공감이 과도할 때**(무비판적 동조) 오히려 신뢰를 손상시킬 수 있음을 지적.

→ 공감 점수에 **상한 패널티** 도입 — 과도하게 긍정적일 때 감점.

### 6.3 보강 방향: 심판 평가 차원 확장

#### 가중치 재배분

| 차원                     | 기존 가중치 | 보강 가중치 |
| ------------------------ | ----------- | ----------- |
| voiceConsistency         | 0.30        | 0.25        |
| factbookAccuracy         | 0.25        | 0.22        |
| characterDepth           | 0.25        | 0.23        |
| interactionQuality       | 0.20        | 0.18        |
| **empathicIntelligence** | —           | **0.12**    |

#### empathicIntelligence 세부 평가 기준

```typescript
interface EmpathicIntelligenceScore {
  contextualAppropriateness: number // 감정적 맥락에 맞는 반응 (0~1)
  perspectiveTaking: number // 상대방 관점 반영 여부 (0~1)
  socialRuleAdherence: number // 사회적 규범 준수 (0~1)
  empathyCalibration: number // 과도한 동조 패널티 반영 (0~1)
  score: number // 4항목 평균
}
```

### 6.4 Auto-Interview 문항 보강 (E1~E6)

| 번호 | 측정 차원                  | 문항 (예시)                                      |
| ---- | -------------------------- | ------------------------------------------------ |
| E1   | Believability              | 이 페르소나의 반응이 설정과 일관되게 느껴지는가? |
| E2   | Perspective Taking         | 상대방의 감정/상황을 페르소나가 인식하고 있는가? |
| E3   | Social Rules               | 대화에서 사회적 에티켓을 준수하는가?             |
| E4   | Contextual Appropriateness | 감정적 맥락에 맞는 반응을 하는가?                |
| E5   | Empathy Calibration        | 공감이 과도하게 무비판적이지 않은가?             |
| E6   | Relationship Contribution  | 이 인터랙션이 관계에 긍정적으로 기여하는가?      |

### 6.5 기존 설계와의 통합 지점

| 통합 대상                         | 변경 내용                                             |
| --------------------------------- | ----------------------------------------------------- |
| 아레나 심판 (`§7.3`)              | `empathicIntelligence` 추가, 가중치 재배분            |
| Auto-Interview (`§13.1`)          | E1~E6 문항 추가 (20항 → 26항)                         |
| Persona Integrity Score (`§13.2`) | `interactionQuality` 채점 시 empathy calibration 반영 |

### References

- [R14] Zhou, X., et al. (2024). SOTOPIA: Interactive evaluation for social intelligence in language models. _ICLR 2024_.
- [R15] Sorin, V., et al. (2024). Large language model (ChatGPT) as a support tool for breast tumor board. _npj Breast Cancer_.
- [R16] Lee, Y. C., et al. (2024). Can large language models be empathetic? Investigating the perceived empathy of GPT-4, Llama2, and Mistral. _arXiv:2403.05572_.

---

## 7. 출력 다양성 & 성격 일관성

> **대응 설계**: `persona-engine-v4.md §4.3` (보이스 스펙), `§13` (품질 피드백 루프)

### 7.1 현재 설계의 공백

v4.0의 성격 일관성 메커니즘:

- **Voice Anchor**: 최근 포스트/댓글 few-shot → 일관성 유지
- **가드레일**: 격식도/공격성 min-max 범위 유지
- **Persona Integrity Score**: 3요소 LLM 평가

**공백 1 — 반복성 방지 없음**: 동일 패턴이 반복되면 인터랙션 동기 저하(habituation) [R9]에 대한 메커니즘 없음.

**공백 2 — 언어 정렬 미측정**: Frisch & Giulianelli [R18]의 lexical alignment 측정이 Integrity Score에 반영되지 않음.

**공백 3 — 다양성-일관성 트레이드오프 미설계**: 다양성을 높이면 일관성이 떨어지는 구조적 긴장이 명시적으로 관리되지 않음.

### 7.2 이론적 근거

#### Bickmore & Picard — 반복성 저해 [R9]

**동일한 인터랙션 패턴이 반복되면 관계 동기가 저하**됨을 실험적으로 확인. → 반복 탐지 및 다양성 주입 메커니즘 설계의 이론적 근거.

#### Frisch & Giulianelli — 언어 정렬 [R18]

어휘 중복률(lexical alignment)이 성격 일관성의 유효한 프록시. 과도한 정렬은 창의성·다양성 저하와 상관됨을 발견. → 최적 범위(target band) 설정 필요.

#### Chen et al. — Two Tales of Persona [R19]

**성격 일관성 유지가 LLM 페르소나의 핵심 미해결 과제**. 특히 장기 대화에서 초기 성격 설정이 희석되는 **persona drift** 문제. → Drift 감지 + 재앵커링(re-anchoring) 메커니즘 필요.

#### Anthropic — The Assistant Axis [R23]

캐릭터 정체성을 활성화 공간의 안정적 방향으로 고정하는 것이 일관성 유지의 핵심. → VoiceSpec의 핵심 파라미터를 시스템 프롬프트 앵커로 명시적으로 고정.

### 7.3 보강 방향 1: 다양성 점수 (DiversityScore)

```typescript
interface DiversityMetrics {
  ngramOverlapRate: number // 최근 10개 출력 간 trigram 중복률 (낮을수록 다양)
  templateUsageRate: number // 고정 문구/패턴 사용 빈도 (낮을수록 다양)
  sentimentVariance: number // 감정 표현 분산 (높을수록 다양)
  topicCoverageScore: number // 다룬 주제 범위 (높을수록 다양)
}
// DiversityScore = 4 지표 가중 평균, 목표 > 0.6
```

**개입 트리거**:

```
DiversityScore < 0.4  → 경고 (Arena 검토 대상 플래그)
DiversityScore < 0.3  → 다양성 주입 프롬프트 활성화
```

### 7.4 보강 방향 2: 언어 정렬 기반 일관성 측정

```typescript
interface LexicalAlignmentMetrics {
  coreVocabularyConsistency: number // 핵심 어휘(VoiceProfile 기반) 사용률
  stylemarkerStability: number // 말버릇/습관 표현 출현율
  registerConsistency: number // 격식도 수준 분산 (낮을수록 일관)
}
// LexicalAlignmentScore = 3 지표 평균, 목표 > 0.7
```

**Persona Integrity Score 확장**:

```
기존:
PersonaIntegrityScore = 0.35 × ContextRecall
                      + 0.35 × SettingConsistency
                      + 0.30 × CharacterStability

보강:
PersonaIntegrityScore = 0.30 × ContextRecall
                      + 0.28 × SettingConsistency
                      + 0.27 × CharacterStability
                      + 0.15 × LexicalAlignmentScore
```

### 7.5 보강 방향 3: Persona Drift 감지

```typescript
function computePersonaDrift(
  current: VoiceStyleParams,
  baseline: VoiceStyleParams // 생성 시 최초 설정값
): number {
  const params = Object.keys(baseline) as (keyof VoiceStyleParams)[]
  const totalDelta = params.reduce((sum, key) => sum + Math.abs(current[key] - baseline[key]), 0)
  return totalDelta / params.length
}
```

**임계값**:

```
drift < 0.1   → 정상
drift 0.1~0.2 → 경고 (Arena 재교정 권고)
drift > 0.2   → 자동 재앵커링 (VoiceSpec 기준값으로 soft reset)
```

### 7.6 다양성-일관성 균형 지표

```
BalanceScore = min(DiversityScore / 0.6, 1.0)
             × min(LexicalAlignmentScore / 0.7, 1.0)
목표: BalanceScore > 0.70
```

Arena 스케줄링 시 BalanceScore가 낮은 페르소나 우선 교정.

### 7.7 기존 설계와의 통합 지점

| 통합 대상                         | 변경 내용                                           |
| --------------------------------- | --------------------------------------------------- |
| Persona Integrity Score (`§13.2`) | `LexicalAlignmentScore` 4번째 구성요소로 추가       |
| 아레나 교정 루프 (`§7.4`)         | DiversityScore < 임계값 시 교정 트리거 추가         |
| 보이스 스펙 (`§4.3`)              | `baselineVoiceParams` 최초 스냅샷 저장 필드 추가    |
| 인큐베이터 대시보드               | DiversityScore + PersonaDrift 지표 시각화 패널 추가 |

### References

- [R9] Bickmore, T., & Picard, R. W. (2005). Establishing and maintaining long-term human-computer relationships. _ACM Transactions on Computer-Human Interaction_, 12(2), 293–327.
- [R18] Frisch, I., & Giulianelli, M. (2024). LLM agents in interaction: Measuring personality consistency and linguistic adaptation in collaborative tasks. _arXiv:2402.02764_.
- [R19] Chen, J., et al. (2024). Two tales of persona in LLMs: A survey of role-playing and personalization. _arXiv:2406.01171_.
- [R23] Anthropic. (2026). _The Assistant Axis: Structural positioning of LLM character_. Anthropic Research.

---

## 8. 종합 로드맵

### 8.1 보강 제안 요약

| §   | 영역          | 핵심 제안                                        | 구현 복잡도 | 임팩트  |
| --- | ------------- | ------------------------------------------------ | ----------- | ------- |
| §2  | 관계 모델     | 6단계 양방향 모델 (COOLING/DORMANT + 재활성화)   | 중          | 높음    |
| §3  | 라포르 메트릭 | 3요소 RapportScore (상호주의/긍정성/조율)        | 중          | 높음    |
| §4  | 매칭 신뢰     | Trust-Weighted Matching (λ 동적 가중)            | 중          | 중-높음 |
| §5  | 벡터 이론     | L1/L3 차원 심리학 매핑 문서화                    | 낮음        | 중      |
| §6  | 공감 평가     | 아레나 empathicIntelligence 차원 + E1~E6 문항    | 중          | 높음    |
| §7  | 출력 품질     | DiversityScore + LexicalAlignment + PersonaDrift | 높음        | 높음    |

### 8.2 구현 우선순위 로드맵

#### Phase 1 — 이론 기반 확보 (비용 최소, 즉시 적용 가능)

> 코드 변경 없이 문서 수준에서 해결 가능

| 작업                                  | 대상                         |
| ------------------------------------- | ---------------------------- |
| L1/L3 차원 심리학 매핑 명시           | `persona-engine-v4.md §3`    |
| Auto-Interview 문항 E1~E6 추가 정의   | `persona-engine-v4.md §13.1` |
| 관계 모델 COOLING/DORMANT 설계서 반영 | `persona-engine-v4.md §4.2`  |

#### Phase 2 — 관계·라포르 인프라 (DB 스키마 변경 포함)

| 작업                                                     | 관련 § |
| -------------------------------------------------------- | ------ |
| RelationshipStage COOLING/DORMANT 추가 + warmth 감쇠     | §2     |
| RapportComponents DB 컬럼 + computeRapportScore()        | §3     |
| 소셜 그래프 weight 공식 업데이트 (warmth → rapportScore) | §3     |

#### Phase 3 — 매칭 고도화 (알고리즘 레이어)

| 작업                         | 관련 § |
| ---------------------------- | ------ |
| TrustScore 계산기 구현       | §4     |
| TrustWeightedScore 매칭 통합 | §4     |
| Cold-start L2 우선 매칭 분기 | §4     |

#### Phase 4 — 품질 루프 강화 (Arena + Integrity)

| 작업                                              | 관련 § |
| ------------------------------------------------- | ------ |
| 아레나 심판 empathicIntelligence 차원 추가        | §6     |
| DiversityMetrics 계산 파이프라인                  | §7     |
| LexicalAlignmentScore 구현 + Integrity Score 통합 | §7     |
| PersonaDrift 감지 + 재앵커링 트리거               | §7     |

### 8.3 기존 v4.0 설계와의 호환성

모든 보강 제안은 다음 원칙을 준수하여 **하위 호환성**을 보장한다:

1. **기존 필드 삭제 없음**: warmth, tension 등 기존 값 유지, 신규 필드 추가
2. **단계적 활성화**: Phase별로 독립 배포 가능
3. **Graceful Degradation**: Trust/Rapport 계산 실패 시 기존 벡터 유사도만으로 fallback
4. **테스트 우선**: 각 Phase 완료 시 기존 테스트 PASS 후 완료 처리

### 8.4 검증 지표

| 지표                      | 목표값            | 측정 방법                              |
| ------------------------- | ----------------- | -------------------------------------- |
| Persona Integrity Score   | ≥ 0.85            | Auto-Interview + LexicalAlignment      |
| BalanceScore              | ≥ 0.70            | DiversityScore × LexicalAlignmentScore |
| PersonaDrift              | < 0.10            | VoiceStyleParams 편차                  |
| TrustWeighted 매칭 정확도 | CF 대비 ≥ 5% 개선 | A/B 테스트 (30세션+ 서브셋)            |
| empathicIntelligence 점수 | ≥ 0.75            | 아레나 심판 신규 차원                  |

### 8.5 연구 미해결 과제

1. **라포르 요소 가중치 최적화**: RAPPORT_WEIGHTS 값은 [R6]의 정성적 기술에서 추론한 것으로, DeepSight 도메인에 맞는 실증적 교정 필요.
2. **신뢰 λ 상한값**: 30% 상한은 보수적 선택이며, 실제 인터랙션 데이터 기반 최적화 필요.
3. **공감 과잉 판별**: empathy calibration 패널티의 임계값은 도메인별로 달라지며, 자동화된 기준 정립이 어려움.
4. **LLM 성격 드리프트의 원인**: persona drift의 근본 원인이 프롬프트 설계인지 모델 내부 표현인지 미확정. [R23] 후속 연구 모니터링 필요.

---

_문서 종료. 다음 단계: Phase 1 적용 → `persona-engine-v4.md` §3 / §4.2 / §13.1 업데이트._
