import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  buildReviewPrompt,
  buildPostPrompt,
  buildCommentPrompt,
  buildInteractionPrompt,
  buildPrompt,
} from "@/lib/prompt-builder"
import type { PromptBuildInput, PromptDemographics } from "@/lib/prompt-builder"
import { generateText, generateConversation, isLLMConfigured } from "@/lib/llm-client"
import type {
  ApiResponse,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  Factbook,
} from "@/types"
import type { VoiceSpec } from "@/lib/qualitative/voice-spec"
import type { TriggerRuleDSL } from "@/lib/trigger/rule-dsl"
import {
  L1_DIM_MAP,
  L2_DIM_MAP,
  L3_DIM_MAP,
  layerVectorToRecord,
  layerVectorsToMap,
} from "@/lib/vector/dim-maps"

// ── 타입 정의 ──────────────────────────────────────────────────

type TestPromptType = "review" | "post" | "comment" | "interaction" | "call"

interface TestStateOverride {
  mood?: number // 0.0~1.0
  energy?: number // 0.0~1.0
  socialBattery?: number // 0.0~1.0
  paradoxTension?: number // 0.0~1.0
}

interface ConversationMessage {
  role: "user" | "assistant"
  content: string
}

interface TestGenerateBody {
  type: TestPromptType
  scenario: string
  maxTokens?: number
  state?: TestStateOverride
  messages?: ConversationMessage[]
}

interface TestGenerateResponse {
  output: string
  type: TestPromptType
  inputTokens: number
  outputTokens: number
  model: string
  promptVersion: "v3" | "v4"
  messages?: ConversationMessage[]
}

// ── 상태 컨텍스트 빌드 (conversation-engine suffix 간소화 버전) ──

const CALL_MAX_TOKENS = 200

function describeMood(value: number): string {
  if (value < 0.2) return "매우 우울"
  if (value < 0.35) return "약간 우울"
  if (value < 0.5) return "평온하지만 약간 가라앉음"
  if (value < 0.65) return "보통"
  if (value < 0.8) return "기분 좋음"
  return "매우 기분 좋음"
}

function describeLevel(value: number, low: string, high: string): string {
  if (value < 0.3) return `${low} 상태`
  if (value < 0.7) return "보통"
  return `${high} 상태`
}

function buildStateContext(state: TestStateOverride): string {
  const lines: string[] = ["\n## 현재 상태"]
  lines.push(`기분: ${describeMood(state.mood ?? 0.6)}`)
  lines.push(`에너지: ${describeLevel(state.energy ?? 0.7, "소진", "충만")}`)
  lines.push(`소셜 배터리: ${describeLevel(state.socialBattery ?? 0.6, "방전", "충전")}`)
  const tension = state.paradoxTension ?? 0
  if (tension > 0.6) {
    lines.push(`내면 긴장: 높음 (${(tension * 100).toFixed(0)}%) — 평소와 다른 모습이 나올 수 있음`)
  }
  return lines.join("\n")
}

function buildCallSuffix(): string {
  const lines: string[] = [
    "\n## 통화 규칙",
    "- 음성 통화 모드. 말하듯이 자연스럽게 답변하세요.",
    "- 짧고 간결하게: 1-3문장으로 답변하세요.",
    "- 이모티콘, 해시태그, 특수문자를 사용하지 마세요.",
    "- 당신의 성격과 말투를 유지하면서 감정적으로 교감하세요.",
    "- 상대방의 말에 자연스럽게 맞장구치고 반응하세요.",
  ]
  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/[id]/test-generate
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    // LLM 설정 확인
    if (!isLLMConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LLM_NOT_CONFIGURED",
            message:
              "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 ANTHROPIC_API_KEY를 추가해주세요.",
          },
        } satisfies ApiResponse<never>,
        { status: 503 }
      )
    }

    const { id } = await params
    const body: TestGenerateBody = await request.json()

    // 유효성 검증
    const validTypes: TestPromptType[] = ["review", "post", "comment", "interaction", "call"]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "유효하지 않은 프롬프트 유형입니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    if (!body.scenario || body.scenario.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "시나리오는 최소 5자 이상이어야 합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    // 페르소나 조회 (include 시 Persona 전체 필드 반환 — voiceSpec/factbook/triggerMap/demographics 포함)
    const persona = await prisma.persona.findUnique({
      where: { id },
      include: { layerVectors: true },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    // 벡터 추출
    const layerMap = layerVectorsToMap(persona.layerVectors)
    const l1Raw = layerMap.get("SOCIAL")
    const l2Raw = layerMap.get("TEMPERAMENT")
    const l3Raw = layerMap.get("NARRATIVE")

    if (!l1Raw || !l2Raw || !l3Raw) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "페르소나 벡터 데이터가 불완전합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    const l1 = layerVectorToRecord(l1Raw, L1_DIM_MAP) as unknown as SocialPersonaVector
    const l2 = layerVectorToRecord(l2Raw, L2_DIM_MAP) as unknown as CoreTemperamentVector
    const l3 = layerVectorToRecord(l3Raw, L3_DIM_MAP) as unknown as NarrativeDriveVector

    // v4 필드 매핑 — voiceSpec이 있으면 isV4Input() = true → v4 프롬프트 생성
    const demographics: PromptDemographics | undefined =
      persona.gender ||
      persona.birthDate ||
      persona.nationality ||
      persona.region ||
      persona.educationLevel
        ? {
            gender: persona.gender,
            birthDate: persona.birthDate?.toISOString() ?? null,
            height: persona.height,
            nationality: persona.nationality,
            region: persona.region,
            educationLevel: persona.educationLevel,
          }
        : undefined

    const promptInput: PromptBuildInput = {
      name: persona.name,
      role: persona.role,
      expertise: persona.expertise,
      l1,
      l2,
      l3,
      demographics,
      voiceSpec: (persona.voiceSpec as VoiceSpec | null) ?? undefined,
      factbook: (persona.factbook as Factbook | null) ?? undefined,
      triggerRules: (persona.triggerMap as TriggerRuleDSL[] | null) ?? undefined,
    }

    // 상태 컨텍스트 (기본값 또는 사용자 override)
    const stateContext = buildStateContext({
      mood: body.state?.mood ?? 0.6,
      energy: body.state?.energy ?? 0.7,
      socialBattery: body.state?.socialBattery ?? 0.6,
      paradoxTension: body.state?.paradoxTension ?? Number(persona.paradoxScore ?? 0),
    })

    const promptVersion: "v3" | "v4" = promptInput.voiceSpec ? "v4" : "v3"

    // ── call 타입: 멀티턴 대화 (generateConversation) ──
    if (body.type === "call") {
      const basePrompt = buildPrompt(promptInput)
      const callSuffix = buildCallSuffix()
      const systemPromptPrefix = basePrompt
      const systemPromptSuffix = stateContext + callSuffix

      // 대화 이력 구성
      const prevMessages = body.messages ?? []
      const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...prevMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: body.scenario.trim() },
      ]

      const result = await generateConversation({
        systemPromptPrefix,
        systemPromptSuffix,
        messages: anthropicMessages,
        maxTokens: body.maxTokens ?? CALL_MAX_TOKENS,
        temperature: 0.7,
        callType: "test-call",
        personaId: id,
      })

      // 응답에 전체 대화 이력 포함
      const updatedMessages: ConversationMessage[] = [
        ...prevMessages,
        { role: "user", content: body.scenario.trim() },
        { role: "assistant", content: result.text },
      ]

      return NextResponse.json({
        success: true,
        data: {
          output: result.text,
          type: body.type,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          model: result.model,
          promptVersion,
          messages: updatedMessages,
        },
      } satisfies ApiResponse<TestGenerateResponse>)
    }

    // ── 기존 타입 (review/post/comment/interaction): single-shot ──
    const promptBuilders: Record<Exclude<TestPromptType, "call">, () => string> = {
      review: () => buildReviewPrompt(promptInput),
      post: () => buildPostPrompt(promptInput),
      comment: () => buildCommentPrompt(promptInput),
      interaction: () => buildInteractionPrompt(promptInput),
    }

    const basePrompt = promptBuilders[body.type]()
    const systemPrompt = basePrompt + stateContext

    // LLM 호출
    const result = await generateText({
      systemPrompt,
      userMessage: body.scenario.trim(),
      maxTokens: body.maxTokens ?? 1024,
      temperature: 0.7,
      callType: `test-${body.type}`,
      personaId: id,
    })

    return NextResponse.json({
      success: true,
      data: {
        output: result.text,
        type: body.type,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: result.model,
        promptVersion,
      },
    } satisfies ApiResponse<TestGenerateResponse>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `테스트 생성 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
