import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/onboarding/preview?phase=1&userId=xxx
 *
 * Phase 완료 직후 매칭 프리뷰를 반환한다.
 *
 * Phase 1 → top 3 페르소나 (65% 신뢰도)
 * Phase 2 → top 1 상세 + L1 차원 비교 (80% 신뢰도)
 * Phase 3 → top 5 랭킹 (93% 신뢰도)
 *
 * 페르소나 벡터와 사용자 벡터의 코사인 유사도를 계산하여 매칭한다.
 */

// 간단한 6D 벡터 코사인 유사도
function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

const DIMS = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

function toVector(obj: Record<string, number | null>): number[] {
  return DIMS.map((d) => Number(obj[d]) || 0.5)
}

const PHASE_CONFIDENCE: Record<number, number> = { 1: 0.65, 2: 0.8, 3: 0.93 }
const PHASE_TOP_N: Record<number, number> = { 1: 3, 2: 1, 3: 5 }

export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const phase = Number(request.nextUrl.searchParams.get("phase") || "1")
    const userId = request.nextUrl.searchParams.get("userId") || ""

    if (![1, 2, 3].includes(phase)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PHASE", message: "phase must be 1, 2, or 3" } },
        { status: 400 }
      )
    }

    // 사용자 벡터 조회
    const user = userId
      ? await prisma.personaWorldUser.findUnique({
          where: { email: userId },
          select: {
            depth: true,
            lens: true,
            stance: true,
            scope: true,
            taste: true,
            purpose: true,
          },
        })
      : null

    const userVec = user
      ? toVector({
          depth: user.depth ? Number(user.depth) : null,
          lens: user.lens ? Number(user.lens) : null,
          stance: user.stance ? Number(user.stance) : null,
          scope: user.scope ? Number(user.scope) : null,
          taste: user.taste ? Number(user.taste) : null,
          purpose: user.purpose ? Number(user.purpose) : null,
        })
      : DIMS.map(() => 0.5)

    // 활성 페르소나 + 벡터 조회
    const personas = await prisma.persona.findMany({
      where: { status: { in: ["ACTIVE", "STANDARD"] } },
      select: {
        id: true,
        name: true,
        handle: true,
        tagline: true,
        role: true,
        profileImageUrl: true,
        warmth: true,
        vectors: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            depth: true,
            lens: true,
            stance: true,
            scope: true,
            taste: true,
            purpose: true,
          },
        },
      },
      take: 50,
    })

    // 유사도 계산 & 정렬
    const scored = personas
      .map((p) => {
        const vec = p.vectors[0]
        const pVec = vec
          ? toVector({
              depth: Number(vec.depth),
              lens: Number(vec.lens),
              stance: Number(vec.stance),
              scope: Number(vec.scope),
              taste: Number(vec.taste),
              purpose: Number(vec.purpose),
            })
          : DIMS.map(() => 0.5)
        const similarity = Math.round(cosineSim(userVec, pVec) * 100)

        // Phase별 L1 차원 비교 (Phase 2+)
        const dimComparison =
          phase >= 2
            ? DIMS.map((dim, i) => ({
                dimension: dim,
                userValue: Math.round(userVec[i] * 100) / 100,
                personaValue: Math.round(pVec[i] * 100) / 100,
              }))
            : undefined

        return {
          personaId: p.id,
          name: p.name,
          handle: p.handle ?? "",
          tagline: p.tagline,
          role: p.role,
          profileImageUrl: p.profileImageUrl,
          similarity,
          dimComparison,
        }
      })
      .sort((a, b) => b.similarity - a.similarity)

    const topN = PHASE_TOP_N[phase]
    const topPersonas = scored.slice(0, topN)
    const confidence = PHASE_CONFIDENCE[phase]

    return NextResponse.json({
      success: true,
      data: {
        phase,
        confidence,
        topPersonas,
        nextPhaseInfo:
          phase < 3
            ? {
                nextPhase: phase + 1,
                estimatedTime: 80,
                expectedImprovement: phase === 1 ? 15 : 13,
              }
            : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ONBOARDING_PREVIEW_ERROR", message } },
      { status: 500 }
    )
  }
}
