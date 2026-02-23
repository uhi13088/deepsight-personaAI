import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Phase RA: 24시간 이내 engagement 결정 통계용 시작 시각
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    let todayPostCount = 0
    let todayCommentCount = 0
    let todayLikeCount = 0
    let activePersonaCount = 0
    let totalPostCount = 0
    let totalCommentCount = 0
    let totalLikeCount = 0
    let totalRepostCount = 0
    let totalBookmarkCount = 0
    let recentLogs: Array<{
      id: string
      personaId: string
      activityType: string
      createdAt: Date
      metadata: unknown
    }> = []

    // Phase RA: COMMENT_SUPPRESSED 로그 (24h)
    let suppressedLogs: Array<{ metadata: unknown }> = []

    try {
      ;[
        todayPostCount,
        todayCommentCount,
        todayLikeCount,
        activePersonaCount,
        totalPostCount,
        totalCommentCount,
        totalLikeCount,
        totalRepostCount,
        totalBookmarkCount,
        recentLogs,
        suppressedLogs,
      ] = await Promise.all([
        prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaComment.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaPostLike.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
        // 누적 전체 통계
        prisma.personaPost.count(),
        prisma.personaComment.count(),
        prisma.personaPostLike.count(),
        prisma.personaRepost.count(),
        prisma.personaPostBookmark.count(),
        prisma.personaActivityLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        // Phase RA: 24h 내 COMMENT_SUPPRESSED 로그
        prisma.personaActivityLog.findMany({
          where: {
            activityType: "COMMENT_SUPPRESSED",
            createdAt: { gte: last24h },
          },
          select: { metadata: true },
        }),
      ])
    } catch {
      // DB not ready — return empty data
    }

    const personaIds = [...new Set(recentLogs.map((log) => log.personaId))]
    let personaMap = new Map<string, string>()
    if (personaIds.length > 0) {
      try {
        const personas = await prisma.persona.findMany({
          where: { id: { in: personaIds } },
          select: { id: true, name: true },
        })
        personaMap = new Map(personas.map((p) => [p.id, p.name]))
      } catch {
        // ignore
      }
    }

    // Phase RA: engagement 결정 통계 집계
    const engagementStats = buildEngagementStats(suppressedLogs, todayCommentCount)

    return NextResponse.json({
      success: true,
      data: {
        todayPostCount,
        todayCommentCount,
        todayLikeCount,
        activePersonaCount,
        totalPostCount,
        totalCommentCount,
        totalLikeCount,
        totalRepostCount,
        totalBookmarkCount,
        // Phase RA: engagement 결정 통계 (24h)
        engagementStats,
        recentActivities: recentLogs.map((log) => ({
          id: log.id,
          personaId: log.personaId,
          personaName: personaMap.get(log.personaId) ?? "Unknown",
          activityType: log.activityType,
          createdAt: log.createdAt.toISOString(),
          metadata: log.metadata as Record<string, unknown> | null,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ACTIVITY_ERROR", message } },
      { status: 500 }
    )
  }
}

/** Phase RA: COMMENT_SUPPRESSED 로그에서 engagement 통계 집계 */
function buildEngagementStats(suppressedLogs: Array<{ metadata: unknown }>, commentCount: number) {
  let skipCount = 0
  let reactOnlyCount = 0

  for (const log of suppressedLogs) {
    const meta = log.metadata as Record<string, unknown> | null
    if (!meta) continue
    if (meta.action === "skip") skipCount++
    else if (meta.action === "react_only") reactOnlyCount++
  }

  const total = commentCount + skipCount + reactOnlyCount
  return {
    comment: commentCount,
    reactOnly: reactOnlyCount,
    skip: skipCount,
    total,
    commentRate: total > 0 ? Math.round((commentCount / total) * 100) : 0,
    suppressRate: total > 0 ? Math.round(((skipCount + reactOnlyCount) / total) * 100) : 0,
  }
}
