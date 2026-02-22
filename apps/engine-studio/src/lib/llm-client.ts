// ═══════════════════════════════════════════════════════════════
// LLM Client — Anthropic SDK 기반 통합 클라이언트
// 페르소나 테스트 생성 및 향후 LLM 호출에 공통 사용
// T143: Prompt Caching 지원 — 정적 prefix를 캐시하여 비용 절감
// ═══════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { createSafetyFilter, evaluateFilter } from "@/lib/global-config"
import type { SafetyFilter, FilterAction } from "@/lib/global-config"
import type { Prisma } from "@/generated/prisma"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface LLMGenerateParams {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
  callType?: string
  personaId?: string
  /**
   * 정적 시스템 프롬프트 prefix (캐시 대상).
   * 팩트북 + 보이스 스펙 + 기본 역할 등 매 호출 동일한 부분.
   * 지정 시 systemPrompt은 동적 suffix로 취급됨.
   */
  systemPromptPrefix?: string
}

export interface LLMGenerateResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  stopReason: string | null
  /** 캐시 생성 시 사용된 입력 토큰 (Anthropic API) */
  cacheCreationInputTokens: number
  /** 캐시 히트 시 읽은 입력 토큰 (Anthropic API) */
  cacheReadInputTokens: number
}

// ── 모델별 가격 (USD per 1M tokens) ─────────────────────────

const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "claude-sonnet-4-5-20250929": { inputPerM: 3, outputPerM: 15 },
  "claude-haiku-4-5-20251001": { inputPerM: 0.8, outputPerM: 4 },
}

/** 캐시 관련 가격 배율 (Anthropic 공식 문서 기준) */
const CACHE_PRICING = {
  /** 캐시 write: 기본 입력 토큰 가격의 25% 추가 */
  creationMultiplier: 1.25,
  /** 캐시 read: 기본 입력 토큰 가격의 10% */
  readMultiplier: 0.1,
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { inputPerM: 3, outputPerM: 15 }
  return (inputTokens * pricing.inputPerM + outputTokens * pricing.outputPerM) / 1_000_000
}

/** 캐싱 절감액 계산: 캐시 읽기 토큰에 대해 정규 가격 대비 절감된 금액 */
export function calculateCacheSavings(
  model: string,
  cacheCreationTokens: number,
  cacheReadTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? { inputPerM: 3, outputPerM: 15 }
  const inputPricePerToken = pricing.inputPerM / 1_000_000

  // 캐시 읽기: 정규 가격의 10%만 과금 → 90% 절감
  const readSavings = cacheReadTokens * inputPricePerToken * (1 - CACHE_PRICING.readMultiplier)
  // 캐시 생성: 25% 추가 비용
  const creationCost =
    cacheCreationTokens * inputPricePerToken * (CACHE_PRICING.creationMultiplier - 1)

  return Math.max(0, readSavings - creationCost)
}

// ── 클라이언트 싱글턴 ────────────────────────────────────────

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export function isLLMConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

// ── 시스템 프롬프트 빌더 ─────────────────────────────────────

type SystemBlock = Anthropic.TextBlockParam & {
  cache_control?: { type: "ephemeral" }
}

/**
 * 시스템 프롬프트를 Anthropic cache_control 블록으로 변환.
 *
 * - systemPromptPrefix가 있으면: prefix에 cache_control 태그 + suffix는 일반 블록
 * - systemPromptPrefix가 없으면: 전체를 단일 문자열로 전달 (캐시 미사용)
 */
export function buildSystemBlocks(
  systemPrompt: string,
  systemPromptPrefix?: string
): string | SystemBlock[] {
  if (!systemPromptPrefix) {
    return systemPrompt
  }

  const blocks: SystemBlock[] = [
    {
      type: "text" as const,
      text: systemPromptPrefix,
      cache_control: { type: "ephemeral" as const },
    },
  ]

  if (systemPrompt) {
    blocks.push({
      type: "text" as const,
      text: systemPrompt,
    })
  }

  return blocks
}

// ── 안전 필터 연동 ───────────────────────────────────────────

export class SafetyFilterBlockedError extends Error {
  action: FilterAction
  matchedWords: string[]
  constructor(action: FilterAction, matchedWords: string[]) {
    super(`안전 필터에 의해 차단됨: ${matchedWords.join(", ")}`)
    this.name = "SafetyFilterBlockedError"
    this.action = action
    this.matchedWords = matchedWords
  }
}

async function loadSafetyFilter(): Promise<SafetyFilter> {
  const rows = await prisma.systemConfig.findMany({ where: { category: "SAFETY" } })
  if (rows.length === 0) return createSafetyFilter()
  const configMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const defaults = createSafetyFilter()
  return {
    config: (configMap.config ?? defaults.config) as SafetyFilter["config"],
    logs: (configMap.logs ?? defaults.logs) as SafetyFilter["logs"],
  }
}

async function saveSafetyFilterLogs(filter: SafetyFilter): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: "SAFETY", key: "logs" } },
    update: { value: filter.logs as unknown as Prisma.InputJsonValue },
    create: {
      category: "SAFETY",
      key: "logs",
      value: filter.logs as unknown as Prisma.InputJsonValue,
    },
  })
}

// ── 생성 함수 ─────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929"
const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_TEMPERATURE = 0.7

export async function generateText(params: LLMGenerateParams): Promise<LLMGenerateResult> {
  const client = getClient()
  const model = DEFAULT_MODEL
  const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = params.temperature ?? DEFAULT_TEMPERATURE

  const startTime = Date.now()
  let result: LLMGenerateResult

  try {
    // ── 안전 필터 사전 검사 ──────────────────────────────────
    const safetyFilter = await loadSafetyFilter()
    if (safetyFilter.config.level !== "off") {
      const { result: filterResult, updatedFilter } = evaluateFilter(
        safetyFilter,
        params.userMessage
      )
      // 로그 저장 (비동기, 실패 무시)
      saveSafetyFilterLogs(updatedFilter).catch(() => {})

      if (filterResult.action === "block") {
        throw new SafetyFilterBlockedError(
          filterResult.action,
          filterResult.matchedWords.map((m) => m.word)
        )
      }
    }

    const systemContent = buildSystemBlocks(params.systemPrompt, params.systemPromptPrefix)

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemContent,
      messages: [{ role: "user", content: params.userMessage }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")

    // Anthropic API usage에서 캐시 토큰 정보 추출
    const usage = response.usage as {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }

    result = {
      text,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      model,
      stopReason: response.stop_reason,
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    }

    const durationMs = Date.now() - startTime

    // 비동기 로깅 (실패해도 응답에 영향 없음)
    logUsage({
      personaId: params.personaId ?? null,
      callType: params.callType ?? "unknown",
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs,
      status: "SUCCESS",
      errorMessage: null,
      cacheCreationInputTokens: result.cacheCreationInputTokens,
      cacheReadInputTokens: result.cacheReadInputTokens,
    }).catch(() => {
      // 로깅 실패 무시
    })

    return result
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logUsage({
      personaId: params.personaId ?? null,
      callType: params.callType ?? "unknown",
      model,
      inputTokens: 0,
      outputTokens: 0,
      durationMs,
      status: "ERROR",
      errorMessage,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    }).catch(() => {
      // 로깅 실패 무시
    })

    throw error
  }
}

// ── 사용량 로깅 ───────────────────────────────────────────────

interface LogUsageParams {
  personaId: string | null
  callType: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
  status: "SUCCESS" | "ERROR"
  errorMessage: string | null
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

async function logUsage(params: LogUsageParams): Promise<void> {
  const costUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens)
  const cacheSavings = calculateCacheSavings(
    params.model,
    params.cacheCreationInputTokens,
    params.cacheReadInputTokens
  )

  await prisma.llmUsageLog.create({
    data: {
      personaId: params.personaId,
      callType: params.callType,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      estimatedCostUsd: costUsd,
      durationMs: params.durationMs,
      status: params.status,
      errorMessage: params.errorMessage,
      cacheCreationInputTokens:
        params.cacheCreationInputTokens > 0 ? params.cacheCreationInputTokens : null,
      cacheReadInputTokens: params.cacheReadInputTokens > 0 ? params.cacheReadInputTokens : null,
      cacheSavingsUsd: cacheSavings > 0 ? cacheSavings : null,
    },
  })
}
