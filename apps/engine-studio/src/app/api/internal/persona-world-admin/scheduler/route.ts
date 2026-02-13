import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [activePersonaCount, pausedPersonas, todayPostCount, recentLogs] = await Promise.all([
      prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
      prisma.persona.findMany({
        where: { status: "PAUSED" },
        select: { id: true, name: true },
      }),
      prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.personaActivityLog.findMany({
        where: { trigger: "SCHEDULED" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ])

    const lastRunAt = recentLogs.length > 0 ? recentLogs[0].createdAt.toISOString() : null

    return NextResponse.json({
      success: true,
      data: {
        isActive: activePersonaCount > 0,
        activePersonaCount,
        pausedPersonas,
        todayPostCount,
        lastRunAt,
        recentRuns: recentLogs.map(
          (log: { id: string; personaId: string; activityType: string; createdAt: Date }) => ({
            id: log.id,
            personaId: log.personaId,
            activityType: log.activityType,
            createdAt: log.createdAt.toISOString(),
          })
        ),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SCHEDULER_READ_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, personaId } = body as { action: string; personaId?: string }

    switch (action) {
      case "trigger_now":
        return NextResponse.json({
          success: true,
          data: { message: "Scheduler triggered" },
        })

      case "resume_persona":
        if (!personaId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "personaId required" } },
            { status: 400 }
          )
        }
        await prisma.persona.update({
          where: { id: personaId },
          data: { status: "ACTIVE" },
        })
        return NextResponse.json({
          success: true,
          data: { action, personaId },
        })

      case "pause_persona":
        if (!personaId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "personaId required" } },
            { status: 400 }
          )
        }
        await prisma.persona.update({
          where: { id: personaId },
          data: { status: "PAUSED" },
        })
        return NextResponse.json({
          success: true,
          data: { action, personaId },
        })

      default:
        return NextResponse.json(
          { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SCHEDULER_ERROR", message } },
      { status: 500 }
    )
  }
}
