import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import {
  generatePersonaAutomatically,
  generatePersonaBatch,
  analyzeDiversity,
  type PersonaGenerationResult,
} from "@/lib/persona-generation"

// 단일 생성 요청 스키마
const generateRequestSchema = z.object({
  vector6d: z
    .object({
      depth: z.number().min(0).max(1).optional(),
      lens: z.number().min(0).max(1).optional(),
      stance: z.number().min(0).max(1).optional(),
      scope: z.number().min(0).max(1).optional(),
      taste: z.number().min(0).max(1).optional(),
      purpose: z.number().min(0).max(1).optional(),
    })
    .optional(),
  country: z.string().min(2).max(3).optional(),
  generation: z.enum(["GEN_Z", "MILLENNIAL", "GEN_X", "BOOMER"]).optional(),
  preferredGender: z.enum(["male", "female", "neutral"]).optional(),
  organizationId: z.string().optional(),
})

// 배치 생성 요청 스키마
const batchGenerateRequestSchema = z.object({
  count: z.number().min(1).max(50),
  country: z.string().min(2).max(3).optional(),
  organizationId: z.string().optional(),
})

/**
 * POST /api/personas/generate - 페르소나 자동 생성
 *
 * @query batch - true이면 배치 생성 모드
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const isBatch = searchParams.get("batch") === "true"

    const body = await request.json()

    if (isBatch) {
      // 배치 생성 모드
      const validationResult = batchGenerateRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "입력값이 올바르지 않습니다",
              details: validationResult.error.flatten(),
            },
          },
          { status: 400 }
        )
      }

      const { count, country, organizationId } = validationResult.data

      const result = await generatePersonaBatch({
        count,
        country,
        organizationId,
        createdById: session.user.id,
      })

      return NextResponse.json({
        success: result.success,
        data: {
          created: result.created.map((p) => ({
            id: p.id,
            name: p.name,
            handle: p.handle,
            tagline: p.tagline,
            country: p.country,
            status: p.status,
            consistencyScore: Number(p.consistencyScore),
          })),
          failed: result.failed,
          summary: result.summary,
        },
      })
    } else {
      // 단일 생성 모드
      const validationResult = generateRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "입력값이 올바르지 않습니다",
              details: validationResult.error.flatten(),
            },
          },
          { status: 400 }
        )
      }

      const { vector6d, country, generation, preferredGender, organizationId } =
        validationResult.data

      const result: PersonaGenerationResult = await generatePersonaAutomatically({
        vector6d,
        country,
        generation,
        preferredGender,
        organizationId,
        createdById: session.user.id,
      })

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            metadata: result.metadata,
          },
          { status: 422 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          persona: {
            id: result.persona!.id,
            name: result.persona!.name,
            handle: result.persona!.handle,
            tagline: result.persona!.tagline,
            country: result.persona!.country,
            region: result.persona!.region,
            warmth: Number(result.persona!.warmth),
            expertiseLevel: result.persona!.expertiseLevel,
            status: result.persona!.status,
            consistencyScore: Number(result.persona!.consistencyScore),
            sampleContents: result.persona!.sampleContents,
          },
          metadata: result.metadata,
        },
      })
    }
  } catch (error) {
    console.error("페르소나 자동 생성 API 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/personas/generate - 다양성 분석 조회
 */
export async function GET() {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
        },
        { status: 401 }
      )
    }

    const analysis = await analyzeDiversity()

    return NextResponse.json({
      success: true,
      data: {
        totalPersonas: analysis.totalPersonas,
        coverageScore: analysis.coverageScore,
        emptyCellCount: analysis.emptyCells.length,
        underrepresentedCellCount: analysis.underrepresentedCells.length,
        recommendations: generateRecommendations(analysis),
      },
    })
  } catch (error) {
    console.error("다양성 분석 API 오류:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "다양성 분석에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

/**
 * 다양성 분석 기반 추천 생성
 */
function generateRecommendations(analysis: Awaited<ReturnType<typeof analyzeDiversity>>): string[] {
  const recommendations: string[] = []

  if (analysis.totalPersonas < 10) {
    recommendations.push("페르소나 풀이 작습니다. 더 많은 페르소나 생성을 권장합니다.")
  }

  if (analysis.coverageScore < 30) {
    recommendations.push("벡터 공간 커버리지가 낮습니다. 다양한 성향의 페르소나를 추가하세요.")
  }

  if (analysis.emptyCells.length > 100) {
    recommendations.push("비어있는 성향 조합이 많습니다. 자동 생성을 통해 다양성을 높이세요.")
  }

  if (recommendations.length === 0) {
    recommendations.push("현재 페르소나 풀의 다양성이 양호합니다.")
  }

  return recommendations
}
