// ═══════════════════════════════════════════════════════════════
// LLM Client — Anthropic SDK 기반 통합 클라이언트
// 페르소나 테스트 생성 및 향후 LLM 호출에 공통 사용
// T143: Prompt Caching 지원 — 정적 prefix를 캐시하여 비용 절감
// T328: Haiku 화이트리스트 자동 라우팅 + routingReason 추적
// ═══════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import {
  createSafetyFilter,
  evaluateFilter,
  createModelConfig,
  resolveModelForCallType,
  buildDefaultCallTypeOverrides,
  isHaikuWhitelisted,
  MODEL_API_IDS,
} from "@/lib/global-config"
import type { SafetyFilter, FilterAction, ModelConfig, RoutingReason } from "@/lib/global-config"
import type { Prisma } from "@/generated/prisma"

// ── 타입 정의 ─────────────────────────────────────────────────

/** v4.2.0: Vision 이미지 입력 */
export interface LLMImageInput {
  /** base64: 인코딩된 이미지 데이터, url: 외부 URL */
  type: "base64" | "url"
  /** base64 인코딩된 데이터 또는 이미지 URL */
  data: string
  /** MIME 타입 */
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
}

/** 이미지 검증 제한 */
const MAX_IMAGES_PER_REQUEST = 5
const ALLOWED_IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"])

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
  /**
   * 사용할 모델 ID (미지정 시 DEFAULT_MODEL).
   * 비용 절감용: "claude-haiku-4-5-20251001" 지정 가능.
   */
  model?: string
  /**
   * v4.2.0: Vision 이미지 입력 (최대 5장).
   * 지정 시 userMessage와 함께 멀티모달 content block으로 전송.
   */
  images?: LLMImageInput[]
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

// ── 모델 설정 캐시 (DB 읽기 최소화) ──────────────────────────

let _modelConfigCache: { config: ModelConfig; loadedAt: number } | null = null
const MODEL_CONFIG_CACHE_TTL = 60_000 // 1분

async function loadModelConfigCached(): Promise<ModelConfig> {
  const now = Date.now()
  if (_modelConfigCache && now - _modelConfigCache.loadedAt < MODEL_CONFIG_CACHE_TTL) {
    return _modelConfigCache.config
  }

  try {
    const rows = await prisma.systemConfig.findMany({ where: { category: "MODEL" } })
    if (rows.length === 0) {
      const config = createModelConfig()
      _modelConfigCache = { config, loadedAt: now }
      return config
    }

    const configMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    const defaults = createModelConfig()
    // DB에 저장된 오버라이드와 추천 기본값 병합 (DB 값 우선)
    const dbOverrides = (configMap.callTypeOverrides ?? {}) as ModelConfig["callTypeOverrides"]
    const mergedOverrides = { ...buildDefaultCallTypeOverrides(), ...dbOverrides }
    const config: ModelConfig = {
      models: (configMap.models ?? defaults.models) as ModelConfig["models"],
      routingRules: (configMap.routingRules ??
        defaults.routingRules) as ModelConfig["routingRules"],
      defaultModel: (configMap.defaultModel ??
        defaults.defaultModel) as ModelConfig["defaultModel"],
      budget: (configMap.budget ?? defaults.budget) as ModelConfig["budget"],
      callTypeOverrides: mergedOverrides,
    }
    _modelConfigCache = { config, loadedAt: now }
    return config
  } catch {
    // DB 오류 시 기본값 사용
    return createModelConfig()
  }
}

/** 모델 설정 캐시 무효화 (설정 변경 시 호출) */
export function invalidateModelConfigCache(): void {
  _modelConfigCache = null
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

// ── v4.2.0: Vision 유저 메시지 빌드 ──────────────────────────

/**
 * 이미지가 있으면 멀티모달 content block 배열, 없으면 텍스트 문자열 반환.
 * Anthropic API의 user message content 형식에 맞춤.
 */
export function buildUserContent(
  userMessage: string,
  images?: LLMImageInput[]
): string | Anthropic.ContentBlockParam[] {
  if (!images || images.length === 0) {
    return userMessage
  }

  // 검증
  if (images.length > MAX_IMAGES_PER_REQUEST) {
    throw new Error(
      `이미지는 최대 ${MAX_IMAGES_PER_REQUEST}장까지 지원합니다. (요청: ${images.length}장)`
    )
  }

  for (const img of images) {
    if (!ALLOWED_IMAGE_MEDIA_TYPES.has(img.mediaType)) {
      throw new Error(`지원하지 않는 이미지 포맷: ${img.mediaType}. 허용: jpeg, png, gif, webp`)
    }
  }

  const blocks: Anthropic.ContentBlockParam[] = []

  // 이미지 블록 먼저 추가 (Claude Vision 권장 순서)
  for (const img of images) {
    if (img.type === "base64") {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType,
          data: img.data,
        },
      })
    } else {
      blocks.push({
        type: "image",
        source: {
          type: "url",
          url: img.data,
        },
      })
    }
  }

  // 텍스트 블록
  blocks.push({ type: "text", text: userMessage })

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

// ── 모델 라우팅 (T328) ─────────────────────────────────────────

const HAIKU_API_MODEL = MODEL_API_IDS["claude-haiku"]

/**
 * 모델 결정 + 라우팅 이유 추적.
 *
 * 우선순위:
 * 1. params.model (명시적 지정) → explicit_param
 * 2. Haiku 화이트리스트 (callType 기반) → haiku_whitelist
 * 3. DB callTypeOverrides (UI 설정) → config_override
 * 4. DEFAULT_MODEL → default_model
 */
async function resolveModelWithRouting(
  params: LLMGenerateParams
): Promise<{ model: string; routingReason: RoutingReason }> {
  // 1. 명시적 모델 지정
  if (params.model) {
    return { model: params.model, routingReason: "explicit_param" }
  }

  // 2. Haiku 화이트리스트 자동 라우팅
  if (params.callType && isHaikuWhitelisted(params.callType)) {
    return { model: HAIKU_API_MODEL, routingReason: "haiku_whitelist" }
  }

  // 3. DB callTypeOverrides → 4. DEFAULT_MODEL
  const modelConfig = await loadModelConfigCached()
  const resolved = resolveModelForCallType(modelConfig, params.callType)

  // callTypeOverrides에서 해석된 건지 default인지 구분
  const hasOverride = params.callType ? !!modelConfig.callTypeOverrides[params.callType] : false
  const routingReason: RoutingReason = hasOverride ? "config_override" : "default_model"

  return { model: resolved, routingReason }
}

// ── 생성 함수 ─────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929"
const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_TEMPERATURE = 0.7

export async function generateText(params: LLMGenerateParams): Promise<LLMGenerateResult> {
  const client = getClient()
  const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = params.temperature ?? DEFAULT_TEMPERATURE

  // 모델 결정 (T328 확장):
  // 우선순위: params.model(명시적) → Haiku 화이트리스트 → DB callTypeOverrides → DEFAULT_MODEL
  const { model, routingReason } = await resolveModelWithRouting(params)

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

    // v4.2.0: Vision 이미지가 있으면 멀티모달 content block 구성
    const userContent = buildUserContent(params.userMessage, params.images)

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemContent,
      messages: [{ role: "user", content: userContent }],
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
      routingReason,
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
      routingReason,
    }).catch(() => {
      // 로깅 실패 무시
    })

    throw error
  }
}

// ── 멀티턴 대화 생성 (T331: 1:1 채팅/통화) ──────────────────────

export interface ConversationGenerateParams {
  /** 정적 시스템 프롬프트 prefix (캐시 대상: 페르소나 정의+VoiceSpec+Factbook) */
  systemPromptPrefix?: string
  /** 동적 시스템 프롬프트 suffix (현재 상태+RAG+규칙) */
  systemPromptSuffix: string
  /** 멀티턴 대화 이력 (Anthropic MessageParam 형식) */
  messages: Anthropic.MessageParam[]
  maxTokens?: number
  temperature?: number
  callType?: string
  personaId?: string
}

/**
 * 멀티턴 대화 생성 — 1:1 채팅/통화용.
 * generateText()와 동일한 인프라(모델 라우팅, 안전 필터, 사용량 로깅, 프롬프트 캐싱)를
 * 사용하되, 멀티턴 messages 배열과 Vision(이미지) 콘텐츠를 지원.
 */
export async function generateConversation(
  params: ConversationGenerateParams
): Promise<LLMGenerateResult> {
  const client = getClient()
  const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS
  const temperature = params.temperature ?? DEFAULT_TEMPERATURE

  // 모델 라우팅 (T328)
  const routingParams: LLMGenerateParams = {
    systemPrompt: params.systemPromptSuffix,
    userMessage: "",
    callType: params.callType,
    personaId: params.personaId,
  }
  const { model, routingReason } = await resolveModelWithRouting(routingParams)

  const startTime = Date.now()

  try {
    // 안전 필터: 마지막 유저 메시지만 검사
    const lastUserMsg = [...params.messages].reverse().find((m) => m.role === "user")
    if (lastUserMsg) {
      const userText =
        typeof lastUserMsg.content === "string"
          ? lastUserMsg.content
          : (lastUserMsg.content as Array<{ type: string; text?: string }>)
              .filter((b) => b.type === "text")
              .map((b) => b.text ?? "")
              .join(" ")

      const safetyFilter = await loadSafetyFilter()
      if (safetyFilter.config.level !== "off" && userText) {
        const { result: filterResult, updatedFilter } = evaluateFilter(safetyFilter, userText)
        saveSafetyFilterLogs(updatedFilter).catch(() => {})
        if (filterResult.action === "block") {
          throw new SafetyFilterBlockedError(
            filterResult.action,
            filterResult.matchedWords.map((m) => m.word)
          )
        }
      }
    }

    // 시스템 프롬프트 (캐싱 지원)
    const systemContent = buildSystemBlocks(params.systemPromptSuffix, params.systemPromptPrefix)

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemContent,
      messages: params.messages,
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")

    const usage = response.usage as {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }

    const result: LLMGenerateResult = {
      text,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      model,
      stopReason: response.stop_reason,
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    }

    const durationMs = Date.now() - startTime
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
      routingReason,
    }).catch(() => {})

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
      routingReason,
    }).catch(() => {})
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
  // v4.1 최적화 추적 (T328)
  routingReason?: RoutingReason
  batchGroupId?: string
  isRegenerated?: boolean
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
      // v4.1 최적화 추적 (T328)
      routingReason: params.routingReason ?? null,
      batchGroupId: params.batchGroupId ?? null,
      isRegenerated: params.isRegenerated ?? false,
    },
  })
}
