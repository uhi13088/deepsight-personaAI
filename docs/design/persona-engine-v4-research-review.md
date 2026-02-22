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

| 영역 | 강점 | 설계서 참조 |
|------|------|-------------|
| 벡터 시스템 | 3-Layer 106D+ 직교 벡터로 성격의 다면성 표현 | §3 |
| 보안 | 입력→처리→출력 3계층 독립 방어 | §5 |
| 기억 | Ebbinghaus 기반 망각 곡선 + Poignancy 가중 | §6 |
| 자기교정 | 아레나 스파링 → 심판 → 자동 패치 루프 | §7 |
| 캐릭터 정체성 | Instruction/Memory 물리적 분리로 불변성 보장 | §8 |

반면, 다음 영역에서 학술적 근거가 부족하거나 설계 공백이 존재한다:

| 영역 | 부족한 점 | 본 문서 § |
|------|----------|-----------|
| 관계 모델 | 4단계 단방향 발전만 존재, 쇠퇴/퇴행 경로 없음 | §2 |
| 라포르 측정 | warmth/tension만으로 관계 품질을 측정, 과정 지표 없음 | §3 |
| 매칭 신뢰 | 벡터 유사도만 사용, 축적된 인터랙션 신뢰 미반영 | §4 |
| 벡터 이론 | L1(7D), L3(4D) 차원 선정의 심리학적 근거 미명시 | §5 |
| 품질 평가 | 아레나 심판에 공감/사회적 지능 차원 없음 | §6 |
| 출력 품질 | 반복성 방지 메커니즘 없음, 성격 일관성 검증 약함 | §7 |

### 1.3 분석 대상 연구

본 문서에서 참조하는 연구를 **영역별**로 분류한다.

#### 추천 시스템 + 성격 심리학

| # | 논문 | 연도 | 핵심 기여 |
|---|------|------|----------|
| R1 | Golbeck — FilmTrust | 2006 | 소셜 네트워크 신뢰 기반 영화 추천. 의견이 평균에서 벗어난 유저에서 CF 대비 우수 |
| R2 | Massa & Avesani — TARS | 2007 | 신뢰 메트릭으로 유사도 가중치 대체. cold-start 유저에서 정확도+커버리지 동시 향상 |
| R3 | Tkalcic & Chen | 2015 | Big Five 성격과 추천 시스템 통합 서베이. 성격=도메인 독립적 유저 프로필 |
| R4 | Hu & Pu | 2011 | 성격 벡터 코사인 유사도로 CF 강화. 성격-장르 선호 상관관계 실증 |

#### 관계 발전 + 라포르

| # | 논문 | 연도 | 핵심 기여 |
|---|------|------|----------|
| R5 | Knapp — Relational Development Model | 1978 | 관계 10단계 모델 (발전 5 + 쇠퇴 5) |
| R6 | Tickle-Degnen & Rosenthal | 1990 | 라포르 3요소: 상호주의, 긍정성, 조율. 관계 단계별 가중치 변화 |
| R7 | Short, Williams & Christie — Social Presence | 1976 | 사회적 존재감 = 친밀감 + 즉시성 |
| R8 | Biocca, Harms & Burgoon | 2003 | 확장 Social Presence: 공존감, 심리적 관여, 행동적 참여 |

#### AI 에이전트 + 준사회적 관계

| # | 논문 | 연도 | 핵심 기여 |
|---|------|------|----------|
| R9 | Bickmore & Picard | 2005 | 관계적 에이전트: 연속성+공감+사회적 대화가 신뢰 증가. 반복성은 동기 저해 |
| R10 | Tukachinsky et al. — PSR 메타분석 | 2020 | 120개 연구 분석. 유사성(homophily)이 준사회적 관계의 최강 예측변수 |
| R11 | Smith, Bradbury & Karney | 2025 | 50년 관계 과학으로 AI 챗봇 평가. 일부 관계 특성 있으나 한계 존재 |
| R12 | Horton & Wohl | 1956 | "준사회적 상호작용" 원조 개념 정립 |
| R13 | Turkle — Alone Together | 2011 | AI 시뮬레이션 친밀감의 윤리적 경고 |

#### LLM 사회성 + 성격 일관성

| # | 논문 | 연도 | 핵심 기여 |
|---|------|------|----------|
| R14 | Zhou et al. — SOTOPIA | 2024 | 소셜 지능 벤치마크. GPT-4도 전략적 소통에서 인간 미달 |
| R15 | Sorin et al. — LLM 공감 리뷰 | 2024 | ChatGPT가 78.6%에서 인간 의사보다 공감적으로 평가됨 |
| R16 | Lee et al. — LLM 공감 지각 | 2024 | GPT-4/Llama2/Mistral 모두 인간보다 공감적으로 지각됨 |
| R17 | Jiang et al. — PersonaLLM | 2023 | LLM이 Big Five 성격을 일관되게 표현 가능 (큰 효과크기) |
| R18 | Frisch & Giulianelli | 2024 | 성격 조건화 에이전트 간 일관성 차이 + 언어 정렬 측정 |
| R19 | Chen et al. — Two Tales of Persona | 2024 | LLM 역할극+개인화 통합 서베이. 일관성 유지가 핵심 과제 |

#### Anthropic 해석가능성

| # | 논문 | 연도 | 핵심 기여 |
|---|------|------|----------|
| R20 | Anthropic — Claude's Character | 2024 | Character training = 정렬 목표. Constitutional AI 변형 |
| R21 | Anthropic — Scaling Monosemanticity | 2024 | Sparse autoencoder로 수백만 해석 가능 특징 추출 |
| R22 | Anthropic — Persona Vectors | 2025 | 활성화 공간에서 성격 특성 방향 추출 + 조향(steering) |
| R23 | Anthropic — The Assistant Axis | 2026 | LLM 캐릭터의 구조적 위치 및 안정화 |

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

| 방향 | 단계 | 특징 |
|------|------|------|
| 접근 (Coming Together) | Initiating → Experimenting → Intensifying → Integrating → Bonding | 점진적 자기노출, 의존도 증가 |
| 이탈 (Coming Apart) | Differentiating → Circumscribing → Stagnating → Avoiding → Terminating | 거리감 증가, 소통 감소 |

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

| 단계 | 설명 | 행동 프로토콜 |
|------|------|--------------|
| STRANGER | 첫 접촉 또는 재활성화 전 | 격식 only, 자기노출 없음 |
| ACQUAINTANCE | 초기 교류 | 약간 캐주얼, 표면적 자기노출 |
| FAMILIAR | 반복적 관계 | 자유로운 톤, 개인적 자기노출 |
| CLOSE | 깊은 친밀감 | 매우 친밀, 깊은 자기노출 |
| COOLING *(신규)* | 비활성 또는 갈등으로 거리감 발생 | 격식으로 회귀, 자기노출 감소 |
| DORMANT *(신규)* | 장기 비활성 — 사실상 휴면 | 격식 only, 자기노출 없음 |

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
  | 'STRANGER'
  | 'ACQUAINTANCE'
  | 'FAMILIAR'
  | 'CLOSE'
  | 'COOLING'   // 신규
  | 'DORMANT'   // 신규

interface RelationshipDecayConfig {
  inactivityDaysForCooling: number   // 기본: 14
  inactivityDaysForDormant: number   // 기본: 60
  warmthDecayRate: number            // 기본: 0.02 (일별)
  tensionThresholdForCooling: number // 기본: 0.8
}

interface StageTransition {
  from: RelationshipStage
  to: RelationshipStage
  at: Date
  trigger: 'warmth_threshold' | 'inactivity' | 'tension_peak' | 'reactivation'
}

// 기존 PersonaRelationship에 추가되는 필드
interface RelationshipHistory {
  peakStage: RelationshipStage     // 역대 최고 단계
  peakWarmth: number               // 역대 최고 warmth
  lastInteractionAt: Date          // 마지막 인터랙션 시각
  inactivityDays: number           // 현재 비활성 일수 (주기적 계산)
  stageTransitions: StageTransition[] // 단계 전환 이력
}
```

### 2.7 행동 프로토콜 확장

기존 4단계 테이블에 COOLING/DORMANT 행을 추가한다:

| 속성 | STRANGER | ACQUAINTANCE | FAMILIAR | CLOSE | COOLING | DORMANT |
|------|----------|--------------|----------|-------|---------|---------|
| 톤 허용 | 격식 only | 약간 캐주얼 | 자유 | 매우 친밀 | 격식으로 회귀 | 격식 only |
| 자기노출 | 없음 | 표면적 | 개인적 | 깊은 | 줄어듦 | 없음 |
| 논쟁 의지 | 회피 | 조심스럽게 | 직접적 | 격렬 가능 | 회피 | 회피 |
| 재접촉 언급 | — | — | — | — | 선택적 | **공백 언급** [R9] |

> **DORMANT 재접촉 시 권장 행동**: Bickmore & Picard [R9]의 연구에 따라, 장기 공백 후 재접촉 시 페르소나가 자연스럽게 부재를 인지하고 언급하는 것이 신뢰 회복에 효과적이다.

### 2.8 기존 설계와의 통합 지점

| 통합 대상 | 변경 내용 |
|----------|----------|
| `PersonaRelationship` (DB) | `stage` 컬럼에 `COOLING`, `DORMANT` 값 추가, `RelationshipHistory` 필드 추가 |
| 감정 전염 (`§10`) | COOLING/DORMANT 관계는 전파 가중치 0.1× 이하 적용 |
| 소셜 모듈 그래프 (`§9`) | DORMANT 엣지를 약엣지(weak edge)로 분류, betweenness 계산 제외 |
| Integrity Monitor (`§5.2`) | DORMANT → ACQUAINTANCE 전환 시 warmth 리셋 이력 감사 로그 기록 |

### References

- [R5] Knapp, M. L. (1978). *Social Intercourse: From Greeting to Goodbye*. Allyn & Bacon.
- [R9] Bickmore, T., & Picard, R. W. (2005). Establishing and maintaining long-term human-computer relationships. *ACM Transactions on Computer-Human Interaction*, 12(2), 293–327.
- [R11] Smith, T. W., Bradbury, T. N., & Karney, B. R. (2025). Applying 50 years of relationship science to evaluate AI chatbot relationships. *PNAS*.
- [R12] Horton, D., & Wohl, R. R. (1956). Mass communication and para-social interaction. *Psychiatry*, 19(3), 215–229.
- [R13] Turkle, S. (2011). *Alone Together: Why We Expect More from Technology and Less from Each Other*. Basic Books.
