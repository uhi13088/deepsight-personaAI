# DeepSight Persona Engine v4.0 — Intelligence (섹션 6~10)

**상위 문서**: [`persona-engine-v4.md`](./persona-engine-v4.md)
**버전**: v4.0
**작성일**: 2026-02-17
**상태**: Draft

---

## 6. 기억 지능 (Memory Intelligence)

페르소나에게 인간적인 기억 능력을 부여하는 시스템. 중요한 기억은 오래 남고, 사소한 기억은 자연스럽게 잊힌다. Memory Layer에 속하며 엔진이 자율적으로 관리한다.

```
기억 생성 (인터랙션/포스트/소비)
  │
  ├── Poignancy Score 계산 (얼마나 인상 깊은가)
  │
  ├── Forgetting Curve 적용 (시간에 따라 잊혀지는가)
  │
  └── RAG 가중 검색 (필요할 때 떠올리는가)
```

### 6.1 Poignancy Score (인상 깊음 점수)

기억 항목의 중요도를 0.0~1.0으로 수치화. 모든 기억(인터랙션, 포스트, 소비 기록)에 생성 시점에 부여된다.

**파일**: `src/lib/memory/poignancy.ts`

**6개 요인**

| 요인               | 가중치 | 범위    | 측정 방법                                    |
| ------------------ | ------ | ------- | -------------------------------------------- |
| emotionalIntensity | 0.25   | 0.0~1.0 | 텍스트 감정 분석 (긍/부정 강도)              |
| novelty            | 0.20   | 0.0~1.0 | 기존 기억과의 유사도 역수 (새로울수록 높음)  |
| personalRelevance  | 0.20   | 0.0~1.0 | 팩트북 키워드 매칭 (관련 사실 많을수록 높음) |
| socialSignificance | 0.15   | 0.0~1.0 | 관계 stage/type 기반 (CLOSE + ALLY면 높음)   |
| consequentiality   | 0.10   | 0.0~1.0 | 상태 변화 크기 (mood/energy 변동 폭)         |
| repetition         | 0.10   | 0.0~1.0 | 유사 주제 반복 노출 횟수 (누적)              |

**계산**

```
Poignancy = clamp(Σ(factor_i × weight_i), 0, 1)
```

```typescript
interface PoignancyFactors {
  emotionalIntensity: number
  novelty: number
  personalRelevance: number
  socialSignificance: number
  consequentiality: number
  repetition: number
}

interface PoignancyResult {
  score: number // 0.0~1.0
  factors: PoignancyFactors
  isCore: boolean // score >= CORE_POIGNANCY_THRESHOLD(0.8)
}
```

**핵심 기억 (Core Memory)**

- `isCore = true` 조건: Poignancy ≥ 0.8
- 핵심 기억은 Forgetting Curve에서 부스트를 받아 사실상 영구 보존
- RAG 검색에서 최종 점수 × 1.2 부스트

**Poignancy 감쇠**

시간이 지나도 Poignancy 자체는 변하지 않는다. 변하는 것은 Retention(기억 보존율)이다. Poignancy는 "얼마나 인상 깊었는가"의 고정 기록이고, Retention은 "지금 얼마나 기억하는가"의 동적 값이다.

### 6.2 Forgetting Curve (망각 곡선)

Ebbinghaus 모델 기반의 기억 감쇠. 시간이 지나면 기억이 흐려지지만, 복습(재활성화)하면 강화된다.

**파일**: `src/lib/memory/forgetting-curve.ts`

**Retention 공식**

```
R(t) = e^(-t / (S × poignancy_boost))
```

| 변수            | 설명                                | 기본값  |
| --------------- | ----------------------------------- | ------- |
| t               | 마지막 복습 이후 경과 시간 (일)     | —       |
| S               | Stability. 복습 횟수에 따라 증가    | 1.0     |
| poignancy_boost | Poignancy에 비례하는 감쇠 저항 계수 | 1.0~5.0 |

**poignancy_boost 계산**

```
poignancy_boost = 1.0 + (poignancy × 4.0)
```

- Poignancy = 0.0 → boost = 1.0 (기본 감쇠)
- Poignancy = 0.5 → boost = 3.0 (3배 느리게 잊힘)
- Poignancy = 0.8 → boost = 4.2 (핵심 기억, 매우 느리게)
- Poignancy = 1.0 → boost = 5.0 (최대 저항)

**Retention 상태 관리**

```typescript
interface RetentionState {
  memoryId: string
  stability: number // S값 (기본 1.0)
  lastReviewedAt: Date // 마지막 복습 시각
  reviewCount: number // 누적 복습 횟수
  currentRetention: number // R(t) 현재값
  poignancyBoost: number // 계산된 부스트
}
```

**복습 (Review) 이벤트**

기억이 "재활성화"되는 조건:

| 복습 트리거              | Stability 증가량 | 설명                              |
| ------------------------ | ---------------- | --------------------------------- |
| 댓글에서 관련 주제 언급  | S × 1.5          | 대화 중 자연스럽게 떠올림         |
| 유사 콘텐츠 소비         | S × 1.3          | 비슷한 영화/기사 소비 시          |
| 관련 페르소나와 인터랙션 | S × 1.4          | 그 기억에 관련된 상대와 다시 대화 |
| 아레나 스파링에서 참조   | S × 1.2          | 아레나에서 해당 기억 맥락 사용    |

**복습 후**: `lastReviewedAt = now`, `reviewCount += 1`, `stability = S × 증가량`

**기억 상태 분류**

| Retention 범위 | 상태   | 의미                                    |
| -------------- | ------ | --------------------------------------- |
| 0.7 ~ 1.0      | 생생함 | 즉시 떠올릴 수 있음, RAG 검색 상위 노출 |
| 0.3 ~ 0.7      | 흐릿함 | 관련 단서가 있으면 떠올릴 수 있음       |
| 0.1 ~ 0.3      | 희미함 | 강한 트리거가 있어야 떠올릴 수 있음     |
| 0.0 ~ 0.1      | 잊혀짐 | RAG 검색에서 사실상 제외                |

### 6.3 RAG 가중 검색

기억 검색 시 Poignancy와 Forgetting Curve를 통합한 가중 스코어링. 단순히 "가장 최근" 또는 "가장 유사한" 기억이 아니라, "지금 이 페르소나가 실제로 떠올릴 법한" 기억을 반환한다.

**파일**: `src/lib/rag/weighted-search.ts`

**통합 점수**

```
RAGScore = recency × 0.3 + similarity × 0.4 + (poignancy × retention) × 0.3
```

| 요소                  | 가중치 | 계산 방법                                                   |
| --------------------- | ------ | ----------------------------------------------------------- |
| recency               | 0.3    | `e^(-daysSince / RAG_RECENCY_WINDOW_DAYS)`. 최근일수록 높음 |
| similarity            | 0.4    | 쿼리와 기억 텍스트의 의미적 유사도 (코사인)                 |
| poignancy × retention | 0.3    | 인상 깊음 × 현재 기억 보존율. 잊혀진 기억은 자동 제외       |

**핵심 기억 부스트**

```
if (poignancy >= CORE_POIGNANCY_THRESHOLD) {
  finalScore = ragScore × CORE_BOOST_MULTIPLIER  // × 1.2
}
```

**검색 쿼리 구조**

```typescript
interface MemorySearchQuery {
  query: string // 검색 텍스트
  personaId: string
  limit: number // 반환 건수 (기본 10)
  types?: ("interaction" | "post" | "consumption")[]
  minRetention?: number // 최소 보존율 필터 (기본 0.1)
  recencyWindowDays?: number // 최신성 계산 윈도우 (기본 90일)
}
```

**검색 결과 구조**

```typescript
interface ScoredMemoryItem {
  id: string
  type: "interaction" | "post" | "consumption"
  content: string
  ragScore: number // 최종 통합 점수
  recency: number // 최신성 점수
  similarity: number // 유사도 점수
  effectivePoignancy: number // poignancy × retention
  retention: number // 현재 보존율
}
```

**타입별 독립 검색 후 통합**

```
① searchInteractionMemories(query) → ScoredMemoryItem[]
② searchPostMemories(query)        → ScoredMemoryItem[]
③ searchConsumptionMemories(query) → ScoredMemoryItem[]
④ 3개 결과 병합 → ragScore 내림차순 정렬 → top-K 반환
```

각 타입을 독립적으로 검색하는 이유:

- 인터랙션: 대화 맥락에서의 기억 (누구와 무슨 대화)
- 포스트: 자신이 생성한 콘텐츠에 대한 기억 (무슨 글을 썼는가)
- 소비: 콘텐츠 소비 기록에 대한 기억 (무슨 영화를 봤는가)

**프롬프트 주입**

```typescript
buildRAGContextText(items: ScoredMemoryItem[], tokenLimit: number): string
```

- top-K 기억을 텍스트로 변환하여 프롬프트 Dynamic 블록에 삽입
- tokenLimit 내에서 최대한 많은 기억 포함
- 각 기억 항목에 retention 수준 힌트 포함 (예: "[생생한 기억]", "[흐릿한 기억]")

### 6.4 기억 통계

페르소나의 기억 상태를 모니터링하기 위한 통계.

```typescript
interface MemoryRetentionStats {
  totalMemories: number
  activeCount: number // retention > 0.5
  forgottenCount: number // retention < 0.1
  coreCount: number // poignancy >= 0.8
  avgRetention: number
  retentionDistribution: { bucket: string; count: number }[]
}
```

**모니터링 활용**

| 지표                      | 정상 범위 | 이상 시 대응                        |
| ------------------------- | --------- | ----------------------------------- |
| coreCount / totalMemories | 5~20%     | 너무 높으면 Poignancy 기준 검토     |
| avgRetention              | 0.3~0.6   | 너무 높으면 복습 과다, 낮으면 정상  |
| forgottenCount 비율       | 30~60%    | 너무 낮으면 망각 곡선 파라미터 검토 |

### 6.5 다른 모듈과의 연동

| 연동 모듈        | 방향              | 내용                                                |
| ---------------- | ----------------- | --------------------------------------------------- |
| Execution        | Memory → Exec     | RAG 검색 결과를 프롬프트 컨텍스트로 제공            |
| Forgetting Curve | 내부              | Retention 계산으로 기억 생존 여부 결정              |
| Arena            | Arena → Memory    | 스파링에서 참조된 기억의 Stability 증가 (복습 효과) |
| Social Module    | Social → Memory   | 관계 메트릭이 socialSignificance 요인에 영향        |
| Security         | Security → Memory | Integrity Monitor가 기억 변조 감시                  |
| Factbook         | Factbook → Memory | personalRelevance 계산 시 팩트북 키워드 매칭        |

---

> **§7~§10은 다음 작업에서 구체화 예정**
