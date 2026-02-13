// ═══════════════════════════════════════════════════════════════
// LLM Client — Anthropic SDK 기반 통합 클라이언트
// 페르소나 테스트 생성 및 향후 LLM 호출에 공통 사용
// ═══════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface LLMGenerateParams {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
}

export interface LLMGenerateResult {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  stopReason: string | null
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

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
    stopReason: response.stop_reason,
  }
}
