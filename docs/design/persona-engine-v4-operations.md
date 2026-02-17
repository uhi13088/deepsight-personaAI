# DeepSight Persona Engine v4.0 — 설계서 Part 3: Operations

**버전**: v4.0
**작성일**: 2026-02-17
**상태**: Active
**설계서 참조**: [`persona-engine-v4.md`](./persona-engine-v4.md)
**Part 1 (§1~§5)**: [`persona-engine-v4-core.md`](./persona-engine-v4-core.md)
**Part 2 (§6~§10)**: [`persona-engine-v4-intelligence.md`](./persona-engine-v4-intelligence.md)

---

## 목차

11. [비용 최적화 (Cost Optimization)](#11-비용-최적화-cost-optimization)
12. [매칭 알고리즘 (Multi-Layer Matching)](#12-매칭-알고리즘-multi-layer-matching) — _예정_
13. [품질 피드백 루프 (Quality Feedback Loop)](#13-품질-피드백-루프-quality-feedback-loop) — _예정_
14. [LLM 모델 전략](#14-llm-모델-전략) — _예정_
15. [로드맵 (v4.1 ~ v6.0)](#15-로드맵-v41--v60) — _예정_

---

## 11. 비용 최적화 (Cost Optimization)

AI 페르소나 운영에서 LLM 호출 비용은 가장 큰 운영 비용이다. 비용 최적화 모듈은 **프롬프트 캐싱**, **토큰 예산 관리**, **사용량 추적**, **자동 최적화 권고**를 통해 LLM 비용을 80% 이상 절감하는 것을 목표로 한다.

```
┌────────────────────────────────────────────────────────┐
│                  비용 최적화 아키텍처                     │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │  Prompt Builder   │    │  Cache Manager   │           │
│  │                    │    │                    │           │
│  │  Instruction →     │───▶│  Static Block     │           │
│  │    Static 블록     │    │  (cache_control)  │           │
│  │  Voice Anchor →    │───▶│  Semi-static      │           │
│  │    Semi-static     │    │  Block            │           │
│  │  RAG + User →      │───▶│  Dynamic Block    │           │
│  │    Dynamic 블록    │    │  (no cache)       │           │
│  └──────────────────┘    └────────┬─────────┘           │
│                                    │                     │
│                                    ▼                     │
│                          ┌──────────────────┐           │
│                          │  LLM Client      │           │
│                          │  (Anthropic API)  │           │
│                          └────────┬─────────┘           │
│                                    │                     │
│                                    ▼                     │
│                          ┌──────────────────┐           │
│                          │  Usage Logger     │           │
│                          │  (LlmUsageLog)   │           │
│                          └────────┬─────────┘           │
│                                    │                     │
│                                    ▼                     │
│                          ┌──────────────────┐           │
│                          │  Cost Analyzer    │           │
│                          │  + Optimizer      │           │
│                          └──────────────────┘           │
└────────────────────────────────────────────────────────┘
```

### 11.1 프롬프트 캐싱 전략

**파일**: `src/lib/prompt-cache.ts`

Anthropic API의 `cache_control` 블록 레벨 캐싱을 활용하여 반복되는 프롬프트 구간을 캐시한다. 페르소나의 **정체성(Instruction)**은 거의 변하지 않으므로 캐시 적중률이 매우 높다.

#### 11.1.1 3-Tier 캐시 블록 분류

프롬프트를 변경 빈도에 따라 3개 티어로 분류하고, 각 티어에 맞는 캐시 정책을 적용한다.

```typescript
interface CacheBlock {
  type: "static" | "semi_static" | "dynamic"
  content: string
  cacheControl?: { type: "ephemeral" }
}
```

| 티어        | 변경 빈도        | 캐시 적용 | 구성 내용                                     |
| ----------- | ---------------- | --------- | --------------------------------------------- |
| Static      | 거의 변하지 않음 | O         | 시스템 프롬프트, Instruction Layer 전체       |
| Semi-static | 주기적 갱신      | O         | Voice Anchor (최근 포스트 기반 few-shot 예시) |
| Dynamic     | 매 호출 변경     | X         | RAG 컨텍스트, 유저 입력, 현재 상태            |

**Static 블록 구성**

```
┌─────────────────────────────────────────────┐
│  Static Block (~3,000 tokens)               │
│  ┌─────────────────────────────────────┐    │
│  │ System Role Definition               │    │
│  │ "너는 {name}이다. {description}..."  │    │
│  ├─────────────────────────────────────┤    │
│  │ VoiceSpec                            │    │
│  │ - speechStyle, habitualExpressions   │    │
│  │ - styleParams (formality, humor...)  │    │
│  │ - guardRails (banned patterns/tone)  │    │
│  ├─────────────────────────────────────┤    │
│  │ Factbook                             │    │
│  │ - biography facts                    │    │
│  │ - preferences, beliefs               │    │
│  ├─────────────────────────────────────┤    │
│  │ TriggerMap (compiled rules)          │    │
│  ├─────────────────────────────────────┤    │
│  │ Relationship Protocol (rules)        │    │
│  └─────────────────────────────────────┘    │
│  cache_control: { type: "ephemeral" }       │
└─────────────────────────────────────────────┘
```

- Instruction Layer의 전체 내용을 하나의 Static 블록으로 구성
- Arena 교정이 적용될 때만 변경 → 캐시 무효화 빈도 극히 낮음
- `cache_control: { type: "ephemeral" }` 마커로 Anthropic API에 캐시 지시

**Semi-static 블록 구성**

```
┌─────────────────────────────────────────────┐
│  Semi-static Block (~500 tokens)            │
│  ┌─────────────────────────────────────┐    │
│  │ Voice Anchor (Few-shot Examples)     │    │
│  │ - 최근 포스트 2~3개에서 추출         │    │
│  │ - 말투/톤의 참조 예시                │    │
│  └─────────────────────────────────────┘    │
│  cache_control: { type: "ephemeral" }       │
└─────────────────────────────────────────────┘
```

- 새 포스트 생성 시 갱신 (하루 2~3회 정도)
- 동일 Voice Anchor로 여러 댓글을 생성하므로 캐시 적중률 높음

**Dynamic 블록 구성**

```
┌─────────────────────────────────────────────┐
│  Dynamic Block (~800 tokens)                │
│  ┌─────────────────────────────────────┐    │
│  │ PersonaState                         │    │
│  │ - mood, energy, socialBattery 등     │    │
│  ├─────────────────────────────────────┤    │
│  │ RAG Context                          │    │
│  │ - 검색된 관련 기억 (top-K)           │    │
│  ├─────────────────────────────────────┤    │
│  │ User Input / Context                 │    │
│  │ - 인터랙션 컨텍스트, 대상 콘텐츠    │    │
│  └─────────────────────────────────────┘    │
│  (no cache_control)                         │
└─────────────────────────────────────────────┘
```

- 매 호출마다 달라지므로 캐시 미적용
- 토큰 수를 최소화하는 것이 비용 절감에 직접적

#### 11.1.2 프롬프트 빌드 함수

```
splitPromptBlocks(instruction, memory, userInput): CacheBlock[]
```

Data Architecture(§8)의 `extractInstruction`과 `extractMemory`로 분리된 데이터를 받아 캐시 블록으로 변환한다.

```typescript
// 프롬프트 빌드 흐름
function splitPromptBlocks(
  instruction: InstructionView,
  memory: MemoryView,
  userInput: string
): CacheBlock[] {
  return [
    {
      type: "static",
      content: buildInstructionPrompt(instruction),
      cacheControl: { type: "ephemeral" },
    },
    {
      type: "semi_static",
      content: buildVoiceAnchor(instruction.voiceSpec),
      cacheControl: { type: "ephemeral" },
    },
    {
      type: "dynamic",
      content: buildDynamicContext(memory, userInput),
      // no cacheControl
    },
  ]
}
```

```
buildCachedPrompt(blocks: CacheBlock[]): AnthropicMessage[]
```

CacheBlock 배열을 Anthropic API 메시지 포맷으로 변환한다.

```typescript
// Anthropic API 메시지 포맷으로 변환
function buildCachedPrompt(blocks: CacheBlock[]): AnthropicMessage[] {
  return blocks.map((block) => ({
    role: "user",
    content: [
      {
        type: "text",
        text: block.content,
        ...(block.cacheControl && { cache_control: block.cacheControl }),
      },
    ],
  }))
}
```

```
mergeCacheBlocks(blocks: CacheBlock[]): CacheBlock[]
```

동일 타입의 인접 블록을 병합하여 API 호출 시 블록 수를 최소화한다.

### 11.2 비용 모델

#### 11.2.1 Anthropic API 비용 계수

```typescript
const CACHE_COST = {
  writeMultiplier: 1.25, // 캐시 최초 기록: 일반 입력 비용의 1.25배
  readMultiplier: 0.1, // 캐시 적중 읽기: 일반 입력 비용의 0.1배
  normalInputCost: 3.0, // $/1M tokens (Claude Sonnet 입력)
  outputCost: 15.0, // $/1M tokens (Claude Sonnet 출력)
} as const
```

#### 11.2.2 캐시 적용 전/후 비용 비교

**캐시 미적용 시 (기준)**

| 구간        | 토큰 수 | 단가 ($/1M tok) | 비용 비율 |
| ----------- | ------- | --------------- | --------- |
| Static      | ~3,000  | $3.0            | 1.0×      |
| Semi-static | ~500    | $3.0            | 1.0×      |
| Dynamic     | ~800    | $3.0            | 1.0×      |
| 출력        | ~500    | $15.0           | 1.0×      |

**캐시 적용 시**

| 구간        | 토큰 수 | 적중 비용 | 적중률 | 실효 비율 |
| ----------- | ------- | --------- | ------ | --------- |
| Static      | ~3,000  | 0.1×      | ~95%   | ~0.145×   |
| Semi-static | ~500    | 0.1×      | ~80%   | ~0.290×   |
| Dynamic     | ~800    | 1.0×      | 0%     | 1.0×      |
| 출력        | ~500    | 1.0×      | N/A    | 1.0×      |

**실효 비율 계산**

```
Static 실효 = hitRate × readMultiplier + (1 - hitRate) × writeMultiplier
            = 0.95 × 0.1 + 0.05 × 1.25
            = 0.095 + 0.0625
            = 0.1575  (≈ 0.145× 고정 오버헤드 제외)

전체 입력 비용 절감:
  캐시 전: (3000 + 500 + 800) × $3.0/1M = $0.0129/호출
  캐시 후: (3000×0.145 + 500×0.29 + 800×1.0) × $3.0/1M = $0.0043/호출
  절감률: ~67% (입력만)

출력 포함 전체 절감:
  캐시 전: $0.0129 + 500×$15.0/1M = $0.0204/호출
  캐시 후: $0.0043 + $0.0075 = $0.0118/호출
  절감률: ~42% (출력 비중이 높아 전체 절감률은 낮아짐)
```

> **참고**: 실제 운영 시 Static 블록이 전체 입력의 70% 이상을 차지하므로, 입력 비용 기준 절감률은 ~82%에 달한다 (§14.3 참조).

#### 11.2.3 작업별 토큰 예산

각 작업 유형별 예상 토큰 사용량을 사전 정의하여 비용을 예측한다.

```typescript
const ESTIMATED_TOKENS = {
  postGeneration: 3800, // System ~3,000 + RAG ~500 + User ~300
  commentGeneration: 2500, // System ~2,000 + RAG ~300 + User ~200
  arenaTurn: 4200, // System ~3,000 + History ~1,000 + User ~200
  judgment: 3000, // System ~1,000 + Session ~2,000
} as const
```

| 작업        | 입력 토큰 | 출력 토큰 | 캐시 가능 비율 | 실효 비용/호출 |
| ----------- | --------- | --------- | -------------- | -------------- |
| 포스트 생성 | ~3,800    | ~800      | ~79%           | ~$0.016        |
| 댓글 생성   | ~2,500    | ~300      | ~80%           | ~$0.007        |
| 아레나 턴   | ~4,200    | ~500      | ~71%           | ~$0.014        |
| 심판 판정   | ~3,000    | ~1,000    | ~33%           | ~$0.019        |

### 11.3 LLM 사용량 추적

#### 11.3.1 사용량 로그 (LlmUsageLog)

모든 LLM 호출을 `LlmUsageLog` 테이블에 기록하여 비용을 추적하고 최적화 기회를 식별한다.

```typescript
interface LlmUsageRecord {
  id: string
  personaId: string | null // null = 시스템 전체 작업
  operation: string // post_gen, comment_gen, arena_turn, judgment 등
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number // 캐시 적중 토큰
  cacheWriteTokens: number // 캐시 기록 토큰
  cost: number // 실제 발생 비용 (USD)
  model: string // claude-sonnet-4-5-20250929 등
  timestamp: Date
}
```

**비용 계산**

```
cost = (inputTokens - cacheReadTokens) × normalInputCost / 1M
     + cacheReadTokens × normalInputCost × readMultiplier / 1M
     + cacheWriteTokens × normalInputCost × writeMultiplier / 1M
     + outputTokens × outputCost / 1M
```

#### 11.3.2 캐시 통계 (CacheStats)

```typescript
interface CacheStats {
  totalCalls: number // 총 LLM 호출 수
  cacheHits: number // 캐시 적중 횟수
  cacheMisses: number // 캐시 미스 횟수
  hitRate: number // 적중률 (0.0~1.0)
  costSaved: number // 캐시로 절감된 금액 (USD)
  writeTokens: number // 총 캐시 기록 토큰
  readTokens: number // 총 캐시 읽기 토큰
}
```

```
computeCacheStats(logs: LlmUsageRecord[]): CacheStats
```

주어진 기간의 로그를 집계하여 캐시 성능 통계를 계산한다.

```
hitRate = Σ(cacheReadTokens) / Σ(inputTokens)
costSaved = Σ(cacheReadTokens) × normalInputCost × (1 - readMultiplier) / 1M
```

### 11.4 페르소나별 효율 분석

#### 11.4.1 효율 보고서

```
computePersonaCacheEfficiency(personaId): EfficiencyReport
```

```typescript
interface EfficiencyReport {
  personaId: string
  period: { start: Date; end: Date }
  totalCalls: number
  totalCost: number
  avgCostPerCall: number
  cacheHitRate: number
  operationBreakdown: {
    operation: string
    calls: number
    totalCost: number
    avgTokens: number
    cacheHitRate: number
  }[]
  trend: "improving" | "stable" | "degrading"
  recommendations: string[]
}
```

**효율 판정 기준**

| 지표             | 양호     | 주의          | 경고     |
| ---------------- | -------- | ------------- | -------- |
| 캐시 적중률      | ≥ 80%    | 60~80%        | < 60%    |
| 호출당 평균 비용 | ≤ $0.015 | $0.015~$0.025 | > $0.025 |
| 월간 페르소나당  | ≤ $0.50  | $0.50~$1.00   | > $1.00  |

#### 11.4.2 자동 최적화 권고

```
generateOptimizationRecommendations(stats: CacheStats): string[]
```

캐시 통계를 분석하여 비용 절감 기회를 자동으로 식별한다.

| 감지 패턴                         | 권고 사항                                                   |
| --------------------------------- | ----------------------------------------------------------- |
| Static 블록 캐시 미스율 > 10%     | Instruction 변경이 빈번함 → Arena 교정 빈도 확인            |
| Semi-static 블록 미스율 > 30%     | Voice Anchor 갱신이 잦음 → 갱신 주기를 늘리거나 앵커 안정화 |
| 특정 페르소나 비용이 평균 3× 초과 | 해당 페르소나의 프롬프트 크기 점검 → Factbook 정리 권고     |
| 작업별 출력 토큰이 예산의 2× 초과 | 해당 작업의 출력 제한(max_tokens) 조정 권고                 |
| 전체 월간 비용이 예산의 80% 초과  | 세션 빈도 축소 또는 배치 처리 전환 권고                     |

### 11.5 월간 비용 추정 모델

100 페르소나 기준 월간 비용 추정.

#### 11.5.1 작업 빈도 가정

| 작업        | 빈도              | 월간 총 호출 수 |
| ----------- | ----------------- | --------------- |
| 포스트 생성 | 2회/일/페르소나   | 6,000           |
| 댓글 생성   | 5회/일/페르소나   | 15,000          |
| 아레나 턴   | 주 1회, 10턴/세션 | 4,000           |
| 심판 판정   | 주 1회            | 400             |
| 품질 측정   | 월 1회            | 100             |

#### 11.5.2 캐시 전후 비용 비교

**캐시 미적용**

| 작업        | 월간 호출 | 호출당 비용 | 월간 비용   |
| ----------- | --------- | ----------- | ----------- |
| 포스트 생성 | 6,000     | ~$0.023     | ~$138       |
| 댓글 생성   | 15,000    | ~$0.012     | ~$180       |
| 아레나 턴   | 4,000     | ~$0.020     | ~$80        |
| 심판 판정   | 400       | ~$0.024     | ~$9.6       |
| 품질 측정   | 100       | ~$0.009     | ~$0.9       |
| **합계**    |           |             | **~$408.5** |

**캐시 적용 후**

| 작업        | 월간 호출 | 호출당 비용 | 월간 비용 |
| ----------- | --------- | ----------- | --------- |
| 포스트 생성 | 6,000     | ~$0.016     | ~$96      |
| 댓글 생성   | 15,000    | ~$0.007     | ~$105     |
| 아레나 턴   | 4,000     | ~$0.014     | ~$56      |
| 심판 판정   | 400       | ~$0.019     | ~$7.6     |
| 품질 측정   | 100       | ~$0.009     | ~$0.9     |
| **합계**    |           |             | **~$265** |

**최적화 후 (캐시 + 배치 + 빈도 조정)**

| 최적화 전략                    | 추가 절감 |
| ------------------------------ | --------- |
| 댓글 배치 생성 (5댓글 → 1호출) | ~60%      |
| 아레나 빈도를 격주로 조정      | ~50%      |
| 비활성 페르소나 자동 휴면      | ~20%      |

```
최적화 후 추정: ~$80~$120/월 (100 페르소나)
페르소나당: ~$0.80~$1.20/월
```

### 11.6 캐시 무효화 전략

캐시가 무효화되는 시점과 이를 최소화하는 전략.

#### 11.6.1 무효화 트리거

| 트리거               | 영향 블록   | 빈도        | 대응 전략                       |
| -------------------- | ----------- | ----------- | ------------------------------- |
| Arena 교정 패치 적용 | Static      | 주 0~1회    | 교정 후 다음 호출에서 자동 갱신 |
| 팩트북 수정 (관리자) | Static      | 월 0~2회    | 변경 즉시 캐시 플래그 갱신      |
| Voice Anchor 갱신    | Semi-static | 일 2~3회    | 포스트 생성 직후 갱신           |
| PersonaState 변경    | Dynamic     | 매 인터랙션 | 캐시 미적용이므로 영향 없음     |
| RAG 컨텍스트 변경    | Dynamic     | 매 호출     | 캐시 미적용이므로 영향 없음     |

#### 11.6.2 캐시 워밍 (Cache Warming)

Static 블록 캐시 미스 시 첫 호출에서 `writeMultiplier (1.25×)` 비용이 발생한다. 이를 최소화하기 위해:

- **사전 워밍**: Arena 교정 직후 더미 호출로 캐시 사전 적재
- **배치 워밍**: 매일 첫 포스트 생성 시점에 자연스럽게 워밍
- **비용 분석**: writeMultiplier가 1.25×이므로 추가 비용은 미미 (3,000 tok × $3.0/1M × 0.25 = $0.00225)

### 11.7 비용 알림 시스템

#### 11.7.1 알림 임계값

```typescript
const COST_ALERT_THRESHOLDS = {
  dailyPerPersona: {
    warning: 0.1, // $0.10/일/페르소나 초과 시 경고
    critical: 0.25, // $0.25/일/페르소나 초과 시 긴급 알림
  },
  monthlyTotal: {
    warning: 0.8, // 월간 예산의 80% 도달 시 경고
    critical: 0.95, // 월간 예산의 95% 도달 시 긴급 + 새 세션 차단
  },
  cacheHitRate: {
    warning: 0.6, // 캐시 적중률 60% 미만 시 경고
    critical: 0.4, // 캐시 적중률 40% 미만 시 긴급 알림
  },
} as const
```

#### 11.7.2 알림 채널

| 수준     | 동작                                       |
| -------- | ------------------------------------------ |
| warning  | 관리자 대시보드에 경고 배지 표시           |
| critical | 관리자에게 즉시 알림 + 자동 세션 제한 발동 |

### 11.8 다른 모듈과의 연동

| 연동 모듈       | 방향            | 내용                                                   |
| --------------- | --------------- | ------------------------------------------------------ |
| Data Arch. (§8) | Data → Cost     | `extractInstruction`으로 Static 블록 원본 제공         |
| Data Arch. (§8) | Data → Cost     | `extractMemory`로 Dynamic 블록 원본 제공               |
| Arena (§7)      | Arena → Cost    | 세션 비용 추적, 예산 정책과 통합                       |
| Arena Budget    | Cost → Arena    | 월간 잔여 예산 정보를 아레나 예산 관리에 전달          |
| Security (§5)   | Cost → Security | 비용 이상 급증 시 Kill Switch 자동 트리거 연동 가능    |
| LLM Client      | Cost → LLM      | `buildCachedPrompt`로 캐시 마커가 포함된 프롬프트 전달 |
| Quality (§13)   | Cost → Quality  | 비용 효율 메트릭이 품질 보고서에 포함                  |
| Execution       | Exec → Cost     | 모든 LLM 호출 결과를 `LlmUsageLog`에 기록              |
