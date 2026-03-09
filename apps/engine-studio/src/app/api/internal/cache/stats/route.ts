import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { redis } from "@/lib/redis"
import type { ApiResponse } from "@/types"

interface CacheStats {
  enabled: boolean
  dbSize: number | null
  message: string
}

/**
 * GET /api/internal/cache/stats
 * 캐시 상태 조회 (관리자 전용)
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  if (!redis) {
    return NextResponse.json({
      success: true,
      data: { enabled: false, dbSize: null, message: "Redis not configured" },
    } satisfies ApiResponse<CacheStats>)
  }

  try {
    const dbSize = await redis.dbsize()

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        dbSize,
        message: `${dbSize} keys in Redis`,
      },
    } satisfies ApiResponse<CacheStats>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "CACHE_ERROR", message } },
      { status: 500 }
    )
  }
}
