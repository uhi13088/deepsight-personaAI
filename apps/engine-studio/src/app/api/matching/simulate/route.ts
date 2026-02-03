import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  calculateMatchingScore,
  selectTopNWithDiversity,
  type Vector6D,
  type AlgorithmType,
  type MatchingContext,
} from "@/lib/matching/algorithms"

// 입력 검증 스키마
const simulateSchema = z.object({
  userVector: z.object({
    depth: z.number().min(0).max(1),
    lens: z.number().min(0).max(1),
    stance: z.number().min(0).max(1),
    scope: z.number().min(0).max(1),
    taste: z.number().min(0).max(1),
    purpose: z.number().min(0).max(1),
  }),
  algorithm: z.enum(["COSINE", "WEIGHTED", "CONTEXT", "HYBRID"]).default("COSINE"),
  weights: z.array(z.number()).length(6).optional(),
  context: z
    .object({
      timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
      mood: z.enum(["relaxed", "focused", "adventurous", "contemplative"]).optional(),
      contentType: z.string().optional(),
      genre: z.string().optional(),
    })
    .optional(),
  topN: z.number().min(1).max(20).default(5),
  diversityFactor: z.number().min(0).max(1).default(0.3),
  personaIds: z.array(z.string()).optional(), // 특정 페르소나만 대상으로 테스트
})

// POST /api/matching/simulate - 매칭 시뮬레이션
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = simulateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { userVector, algorithm, weights, context, topN, diversityFactor, personaIds } =
      parsed.data

    // 페르소나 조회 (ACTIVE 상태만)
    const whereClause: { id?: { in: string[] }; status: "ACTIVE" | "STANDARD" } = {
      status: "ACTIVE",
    }

    if (personaIds && personaIds.length > 0) {
      whereClause.id = { in: personaIds }
    }

    const personas = await prisma.persona.findMany({
      where: {
        OR: [{ status: "ACTIVE" }, { status: "STANDARD" }],
        ...(personaIds && personaIds.length > 0 ? { id: { in: personaIds } } : {}),
      },
      include: {
        vectors: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    })

    if (personas.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          algorithm,
          userVector,
          results: [],
          message: "매칭 가능한 페르소나가 없습니다",
          timestamp: new Date().toISOString(),
        },
      })
    }

    // 각 페르소나와 매칭 점수 계산
    const matchResults = personas
      .filter((p) => p.vectors.length > 0)
      .map((persona) => {
        const personaVector: Vector6D = {
          depth: Number(persona.vectors[0].depth),
          lens: Number(persona.vectors[0].lens),
          stance: Number(persona.vectors[0].stance),
          scope: Number(persona.vectors[0].scope),
          taste: Number(persona.vectors[0].taste),
          purpose: Number(persona.vectors[0].purpose),
        }

        const matchResult = calculateMatchingScore(
          userVector as Vector6D,
          personaVector,
          algorithm as AlgorithmType,
          context as MatchingContext,
          weights
        )

        return {
          persona: {
            id: persona.id,
            name: persona.name,
            role: persona.role,
            expertise: persona.expertise,
            description: persona.description,
          },
          vector: personaVector,
          score: matchResult.score,
          breakdown: matchResult.breakdown,
        }
      })

    // 다양성을 고려한 Top-N 선택
    const topResults = selectTopNWithDiversity(matchResults, topN, diversityFactor)

    // 매칭 로그 저장 (선택적)
    if (session.user.id) {
      await prisma.matchingLog.create({
        data: {
          userId: session.user.id,
          context: {
            userVector,
            algorithm,
            weights,
            matchingContext: context,
          },
          matchedPersonas: topResults.map((r, idx) => ({
            personaId: r.persona.id,
            score: r.score,
            rank: idx + 1,
          })),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        algorithm,
        userVector,
        context,
        results: topResults.map((r) => ({
          persona: r.persona,
          vector: r.vector,
          score: Math.round(r.score * 100) / 100,
          breakdown: r.breakdown,
        })),
        totalCandidates: personas.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] POST /api/matching/simulate error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "매칭 시뮬레이션에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
