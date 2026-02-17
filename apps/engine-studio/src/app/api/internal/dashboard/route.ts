// ═══════════════════════════════════════════════════════════════
// Dashboard API — DB 기반 실시간 통계
// Persona 수, 매칭률, API 레이턴시, 시스템 상태를 DB에서 조회
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ── 응답 타입 ─────────────────────────────────────────────────

interface DashboardStats {
  activePersonas: number
  totalPersonas: number
  matchingRate: string
  apiLatency: string
  systemHealth: string
  statusDistribution: Record<string, number>
}

// ── GET: 대시보드 통계 ────────────────────────────────────────

export async function GET() {
  try {
    const [activeCount, totalCount, statusGroups, matchingStats, latencyStats] = await Promise.all([
      // 활성 페르소나 수 (ACTIVE + STANDARD)
      prisma.persona.count({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
      }),

      // 전체 페르소나 수
      prisma.persona.count(),

      // 상태별 분포
      prisma.persona.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // 최근 매칭 통계 (최근 30일)
      prisma.matchingLog.aggregate({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
        _avg: { responseTimeMs: true },
      }),

      // 최근 매칭 응답시간 (최근 100건 평균)
      prisma.matchingLog.findMany({
        where: { responseTimeMs: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { responseTimeMs: true },
      }),
    ])

    // 상태별 분포 맵
    const statusDistribution: Record<string, number> = {}
    for (const group of statusGroups) {
      statusDistribution[group.status] = group._count.status
    }

    // 매칭률 계산: 피드백이 있는 매칭 / 전체 매칭
    let matchingRate = "—"
    const totalMatches = matchingStats._count.id
    if (totalMatches > 0) {
      const positiveMatches = await prisma.matchingLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          feedback: "LIKE",
        },
      })
      const rate = (positiveMatches / totalMatches) * 100
      matchingRate = `${rate.toFixed(1)}%`
    }

    // API 레이턴시 (최근 100건 평균)
    let apiLatency = "—"
    const latencies = latencyStats
      .map((l) => l.responseTimeMs)
      .filter((ms): ms is number => ms !== null)
    if (latencies.length > 0) {
      const avg = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length
      apiLatency = `${Math.round(avg)}ms`
    }

    // 시스템 상태 판단
    const systemHealth = determineHealth(activeCount, totalCount, latencies)

    const stats: DashboardStats = {
      activePersonas: activeCount,
      totalPersonas: totalCount,
      matchingRate,
      apiLatency,
      systemHealth,
      statusDistribution,
    }

    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: true,
      data: stats,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "대시보드 데이터 조회 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}

// ── 시스템 상태 판단 ──────────────────────────────────────────

function determineHealth(activeCount: number, totalCount: number, latencies: number[]): string {
  // 페르소나가 하나도 없으면 초기화 상태
  if (totalCount === 0) return "초기화"

  // 활성 페르소나가 없으면 주의
  if (activeCount === 0) return "주의"

  // 레이턴시가 높으면 경고 (500ms 이상)
  if (latencies.length > 0) {
    const avg = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length
    if (avg > 500) return "경고"
  }

  return "정상"
}
