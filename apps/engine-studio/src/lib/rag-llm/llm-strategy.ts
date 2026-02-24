// ═══════════════════════════════════════════════════════════════
// LLM Strategy — 2-Tier model config, dynamic router,
// provider adapter, Prompt Caching
// ═══════════════════════════════════════════════════════════════

import { roundTo } from "./types"

// ── Model Tier ─────────────────────────────────────────────────

/**
 * 2-Tier 모델 분류.
 * - tier1_heavy: 생성/복잡한 작업 (Anthropic Sonnet 급)
 * - tier2_light: 매칭/검증/단순 작업 (OpenAI mini 또는 규칙 기반)
 */
export type ModelTier = "tier1_heavy" | "tier2_light"

export type LLMProvider = "anthropic" | "openai" | "rule-based"

export interface ModelConfig {
  readonly tier: ModelTier
  readonly provider: LLMProvider
  readonly model: string | null // rule-based는 null
  readonly maxTokens: number
  readonly costPerInputMToken: number // $/M input tokens
  readonly costPerOutputMToken: number // $/M output tokens
  readonly temperature: number
}

export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  tier1_heavy: {
    tier: "tier1_heavy",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    maxTokens: 4096,
    costPerInputMToken: 3.0,
    costPerOutputMToken: 15.0,
    temperature: 0.7,
  },
  tier2_light: {
    tier: "tier2_light",
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 4096,
    costPerInputMToken: 0.15,
    costPerOutputMToken: 0.6,
    temperature: 0.5,
  },
} as const

// ── Tier Routing ──────────────────────────────────────────────

export type TaskType =
  | "persona-generation"
  | "review"
  | "post"
  | "comment"
  | "chat"
  | "reaction"
  | "matching"
  | "validation"

export interface TierRoutingInput {
  readonly personaId: string
  readonly paradoxScore: number
  readonly task: TaskType
  readonly pressure?: number
  readonly triggerDetected?: boolean
  readonly conflictScore?: number
  readonly expectedResponseLength?: number
}

export interface TierRoutingRule {
  readonly name: string
  readonly condition: (input: TierRoutingInput) => boolean
  readonly tier: ModelTier
  readonly priority: number // 낮을수록 우선
}

export interface TierRoutingConfig {
  readonly rules: readonly TierRoutingRule[]
  readonly defaultTier: ModelTier
  readonly tokenBudgetPerRequest: number
  readonly dailyTokenBudget: number
}

/**
 * 기본 Tier 라우팅 규칙.
 *
 * Heavy (Tier1):
 *   - paradoxScore > 0.5 (역설 표현 필요)
 *   - pressure > 0.4 (내면 드러남)
 *   - triggerDetected (상황 트리거)
 *   - conflictScore > 0.7 (갈등 상황)
 *   - task == 'persona-generation' | 'review'
 *
 * Light (Tier2): 나머지 전부
 */
export const DEFAULT_ROUTING_RULES: readonly TierRoutingRule[] = [
  {
    name: "persona-generation-heavy",
    condition: (input) => input.task === "persona-generation",
    tier: "tier1_heavy",
    priority: 1,
  },
  {
    name: "review-heavy",
    condition: (input) => input.task === "review",
    tier: "tier1_heavy",
    priority: 2,
  },
  {
    name: "high-paradox-heavy",
    condition: (input) => input.paradoxScore > 0.5,
    tier: "tier1_heavy",
    priority: 3,
  },
  {
    name: "high-pressure-heavy",
    condition: (input) => (input.pressure ?? 0) > 0.4,
    tier: "tier1_heavy",
    priority: 4,
  },
  {
    name: "trigger-detected-heavy",
    condition: (input) => input.triggerDetected === true,
    tier: "tier1_heavy",
    priority: 5,
  },
  {
    name: "conflict-heavy",
    condition: (input) => (input.conflictScore ?? 0) > 0.7,
    tier: "tier1_heavy",
    priority: 6,
  },
  {
    name: "short-response-light",
    condition: (input) => (input.expectedResponseLength ?? 200) < 50,
    tier: "tier2_light",
    priority: 7,
  },
  {
    name: "reaction-light",
    condition: (input) => input.task === "reaction",
    tier: "tier2_light",
    priority: 8,
  },
  {
    name: "matching-light",
    condition: (input) => input.task === "matching",
    tier: "tier2_light",
    priority: 9,
  },
  {
    name: "validation-light",
    condition: (input) => input.task === "validation",
    tier: "tier2_light",
    priority: 10,
  },
] as const

export const DEFAULT_ROUTING_CONFIG: TierRoutingConfig = {
  rules: DEFAULT_ROUTING_RULES,
  defaultTier: "tier2_light",
  tokenBudgetPerRequest: 8192,
  dailyTokenBudget: 5_000_000,
} as const

/**
 * 입력 조건에 따라 적절한 모델 Tier를 결정한다.
 * 우선순위가 높은(숫자가 낮은) 규칙이 먼저 매칭된다.
 */
export function routeToTier(
  input: TierRoutingInput,
  config: TierRoutingConfig = DEFAULT_ROUTING_CONFIG
): ModelTier {
  const sortedRules = [...config.rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sortedRules) {
    if (rule.condition(input)) {
      return rule.tier
    }
  }

  return config.defaultTier
}

/**
 * 라우팅 결정에 대한 설명을 반환한다 (디버깅/로깅용).
 */
export function explainRouting(
  input: TierRoutingInput,
  config: TierRoutingConfig = DEFAULT_ROUTING_CONFIG
): TierRoutingExplanation {
  const sortedRules = [...config.rules].sort((a, b) => a.priority - b.priority)
  const matchedRules: string[] = []
  let selectedTier: ModelTier = config.defaultTier
  let selectedRuleName = "default"

  for (const rule of sortedRules) {
    if (rule.condition(input)) {
      matchedRules.push(rule.name)
      if (matchedRules.length === 1) {
        selectedTier = rule.tier
        selectedRuleName = rule.name
      }
    }
  }

  return {
    input,
    selectedTier,
    selectedRuleName,
    matchedRules,
    modelConfig: MODEL_CONFIGS[selectedTier],
  }
}

export interface TierRoutingExplanation {
  readonly input: TierRoutingInput
  readonly selectedTier: ModelTier
  readonly selectedRuleName: string
  readonly matchedRules: readonly string[]
  readonly modelConfig: ModelConfig
}

// ── Provider Adapter ──────────────────────────────────────────

/**
 * LLM 프로바이더 어댑터 인터페이스.
 * 다양한 LLM 제공자를 통일된 인터페이스로 호출한다.
 */
export interface ProviderAdapter {
  readonly provider: LLMProvider
  sendRequest(request: LLMRequest): Promise<LLMResponse>
  estimateCost(inputTokens: number, outputTokens: number): CostEstimate
}

export interface LLMRequest {
  readonly systemPrompt: string
  readonly ragContext?: string
  readonly messages: readonly LLMMessage[]
  readonly tier: ModelTier
  readonly enableCaching?: boolean
  readonly maxTokens?: number
  readonly temperature?: number
}

export interface LLMMessage {
  readonly role: "user" | "assistant"
  readonly content: string
}

export interface LLMResponse {
  readonly content: string
  readonly tier: ModelTier
  readonly provider: LLMProvider
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cached: boolean
  readonly latencyMs: number
}

export interface CostEstimate {
  readonly provider: LLMProvider
  readonly inputCostUSD: number
  readonly outputCostUSD: number
  readonly totalCostUSD: number
  readonly cached: boolean
  readonly savingsUSD: number // 캐시 적중 시 절감액
}

/**
 * 비용 추정: 주어진 토큰 수와 모델 설정으로 비용을 계산한다.
 */
export function estimateRequestCost(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number,
  cached: boolean = false
): CostEstimate {
  const config = MODEL_CONFIGS[tier]
  const inputCostUSD = (inputTokens / 1_000_000) * config.costPerInputMToken
  const outputCostUSD = (outputTokens / 1_000_000) * config.costPerOutputMToken

  // Anthropic 캐시 적중 시 input 82% 절감
  const cachedInputCost =
    cached && config.provider === "anthropic" ? inputCostUSD * 0.18 : inputCostUSD
  const savings = cached ? inputCostUSD - cachedInputCost : 0

  return {
    provider: config.provider,
    inputCostUSD: roundTo(cached ? cachedInputCost : inputCostUSD, 6),
    outputCostUSD: roundTo(outputCostUSD, 6),
    totalCostUSD: roundTo((cached ? cachedInputCost : inputCostUSD) + outputCostUSD, 6),
    cached,
    savingsUSD: roundTo(savings, 6),
  }
}

// ── Prompt Cache ──────────────────────────────────────────────

/**
 * 프롬프트 캐시: 컴파일된 프롬프트를 재사용하여 비용/시간 절감.
 *
 * Anthropic cache_control 구조:
 * - 시스템 프롬프트 + 벡터/역설 정의 → 캐시 블록 (5분 TTL)
 * - RAG 컨텍스트 → 변동이므로 별도 블록
 */
export interface PromptCache {
  readonly key: string
  readonly compiledPrompt: string
  readonly createdAt: number
  readonly ttlMs: number
  readonly hitCount: number
}

export interface PromptCacheStore {
  readonly entries: ReadonlyMap<string, PromptCache>
  readonly maxEntries: number
  readonly totalHits: number
  readonly totalMisses: number
}

/**
 * 새 프롬프트 캐시를 생성한다.
 */
export function createPromptCache(
  key: string,
  compiledPrompt: string,
  ttlMs: number = 300_000 // 기본 5분
): PromptCache {
  return {
    key,
    compiledPrompt,
    createdAt: Date.now(),
    ttlMs,
    hitCount: 0,
  }
}

/**
 * 캐시된 프롬프트를 조회한다. 만료되었으면 null을 반환한다.
 */
export function getCachedPrompt(
  store: PromptCacheStore,
  key: string
): { prompt: PromptCache | null; store: PromptCacheStore } {
  const entry = store.entries.get(key)

  if (!entry) {
    return {
      prompt: null,
      store: {
        ...store,
        totalMisses: store.totalMisses + 1,
      },
    }
  }

  const now = Date.now()
  if (now - entry.createdAt > entry.ttlMs) {
    // 만료 → 삭제
    const newEntries = new Map(store.entries)
    newEntries.delete(key)
    return {
      prompt: null,
      store: {
        ...store,
        entries: newEntries,
        totalMisses: store.totalMisses + 1,
      },
    }
  }

  // 히트 카운트 업데이트
  const updatedEntry: PromptCache = {
    ...entry,
    hitCount: entry.hitCount + 1,
  }
  const newEntries = new Map(store.entries)
  newEntries.set(key, updatedEntry)

  return {
    prompt: updatedEntry,
    store: {
      ...store,
      entries: newEntries,
      totalHits: store.totalHits + 1,
    },
  }
}

/**
 * 특정 키의 캐시를 무효화한다.
 */
export function invalidateCache(store: PromptCacheStore, key: string): PromptCacheStore {
  const newEntries = new Map(store.entries)
  newEntries.delete(key)
  return {
    ...store,
    entries: newEntries,
  }
}

/**
 * 페르소나 ID 기반으로 관련 캐시를 모두 무효화한다.
 */
export function invalidateCacheByPersona(
  store: PromptCacheStore,
  personaId: string
): PromptCacheStore {
  const newEntries = new Map(store.entries)
  for (const [key] of newEntries) {
    if (key.includes(personaId)) {
      newEntries.delete(key)
    }
  }
  return {
    ...store,
    entries: newEntries,
  }
}

/**
 * 만료된 캐시 엔트리를 모두 정리한다.
 */
export function purgeExpiredCache(store: PromptCacheStore): PromptCacheStore {
  const now = Date.now()
  const newEntries = new Map<string, PromptCache>()

  for (const [key, entry] of store.entries) {
    if (now - entry.createdAt <= entry.ttlMs) {
      newEntries.set(key, entry)
    }
  }

  return {
    ...store,
    entries: newEntries,
  }
}

/**
 * 빈 프롬프트 캐시 스토어를 생성한다.
 */
export function createPromptCacheStore(maxEntries: number = 1000): PromptCacheStore {
  return {
    entries: new Map<string, PromptCache>(),
    maxEntries,
    totalHits: 0,
    totalMisses: 0,
  }
}

/**
 * 프롬프트 캐시에 새 엔트리를 추가한다.
 * 최대 엔트리 수를 초과하면 가장 오래된 것을 제거한다.
 */
export function addToPromptCache(store: PromptCacheStore, cache: PromptCache): PromptCacheStore {
  const newEntries = new Map(store.entries)

  // LRU: 초과 시 가장 오래된 엔트리 제거
  if (newEntries.size >= store.maxEntries && !newEntries.has(cache.key)) {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of newEntries) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = key
      }
    }

    if (oldestKey !== null) {
      newEntries.delete(oldestKey)
    }
  }

  newEntries.set(cache.key, cache)

  return {
    ...store,
    entries: newEntries,
  }
}
