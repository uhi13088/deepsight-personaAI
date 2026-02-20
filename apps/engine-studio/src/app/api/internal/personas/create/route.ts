import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { executePersonaGenerationPipeline } from "@/lib/persona-generation/pipeline"
import type {
  ApiResponse,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import type { PersonaRole, PersonaStatus } from "@/generated/prisma"

interface CreatePersonaBody {
  name: string
  role: string
  expertise: string[]
  profileImageUrl: string | null
  description: string | null
  vectors: {
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  }
  archetypeId: string | null
  basePrompt: string
  promptVersion: string
  status: string
}

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/create
// T159: validation만 유지, 생성 로직은 공유 파이프라인 호출
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body: CreatePersonaBody = await request.json()

    // ── Validate required fields ─────────────────────────────
    if (!body.name?.trim() || body.name.trim().length < 2 || body.name.trim().length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "이름은 2~30자여야 합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    if (!body.role) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "역할을 선택하세요." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    if (!body.basePrompt?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "프롬프트를 입력하세요." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    // ── 공유 파이프라인 호출 (manual 모드) ───────────────────
    const result = await executePersonaGenerationPipeline({
      mode: "manual",
      name: body.name.trim(),
      role: body.role as PersonaRole,
      expertise: body.expertise,
      description: body.description,
      profileImageUrl: body.profileImageUrl,
      basePrompt: body.basePrompt,
      promptVersion: body.promptVersion || "1.0",
      vectors: body.vectors,
      archetypeId: body.archetypeId,
      status: (body.status === "ACTIVE" ? "ACTIVE" : "DRAFT") as PersonaStatus,
    })

    const apiResponse: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: result.id },
    }

    return NextResponse.json(apiResponse, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const apiResponse: ApiResponse<never> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `페르소나 생성 실패: ${message}`,
      },
    }
    return NextResponse.json(apiResponse, { status: 500 })
  }
}
