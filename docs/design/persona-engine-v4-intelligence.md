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

| 상태      | 진입 조건                    | 가능한 전이            |
| --------- | ---------------------------- | ---------------------- |
| CREATED   | `createSession` 호출         | STARTED, CANCELLED     |
| STARTED   | `startSession` 호출          | COMPLETED, CANCELLED   |
| COMPLETED | maxTurns 도달 또는 예산 소진 | ARCHIVED               |
| CANCELLED | 관리자 취소 또는 시스템 에러 | (종료 상태)            |
| ARCHIVED  | 세션 완료 후 보관 처리       | EXPIRED                |
| EXPIRED   | 보관 기한(90일) 초과         | (종료 상태, 삭제 대상) |

```typescript
type ArenaSessionStatus = "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED" | "ARCHIVED" | "EXPIRED"

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
| 일일 교정 횟수    | `dailyCount < MAX_DAILY_CORRECTIONS (3)`        | 패치 큐 대기 (익일)    |
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
const MAX_DAILY_CORRECTIONS = 3
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

> **§8~§10은 다음 작업에서 구체화 예정**
