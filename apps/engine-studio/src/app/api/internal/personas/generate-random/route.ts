import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { executePersonaGenerationPipeline } from "@/lib/persona-generation/pipeline"
import type { ApiResponse } from "@/types"
import type { PersonaStatus } from "@/generated/prisma"

interface GenerateRandomBody {
  archetypeId?: string
  status?: string
}

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/generate-random
// 전체 파이프라인: 벡터→Paradox→캐릭터→정성적→프롬프트→활동성→DB저장
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body: GenerateRandomBody = await request.json().catch(() => ({}))

    const result = await executePersonaGenerationPipeline({
      archetypeId: body.archetypeId,
      status: (body.status === "DRAFT" ? "DRAFT" : "ACTIVE") as PersonaStatus,
    })

    return NextResponse.json<ApiResponse<typeof result>>(
      { success: true, data: result },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `랜덤 페르소나 생성 실패: ${message}`,
        },
      },
      { status: 500 }
    )
  }
}
