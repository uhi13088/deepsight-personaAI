import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { computeAndCache } from "@/lib/cache/persona-match-cache"
import type { ApiResponse } from "@/types"

/**
 * POST /api/internal/cache/warm
 * 활성 페르소나 전체 캐시 워밍 (관리자 전용)
 */
export async function POST() {
  const { response } = await requireAuth()
  if (response) return response

  if (!redis) {
    return NextResponse.json({
      success: true,
      data: { warmed: 0, failed: 0, message: "Redis not configured" },
    } satisfies ApiResponse<{ warmed: number; failed: number; message: string }>)
  }

  try {
    // 활성 페르소나 ID 조회
    const activePersonas = await prisma.persona.findMany({
      where: { status: { in: ["ACTIVE", "STANDARD"] } },
      select: { id: true },
    })

    let warmed = 0
    let failed = 0

    // 배치 처리 (10개씩)
    const batchSize = 10
    for (let i = 0; i < activePersonas.length; i += batchSize) {
      const batch = activePersonas.slice(i, i + batchSize)
      const results = await Promise.allSettled(batch.map((p) => computeAndCache(p.id)))

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          warmed++
        } else {
          failed++
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        warmed,
        failed,
        message: `${warmed}/${activePersonas.length} personas warmed (${failed} failed)`,
      },
    } satisfies ApiResponse<{ warmed: number; failed: number; message: string }>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "CACHE_ERROR", message } },
      { status: 500 }
    )
  }
}
