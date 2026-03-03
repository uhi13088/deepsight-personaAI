// ═══════════════════════════════════════════════════════════════
// TTS 캐시 상태 조회 / 초기화
// GET  → 캐시 통계 (entries, hits, misses, hitRate, memory)
// DELETE → 캐시 전체 초기화
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { ttsCache, type TtsCacheStats } from "@/lib/persona-world/voice-pipeline"
import type { ApiResponse } from "@/types"

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  return NextResponse.json<ApiResponse<TtsCacheStats>>({
    success: true,
    data: ttsCache.stats(),
  })
}

export async function DELETE() {
  const { response } = await requireAuth()
  if (response) return response

  ttsCache.clear()

  return NextResponse.json<ApiResponse<{ cleared: true }>>({
    success: true,
    data: { cleared: true },
  })
}
