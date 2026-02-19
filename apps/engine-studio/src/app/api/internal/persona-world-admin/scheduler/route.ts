import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let activePersonaCount = 0
    let pausedPersonas: Array<{ id: string; name: string }> = []
    let todayPostCount = 0
    let recentLogs: Array<{
      id: string
      personaId: string
      activityType: string
      createdAt: Date
    }> = []

    try {
      ;[activePersonaCount, pausedPersonas, todayPostCount, recentLogs] = await Promise.all([
        prisma.persona.count({ where: { status: { in: ["ACTIVE", "STANDARD"] } } }),
        prisma.persona.findMany({
          where: { status: "PAUSED" },
          select: { id: true, name: true },
        }),
        prisma.personaPost.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.personaActivityLog.findMany({
          where: { trigger: { in: ["SCHEDULED", "MANUAL"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ])
    } catch {
      // DB not ready — return empty data
    }

    const lastRunAt = recentLogs.length > 0 ? recentLogs[0].createdAt.toISOString() : null

    return NextResponse.json({
      success: true,
      data: {
        isActive: activePersonaCount > 0,
        activePersonaCount,
        pausedPersonas,
        todayPostCount,
        lastRunAt,
        recentRuns: recentLogs.map((log) => ({
          id: log.id,
          personaId: log.personaId,
          activityType: log.activityType,
          createdAt: log.createdAt.toISOString(),
        })),
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action, personaId } = body as { action: string; personaId?: string }

    switch (action) {
      case "trigger_now": {
        // 실제 스케줄러 파이프라인 호출
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        const schedulerRes = await fetch(`${baseUrl}/api/persona-world/scheduler`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger: "MANUAL" }),
        })
        const schedulerJson = (await schedulerRes.json()) as {
          success: boolean
          data?: Record<string, unknown>
          error?: Record<string, unknown>
        }

        return NextResponse.json({
          success: schedulerRes.ok,
          data: {
            message: schedulerRes.ok ? "Scheduler executed" : "Scheduler failed",
            result: schedulerJson.data ?? schedulerJson.error,
          },
        })
      }

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
