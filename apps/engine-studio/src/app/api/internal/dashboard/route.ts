import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

// ── Dashboard stats (in-memory sample) ──────────────────────────

interface DashboardStats {
  activePersonas: number
  matchingRate: string
  apiLatency: string
  systemHealth: string
}

function buildDashboardStats(): DashboardStats {
  return {
    activePersonas: 24,
    matchingRate: "87.3%",
    apiLatency: "142ms",
    systemHealth: "정상",
  }
}

let store: DashboardStats | null = null

function getStore(): DashboardStats {
  if (!store) {
    store = buildDashboardStats()
  }
  return store
}

// ── GET: Return dashboard stats ─────────────────────────────────

export async function GET() {
  try {
    const stats = getStore()

    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: true,
      data: stats,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "대시보드 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}
