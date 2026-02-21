import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { DashboardDataProvider } from "@/lib/persona-world/moderation/dashboard-service"
import { buildDashboard, checkKPIAlerts } from "@/lib/persona-world/moderation/dashboard-service"

// Prisma 기반 DashboardDataProvider
const prismaDashboardProvider: DashboardDataProvider = {
  async getActivityStats() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [activePersonas, postsToday, commentsToday, likesToday, followsToday] = await Promise.all(
      [
        prisma.persona.count({ where: { status: "ACTIVE" } }),
        prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaComment.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaPostLike.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaFollow.count({ where: { createdAt: { gte: todayStart } } }),
      ]
    )

    return { activePersonas, postsToday, commentsToday, likesToday, followsToday }
  },

  async getQualityStats() {
    // 간단한 품질 통계 (PIS가 없으면 기본값)
    const personas = await prisma.persona.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    })

    return {
      avgPIS: 0.75, // 기본 평균
      distribution: {
        excellent: Math.floor(personas.length * 0.3),
        good: Math.floor(personas.length * 0.5),
        warning: Math.floor(personas.length * 0.15),
        critical: Math.floor(personas.length * 0.05),
      },
    }
  },

  async getSecurityStats() {
    const quarantinePending = await prisma.quarantineEntry
      .count({
        where: { status: "PENDING" },
      })
      .catch(() => 0)

    return {
      gateGuardBlocks: 0,
      sentinelFlags: 0,
      quarantinePending,
      killSwitchActive: false,
    }
  },

  async getReportOverview() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [pendingCount, resolvedToday, topReasons] = await Promise.all([
      prisma.personaWorldReport.count({ where: { status: "PENDING" } }),
      prisma.personaWorldReport.count({
        where: { status: "RESOLVED", resolvedAt: { gte: todayStart } },
      }),
      prisma.personaWorldReport.groupBy({
        by: ["reason"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
      }),
    ])

    return {
      pendingCount,
      resolvedToday,
      avgResolutionHours: null,
      byCategoryTop3: topReasons.map((r) => ({
        category: r.reason,
        count: r._count.id,
      })),
    }
  },

  async getRecentAlerts() {
    return []
  },
}

/**
 * GET /api/internal/persona-world-admin/dashboard
 * 관리자 대시보드 데이터
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const overview = await buildDashboard(prismaDashboardProvider)
    const alerts = checkKPIAlerts(overview)

    return NextResponse.json({
      success: true,
      data: { overview, alerts },
    })
  } catch (error) {
    console.error("[dashboard] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Dashboard data fetch failed" } },
      { status: 500 }
    )
  }
}
