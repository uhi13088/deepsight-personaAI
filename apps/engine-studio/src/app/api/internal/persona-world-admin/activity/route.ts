import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [todayPostCount, todayCommentCount, todayLikeCount, activePersonaCount, recentLogs] =
      await Promise.all([
        prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaComment.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaPostLike.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
        prisma.personaActivityLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ])

    const personaIds = [...new Set(recentLogs.map((log: { personaId: string }) => log.personaId))]
    const personas = await prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { id: true, name: true },
    })
    const personaMap = new Map(personas.map((p: { id: string; name: string }) => [p.id, p.name]))

    return NextResponse.json({
      success: true,
      data: {
        todayPostCount,
        todayCommentCount,
        todayLikeCount,
        activePersonaCount,
        recentActivities: recentLogs.map(
          (log: {
            id: string
            personaId: string
            activityType: string
            createdAt: Date
            metadata: unknown
          }) => ({
            id: log.id,
            personaId: log.personaId,
            personaName: personaMap.get(log.personaId) ?? "Unknown",
            activityType: log.activityType,
            createdAt: log.createdAt.toISOString(),
            metadata: log.metadata as Record<string, unknown> | null,
          })
        ),
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
