import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { redis } from "@/lib/redis"
import type { ApiResponse } from "@/types"

/**
 * POST /api/internal/cache/invalidate-all
 * 전체 캐시 초기화 (관리자 전용)
 */
export async function POST() {
  const { response } = await requireAuth()
  if (response) return response

  if (!redis) {
    return NextResponse.json({
      success: true,
      data: { cleared: 0, message: "Redis not configured" },
    } satisfies ApiResponse<{ cleared: number; message: string }>)
  }

  try {
    await redis.flushdb()

    return NextResponse.json({
      success: true,
      data: { cleared: -1, message: "All cache cleared" },
    } satisfies ApiResponse<{ cleared: number; message: string }>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "CACHE_ERROR", message } },
      { status: 500 }
    )
  }
}
