import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runPeriodicQualityCheck } from "@/lib/persona-world/quality-runner"
import type { QualityRunnerDataProvider } from "@/lib/persona-world/quality-runner"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * GET /api/cron/quality-check
 *
 * Daily quality monitoring check for all active personas.
 * Runs voice consistency checks and auto-pauses personas with critical PIS.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
          { status: 401 }
        )
      }
    }

    const dataProvider: QualityRunnerDataProvider = {
      async getActivePersonas() {
        return prisma.persona.findMany({
          where: { status: { in: ["ACTIVE", "STANDARD"] } },
          select: { id: true, name: true },
        })
      },

      async getRecentPostTexts(personaId: string, count: number) {
        const posts = await prisma.personaPost.findMany({
          where: { personaId, isHidden: false },
          orderBy: { createdAt: "desc" },
          take: count,
          select: { content: true },
        })
        return posts.map((p) => p.content)
      },

      async pausePersona(personaId: string) {
        await prisma.persona.update({
          where: { id: personaId },
          data: { status: "PAUSED" },
        })
      },

      async saveQualityCheckResult(params) {
        await prisma.personaActivityLog.create({
          data: {
            personaId: params.personaId,
            activityType: "QUALITY_CHECK",
            trigger: "SCHEDULED",
            stateSnapshot: {
              voiceCheck: params.voiceCheck,
              qualityGate: params.qualityGate
                ? {
                    status: params.qualityGate.status,
                    pis: params.qualityGate.integrityScore.pis,
                    shouldPause: params.qualityGate.shouldPauseActivity,
                  }
                : null,
              autoAction: params.autoAction,
            },
          },
        })
      },
    }

    const summary = await runPeriodicQualityCheck(dataProvider)

    return NextResponse.json({
      success: true,
      data: {
        executedAt: summary.checkedAt.toISOString(),
        totalChecked: summary.totalChecked,
        stats: summary.stats,
        alerts: summary.alerts,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "CRON_ERROR", message } },
      { status: 500 }
    )
  }
}
