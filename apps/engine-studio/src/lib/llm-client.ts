// ═══════════════════════════════════════════════════════════════
// LLM Client — Anthropic SDK 기반 통합 클라이언트
// 페르소나 테스트 생성 및 향후 LLM 호출에 공통 사용
// ═══════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface LLMGenerateParams {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
  callType?: string
  personaId?: string
}

export interface LLMGenerateResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  stopReason: string | null
}

// ── 모델별 가격 (USD per 1M tokens) ─────────────────────────

const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "claude-sonnet-4-5-20250929": { inputPerM: 3, outputPerM: 15 },
  "claude-haiku-4-5-20251001": { inputPerM: 0.8, outputPerM: 4 },
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { inputPerM: 3, outputPerM: 15 }
  return (inputTokens * pricing.inputPerM + outputTokens * pricing.outputPerM) / 1_000_000
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
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userMessage }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")

    result = {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model,
      stopReason: response.stop_reason,
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
}

async function logUsage(params: LogUsageParams): Promise<void> {
  const costUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens)

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
    },
  })
}
