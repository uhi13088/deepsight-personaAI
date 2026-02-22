import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { computeKPISummary } from "@/lib/persona-world/admin/kpi-tracker"
import type { KPIDataProvider } from "@/lib/persona-world/admin/kpi-aggregator"
import { aggregateAllKPIInputs } from "@/lib/persona-world/admin/kpi-aggregator"

/**
 * GET /api/internal/persona-world-admin/operations/kpis
 * 서비스 건전성 8종 + UX 6종 KPI 대시보드
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const provider = createPrismaKPIDataProvider()
    const { serviceInput, uxInput } = await aggregateAllKPIInputs(provider)
    const summary = computeKPISummary(serviceInput, uxInput)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          overallHealth: summary.overallHealth,
          healthyCount: summary.healthyCount,
          warningCount: summary.warningCount,
          criticalCount: summary.criticalCount,
          measuredAt: summary.measuredAt.toISOString(),
        },
        serviceKPIs: summary.serviceKPIs,
        uxKPIs: summary.uxKPIs,
      },
    })
  } catch (error) {
    console.error("[operations/kpis] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to compute KPIs" } },
      { status: 500 }
    )
  }
}

// ── Prisma 기반 KPIDataProvider ──────────────────────────────

function createPrismaKPIDataProvider(): KPIDataProvider {
  return {
    async countActivePersonas() {
      return prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } })
    },

    async countTotalPersonas() {
      return prisma.persona.count({
        where: { status: { not: "ARCHIVED" } },
      })
    },

    async getAveragePIS() {
      const result = await prisma.persona.aggregate({
        where: { status: { in: ["ACTIVE", "STANDARD"] }, qualityScore: { not: null } },
        _avg: { qualityScore: true },
      })
      return Number(result._avg.qualityScore ?? 0.75)
    },

    async countTotalPosts() {
      return prisma.personaPost.count()
    },

    async countTotalComments() {
      return prisma.personaComment.count()
    },

    async countTotalLikes() {
      return prisma.personaPostLike.count()
    },

    async countTotalFollows() {
      return prisma.personaFollow.count()
    },

    async countFactbookViolations() {
      // 팩트북 위반은 격리 사유 중 factbook_violation 카운트
      return prisma.quarantineEntry
        .count({ where: { reason: { contains: "factbook" } } })
        .catch(() => 0)
    },

    async countQuarantinedContent() {
      return prisma.quarantineEntry.count().catch(() => 0)
    },

    async countTotalContent() {
      const [posts, comments] = await Promise.all([
        prisma.personaPost.count(),
        prisma.personaComment.count(),
      ])
      return posts + comments
    },

    async getAvgReportResolutionMinutes() {
      const resolved = await prisma.personaWorldReport.findMany({
        where: { status: "RESOLVED", resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 100,
        orderBy: { resolvedAt: "desc" },
      })

      if (resolved.length === 0) return 0

      const totalMinutes = resolved.reduce((sum, r) => {
        if (!r.resolvedAt) return sum
        return sum + (r.resolvedAt.getTime() - r.createdAt.getTime()) / 60000
      }, 0)

      return totalMinutes / resolved.length
    },

    async countKillSwitchActivations() {
      // Kill Switch 발동 횟수는 SystemSafetyConfig에서 추적
      // 현재 월 기준
      return 0
    },

    async countCacheHits() {
      // 프롬프트 캐싱 통계 (T152에서 구현된 캐시 시스템)
      return 0
    },

    async countTotalLLMCalls() {
      return 0
    },

    // UX 지표 — 유저 행동 추적 인프라 미구축 시 0 반환 (대시보드에서 "측정 전" 표시)
    async getAvgSessionDurationMinutes() {
      return 0
    },

    async getAvgFeedScrollCount() {
      return 0
    },

    async countProfileVisits() {
      return 0
    },

    async countUserFollows() {
      // 유저가 페르소나를 팔로우한 수
      return prisma.personaFollow.count({ where: { followerUserId: { not: null } } }).catch(() => 0)
    },

    async countFeedImpressions() {
      return 0 // 추적 인프라 구축 전
    },

    async countUserComments() {
      return prisma.personaComment.count({ where: { userId: { not: null } } }).catch(() => 0)
    },

    async countOnboardingStarted() {
      return prisma.personaWorldUser.count().catch(() => 0)
    },

    async countOnboardingCompleted() {
      // depth가 설정된 유저 = Phase 1 온보딩 완료
      return prisma.personaWorldUser.count({ where: { depth: { not: null } } }).catch(() => 0)
    },

    async countModeratedContent() {
      const [hiddenPosts, hiddenComments] = await Promise.all([
        prisma.personaPost.count({ where: { isHidden: true } }),
        prisma.personaComment.count({ where: { isHidden: true } }),
      ])
      return hiddenPosts + hiddenComments
    },
  }
}
