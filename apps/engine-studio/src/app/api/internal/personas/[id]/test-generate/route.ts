import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  buildReviewPrompt,
  buildPostPrompt,
  buildCommentPrompt,
  buildInteractionPrompt,
} from "@/lib/prompt-builder"
import { generateText, isLLMConfigured } from "@/lib/llm-client"
import type {
  ApiResponse,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import {
  L1_DIM_MAP,
  L2_DIM_MAP,
  L3_DIM_MAP,
  layerVectorToRecord,
  layerVectorsToMap,
} from "@/lib/vector/dim-maps"

// ── 타입 정의 ──────────────────────────────────────────────────

type TestPromptType = "review" | "post" | "comment" | "interaction"

interface TestGenerateBody {
  type: TestPromptType
  scenario: string
  maxTokens?: number
}

interface TestGenerateResponse {
  output: string
  type: TestPromptType
  inputTokens: number
  outputTokens: number
  model: string
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
    const validTypes: TestPromptType[] = ["review", "post", "comment", "interaction"]
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

    // 페르소나 조회
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

    const promptInput = {
      name: persona.name,
      role: persona.role,
      expertise: persona.expertise,
      l1,
      l2,
      l3,
    }

    // 유형별 시스템 프롬프트 빌드
    const promptBuilders: Record<TestPromptType, () => string> = {
      review: () => buildReviewPrompt(promptInput),
      post: () => buildPostPrompt(promptInput),
      comment: () => buildCommentPrompt(promptInput),
      interaction: () => buildInteractionPrompt(promptInput),
    }

    const systemPrompt = promptBuilders[body.type]()

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
