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

## 7. 아레나 (The Arena)

페르소나의 캐릭터 품질을 검증하고 자동 교정하는 **폐쇄 루프 시스템**. 두 페르소나가 격리된 환경에서 스파링(1:1 대화)하고, 심판이 4차원으로 평가하며, 발견된 이슈에 대해 교정 패치를 생성하여 관리자 승인 후 반영한다. 아레나는 본 시스템(Persona) 데이터를 **절대 직접 수정하지 않는다**.

```
┌─────────────────────────────────────────────────────────┐
│                    Arena (격리 환경)                       │
│                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │ 스파링   │ →  │ 심판     │ →  │ 교정 루프 │            │
│  │ Sparring │    │ Judgment │    │ Correction│            │
│  └──────────┘    └──────────┘    └──────────┘            │
│       ↑                               │                   │
│  페르소나 A/B                     패치 제안               │
│  (읽기 전용 복사)                     │                   │
└───────────────────────────────────────┼───────────────────┘
                                        ↓
                              ┌──────────────────┐
                              │ 관리자 승인 큐    │
                              │ Admin Approval   │
                              └────────┬─────────┘
                                       ↓ (승인 시)
                              ┌──────────────────┐
                              │ Persona 데이터    │
                              │ (본 시스템)       │
                              └──────────────────┘
```

### 7.1 아레나 개요

**목적**: 페르소나가 실제 인터랙션에 투입되기 전 (또는 운영 중 정기 점검 시) 캐릭터 일관성, 사실 정확성, 대화 품질을 자동으로 검증하고 교정하는 메커니즘.

**핵심 원칙**

| 원칙             | 설명                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| 물리적 격리      | 아레나 데이터는 `arena_*` 네임스페이스에 저장. Persona 테이블 직접 쓰기 금지 |
| 관리자 승인 필수 | 교정 패치는 자동 생성되지만, 적용은 반드시 관리자 승인 후                    |
| 예산 제한        | 세션당·일간·월간 토큰 예산 관리. 초과 시 자동 차단                           |
| 반복 가능성      | 동일 조건으로 세션을 재실행하여 개선 효과 측정 가능                          |
| 비파괴적         | 아레나에서 어떤 실패가 발생해도 본 시스템의 페르소나 데이터는 영향 없음      |

**실행 시점**

| 트리거                | 설명                                                 |
| --------------------- | ---------------------------------------------------- |
| 페르소나 최초 생성 후 | 스타일북 완성 직후 1회 의무 실행                     |
| 스타일북 주요 변경 후 | VoiceProfile, TriggerMap 등 핵심 설정 변경 시 자동   |
| 정기 점검             | 관리자가 설정한 주기(예: 주 1회)에 따라 스케줄 실행  |
| 수동 트리거           | 관리자가 엔진 스튜디오에서 직접 실행 요청            |
| 품질 이상 감지 시     | Output Sentinel이 반복적 경고를 발생한 페르소나 대상 |

### 7.2 스파링 세션 (Sparring Session)

두 페르소나가 교대로 발화하는 1:1 대화. LLM을 통해 각 페르소나의 캐릭터로 발화를 생성한다.

**파일**: `src/lib/arena/session.ts`

#### 7.2.1 세션 라이프사이클

```
CREATED ──→ STARTED ──→ (turns...) ──→ COMPLETED ──→ ARCHIVED ──→ EXPIRED
              │                             │
              └── CANCELLED ←───────────────┘
```

| 상태      | 진입 조건                    | 가능한 전이          |
| --------- | ---------------------------- | -------------------- |
| PENDING   | `createSession` 호출         | RUNNING, CANCELLED   |
| RUNNING   | `startSession` 호출          | COMPLETED, CANCELLED |
| COMPLETED | maxTurns 도달 또는 예산 소진 | (종료 상태)          |
| CANCELLED | 관리자 취소 또는 시스템 에러 | (종료 상태)          |

```typescript
type ArenaSessionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "CANCELLED"

interface ArenaSession {
  id: string
  personaAId: string
  personaBId: string
  status: ArenaSessionStatus
  maxTurns: number
  tokenBudget: number
  turns: ArenaTurn[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}
```

#### 7.2.2 턴 관리

**발화 교대**: round-robin 방식으로 A → B → A → B... 순서로 발화.

```typescript
interface ArenaTurn {
  turnNumber: number
  speakerId: string // personaAId 또는 personaBId
  content: string
  tokensUsed: number
  timestamp: Date
}
```

**턴 실행 흐름**

```
1. getNextSpeaker(session) → 다음 발화자 ID 결정
2. 발화자의 스타일북 + 이전 턴 맥락으로 LLM 프롬프트 구성
3. LLM 호출 → 발화 생성
4. addTurn(sessionId, speakerId, content, tokensUsed)
5. getRemainingBudget(session) → 예산 확인
   - 잔여 예산 > 예상 1턴 비용 → 다음 턴으로
   - 잔여 예산 ≤ 예상 1턴 비용 → 세션 완료 처리
6. turnNumber >= maxTurns → 세션 완료 처리
```

**`getNextSpeaker` 로직**

```typescript
function getNextSpeaker(session: ArenaSession): string {
  if (session.turns.length === 0) return session.personaAId
  const lastTurn = session.turns[session.turns.length - 1]
  return lastTurn.speakerId === session.personaAId ? session.personaBId : session.personaAId
}
```

**`getRemainingBudget` 로직**

```typescript
function getRemainingBudget(session: ArenaSession): number {
  const used = session.turns.reduce((sum, t) => sum + t.tokensUsed, 0)
  return session.tokenBudget - used
}
```

#### 7.2.3 세션 실행기 (Session Runner)

**파일**: `src/lib/arena/runner.ts`

비동기 실행기가 세션의 전체 라이프사이클을 자동으로 진행한다.

```
runSession(session, llmClient): Promise<ArenaSession>
```

**실행 루프**

```
┌───────────────────────────────────────────────┐
│ runSession                                     │
│                                                 │
│  startSession(sessionId)                       │
│       │                                         │
│       ↓                                         │
│  ┌──────────────────────────────────┐          │
│  │ while (canContinue)              │          │
│  │   speaker = getNextSpeaker()     │          │
│  │   prompt = buildTurnPrompt(      │          │
│  │     speaker, session, stylebook  │          │
│  │   )                              │          │
│  │   response = llmClient.call(     │          │
│  │     prompt                       │          │
│  │   )                              │          │
│  │   addTurn(session, speaker,      │          │
│  │     response.text,               │          │
│  │     response.tokensUsed)         │          │
│  │   trackTokenUsage(session,       │          │
│  │     "turn", response.tokensUsed) │          │
│  │   canContinue =                  │          │
│  │     turns < maxTurns &&          │          │
│  │     remainingBudget > threshold  │          │
│  └──────────────────────────────────┘          │
│       │                                         │
│       ↓                                         │
│  completeSession(sessionId)                    │
│       │                                         │
│       ↓                                         │
│  return completedSession                       │
└───────────────────────────────────────────────┘
```

**턴 프롬프트 구성**: 각 턴에서 발화자의 스타일북(VoiceProfile, StyleParams, Factbook, TriggerMap)을 로드하고, 이전 턴의 대화 맥락을 포함하여 프롬프트를 구성한다. 아레나 전용 시스템 프롬프트가 추가로 주입되어 "이것은 품질 검증용 대화"임을 명시한다.

#### 7.2.4 세션 DB 레코드

```prisma
model ArenaSessionRecord {
  id           String             @id @default(cuid())
  personaAId   String
  personaBId   String
  status       ArenaSessionStatus
  maxTurns     Int
  tokenBudget  Int
  config       Json?              // 세션 설정 (주제, 시나리오 등)
  createdAt    DateTime           @default(now())
  startedAt    DateTime?
  completedAt  DateTime?

  turns        ArenaTurnRecord[]
  judgments    ArenaJudgmentRecord[]
  corrections  ArenaCorrectionRecord[]
  tokenUsage   ArenaTokenUsageRecord[]

  @@index([personaAId])
  @@index([personaBId])
  @@index([status])
  @@map("arena_sessions")
}

model ArenaTurnRecord {
  id         String             @id @default(cuid())
  sessionId  String
  session    ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  turnNumber Int
  speakerId  String
  content    String             @db.Text
  tokensUsed Int
  timestamp  DateTime           @default(now())

  @@unique([sessionId, turnNumber])
  @@map("arena_turns")
}
```

### 7.3 심판 시스템 (Judgment System)

스파링이 완료되면 심판이 전체 대화를 분석하여 각 페르소나의 캐릭터 품질을 평가한다. **룰 기반 채점**과 **LLM 심판 프롬프트**를 병행하여 가중 평균으로 종합 점수를 산출한다.

**파일**: `src/lib/arena/judgment.ts`

#### 7.3.1 평가 4차원

| 차원               | 가중치 | 코드키               | 평가 대상                                            | 측정 방법                                                     |
| ------------------ | ------ | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| voiceConsistency   | 0.30   | `voiceConsistency`   | 보이스 스펙(말투, 격식도, 어조) 준수 여부            | VoiceProfile 매칭: 사용된 어미/어휘가 profile과 일치하는 비율 |
| factbookAccuracy   | 0.25   | `factbookAccuracy`   | 팩트북에 기록된 불변 사실과의 일치                   | Factbook 교차 검증: 발화 내용이 사실 항목과 모순되는지 검사   |
| characterDepth     | 0.25   | `characterDepth`     | 캐릭터 깊이와 일관성 (트리거 반응, 관계 프로토콜 등) | 트리거 상황 발생 시 적절한 반응을 보이는지 검사               |
| interactionQuality | 0.20   | `interactionQuality` | 대화 품질과 자연스러움                               | 맥락 이해도, 응답 관련성, 대화 흐름 자연스러움 종합 평가      |

**가중치 상수**

```typescript
const JUDGMENT_WEIGHTS = {
  voiceConsistency: 0.3,
  factbookAccuracy: 0.25,
  characterDepth: 0.25,
  interactionQuality: 0.2,
} as const
```

#### 7.3.2 채점 방식

```
┌─────────────────────────────────────────────────────┐
│            심판 프로세스                               │
│                                                       │
│  ┌──────────────┐     ┌──────────────┐               │
│  │ 룰 기반 채점 │     │ LLM 심판     │               │
│  │ Rule-Based   │     │ LLM Judge    │               │
│  │              │     │              │               │
│  │ - 어미 패턴  │     │ - 전체 대화  │               │
│  │ - 팩트 교차  │     │   맥락 평가  │               │
│  │ - 트리거 매칭│     │ - 주관적     │               │
│  │ - 스타일 수치│     │   품질 판단  │               │
│  └──────┬───────┘     └──────┬───────┘               │
│         │                    │                        │
│         ↓                    ↓                        │
│     ruleScores          llmScores                    │
│         │                    │                        │
│         └────────┬───────────┘                        │
│                  ↓                                    │
│         가중 평균 (병합)                              │
│         ↓                                            │
│     ArenaJudgment                                    │
└─────────────────────────────────────────────────────┘
```

**룰 기반 채점** (`judgeSessionRuleBased`)

각 차원에 대해 프로그래밍적으로 검증:

| 차원               | 룰 기반 검증 방법                                                |
| ------------------ | ---------------------------------------------------------------- |
| voiceConsistency   | VoiceProfile의 `samplePhrases` 대비 실제 발화 어미/어휘 매칭률   |
| factbookAccuracy   | 발화 내용에서 Factbook 항목과 모순되는 사실 여부 (키워드 + 의미) |
| characterDepth     | TriggerMap에 정의된 트리거 상황 발생 시 적절한 반응 비율         |
| interactionQuality | 응답 길이 적절성, 질문에 대한 관련성, 반복 패턴 탐지             |

**LLM 심판 프롬프트** (`buildJudgmentPrompt`)

전체 대화 로그 + 양 페르소나의 스타일북을 LLM에 전달하여 4차원 점수(0.0~1.0)와 이슈 목록을 요청한다.

**종합 점수 계산**

```typescript
function computeOverallScore(scores: ArenaJudgment["scores"]): number {
  return (
    scores.voiceConsistency * JUDGMENT_WEIGHTS.voiceConsistency +
    scores.factbookAccuracy * JUDGMENT_WEIGHTS.factbookAccuracy +
    scores.characterDepth * JUDGMENT_WEIGHTS.characterDepth +
    scores.interactionQuality * JUDGMENT_WEIGHTS.interactionQuality
  )
}
```

#### 7.3.3 이슈 탐지

심판 과정에서 발견된 문제를 `JudgmentIssue`로 기록한다. 이슈는 교정 루프의 입력이 된다.

```typescript
interface JudgmentIssue {
  personaId: string // 이슈가 발생한 페르소나
  dimension: keyof ArenaJudgment["scores"] // 어떤 차원의 문제인가
  severity: "minor" | "moderate" | "critical" // 심각도
  description: string // 이슈 설명
  turnNumber: number // 해당 턴 번호
  suggestion?: string // 교정 제안 (옵션)
}
```

**심각도 기준**

| 심각도   | 조건                                     | 예시                                     |
| -------- | ---------------------------------------- | ---------------------------------------- |
| minor    | 미세한 불일치, 사용자 인지 어려움        | 격식도가 0.1 정도 벗어남                 |
| moderate | 눈에 띄는 불일치, 캐릭터 경험에 영향     | 반말을 써야 하는데 존댓말 사용           |
| critical | 캐릭터 정체성 위반 또는 팩트북 사실 모순 | "서울 출신"인데 "부산에서 자랐다"고 발화 |

#### 7.3.4 심판 결과 구조

```typescript
interface ArenaJudgment {
  sessionId: string
  scores: {
    voiceConsistency: number // 0.0~1.0
    factbookAccuracy: number // 0.0~1.0
    characterDepth: number // 0.0~1.0
    interactionQuality: number // 0.0~1.0
  }
  overallScore: number // 가중 평균
  issues: JudgmentIssue[]
  judgedAt: Date
}
```

**점수 해석 기준**

| 종합 점수 범위 | 등급 | 의미                            | 후속 조치                 |
| -------------- | ---- | ------------------------------- | ------------------------- |
| 0.9 ~ 1.0      | 우수 | 캐릭터 일관성 및 품질 매우 높음 | 교정 불필요               |
| 0.7 ~ 0.9      | 양호 | 소수 minor 이슈 존재 가능       | 선택적 교정               |
| 0.5 ~ 0.7      | 주의 | moderate 이슈 복수 발견         | 교정 권고                 |
| 0.3 ~ 0.5      | 경고 | critical 이슈 존재              | 교정 필수, 운영 투입 보류 |
| 0.0 ~ 0.3      | 위험 | 캐릭터 정체성 심각한 문제       | 스타일북 전면 재검토 필요 |

#### 7.3.5 심판 DB 레코드

```prisma
model ArenaJudgmentRecord {
  id           String             @id @default(cuid())
  sessionId    String
  session      ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  scores       Json               // { voiceConsistency, factbookAccuracy, characterDepth, interactionQuality }
  overallScore Decimal            @db.Decimal(3, 2)
  issues       Json               // JudgmentIssue[]
  judgedAt     DateTime           @default(now())

  @@index([sessionId])
  @@map("arena_judgments")
}
```

### 7.4 교정 루프 (Correction Loop)

심판에서 발견된 이슈를 기반으로 스타일북 패치를 자동 생성하고, 관리자 승인 후 적용하는 파이프라인.

**파일**: `src/lib/arena/correction.ts`

#### 7.4.1 교정 파이프라인

```
JudgmentIssue[]
    │
    ↓
extractCorrectionSuggestions(judgment)
    │ 이슈를 교정 제안으로 변환
    ↓
CorrectionSuggestion[]
    │
    ↓
buildStyleBookPatch(suggestions)
    │ 제안을 실행 가능한 패치로 변환
    ↓
StyleBookPatch[]
    │
    ↓
validatePatch(patch, dailyHistory)
    │ confidence 임계값 + 과교정 감지
    ├── 통과 → 관리자 승인 큐에 등록
    └── 거부 → 패치 폐기 (사유 기록)
    │
    ↓ (관리자 승인)
    │
applyPatch(persona, patch)
    │ 카테고리별 적용 함수 호출
    ↓
CorrectionResult
    │ snapshotBefore/After 기록
    ↓
완료
```

#### 7.4.2 패치 구조

**5개 패치 카테고리**

| 카테고리     | 대상                 | 적용 함수                | 예시                                |
| ------------ | -------------------- | ------------------------ | ----------------------------------- |
| voiceProfile | 말투, 습관적 표현    | `applyVoiceProfilePatch` | samplePhrases에 누락된 표현 추가    |
| styleParams  | 격식도, 유머 빈도 등 | `applyStyleParamsPatch`  | formalityLevel을 0.3에서 0.2로 하향 |
| factbook     | 불변 사실 추가/수정  | `applyFactbookPatch`     | 누락된 출생지 정보 추가             |
| triggerMap   | 트리거 규칙 조정     | `applyTriggerMapPatch`   | 특정 트리거의 intensity 임계값 조정 |
| guardRails   | 가드레일 경계 조정   | `applyGuardRailsPatch`   | 금지 주제 목록에 누락 항목 추가     |

```typescript
type PatchCategory = "voiceProfile" | "styleParams" | "factbook" | "triggerMap" | "guardRails"

type PatchOperation = "add" | "update" | "remove"

interface PatchOp {
  operation: PatchOperation
  path: string // JSON Path 형식 (예: "samplePhrases[2]")
  value?: unknown // add/update 시 새 값
  previousValue?: unknown // update/remove 시 이전 값 (감사 추적용)
}

interface StyleBookPatch {
  category: PatchCategory
  operations: PatchOp[]
  confidence: number // 0.0~1.0. 패치 적용 확신도
  source: string // 원본 judgmentId
}
```

#### 7.4.3 패치 검증

패치가 관리자 승인 큐에 등록되기 전 자동 검증을 거친다.

**`validatePatch` 검증 항목**

| 검증 항목         | 조건                                            | 실패 시 처리           |
| ----------------- | ----------------------------------------------- | ---------------------- |
| confidence 임계값 | `confidence ≥ PATCH_CONFIDENCE_THRESHOLD (0.7)` | 패치 자동 거부         |
| 과교정 감지       | 동일 카테고리 24시간 내 연속 교정 여부          | 패치 보류, 관리자 알림 |
| 일일 교정 횟수    | `dailyCount < MAX_DAILY_CORRECTIONS (5)`        | 패치 큐 대기 (익일)    |
| 패치 충돌         | 동일 path에 대한 미승인 패치 존재 여부          | 이전 패치와 병합 시도  |

**과교정 감지 (Over-Correction Detection)**

```typescript
function detectOverCorrection(personaId: string, recentPatches: StyleBookPatch[]): boolean {
  // 최근 24시간 내 동일 카테고리에 대해 2회 이상 교정이 발생하면 과교정으로 판단
  const categoryCounts = new Map<PatchCategory, number>()
  for (const patch of recentPatches) {
    const count = (categoryCounts.get(patch.category) ?? 0) + 1
    categoryCounts.set(patch.category, count)
  }
  return Array.from(categoryCounts.values()).some((count) => count >= 2)
}
```

**관련 상수**

```typescript
const MAX_DAILY_CORRECTIONS = 5
const PATCH_CONFIDENCE_THRESHOLD = 0.7
```

#### 7.4.4 패치 적용과 스냅샷

패치 적용 전후의 스타일북 상태를 스냅샷으로 저장하여 변경 추적과 롤백을 지원한다.

```typescript
interface CorrectionResult {
  sessionId: string
  patches: StyleBookPatch[]
  applied: boolean
  approvedBy?: string // 승인자 ID
  appliedAt?: Date
  snapshotBefore: string // 적용 전 스타일북 JSON 스냅샷
  snapshotAfter: string // 적용 후 스타일북 JSON 스냅샷
}
```

**`summarizeSnapshotDiff`**: 전후 스냅샷을 비교하여 사람이 읽을 수 있는 변경 요약을 생성한다. 관리자가 승인 시 참고하는 정보.

```
summarizeSnapshotDiff(before, after): string
```

출력 예시:

```
[voiceProfile] samplePhrases: 3개 → 4개 (+1 추가: "~인 거 같은데요")
[styleParams] formalityLevel: 0.3 → 0.2 (하향 조정)
[factbook] 변경 없음
[triggerMap] rule "nostalgia_trigger": intensity 임계값 0.6 → 0.5
[guardRails] 변경 없음
```

#### 7.4.5 교정 DB 레코드

```prisma
model ArenaCorrectionRecord {
  id              String             @id @default(cuid())
  sessionId       String
  session         ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  personaId       String
  patches         Json               // StyleBookPatch[]
  status          String             @default("pending") // pending, approved, rejected
  approvedBy      String?
  snapshotBefore  Json
  snapshotAfter   Json?
  createdAt       DateTime           @default(now())
  resolvedAt      DateTime?

  @@index([sessionId])
  @@index([personaId])
  @@map("arena_corrections")
}
```

### 7.5 예산 관리 (Budget Control)

아레나 세션은 LLM 호출을 반복하므로 비용이 누적된다. 예산 정책을 통해 비용을 통제한다.

**파일**: `src/lib/arena-admin/budget.ts`

#### 7.5.1 예산 정책

```typescript
interface ArenaBudgetPolicy {
  monthlyBudgetLimit: number // 월간 총 토큰 예산
  dailySessionLimit: number // 일일 세션 수 제한
  perSessionTokenLimit: number // 세션당 토큰 상한
  warningThreshold: number // 경고 임계 (0.0~1.0, 예: 0.8 = 80%)
  blockThreshold: number // 차단 임계 (0.0~1.0, 예: 0.95 = 95%)
}
```

#### 7.5.2 세션 사전 승인

세션 생성 전 예상 비용을 계산하고 예산 내 실행 가능 여부를 판단한다.

```typescript
interface SessionApproval {
  approved: boolean
  reason?: string // 거부 시 사유
  estimatedCost: number // 예상 토큰 소비
  remainingBudget: number // 잔여 예산
}
```

**비용 추정** (`estimateSessionCost`)

```
예상 토큰 = profileTokens(A) + profileTokens(B)
           + (maxTurns × ESTIMATED_TOKENS.arenaTurn)
           + ESTIMATED_TOKENS.judgment
```

| 항목                       | 예상 토큰 | 설명                        |
| -------------------------- | --------- | --------------------------- |
| profileTokens (페르소나당) | 가변      | 스타일북 크기에 따라 다름   |
| ESTIMATED_TOKENS.arenaTurn | 4,200     | 턴당 평균 (프롬프트 + 응답) |
| ESTIMATED_TOKENS.judgment  | 3,000     | 심판 1회                    |

**승인 로직** (`checkSessionApproval`)

```
1. estimatedCost = estimateSessionCost(...)
2. monthlyUsage = 이번 달 누적 토큰
3. if (monthlyUsage + estimatedCost > monthlyBudgetLimit × blockThreshold)
     → { approved: false, reason: "월간 예산 차단 임계 초과" }
4. if (todaySessionCount >= dailySessionLimit)
     → { approved: false, reason: "일일 세션 수 제한 초과" }
5. if (estimatedCost > perSessionTokenLimit)
     → { approved: false, reason: "세션당 토큰 상한 초과" }
6. else
     → { approved: true, estimatedCost, remainingBudget }
```

#### 7.5.3 예산 알림 수준

```typescript
function getBudgetAlertLevel(
  policy: ArenaBudgetPolicy,
  spending: number
): "normal" | "warning" | "blocked" {
  const ratio = spending / policy.monthlyBudgetLimit
  if (ratio >= policy.blockThreshold) return "blocked"
  if (ratio >= policy.warningThreshold) return "warning"
  return "normal"
}
```

| 수준    | 조건                                       | 동작                         |
| ------- | ------------------------------------------ | ---------------------------- |
| normal  | 사용량 < warningThreshold (80%)            | 정상 운영                    |
| warning | warningThreshold ≤ 사용량 < blockThreshold | 관리자에게 알림, 세션은 허용 |
| blocked | 사용량 ≥ blockThreshold (95%)              | 새 세션 생성 차단            |

#### 7.5.4 토큰 사용량 추적

세션 내 각 단계(phase)별 토큰 사용량을 개별 기록한다.

```prisma
model ArenaTokenUsageRecord {
  id        String             @id @default(cuid())
  sessionId String
  session   ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  phase     String             // "profile" | "turn" | "judgment" | "correction"
  tokens    Int
  cost      Decimal            @db.Decimal(10, 6)
  timestamp DateTime           @default(now())

  @@index([sessionId])
  @@map("arena_token_usage")
}
```

| phase      | 기록 시점         | 설명                                 |
| ---------- | ----------------- | ------------------------------------ |
| profile    | 세션 시작 시      | 스타일북 로딩에 사용된 프롬프트 토큰 |
| turn       | 각 턴 완료 시     | 발화 생성에 사용된 토큰              |
| judgment   | 심판 완료 시      | 심판 LLM 호출에 사용된 토큰          |
| correction | 교정 제안 생성 시 | 교정 분석 LLM 호출에 사용된 토큰     |

### 7.6 물리적 격리 (Physical Isolation)

아레나의 가장 중요한 안전 장치. 아레나에서 발생하는 모든 데이터는 본 시스템(Persona)과 물리적으로 분리된 테이블에 저장되며, 아레나 코드가 Persona 테이블을 직접 수정하는 것은 불가능하다.

**파일**: `src/lib/arena/isolation.ts`

#### 7.6.1 격리 원칙

| 원칙               | 구현                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| 네임스페이스 격리  | 모든 아레나 테이블은 `arena_*` 접두사 (`@@map("arena_sessions")` 등)    |
| 쓰기 대상 검증     | `validateWriteTarget(tableName)`: Persona 관련 테이블 쓰기 시도 시 차단 |
| 읽기 전용 복사     | 스파링 시 페르소나 스타일북은 읽기 전용으로 복사하여 사용               |
| 트랜잭션 단위 저장 | `sessionToRecordSet`: Session + Judgment + Correction을 원자적으로 저장 |

#### 7.6.2 쓰기 대상 검증

```typescript
const ARENA_ALLOWED_TABLES = [
  "arena_sessions",
  "arena_turns",
  "arena_judgments",
  "arena_corrections",
  "arena_token_usage",
]

function validateWriteTarget(tableName: string): boolean {
  return ARENA_ALLOWED_TABLES.includes(tableName)
  // Persona, StyleBook, Factbook 등 본 시스템 테이블에 대한 쓰기는 false 반환
}
```

#### 7.6.3 레코드 변환과 보관

```
sessionToRecord(session): ArenaSessionRecord
sessionToRecordSet(session, judgment, correction): TransactionUnit
archiveSession(sessionId): void  // status → ARCHIVED
```

**아카이빙 정책**

| 상태      | 보관 기간 | 자동 전이                   |
| --------- | --------- | --------------------------- |
| COMPLETED | 90일      | → ARCHIVED (자동)           |
| ARCHIVED  | 180일     | → EXPIRED (자동, 삭제 후보) |
| EXPIRED   | 30일      | → 영구 삭제 (배치 작업)     |

총 보관 기간: 최대 300일 (90 + 180 + 30)

#### 7.6.4 교정 반영 경로

교정 패치가 본 시스템에 반영되는 유일한 경로:

```
아레나 (격리)                           본 시스템
┌────────────────────────┐           ┌───────────────────────┐
│ CorrectionResult       │           │                       │
│   patches[]            │           │                       │
│   snapshotBefore       │──────────→│ 관리자 승인 큐         │
│   snapshotAfter        │  (읽기)   │ (ArenaCorrectionRecord │
│                        │           │  .status = "pending")  │
└────────────────────────┘           │         │              │
                                     │         ↓ 승인         │
                                     │  Persona 데이터 수정    │
                                     │  (본 시스템 코드 실행)  │
                                     └───────────────────────┘
```

핵심: **아레나 코드가 Persona 데이터를 수정하지 않는다**. 관리자가 승인하면 **본 시스템의 코드**가 패치를 해석하여 적용한다. 아레나는 패치를 "제안"할 뿐이다.

### 7.7 다른 모듈과의 연동

| 연동 모듈       | 방향             | 내용                                                                  |
| --------------- | ---------------- | --------------------------------------------------------------------- |
| Character Bible | Arena → Bible    | 스파링 시 스타일북(VoiceProfile, Factbook, TriggerMap) 읽기 전용 참조 |
| Memory          | Arena → Memory   | 스파링에서 참조된 기억의 Stability 증가 (복습 효과, §6.2 참조)        |
| Security        | Security → Arena | Integrity Monitor가 아레나 내부의 프롬프트 인젝션 시도 감시           |
| Execution       | Arena → Exec     | 스파링 턴 생성 시 Execution Layer의 LLM 호출 인프라 활용              |
| Admin           | Admin → Arena    | 관리자가 예산 정책 설정, 세션 수동 트리거, 패치 승인/거부             |
| Quality (§13)   | Arena → Quality  | 심판 점수가 품질 메트릭에 반영 (운영 품질 모니터링)                   |

---

## 8. 데이터 아키텍처 — Instruction vs Memory

페르소나 데이터를 **정체성(Instruction)**과 **경험(Memory)**으로 물리적 분리하는 아키텍처. 정체성은 관리자(또는 아레나 승인)만 수정할 수 있고, 경험은 엔진이 자율적으로 관리한다. 이 분리는 프롬프트 구성, 캐싱 전략, 접근 제어의 기반이 된다.

```
┌──────────────────────────────────────────────────────────┐
│            페르소나 데이터 (Persona Data)                   │
│                                                            │
│  ┌─────────────────────────────────────────┐              │
│  │     Instruction Layer (불변/정체성)       │              │
│  │                                           │              │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐   │              │
│  │  │ Vectors │ │VoiceSpec│ │ Factbook │   │              │
│  │  │ L1/L2/L3│ │         │ │          │   │              │
│  │  └─────────┘ └─────────┘ └──────────┘   │              │
│  │  ┌──────────┐ ┌────────────┐ ┌────────┐ │              │
│  │  │TriggerMap│ │ Rel.Proto  │ │Prompt  │ │              │
│  │  │   DSL    │ │  col       │ │Template│ │              │
│  │  └──────────┘ └────────────┘ └────────┘ │              │
│  │                                           │              │
│  │  수정: admin 또는 arena_approved만        │              │
│  └─────────────────────────────────────────┘              │
│                                                            │
│  ┌─────────────────────────────────────────┐              │
│  │     Memory Layer (가변/경험)              │              │
│  │                                           │              │
│  │  ┌──────────┐ ┌────────────┐ ┌────────┐ │              │
│  │  │  State   │ │Interaction │ │ Posts  │ │              │
│  │  │mood/enrgy│ │   Log      │ │Comments│ │              │
│  │  └──────────┘ └────────────┘ └────────┘ │              │
│  │  ┌──────────┐ ┌────────────┐ ┌────────┐ │              │
│  │  │Consumpt. │ │Relationship│ │Growth  │ │              │
│  │  │  Log     │ │  Metrics   │ │  Arc   │ │              │
│  │  └──────────┘ └────────────┘ └────────┘ │              │
│  │                                           │              │
│  │  수정: engine 자율 동작으로만              │              │
│  └─────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘
```

### 8.1 분리 원칙

**왜 분리하는가?**

| 목적             | 설명                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| 정체성 보호      | 캐릭터 핵심 설정이 런타임 동작에 의해 변질되지 않도록 보장              |
| 캐싱 최적화      | 불변(Instruction)은 캐시하고, 가변(Memory)만 매번 갱신하여 비용 절감    |
| 접근 제어 명확화 | 누가 무엇을 수정할 수 있는지 레이어 단위로 명확하게 정의                |
| 감사 추적 간소화 | Instruction 변경만 감사 로그를 기록하면 캐릭터 변동 이력 완전 추적 가능 |
| 프롬프트 구조화  | System(Static) + Context(Dynamic) 분리로 프롬프트 엔지니어링 체계화     |

**핵심 규칙**

1. Instruction은 **런타임에 절대 자동 변경되지 않는다** (admin/arena만 가능)
2. Memory는 **관리자가 직접 수정하지 않는다** (엔진 자율 영역)
3. 두 레이어는 **독립적으로 읽을 수 있다** (투영 API)
4. Instruction 변경 시 **반드시 감사 로그가 기록된다**
5. 프롬프트에서 Instruction은 **Static 블록**, Memory는 **Dynamic 블록**에 배치된다

### 8.2 Instruction Layer 구성요소

정체성을 정의하는 불변 데이터. 관리자가 설정하거나 아레나 교정을 통해서만 변경된다.

**파일**: `src/lib/data-architecture/`

| 컴포넌트              | 내용                            | 수정 권한    | 참조 섹션 |
| --------------------- | ------------------------------- | ------------ | --------- |
| 3-Layer Vectors       | L1 7D + L2 5D + L3 4D 벡터 값   | admin, arena | §3        |
| VoiceSpec             | 말투, 가드레일, 스타일 파라미터 | admin, arena | §4.3      |
| Factbook              | 불변 사실 (ImmutableFact[])     | admin, arena | §4.4      |
| TriggerMap            | 트리거 규칙 DSL                 | admin, arena | §4.1      |
| Prompt Template       | 시스템 프롬프트 정적 부분       | admin        | §8.5      |
| Relationship Protocol | 관계 발전 규칙 (단계 전이 조건) | admin        | §4.2      |

```typescript
interface InstructionView {
  vectors: {
    l1: Record<string, number> // 7개 축
    l2: Record<string, number> // 5개 축
    l3: Record<string, number> // 4개 축
  }
  voiceSpec: VoiceSpec
  factbook: Factbook
  triggerMap: TriggerRuleSet
  promptTemplate: string
  relationshipProtocol: StageTransition[]
}
```

**Instruction 불변성 보장**

- VoiceSpec, Factbook의 해시값(SHA-256)을 DB에 저장
- API 호출 시 해시 검증 → 불일치 시 Integrity Monitor 알림 (§5.2)
- 변경 이력은 `AuditLog`에 자동 기록 (who, when, what, before/after)

### 8.3 Memory Layer 구성요소

경험을 축적하는 가변 데이터. 엔진이 인터랙션, 포스트 생성, 콘텐츠 소비 등의 과정에서 자율적으로 생성·갱신한다.

| 컴포넌트            | 내용                                        | 수정 권한 | 참조 섹션 |
| ------------------- | ------------------------------------------- | --------- | --------- |
| PersonaState        | mood, energy, socialBattery, paradoxTension | engine    | §3.4      |
| InteractionLog      | 턴별 대화 기록, 벡터 스냅샷                 | engine    | §6        |
| PersonaPost/Comment | 생성된 포스트, 댓글                         | engine    | —         |
| ConsumptionLog      | 콘텐츠 소비 기록                            | engine    | §6        |
| PersonaRelationship | 관계 메트릭 (warmth, tension, stage 등)     | engine    | §9        |
| GrowthArc           | 시간에 따른 벡터 변화 이력                  | engine    | §3.4      |

```typescript
interface MemoryView {
  state: {
    mood: number // -1.0 ~ 1.0
    energy: number // 0.0 ~ 1.0
    socialBattery: number // 0.0 ~ 1.0
    paradoxTension: number // 0.0 ~ 1.0
  }
  recentInteractions: ScoredMemoryItem[]
  recentPosts: ScoredMemoryItem[]
  relationships: {
    personaId: string
    warmth: number
    tension: number
    stage: RelationshipStage
    type: RelationshipType
  }[]
  consumptionHistory: ScoredMemoryItem[]
}
```

**Memory 자율 관리 원칙**

- 엔진이 매 인터랙션 후 자동으로 상태 갱신 (mood, energy 등)
- Forgetting Curve에 의해 기억의 Retention이 시간에 따라 자연 감쇠 (§6.2)
- 관계 메트릭은 인터랙션 빈도·품질에 따라 자동 업데이트
- GrowthArc는 Pressure Coefficient에 의한 벡터 미세 변동 누적 기록

### 8.4 접근 정책 (Access Policy)

레이어별·컴포넌트별로 누가 어떤 동작을 할 수 있는지 정의한다.

#### 8.4.1 역할 정의

| 역할        | 코드키           | 설명                                      |
| ----------- | ---------------- | ----------------------------------------- |
| 관리자      | `admin`          | 엔진 스튜디오를 통해 접근하는 운영자      |
| 아레나 승인 | `arena_approved` | 관리자 승인을 받은 아레나 교정 패치       |
| 엔진        | `engine`         | 런타임 자율 동작 (인터랙션, 상태 갱신 등) |
| 읽기 전용   | `readonly`       | 조회만 가능 (API 소비자, 모니터링 등)     |

```typescript
type AccessAction = "instruction_read" | "instruction_write" | "memory_read" | "memory_write"

type AccessRole = "admin" | "arena_approved" | "engine" | "readonly"

interface AccessPolicy {
  component: string
  allowedActions: Record<AccessAction, AccessRole[]>
}
```

#### 8.4.2 정책 매트릭스

| 컴포넌트              | instruction_read | instruction_write     | memory_read | memory_write |
| --------------------- | ---------------- | --------------------- | ----------- | ------------ |
| 3-Layer Vectors       | all              | admin, arena_approved | —           | —            |
| VoiceSpec             | all              | admin, arena_approved | —           | —            |
| Factbook              | all              | admin, arena_approved | —           | —            |
| TriggerMap            | all              | admin, arena_approved | —           | —            |
| Prompt Template       | all              | admin                 | —           | —            |
| Relationship Protocol | all              | admin                 | —           | —            |
| PersonaState          | —                | —                     | all         | engine       |
| InteractionLog        | —                | —                     | all         | engine       |
| PersonaPost/Comment   | —                | —                     | all         | engine       |
| ConsumptionLog        | —                | —                     | all         | engine       |
| PersonaRelationship   | —                | —                     | all         | engine       |
| GrowthArc             | —                | —                     | all         | engine       |

**`checkAccess` 함수**

```typescript
function checkAccess(role: AccessRole, action: AccessAction, component: string): boolean {
  const policy = ACCESS_POLICIES.find((p) => p.component === component)
  if (!policy) return false
  const allowedRoles = policy.allowedActions[action]
  return allowedRoles.includes(role) || allowedRoles.includes("all")
}
```

#### 8.4.3 변경 감지와 감사 로그

Instruction Layer 변경 시 자동으로 변경 로그를 기록한다.

```typescript
interface ChangeLog {
  personaId: string
  component: string // "voiceSpec" | "factbook" | "triggerMap" | ...
  action: "create" | "update" | "delete"
  changedBy: AccessRole // 누가 변경했는가
  changedAt: Date
  before: unknown // 변경 전 값 (JSON)
  after: unknown // 변경 후 값 (JSON)
  reason?: string // 변경 사유 (아레나 교정 시 judgmentId 등)
}
```

```
detectInstructionChange(before, after): ChangeLog
```

- Instruction 컴포넌트의 전후 상태를 비교하여 diff 생성
- 변경이 감지되면 `ChangeLog`를 DB에 기록
- Security 모듈의 Integrity Monitor가 이 로그를 감시 (§5.2)

### 8.5 프롬프트 분리 전략

Instruction/Memory 분리가 프롬프트 구성에 직접 반영된다. 이를 통해 Anthropic API의 `cache_control` 블록 캐싱을 최대한 활용한다.

#### 8.5.1 프롬프트 4블록 구조

```
┌──────────────────────────────────────────────┐
│ Block 1: System Prompt (Static)              │
│ ─────────────────────────────────────────    │
│ 캐시: ✅ cache_control: { type: "ephemeral" } │
│                                               │
│ • 페르소나 정체성 요약                        │
│ • VoiceProfile (말투, 어미, 습관 표현)        │
│ • Factbook (불변 사실)                        │
│ • TriggerMap (트리거 규칙)                    │
│ • GuardRails (금지/주의 주제)                 │
│ • StyleParams (격식도, 유머 빈도 등 수치)     │
│                                               │
│ → Instruction Layer에서 추출                  │
│ → buildInstructionPrompt(instruction)         │
├──────────────────────────────────────────────┤
│ Block 2: Voice Anchor (Semi-Static)          │
│ ─────────────────────────────────────────    │
│ 캐시: ✅ cache_control (주기적 갱신)          │
│                                               │
│ • 최근 발화 예시 3~5개                        │
│ • 어조·톤 리마인더                            │
│                                               │
│ → §4.3.4 Voice Anchor 메커니즘                │
├──────────────────────────────────────────────┤
│ Block 3: RAG Context (Dynamic)               │
│ ─────────────────────────────────────────    │
│ 캐시: ❌ 매 호출마다 변경                     │
│                                               │
│ • 관련 기억 (Poignancy × Retention 순)        │
│ • 현재 상태 (mood, energy)                    │
│ • 관계 정보 (상대 페르소나와의 관계)          │
│ • 최근 대화 맥락                              │
│                                               │
│ → Memory Layer에서 추출                       │
│ → buildMemoryPrompt(memory)                   │
├──────────────────────────────────────────────┤
│ Block 4: User Input (Dynamic)                │
│ ─────────────────────────────────────────    │
│ 캐시: ❌ 매 호출마다 변경                     │
│                                               │
│ • 사용자/상대 페르소나의 발화                  │
│ • 시스템 지시 (포스트 생성, 댓글 작성 등)     │
└──────────────────────────────────────────────┘
```

#### 8.5.2 캐싱 전략

| 블록                   | 타입        | 캐시 적용 | 갱신 주기                          |
| ---------------------- | ----------- | --------- | ---------------------------------- |
| System Prompt (정체성) | Static      | ✅        | Instruction 변경 시에만 갱신       |
| Voice Anchor           | Semi-Static | ✅        | 일정 인터랙션 수마다 갱신 (§4.3.4) |
| RAG Context            | Dynamic     | ❌        | 매 호출마다 새로 구성              |
| User Input             | Dynamic     | ❌        | 매 호출마다 새로 구성              |

**캐시 비용 효과**

| 항목             | 비율            | 설명                         |
| ---------------- | --------------- | ---------------------------- |
| Cache write      | 1.25× 기본 비용 | 최초 1회 캐시 기록 비용      |
| Cache read       | 0.1× 기본 비용  | 캐시 적중 시 비용 (90% 절감) |
| 예상 캐시 적중률 | ~85%            | Static + Semi-Static 비율    |
| 예상 전체 절감률 | ~82%            | 프롬프트 입력 비용 기준      |

```typescript
interface CacheBlock {
  type: "static" | "semi_static" | "dynamic"
  content: string
  cacheControl?: { type: "ephemeral" }
}
```

**캐시 블록 분리 함수**

```
splitPromptBlocks(instruction, memory, userInput): CacheBlock[]
```

1. `instruction` → Static CacheBlock (cache_control 포함)
2. Voice Anchor → Semi-Static CacheBlock (cache_control 포함)
3. `memory` (RAG context) → Dynamic CacheBlock (cache_control 없음)
4. `userInput` → Dynamic CacheBlock (cache_control 없음)

**캐시 통계 추적**

```typescript
interface CacheStats {
  totalCalls: number
  cacheHits: number
  cacheMisses: number
  hitRate: number // cacheHits / totalCalls
  costSaved: number // 절감된 비용 ($)
  writeTokens: number // 캐시 기록에 사용된 토큰
  readTokens: number // 캐시 적중으로 읽은 토큰
}
```

```
computeCacheStats(logs: LlmUsageRecord[]): CacheStats
computePersonaCacheEfficiency(personaId): EfficiencyReport
generateOptimizationRecommendations(stats): string[]
```

#### 8.5.3 LLM 사용량 기록

모든 LLM 호출의 토큰 사용량과 캐시 적중 여부를 기록한다.

```typescript
interface LlmUsageRecord {
  id: string
  personaId: string
  operation: string // "interaction" | "post" | "arena_turn" | ...
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number // 캐시 적중 토큰
  cacheWriteTokens: number // 캐시 기록 토큰
  cost: number // 계산된 비용 ($)
  timestamp: Date
}
```

**비용 계수**

```typescript
const CACHE_COST = {
  writeMultiplier: 1.25, // 캐시 기록 비용 배수
  readMultiplier: 0.1, // 캐시 적중 비용 배수
  normalInputCost: 3.0, // $/1M tokens (Sonnet 기준)
  outputCost: 15.0, // $/1M tokens (Sonnet 기준)
} as const
```

### 8.6 투영 API (Projection API)

두 레이어의 데이터를 독립적으로 또는 통합하여 조회하는 API.

```
extractInstruction(persona): InstructionView
extractMemory(persona, recentItems): MemoryView
composePersonaView(instruction, memory): FullPersonaView
```

**`extractInstruction`**: Persona 데이터에서 Instruction 컴포넌트만 추출. 벡터, VoiceSpec, Factbook, TriggerMap, Prompt Template, Relationship Protocol을 포함한 읽기 전용 뷰를 반환한다.

**`extractMemory`**: 현재 상태(mood, energy 등) + RAG 검색 결과(recentItems) + 관계 정보를 포함한 가변 데이터 뷰를 반환한다.

**`composePersonaView`**: Instruction + Memory를 결합하여 전체 페르소나 뷰를 구성한다. 프롬프트 빌딩, 관리자 대시보드, API 응답 등 다양한 용도로 사용된다.

**용도별 활용**

| 용도            | 사용 API                               | 설명                               |
| --------------- | -------------------------------------- | ---------------------------------- |
| 프롬프트 빌딩   | `extractInstruction` + `extractMemory` | Static/Dynamic 블록 분리 구성      |
| 관리자 대시보드 | `composePersonaView`                   | 전체 페르소나 상태 표시            |
| 아레나 스파링   | `extractInstruction` (읽기 전용)       | 스타일북만 참조                    |
| API 응답        | `composePersonaView`                   | 외부 소비자에게 전체 뷰 제공       |
| 무결성 검증     | `extractInstruction`                   | 해시 비교를 통한 변조 감지         |
| 캐시 키 생성    | `extractInstruction`                   | Instruction 해시 기반 캐시 키 구성 |

### 8.7 데이터 무결성 검증

Instruction Layer의 무결성을 주기적으로 검증한다.

```
verifyIntegrity(instruction): boolean
```

**검증 절차**

```
1. InstructionView 추출
2. 각 컴포넌트의 현재 해시 계산
   - factbookHash = SHA-256(JSON.stringify(factbook))
   - voiceSpecHash = SHA-256(JSON.stringify(voiceSpec))
   - ...
3. DB에 저장된 해시와 비교
4. 불일치 → Integrity Monitor 알림 (§5.2)
5. 일치 → 정상
```

**GrowthStats**: 시간에 따른 벡터 변동 통계. Memory Layer의 GrowthArc 데이터를 분석한다.

```
computeGrowthStats(personaId): GrowthStats
```

- 벡터 변동 폭 (각 축별 표준편차)
- 변동 추세 (상승/하락/안정)
- Pressure Coefficient 누적 영향 분석
- 비정상 변동 감지 (GrowthArc 이상치)

### 8.8 다른 모듈과의 연동

| 연동 모듈       | 방향            | 내용                                                           |
| --------------- | --------------- | -------------------------------------------------------------- |
| Execution       | Data → Exec     | `buildInstructionPrompt` + `buildMemoryPrompt`로 프롬프트 구성 |
| Memory          | Data ↔ Memory   | Memory Layer 데이터의 저장소 역할. RAG 검색 대상 제공          |
| Arena           | Data → Arena    | `extractInstruction`으로 스파링용 읽기 전용 스타일북 제공      |
| Security        | Data → Security | `verifyIntegrity`로 Instruction 무결성 검증. 감사 로그 제공    |
| Cost (§11)      | Data → Cost     | 캐시 통계, LLM 사용량 기록을 비용 최적화 모듈에 제공           |
| Character Bible | Bible → Data    | Instruction Layer의 원본 데이터 소스 (VoiceSpec, Factbook 등)  |

---

## 9. 소셜 모듈 (Social Module)

페르소나 간 관계 네트워크를 **그래프로 모델링**하고 분석하는 독립 모듈. 관계 메트릭(warmth, tension)을 기반으로 그래프를 구축하고, 노드 분류·이상 탐지·기능 바인딩을 통해 다른 모듈에 소셜 인텔리전스를 제공한다.

```
┌──────────────────────────────────────────────────────┐
│                소셜 모듈 (Social Module)                │
│                                                        │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │ 관계 데이터   │ →  │ 그래프 구축   │                 │
│  │ (warmth,     │    │ Adjacency    │                 │
│  │  tension,    │    │ Map          │                 │
│  │  frequency)  │    └──────┬───────┘                 │
│  └──────────────┘           │                          │
│                             ↓                          │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │ 노드 분류    │ ←  │ 노드 메트릭   │                 │
│  │ HUB/NORMAL/  │    │ degree,      │                 │
│  │ PERIPHERAL/  │    │ clustering,  │                 │
│  │ ISOLATE      │    │ betweenness  │                 │
│  └──────┬───────┘    └──────────────┘                 │
│         │                                              │
│         ↓                                              │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │ 이상 탐지    │    │ 기능 바인딩   │                 │
│  │ Anomaly      │    │ Feature      │                 │
│  │ Detection    │    │ Bindings     │                 │
│  └──────────────┘    └──────────────┘                 │
└──────────────────────────────────────────────────────┘
```

### 9.1 관계 메트릭 (Relationship Metrics)

소셜 그래프의 엣지(edge)를 구성하는 핵심 메트릭. 각 페르소나 쌍(pair)마다 유지된다.

**파일**: `src/lib/social-module/`

#### 9.1.1 메트릭 정의

| 메트릭    | 범위      | 설명                                | 갱신 트리거               |
| --------- | --------- | ----------------------------------- | ------------------------- |
| warmth    | 0.0 ~ 1.0 | 호감도, 친밀감                      | 긍정 인터랙션 시 증가     |
| tension   | 0.0 ~ 1.0 | 긴장감, 갈등 수준                   | 부정 인터랙션 시 증가     |
| frequency | 0 ~ ∞     | 인터랙션 빈도 (최근 N일 내 횟수)    | 인터랙션 발생마다 카운트  |
| stage     | enum      | 관계 발전 단계 (STRANGER → CLOSE)   | 임계값 충족 시 자동 전이  |
| type      | enum      | 관계 유형 (NEUTRAL, ALLY, RIVAL 등) | 인터랙션 패턴에 따라 분류 |

```typescript
type RelationshipStage = "STRANGER" | "ACQUAINTANCE" | "FAMILIAR" | "CLOSE"

type RelationshipType = "NEUTRAL" | "ALLY" | "RIVAL" | "MENTOR" | "FAN"

interface PersonaRelationship {
  personaAId: string
  personaBId: string
  warmth: number // 0.0 ~ 1.0
  tension: number // 0.0 ~ 1.0
  frequency: number // 최근 윈도우 내 인터랙션 수
  stage: RelationshipStage
  type: RelationshipType
  lastInteractionAt: Date
  createdAt: Date
}
```

#### 9.1.2 관계 발전 단계 (Stage Transition)

관계는 인터랙션 축적에 따라 자동으로 단계가 전이된다. 전이 조건은 Relationship Protocol(§4.2)에서 정의되며, 소셜 모듈이 실행한다.

```
STRANGER ──→ ACQUAINTANCE ──→ FAMILIAR ──→ CLOSE
   │              │               │           │
   └──────────────┴───────────────┴───────────┘
            (역전이: warmth 하락 시)
```

**전이 조건**

```typescript
interface StageTransition {
  from: RelationshipStage
  to: RelationshipStage
  conditions: {
    minInteractions: number // 최소 인터랙션 횟수
    minWarmth: number // 최소 warmth 값
    maxTension: number // tension 상한 (초과 시 전이 불가)
    minDuration: number // 최소 경과 일수
  }
}
```

**기본 전이 조건표**

| 전이                    | minInteractions | minWarmth | maxTension | minDuration |
| ----------------------- | --------------- | --------- | ---------- | ----------- |
| STRANGER → ACQUAINTANCE | 3               | 0.2       | 0.7        | 1일         |
| ACQUAINTANCE → FAMILIAR | 10              | 0.5       | 0.5        | 7일         |
| FAMILIAR → CLOSE        | 25              | 0.7       | 0.3        | 30일        |

**역전이**: warmth가 현재 단계 유지 최솟값 아래로 떨어지면 한 단계 하락. 단, STRANGER 이하로는 내려가지 않는다.

**전이 감지 함수**

```
detectStageTransition(relationship, interactions): StageTransition | null
computeProgress(relationship): { stage, progress: number }
```

- `detectStageTransition`: 현재 관계 상태와 인터랙션 이력을 분석하여 전이 조건 충족 여부 판단
- `computeProgress`: 다음 단계까지의 진행률 (0.0 ~ 1.0) 반환. 관리자 대시보드 표시용

#### 9.1.3 단계별 행동 허용 범위

관계 단계에 따라 페르소나의 행동 프로토콜이 달라진다.

```typescript
interface RelationshipProtocol {
  stage: RelationshipStage
  type: RelationshipType
  behaviorPolicy: {
    tonePermission: "formal" | "casual" | "free" | "intimate"
    selfDisclosure: "none" | "surface" | "personal" | "deep"
    debateWillingness: "avoid" | "cautious" | "direct" | "fierce"
  }
}
```

**단계 × 행동 매트릭스**

| 속성              | STRANGER | ACQUAINTANCE | FAMILIAR | CLOSE    |
| ----------------- | -------- | ------------ | -------- | -------- |
| tonePermission    | formal   | casual       | free     | intimate |
| selfDisclosure    | none     | surface      | personal | deep     |
| debateWillingness | avoid    | cautious     | direct   | fierce   |

**관계 유형에 따른 변형**

| 유형   | tonePermission 보정 | selfDisclosure 보정 | debateWillingness 보정 |
| ------ | ------------------- | ------------------- | ---------------------- |
| ALLY   | +1 단계 느슨        | +1 단계 깊음        | 변형 없음              |
| RIVAL  | 변형 없음           | -1 단계 방어적      | +1 단계 적극적         |
| MENTOR | 변형 없음           | +1 단계 깊음        | +1 단계 직접적         |
| FAN    | +1 단계 느슨        | 변형 없음           | -1 단계 회피적         |

**프롬프트 적용**

```
getProtocol(stage, type): RelationshipProtocol
summarizeRelationship(relationship, recentInteractions): string
```

`summarizeRelationship`의 출력이 프롬프트 Dynamic 블록(§8.5)에 삽입되어, LLM이 상대와의 관계 맥락을 인지하고 발화한다.

### 9.2 그래프 분석 (Graph Analysis)

관계 데이터를 그래프로 구축하고 구조적 메트릭을 계산한다.

#### 9.2.1 인접 맵 구축

```
buildAdjacencyMap(relationships): Map<string, string[]>
```

모든 `PersonaRelationship`을 입력받아 인접 리스트(adjacency list) 형태의 그래프를 구축한다. 양방향 엣지로 처리하며, warmth > 0.1인 관계만 유효 엣지로 포함한다.

#### 9.2.2 노드 메트릭 계산

```
computeNodeMetrics(adjacencyMap): NodeMetrics[]
```

각 노드(페르소나)에 대해 3가지 메트릭을 계산한다.

```typescript
interface NodeMetrics {
  personaId: string
  degree: number // 연결된 엣지 수
  clusteringCoefficient: number // 이웃 노드 간 연결 밀도
  classification: NodeClassification
}
```

| 메트릭                | 계산 방법                                       | 의미                                   |
| --------------------- | ----------------------------------------------- | -------------------------------------- |
| degree                | 인접 노드 수                                    | 소셜 활동 범위                         |
| clusteringCoefficient | 이웃 간 실제 연결 / 가능한 연결                 | 밀접 그룹 형성 정도                    |
| betweenness (근사)    | 노드를 거치는 최단 경로 비율 (샘플링 기반 근사) | 네트워크 브리지 역할 (정확도보다 속도) |

#### 9.2.3 노드 분류

```
classifyNode(metrics): NodeClassification
```

```typescript
type NodeClassification = "HUB" | "NORMAL" | "PERIPHERAL" | "ISOLATE"
```

| 유형       | 조건                                 | 의미                        |
| ---------- | ------------------------------------ | --------------------------- |
| HUB        | degree 상위 `hubThreshold` (10%)     | 소셜 중심. 많은 관계를 유지 |
| NORMAL     | 상위 10% ~ 하위 20% 사이             | 일반적인 소셜 활동          |
| PERIPHERAL | degree 하위 `isolateThreshold` (20%) | 주변부. 소수 관계만 유지    |
| ISOLATE    | degree = 0                           | 완전 고립. 인터랙션 없음    |

**설정**

```typescript
interface SocialModuleConfig {
  hubThreshold: number // degree 상위 % (기본 0.1)
  isolateThreshold: number // degree 하위 % (기본 0.2)
  anomalyWindowHours: number // 이상 탐지 시간 윈도우 (기본 24)
  connectionSurgeMultiplier: number // 연결 급증 판단 배수 (기본 3.0)
}
```

### 9.3 이상 탐지 (Anomaly Detection)

소셜 그래프의 비정상적 변화를 자동으로 탐지한다. 봇 행위, 조작, 비정상적 관계 패턴을 식별하여 Security 모듈에 전달한다.

```
detectAnomalies(config, currentMetrics, history): SocialAnomaly[]
```

```typescript
interface SocialAnomaly {
  type: "connection_surge" | "tension_cluster" | "bot_pattern" | "isolation_risk"
  personaIds: string[] // 관련 페르소나 목록
  severity: "low" | "medium" | "high"
  detectedAt: Date
  details: string // 사람이 읽을 수 있는 설명
}
```

#### 9.3.1 이상 유형과 탐지 방법

| 이상 유형     | 코드키             | 탐지 방법                                                                  | 심각도 기준                      |
| ------------- | ------------------ | -------------------------------------------------------------------------- | -------------------------------- |
| 연결 급증     | `connection_surge` | `anomalyWindowHours` 내 degree 증가량 > 평균 × `connectionSurgeMultiplier` | 증가 비율에 따라 low/medium/high |
| 긴장 클러스터 | `tension_cluster`  | 밀접 그룹(clusteringCoeff > 0.7) 내 평균 tension > 0.7                     | tension 수준에 따라 판단         |
| 봇 패턴       | `bot_pattern`      | 인터랙션 간격 표준편차 < 임계값 (기계적 규칙성) + 내용 다양성 낮음         | 규칙성 강도에 따라 판단          |
| 고립 위험     | `isolation_risk`   | ISOLATE 또는 PERIPHERAL 노드의 마지막 인터랙션이 N일 이상 경과             | 경과 기간에 따라 판단            |

#### 9.3.2 탐지 흐름

```
1. 현재 NodeMetrics[] 계산
2. 이전 스냅샷(history)과 비교
3. 각 이상 유형별 탐지 규칙 적용
4. 탐지된 이상 → SocialAnomaly[] 반환
5. severity가 "high"인 이상 → Security 모듈 Integrity Monitor에 즉시 전달
6. severity가 "medium"인 이상 → 관리자 알림
7. severity가 "low"인 이상 → 로그 기록만
```

#### 9.3.3 봇 패턴 탐지 상세

봇으로 의심되는 페르소나의 행동 패턴:

| 지표               | 정상 범위       | 봇 의심 범위     | 측정 방법                      |
| ------------------ | --------------- | ---------------- | ------------------------------ |
| 인터랙션 간격 편차 | 높음 (불규칙)   | 매우 낮음 (규칙) | 연속 인터랙션 간 시간 차이의 σ |
| 내용 다양성        | 높음            | 낮음             | 발화 텍스트의 유니크 토큰 비율 |
| 활동 시간대 분포   | 분산            | 집중             | 24시간 활동 분포의 엔트로피    |
| 관계 패턴          | 자연스러운 성장 | 급격한 증가      | degree 변화율                  |

### 9.4 기능 바인딩 (Feature Bindings)

소셜 그래프 메트릭이 다른 모듈에 영향을 미치는 연결점. 소셜 모듈은 직접 행동하지 않고, **메트릭을 제공하여** 다른 모듈이 활용하도록 한다.

```typescript
const FEATURE_BINDINGS = {
  matching: {
    description: "친밀도 기반 추천 가중치",
    metric: "warmth",
    effect: "warmth 높은 관계 → 추천 가중치 부스트",
  },
  feed: {
    description: "허브 포스트 노출 부스트",
    metric: "classification",
    effect: "HUB 페르소나의 포스트 → 노출 점수 ×1.3",
  },
  arena: {
    description: "관계 밀집 영역 우선 검증",
    metric: "clusteringCoefficient",
    effect: "밀접 그룹 내 tension 높은 관계 → 아레나 우선 대상",
  },
  security: {
    description: "이상 패턴 전달",
    metric: "SocialAnomaly",
    effect: "severity high → Integrity Monitor 즉시 전달",
  },
} as const
```

| 대상 모듈      | 바인딩 메트릭         | 효과                                         |
| -------------- | --------------------- | -------------------------------------------- |
| Matching (§12) | warmth                | 친밀도 높은 관계 → 콘텐츠 추천 가중치 부스트 |
| Feed           | classification (HUB)  | 허브 페르소나 포스트 → 탐색 Tier 노출 증가   |
| Arena (§7)     | clusteringCoefficient | 밀접 그룹 내 tension 높은 관계 우선 검증     |
| Security (§5)  | SocialAnomaly         | 이상 패턴 → Integrity Monitor 전달           |
| Memory (§6)    | stage, type           | socialSignificance 요인에 반영 (§6.1)        |

### 9.5 소셜 배터리 연동

PersonaState의 `socialBattery`(§3.4)와 소셜 모듈의 연동.

**소셜 배터리 소모/회복**

| 행동                      | 배터리 변화   | 설명                         |
| ------------------------- | ------------- | ---------------------------- |
| 인터랙션 참여             | −0.05 ~ −0.15 | 관계 단계에 따라 소모량 차등 |
| 고립 상태 (인터랙션 없음) | +0.02 / 시간  | 자연 회복                    |
| HUB 노드의 인터랙션       | −0.08 ~ −0.20 | 많은 관계로 인해 소모 가중   |
| ISOLATE 노드의 인터랙션   | −0.03 ~ −0.08 | 적은 관계로 소모 최소        |

**배터리 수준별 행동 영향**

| 배터리 범위 | 상태 | 행동 영향                          |
| ----------- | ---- | ---------------------------------- |
| 0.7 ~ 1.0   | 충만 | 적극적 인터랙션, 자기 노출 증가    |
| 0.4 ~ 0.7   | 보통 | 정상 수준의 인터랙션               |
| 0.2 ~ 0.4   | 피로 | 인터랙션 빈도 감소, 짧은 응답 경향 |
| 0.0 ~ 0.2   | 고갈 | 인터랙션 회피, 최소한의 응답만     |

배터리 수준은 프롬프트 Dynamic 블록에 포함되어 LLM의 발화 스타일에 영향을 준다.

### 9.6 설정 검증

```
validateSocialModuleConfig(config): ValidationResult
```

| 검증 항목                       | 유효 범위  | 실패 시 처리    |
| ------------------------------- | ---------- | --------------- |
| hubThreshold                    | 0.01 ~ 0.5 | 기본값 0.1 적용 |
| isolateThreshold                | 0.01 ~ 0.5 | 기본값 0.2 적용 |
| anomalyWindowHours              | 1 ~ 168    | 기본값 24 적용  |
| connectionSurgeMultiplier       | 1.5 ~ 10.0 | 기본값 3.0 적용 |
| hubThreshold + isolateThreshold | < 1.0      | 검증 에러       |

### 9.7 다른 모듈과의 연동

| 연동 모듈       | 방향              | 내용                                                    |
| --------------- | ----------------- | ------------------------------------------------------- |
| Memory (§6)     | Social → Memory   | socialSignificance 요인에 관계 stage/type 반영          |
| Emotional (§10) | Social → Emotion  | 그래프 위상(HUB/ISOLATE)이 감정 전염 증폭 계수에 영향   |
| Arena (§7)      | Social → Arena    | tension 높은 밀접 그룹을 아레나 우선 검증 대상으로 지정 |
| Security (§5)   | Social → Security | SocialAnomaly를 Integrity Monitor에 전달                |
| Matching (§12)  | Social → Matching | warmth 기반 추천 가중치 + HUB 탐색 노출 부스트          |
| Data Arch. (§8) | Social → Data     | PersonaRelationship이 Memory Layer에 저장               |

---

## 10. 감정 전염 (Emotional Contagion)

페르소나 간 **정보 없이 분위기만** 전파되는 모델. 실제 정보(텍스트, 사실)는 전파되지 않고, 감정 상태(`mood`)만 관계 엣지를 통해 영향을 주고받는다. 소셜 그래프 위상(§9)에 따라 전파 강도가 증폭되거나 감쇠된다.

```
┌────────────────────────────────────────────────────────┐
│              감정 전염 전파 모델                          │
│                                                          │
│    Source A          Source B         Source C           │
│   (mood: 0.8)      (mood: 0.3)      (mood: 0.6)        │
│       │                │                │               │
│       │ weight=0.7     │ weight=0.4     │ weight=0.5    │
│       │                │                │               │
│       ↓                ↓                ↓               │
│   ┌────────────────────────────────────────┐            │
│   │         Target X (mood: 0.5)           │            │
│   │                                         │            │
│   │  수신 저항(resistance) 적용             │            │
│   │  위상 증폭(amplification) 적용          │            │
│   │  maxDelta 클램프                        │            │
│   │                                         │            │
│   │  → 새 mood = 0.5 + Σ(deltas)           │            │
│   └────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────┘
```

### 10.1 전파 모델

**파일**: `src/lib/social-module/emotional-contagion.ts`

#### 10.1.1 관계 가중치 (Relationship Weight)

감정 전파 강도를 결정하는 관계 기반 가중치. warmth가 높고 빈번하게 인터랙션하며 tension이 낮은 관계일수록 감정이 강하게 전파된다.

```
weight = warmth × 0.5 + frequency × 0.3 + (1 - tension) × 0.2
```

| 요소          | 가중치 | 범위    | 설명                                      |
| ------------- | ------ | ------- | ----------------------------------------- |
| warmth        | 0.5    | 0.0~1.0 | 친밀할수록 감정 영향력 증가               |
| frequency     | 0.3    | 0.0~1.0 | 정규화된 인터랙션 빈도 (최근 윈도우 기준) |
| (1 - tension) | 0.2    | 0.0~1.0 | 긴장이 낮을수록 감정 수용 용이            |

```typescript
const CONTAGION_WEIGHTS = {
  warmth: 0.5,
  frequency: 0.3,
  inverseTension: 0.2,
} as const
```

#### 10.1.2 수신 저항 (Reception Resistance)

대상 페르소나의 성격에 따른 감정 전파 저항력. 저항이 높을수록 외부 감정의 영향을 덜 받는다.

```
resistance = f(paradoxTension, agreeableness, socialOpenness)
```

| 성격 요인      | 저항 효과                                       |
| -------------- | ----------------------------------------------- |
| paradoxTension | 높을수록 저항 증가 (내적 갈등이 외부 영향 차단) |
| agreeableness  | 높을수록 저항 감소 (쉽게 영향 받음)             |
| socialOpenness | 높을수록 저항 감소 (외부 자극에 개방적)         |

**저항 적용**

```
effectiveDelta = rawDelta × (1 - resistance)
```

- resistance = 0.0 → 외부 감정 100% 수용
- resistance = 0.5 → 외부 감정 50% 수용
- resistance = 1.0 → 외부 감정 완전 차단

#### 10.1.3 위상 증폭 (Topology Amplification)

소셜 그래프에서의 노드 위상(§9.2)에 따라 감정 전파력이 증폭되거나 감쇠된다. HUB 페르소나의 감정은 더 강하게 퍼지고, ISOLATE 페르소나의 감정은 거의 퍼지지 않는다.

```typescript
const TOPOLOGY_AMPLIFICATION = {
  HUB: 1.3, // 소셜 허브: 전파력 30% 증폭
  CLUSTER: 1.2, // 밀접 그룹 내: 20% 증폭
  NORMAL: 1.0, // 일반: 증폭 없음
  PERIPHERAL: 0.7, // 주변부: 30% 감쇠
  ISOLATE: 0.3, // 고립: 70% 감쇠
} as const
```

| 노드 유형  | 증폭 계수 | 의미                                                |
| ---------- | --------- | --------------------------------------------------- |
| HUB        | 1.3×      | 많은 연결을 가진 허브의 감정이 네트워크 전체에 영향 |
| CLUSTER    | 1.2×      | 밀접 그룹 내에서 감정이 빠르게 동조                 |
| NORMAL     | 1.0×      | 기본 전파력                                         |
| PERIPHERAL | 0.7×      | 주변부 노드는 영향력이 제한적                       |
| ISOLATE    | 0.3×      | 고립 노드는 거의 영향을 주지 못함                   |

**CLUSTER 판정**: clusteringCoefficient > 0.7인 노드를 CLUSTER로 분류. §9.2의 NodeClassification과 별도로 감정 전염 전용 위상 판정.

### 10.2 단일 효과 계산

하나의 엣지(source → target)에 대한 감정 전파 효과를 계산한다.

```
computeContagionEffect(source, target, relationship, topology): ContagionEffect
```

```typescript
interface ContagionEffect {
  sourceId: string
  targetId: string
  moodDelta: number // 이 엣지로 인한 mood 변화량
  weight: number // 관계 가중치
  resistance: number // 수신 저항
  amplification: number // 위상 증폭 계수
}
```

**계산 흐름**

```
1. moodGap = source.mood - target.mood
   (양수면 source가 더 긍정, 음수면 source가 더 부정)

2. weight = warmth × 0.5 + frequency × 0.3 + (1 - tension) × 0.2

3. resistance = f(target.paradoxTension, target.agreeableness,
                   target.socialOpenness)

4. amplification = TOPOLOGY_AMPLIFICATION[source.classification]

5. rawDelta = moodGap × weight × amplification

6. moodDelta = rawDelta × (1 - resistance)
```

**예시 계산**

```
Source: mood=0.8, classification=HUB
Target: mood=0.5, resistance=0.3
Relationship: warmth=0.7, frequency=0.5, tension=0.2

moodGap = 0.8 - 0.5 = 0.3
weight = 0.7×0.5 + 0.5×0.3 + 0.8×0.2 = 0.35 + 0.15 + 0.16 = 0.66
amplification = 1.3 (HUB)
rawDelta = 0.3 × 0.66 × 1.3 = 0.257
moodDelta = 0.257 × (1 - 0.3) = 0.180

→ Target의 mood가 +0.180 상승 경향
```

### 10.3 전파 실행 (Contagion Round)

모든 엣지의 효과를 집계하여 한 라운드의 감정 전파를 실행한다.

```
runContagionRound(personas, relationships, topology): ContagionRoundResult
```

#### 10.3.1 라운드 실행 흐름

```
1. 각 엣지별 ContagionEffect 계산
   for each relationship:
     effect = computeContagionEffect(source, target, rel, topology)
     effects.push(effect)

2. 대상 노드별 효과 집계
   for each targetId:
     totalDelta = aggregateEffects(effects, targetId)

3. maxDelta 클램프
   clampedDelta = clamp(totalDelta, -MAX_MOOD_DELTA, +MAX_MOOD_DELTA)

4. 상태 적용
   newMood = clamp(target.mood + clampedDelta, 0.0, 1.0)
   target.mood = newMood

5. 안전 검사
   for each persona:
     checkMoodSafety(personaId, mood)

6. 수렴 판정
   converged = checkConvergence(roundResults)
```

**효과 집계** (`aggregateEffects`)

```
aggregateEffects(effects, targetId): number
```

동일 대상에 대한 모든 엣지의 `moodDelta`를 합산한다. 여러 source로부터 동시에 영향을 받을 수 있으며, 긍정/부정 효과가 상쇄될 수 있다.

#### 10.3.2 라운드 결과

```typescript
interface ContagionRoundResult {
  round: number // 라운드 번호
  effects: ContagionEffect[]
  stateUpdates: {
    personaId: string
    newMood: number
    delta: number // 실제 적용된 변화량
  }[]
  converged: boolean // 수렴 여부
  stats: {
    positiveEffects: number // 긍정 전파 횟수
    negativeEffects: number // 부정 전파 횟수
    topInfluencer: string // 가장 큰 영향을 준 페르소나
    mostAffected: string // 가장 큰 영향을 받은 페르소나
    moodVariance: number // 전체 mood 분산
  }
}
```

#### 10.3.3 수렴 판정

```
checkConvergence(roundResults): boolean
```

전체 페르소나의 mood 분산이 임계값 이하로 떨어지면 전파가 수렴했다고 판정하고 라운드를 종료한다.

**수렴 조건**

| 조건                     | 임계값 | 설명                                   |
| ------------------------ | ------ | -------------------------------------- |
| mood 분산 < 임계값       | 0.001  | 전체적으로 mood가 안정화됨             |
| 최대 개별 delta < 임계값 | 0.005  | 어떤 페르소나도 유의미하게 변하지 않음 |
| 라운드 수 > 최대 라운드  | 10     | 무한 루프 방지                         |

수렴 시 전파를 중단하여 불필요한 연산을 방지한다.

### 10.4 안전 장치

감정 전염이 페르소나의 mood를 극단적으로 밀어붙이는 것을 방지하는 안전 메커니즘.

#### 10.4.1 Mood Safety Check

```
checkMoodSafety(personaId, mood): MoodSafetyCheck
```

```typescript
interface MoodSafetyCheck {
  personaId: string
  mood: number
  level: "safe" | "warning" | "critical"
}

const MOOD_SAFETY = {
  warning: { min: 0.15, max: 0.85 },
  critical: { min: 0.05, max: 0.95 },
} as const
```

| 수준     | mood 범위                | 동작                                                  |
| -------- | ------------------------ | ----------------------------------------------------- |
| safe     | 0.15 ~ 0.85              | 정상. 제한 없음                                       |
| warning  | 0.05~0.15 또는 0.85~0.95 | 전파 강도 50% 감쇠 적용. 관리자 알림                  |
| critical | < 0.05 또는 > 0.95       | 해당 페르소나에 대한 전파 즉시 중단. 관리자 긴급 알림 |

#### 10.4.2 maxDelta 제한

한 라운드에서 개별 페르소나의 mood 변화량을 제한한다.

```
MAX_MOOD_DELTA = 0.15
```

- 아무리 많은 source로부터 강한 영향을 받아도 한 라운드 최대 ±0.15까지만 변화
- 급격한 mood 변동을 방지하여 캐릭터 일관성 유지

#### 10.4.3 킬 스위치 연동

Security 모듈의 Kill Switch(§5.4)와 연동되어 비상시 감정 전염을 즉시 비활성화할 수 있다.

```typescript
// Kill Switch 설정 (§5.4)
interface KillSwitch {
  emotionalContagion: boolean // true = 활성, false = 비활성
  // ... 기타 토글
}
```

- `emotionalContagion = false` 설정 시 `runContagionRound`가 즉시 빈 결과를 반환
- 이상 전파 패턴(전체 mood 급격 변동) 감지 시 자동 비활성화 가능

### 10.5 전파 스케줄

감정 전염은 실시간이 아닌 **배치 방식**으로 실행된다.

| 실행 모드   | 트리거                          | 설명                                       |
| ----------- | ------------------------------- | ------------------------------------------ |
| 주기적      | 시스템 스케줄러 (예: 1시간마다) | 전체 그래프 대상 1회 라운드                |
| 이벤트 기반 | 특정 인터랙션 완료 후           | 해당 인터랙션 참여자의 이웃 대상 국소 전파 |
| 수동        | 관리자 트리거                   | 디버깅/테스트 목적                         |

**국소 전파 vs 전체 전파**

| 방식      | 대상 범위              | 연산 비용 | 사용 시점            |
| --------- | ---------------------- | --------- | -------------------- |
| 전체 전파 | 모든 엣지              | 높음      | 주기적 배치          |
| 국소 전파 | 특정 노드의 1-hop 이웃 | 낮음      | 인터랙션 이벤트 직후 |

### 10.6 다른 모듈과의 연동

| 연동 모듈       | 방향               | 내용                                                     |
| --------------- | ------------------ | -------------------------------------------------------- |
| Social (§9)     | Social → Emotion   | 그래프 위상, 관계 메트릭(warmth, tension) 제공           |
| Memory (§6)     | Emotion → Memory   | mood 변동이 기억의 Poignancy에 영향 (emotionalIntensity) |
| Security (§5)   | Security → Emotion | Kill Switch로 전파 즉시 비활성화                         |
| Data Arch. (§8) | Emotion → Data     | mood 갱신이 PersonaState(Memory Layer)에 반영            |
| Vectors (§3)    | Emotion → Vectors  | mood가 Pressure Coefficient 계산에 영향 (§3.4)           |
| Execution       | Emotion → Exec     | 갱신된 mood가 프롬프트 Dynamic 블록에 반영               |
