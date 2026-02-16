// ═══════════════════════════════════════════════════════════════
// Prompt Cache v4.0
// T152: Anthropic API-level 프롬프트 캐싱
//
// 기존 rag-llm/index.ts의 PromptCacheStore = 애플리케이션 레벨 캐시
// 이 모듈 = Anthropic API cache_control 블록 레벨 캐싱
//
// 핵심: 시스템 프롬프트를 static(캐시가능) + dynamic(변동) 블록으로 분리하여
// Anthropic API의 cache_control을 활용, input 토큰 비용 82% 절감
//
// LLM 비용: 0 (순수 규칙 기반)
// ═══════════════════════════════════════════════════════════════

// ── 타입 ────────────────────────────────────────────────────

/** Anthropic API cache_control 마커 */
export interface CacheControl {
  readonly type: "ephemeral"
}

/** 프롬프트 컨텐츠 블록 (Anthropic system 배열 형식) */
export interface PromptContentBlock {
  readonly type: "text"
  readonly text: string
  readonly cache_control?: CacheControl
}

/** 프롬프트 블록 분류 */
export type BlockCategory =
  | "persona_definition" // 페르소나 기본 정의 (L1/L2/L3/역설)
  | "voice_spec" // 보이스 스펙 (말투/스타일)
  | "system_instruction" // 시스템 지시사항 (고정)
  | "rag_context" // RAG 컨텍스트 (변동)
  | "few_shot" // Few-shot 예시 (반변동)
  | "current_context" // 현재 대화 컨텍스트 (변동)

/** 캐시 가능 여부 판정 */
export interface CacheEligibility {
  readonly eligible: boolean
  readonly reason: string
  readonly estimatedTokens: number
  readonly category: BlockCategory
}

/** 분리된 프롬프트 블록 */
export interface SplitPromptBlock {
  readonly category: BlockCategory
  readonly content: string
  readonly cacheable: boolean
  readonly estimatedTokens: number
}

/** cache_control 적용된 최종 시스템 프롬프트 */
export interface CacheAwareSystemPrompt {
  readonly blocks: readonly PromptContentBlock[]
  readonly totalBlocks: number
  readonly cachedBlocks: number
  readonly cachedTokens: number
  readonly dynamicTokens: number
  readonly totalTokens: number
  readonly estimatedSavingsPercent: number
}

/** API 응답의 캐시 사용 정보 */
export interface CacheUsageInfo {
  readonly cacheCreationInputTokens: number // 캐시에 새로 쓴 토큰 (1.25x 과금)
  readonly cacheReadInputTokens: number // 캐시에서 읽은 토큰 (0.1x 과금)
  readonly regularInputTokens: number // 일반 입력 토큰 (1x 과금)
  readonly outputTokens: number
}

/** 캐시 비용 계산 결과 */
export interface CacheCostBreakdown {
  readonly cacheWriteCostUSD: number // 생성 비용 (1.25x)
  readonly cacheReadCostUSD: number // 읽기 비용 (0.1x)
  readonly regularInputCostUSD: number // 일반 입력 비용
  readonly outputCostUSD: number
  readonly totalCostUSD: number
  readonly savingsUSD: number // 캐시 없이 전부 regular 대비 절감액
  readonly savingsPercent: number // 절감 비율
}

/** 캐시 통계 (모니터링용) */
export interface PromptCacheStats {
  readonly totalRequests: number
  readonly cacheHits: number // cacheReadInputTokens > 0
  readonly cacheMisses: number // cacheCreationInputTokens > 0 (첫 요청)
  readonly cacheNonEligible: number // 캐시 대상 아닌 요청
  readonly hitRate: number // 0~1
  readonly totalSavingsUSD: number
  readonly avgSavingsPercent: number
  readonly totalCachedTokens: number
  readonly totalRegularTokens: number
}

/** 캐시 사용 히스토리 항목 */
export interface CacheUsageEntry {
  readonly timestamp: number
  readonly personaId: string
  readonly callType: string
  readonly usage: CacheUsageInfo
  readonly cost: CacheCostBreakdown
}

/** 프롬프트 분리 입력 */
export interface PromptSplitInput {
  readonly systemPromptBase: string // [A] 페르소나 정의 (고정)
  readonly voiceSpec?: string // [A'] 보이스 스펙 (고정)
  readonly ragContext?: string // [B]+[C]+[D] RAG (변동)
  readonly fewShotExamples?: string // [E] Few-shot (반변동)
  readonly currentContext?: string // [F] 현재 컨텍스트 (변동)
}

// ── 상수 ────────────────────────────────────────────────────

/** Anthropic cache_control 최소 토큰 수 */
export const MIN_CACHEABLE_TOKENS = 1024

/** 한국어 평균 문자/토큰 비율 */
export const CHARS_PER_TOKEN = 3.5

/** 모델별 토큰 가격 (USD per 1M tokens) */
export const MODEL_TOKEN_PRICING = {
  "claude-sonnet-4-5-20250929": {
    inputPerM: 3,
    outputPerM: 15,
    cacheWritePerM: 3.75, // 1.25x input
    cacheReadPerM: 0.3, // 0.1x input
  },
  "claude-haiku-4-5-20251001": {
    inputPerM: 0.8,
    outputPerM: 4,
    cacheWritePerM: 1.0, // 1.25x input
    cacheReadPerM: 0.08, // 0.1x input
  },
} as const

export type CacheablModel = keyof typeof MODEL_TOKEN_PRICING

/** 기본 모델 */
export const DEFAULT_CACHE_MODEL: CacheablModel = "claude-sonnet-4-5-20250929"

/** 캐시 적용 임계값: 이 이상이면 cache_control 적용 권장 */
export const CACHE_BENEFIT_THRESHOLD = 0.1 // 10% 이상 절감 시

/** 캐시 블록 카테고리별 기본 cacheable 여부 */
const CATEGORY_CACHEABILITY: Record<BlockCategory, boolean> = {
  persona_definition: true, // 고정 → 항상 캐시
  voice_spec: true, // 고정 → 항상 캐시
  system_instruction: true, // 고정 → 항상 캐시
  rag_context: false, // 변동 → 캐시 안 함
  few_shot: false, // 반변동 → 기본 캐시 안 함 (큰 경우 가능)
  current_context: false, // 변동 → 캐시 안 함
}

// ══════════════════════════════════════════════════════════════
// 토큰 추정
// ══════════════════════════════════════════════════════════════

/** 텍스트의 토큰 수 추정 (한국어 기준) */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

// ══════════════════════════════════════════════════════════════
// 캐시 적격성 판정
// ══════════════════════════════════════════════════════════════

/** 블록의 캐시 적격성을 판정한다 */
export function checkCacheEligibility(content: string, category: BlockCategory): CacheEligibility {
  const estimatedTokens = estimateTokens(content)
  const categoryCacheable = CATEGORY_CACHEABILITY[category]

  if (!categoryCacheable) {
    return {
      eligible: false,
      reason: `카테고리 '${category}'는 변동성이 높아 캐시 대상이 아닙니다`,
      estimatedTokens,
      category,
    }
  }

  if (estimatedTokens < MIN_CACHEABLE_TOKENS) {
    return {
      eligible: false,
      reason: `토큰 수 ${estimatedTokens}이 최소 기준 ${MIN_CACHEABLE_TOKENS}에 미달합니다`,
      estimatedTokens,
      category,
    }
  }

  return {
    eligible: true,
    reason: "캐시 적격",
    estimatedTokens,
    category,
  }
}

// ══════════════════════════════════════════════════════════════
// 프롬프트 분리
// ══════════════════════════════════════════════════════════════

/** 프롬프트를 static/dynamic 블록으로 분리한다 */
export function splitPromptBlocks(input: PromptSplitInput): readonly SplitPromptBlock[] {
  const blocks: SplitPromptBlock[] = []

  // [A] 페르소나 정의 (항상 존재, 캐시 대상)
  if (input.systemPromptBase) {
    const tokens = estimateTokens(input.systemPromptBase)
    blocks.push({
      category: "persona_definition",
      content: input.systemPromptBase,
      cacheable: tokens >= MIN_CACHEABLE_TOKENS,
      estimatedTokens: tokens,
    })
  }

  // [A'] 보이스 스펙 (옵션, 캐시 대상)
  if (input.voiceSpec) {
    const tokens = estimateTokens(input.voiceSpec)
    blocks.push({
      category: "voice_spec",
      content: input.voiceSpec,
      cacheable: tokens >= MIN_CACHEABLE_TOKENS,
      estimatedTokens: tokens,
    })
  }

  // [B]+[C]+[D] RAG 컨텍스트 (변동, 캐시 안 함)
  if (input.ragContext) {
    blocks.push({
      category: "rag_context",
      content: input.ragContext,
      cacheable: false,
      estimatedTokens: estimateTokens(input.ragContext),
    })
  }

  // [E] Few-shot (반변동, 기본 캐시 안 함)
  if (input.fewShotExamples) {
    blocks.push({
      category: "few_shot",
      content: input.fewShotExamples,
      cacheable: false,
      estimatedTokens: estimateTokens(input.fewShotExamples),
    })
  }

  // [F] 현재 컨텍스트 (변동)
  if (input.currentContext) {
    blocks.push({
      category: "current_context",
      content: input.currentContext,
      cacheable: false,
      estimatedTokens: estimateTokens(input.currentContext),
    })
  }

  return blocks
}

/**
 * 인접한 작은 cacheable 블록을 병합하여 MIN_CACHEABLE_TOKENS를 충족시킨다.
 * 예: persona_definition(800tok) + voice_spec(600tok) → 합산 1400tok → cacheable
 */
export function mergeSmallCacheableBlocks(
  blocks: readonly SplitPromptBlock[]
): readonly SplitPromptBlock[] {
  const result: SplitPromptBlock[] = []
  let pendingCacheable: SplitPromptBlock[] = []

  for (const block of blocks) {
    if (CATEGORY_CACHEABILITY[block.category]) {
      pendingCacheable.push(block)
    } else {
      // non-cacheable을 만나면 pending을 flush
      if (pendingCacheable.length > 0) {
        result.push(...flushPendingCacheable(pendingCacheable))
        pendingCacheable = []
      }
      result.push(block)
    }
  }

  // 마지막 pending flush
  if (pendingCacheable.length > 0) {
    result.push(...flushPendingCacheable(pendingCacheable))
  }

  return result
}

function flushPendingCacheable(pending: SplitPromptBlock[]): SplitPromptBlock[] {
  // 이미 각각 cacheable이면 그대로 반환
  if (pending.every((b) => b.cacheable)) {
    return pending
  }

  // 합산하여 MIN_CACHEABLE_TOKENS 충족 여부 확인
  const totalTokens = pending.reduce((sum, b) => sum + b.estimatedTokens, 0)

  if (totalTokens >= MIN_CACHEABLE_TOKENS) {
    // 병합: 첫 블록의 카테고리 사용, 내용 합산
    const mergedContent = pending.map((b) => b.content).join("\n\n")
    return [
      {
        category: pending[0].category,
        content: mergedContent,
        cacheable: true,
        estimatedTokens: totalTokens,
      },
    ]
  }

  // 여전히 부족하면 cacheable: false로 반환
  return pending.map((b) => ({ ...b, cacheable: false }))
}

// ══════════════════════════════════════════════════════════════
// cache_control 블록 빌드
// ══════════════════════════════════════════════════════════════

/** SplitPromptBlock → Anthropic API PromptContentBlock 변환 */
export function buildCacheAwareSystemPrompt(
  blocks: readonly SplitPromptBlock[]
): CacheAwareSystemPrompt {
  const contentBlocks: PromptContentBlock[] = []
  let cachedBlocks = 0
  let cachedTokens = 0
  let dynamicTokens = 0

  for (const block of blocks) {
    if (!block.content) continue

    if (block.cacheable) {
      contentBlocks.push({
        type: "text",
        text: block.content,
        cache_control: { type: "ephemeral" },
      })
      cachedBlocks++
      cachedTokens += block.estimatedTokens
    } else {
      contentBlocks.push({
        type: "text",
        text: block.content,
      })
      dynamicTokens += block.estimatedTokens
    }
  }

  const totalTokens = cachedTokens + dynamicTokens
  const estimatedSavingsPercent =
    totalTokens > 0
      ? Math.round((cachedTokens / totalTokens) * 82) // 캐시된 부분의 82%만큼 절감
      : 0

  return {
    blocks: contentBlocks,
    totalBlocks: contentBlocks.length,
    cachedBlocks,
    cachedTokens,
    dynamicTokens,
    totalTokens,
    estimatedSavingsPercent,
  }
}

/**
 * 전체 파이프라인: 입력 → 분리 → 병합 → cache_control 빌드
 */
export function buildCacheAwarePrompt(input: PromptSplitInput): CacheAwareSystemPrompt {
  const rawBlocks = splitPromptBlocks(input)
  const mergedBlocks = mergeSmallCacheableBlocks(rawBlocks)
  return buildCacheAwareSystemPrompt(mergedBlocks)
}

// ══════════════════════════════════════════════════════════════
// 비용 계산
// ══════════════════════════════════════════════════════════════

/** API 응답의 캐시 사용 정보를 파싱한다 */
export function parseCacheUsage(apiResponse: {
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}): CacheUsageInfo {
  const usage = apiResponse.usage
  return {
    cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
    regularInputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  }
}

/** 캐시 사용 정보로부터 비용을 계산한다 */
export function computeCacheCost(
  usage: CacheUsageInfo,
  model: CacheablModel = DEFAULT_CACHE_MODEL
): CacheCostBreakdown {
  const pricing = MODEL_TOKEN_PRICING[model]

  const cacheWriteCostUSD = (usage.cacheCreationInputTokens / 1_000_000) * pricing.cacheWritePerM
  const cacheReadCostUSD = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheReadPerM
  const regularInputCostUSD = (usage.regularInputTokens / 1_000_000) * pricing.inputPerM
  const outputCostUSD = (usage.outputTokens / 1_000_000) * pricing.outputPerM

  const totalCostUSD = cacheWriteCostUSD + cacheReadCostUSD + regularInputCostUSD + outputCostUSD

  // 캐시 없이 전부 regular로 처리했을 경우의 비용
  const allInputTokens =
    usage.cacheCreationInputTokens + usage.cacheReadInputTokens + usage.regularInputTokens
  const noCacheCostUSD = (allInputTokens / 1_000_000) * pricing.inputPerM + outputCostUSD

  const savingsUSD = noCacheCostUSD - totalCostUSD
  const savingsPercent =
    noCacheCostUSD > 0 ? Math.round((savingsUSD / noCacheCostUSD) * 10000) / 100 : 0

  return {
    cacheWriteCostUSD: roundTo6(cacheWriteCostUSD),
    cacheReadCostUSD: roundTo6(cacheReadCostUSD),
    regularInputCostUSD: roundTo6(regularInputCostUSD),
    outputCostUSD: roundTo6(outputCostUSD),
    totalCostUSD: roundTo6(totalCostUSD),
    savingsUSD: roundTo6(Math.max(0, savingsUSD)),
    savingsPercent: Math.max(0, savingsPercent),
  }
}

/**
 * 캐시 적용 시 예상 비용 vs 미적용 시 비용 비교
 */
export function estimateCacheBenefit(
  cachedTokens: number,
  dynamicTokens: number,
  outputTokens: number,
  model: CacheablModel = DEFAULT_CACHE_MODEL
): {
  withCache: number
  withoutCache: number
  savingsUSD: number
  savingsPercent: number
  recommended: boolean
} {
  const pricing = MODEL_TOKEN_PRICING[model]

  // 캐시 적용 (첫 요청: write, 이후: read → 평균으로 read 70% 가정)
  const avgCacheInputCost =
    (cachedTokens / 1_000_000) * (pricing.cacheWritePerM * 0.3 + pricing.cacheReadPerM * 0.7)
  const dynamicCost = (dynamicTokens / 1_000_000) * pricing.inputPerM
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerM
  const withCache = avgCacheInputCost + dynamicCost + outputCost

  // 캐시 미적용
  const totalInputTokens = cachedTokens + dynamicTokens
  const withoutCache = (totalInputTokens / 1_000_000) * pricing.inputPerM + outputCost

  const savingsUSD = withoutCache - withCache
  const savingsPercent =
    withoutCache > 0 ? Math.round((savingsUSD / withoutCache) * 10000) / 100 : 0

  return {
    withCache: roundTo6(withCache),
    withoutCache: roundTo6(withoutCache),
    savingsUSD: roundTo6(Math.max(0, savingsUSD)),
    savingsPercent: Math.max(0, savingsPercent),
    recommended: savingsPercent >= CACHE_BENEFIT_THRESHOLD * 100,
  }
}

// ══════════════════════════════════════════════════════════════
// 캐시 통계
// ══════════════════════════════════════════════════════════════

/** 빈 통계를 생성한다 */
export function createEmptyCacheStats(): PromptCacheStats {
  return {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheNonEligible: 0,
    hitRate: 0,
    totalSavingsUSD: 0,
    avgSavingsPercent: 0,
    totalCachedTokens: 0,
    totalRegularTokens: 0,
  }
}

/** 캐시 사용 정보를 통계에 반영한다 */
export function updateCacheStats(
  stats: PromptCacheStats,
  usage: CacheUsageInfo,
  cost: CacheCostBreakdown
): PromptCacheStats {
  const isCacheHit = usage.cacheReadInputTokens > 0
  const isCacheMiss = usage.cacheCreationInputTokens > 0 && usage.cacheReadInputTokens === 0
  const isNonEligible = usage.cacheCreationInputTokens === 0 && usage.cacheReadInputTokens === 0

  const newTotalRequests = stats.totalRequests + 1
  const newCacheHits = stats.cacheHits + (isCacheHit ? 1 : 0)
  const newCacheMisses = stats.cacheMisses + (isCacheMiss ? 1 : 0)
  const newCacheNonEligible = stats.cacheNonEligible + (isNonEligible ? 1 : 0)

  const newTotalSavings = stats.totalSavingsUSD + cost.savingsUSD
  const newTotalCachedTokens =
    stats.totalCachedTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens
  const newTotalRegularTokens = stats.totalRegularTokens + usage.regularInputTokens

  const hitRate =
    newTotalRequests > 0 ? Math.round((newCacheHits / newTotalRequests) * 1000) / 1000 : 0

  const allTokens = newTotalCachedTokens + newTotalRegularTokens
  const avgSavingsPercent =
    allTokens > 0
      ? Math.round((newTotalCachedTokens / allTokens) * 82 * 10) / 10 // 캐시된 비율 × 82%
      : 0

  return {
    totalRequests: newTotalRequests,
    cacheHits: newCacheHits,
    cacheMisses: newCacheMisses,
    cacheNonEligible: newCacheNonEligible,
    hitRate,
    totalSavingsUSD: roundTo6(newTotalSavings),
    avgSavingsPercent,
    totalCachedTokens: newTotalCachedTokens,
    totalRegularTokens: newTotalRegularTokens,
  }
}

/** 캐시 통계 요약 (로그/디버그용) */
export function summarizeCacheStats(stats: PromptCacheStats): string {
  const lines = [
    `프롬프트 캐시 통계:`,
    `  총 요청: ${stats.totalRequests}건`,
    `  캐시 히트: ${stats.cacheHits}건 (${(stats.hitRate * 100).toFixed(1)}%)`,
    `  캐시 미스: ${stats.cacheMisses}건`,
    `  비적격: ${stats.cacheNonEligible}건`,
    `  총 절감: $${stats.totalSavingsUSD.toFixed(4)}`,
    `  평균 절감률: ${stats.avgSavingsPercent.toFixed(1)}%`,
    `  캐시 토큰: ${stats.totalCachedTokens.toLocaleString()}`,
    `  일반 토큰: ${stats.totalRegularTokens.toLocaleString()}`,
  ]
  return lines.join("\n")
}

// ══════════════════════════════════════════════════════════════
// 캐시 사용 히스토리
// ══════════════════════════════════════════════════════════════

/** 캐시 사용 히스토리 엔트리 생성 */
export function createCacheUsageEntry(
  personaId: string,
  callType: string,
  usage: CacheUsageInfo,
  cost: CacheCostBreakdown
): CacheUsageEntry {
  return {
    timestamp: Date.now(),
    personaId,
    callType,
    usage,
    cost,
  }
}

/** 히스토리에서 기간별 통계 집계 */
export function aggregateCacheHistory(
  entries: readonly CacheUsageEntry[],
  fromTimestamp: number,
  toTimestamp: number
): PromptCacheStats {
  const filtered = entries.filter((e) => e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp)

  let stats = createEmptyCacheStats()
  for (const entry of filtered) {
    stats = updateCacheStats(stats, entry.usage, entry.cost)
  }

  return stats
}

/** 페르소나별 캐시 효율 분석 */
export function analyzePerPersonaCacheEfficiency(
  entries: readonly CacheUsageEntry[]
): ReadonlyMap<string, { requests: number; hitRate: number; savingsUSD: number }> {
  const byPersona = new Map<string, CacheUsageEntry[]>()

  for (const entry of entries) {
    const existing = byPersona.get(entry.personaId) ?? []
    existing.push(entry)
    byPersona.set(entry.personaId, existing)
  }

  const result = new Map<string, { requests: number; hitRate: number; savingsUSD: number }>()

  for (const [personaId, personaEntries] of byPersona) {
    const hits = personaEntries.filter((e) => e.usage.cacheReadInputTokens > 0).length
    const savingsUSD = personaEntries.reduce((sum, e) => sum + e.cost.savingsUSD, 0)

    result.set(personaId, {
      requests: personaEntries.length,
      hitRate:
        personaEntries.length > 0 ? Math.round((hits / personaEntries.length) * 1000) / 1000 : 0,
      savingsUSD: roundTo6(savingsUSD),
    })
  }

  return result
}

// ══════════════════════════════════════════════════════════════
// 프롬프트 캐시 최적화 권고
// ══════════════════════════════════════════════════════════════

/** 캐시 최적화 권고 사항 */
export interface CacheOptimizationAdvice {
  readonly shouldEnableCache: boolean
  readonly reason: string
  readonly estimatedMonthlySavingsUSD: number
  readonly suggestedActions: readonly string[]
}

/** 사용 패턴 기반 캐시 최적화 권고 생성 */
export function generateCacheAdvice(
  stats: PromptCacheStats,
  monthlyRequestEstimate: number
): CacheOptimizationAdvice {
  const suggestedActions: string[] = []

  // 히트율이 낮으면
  if (stats.totalRequests > 10 && stats.hitRate < 0.3) {
    suggestedActions.push("시스템 프롬프트를 더 큰 단위로 병합하여 캐시 적격 토큰 수를 확보하세요")
  }

  // 비적격 비율이 높으면
  const nonEligibleRate = stats.totalRequests > 0 ? stats.cacheNonEligible / stats.totalRequests : 0
  if (nonEligibleRate > 0.5) {
    suggestedActions.push(
      "프롬프트가 너무 짧습니다. 페르소나 정의에 더 상세한 벡터 정보를 포함하세요"
    )
  }

  // 절감이 적으면
  if (stats.avgSavingsPercent < 10 && stats.totalRequests > 10) {
    suggestedActions.push(
      "Dynamic 블록 비율이 높습니다. RAG 컨텍스트를 축소하거나 static 프롬프트를 확장하세요"
    )
  }

  // 월간 추정 절감액
  const avgSavingsPerRequest =
    stats.totalRequests > 0 ? stats.totalSavingsUSD / stats.totalRequests : 0
  const estimatedMonthlySavingsUSD = roundTo6(avgSavingsPerRequest * monthlyRequestEstimate)

  const shouldEnableCache = stats.hitRate >= 0.2 || stats.totalRequests < 10
  const reason =
    stats.totalRequests < 10
      ? "데이터 부족: 더 많은 요청 후 재평가 권장"
      : stats.hitRate >= 0.5
        ? `높은 히트율 ${(stats.hitRate * 100).toFixed(1)}%: 캐시 효과적`
        : stats.hitRate >= 0.2
          ? `적당한 히트율 ${(stats.hitRate * 100).toFixed(1)}%: 캐시 유지 권장`
          : `낮은 히트율 ${(stats.hitRate * 100).toFixed(1)}%: 프롬프트 구조 개선 필요`

  return {
    shouldEnableCache,
    reason,
    estimatedMonthlySavingsUSD,
    suggestedActions,
  }
}

// ── 유틸 ────────────────────────────────────────────────────

function roundTo6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}
