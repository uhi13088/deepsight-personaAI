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
    // Auth check (fail-closed: CRON_SECRET 없으면 거부)
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "CRON_SECRET not configured" } },
        { status: 500 }
      )
    }
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      )
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

      async saveQualityCheckResult(_params) {
        // 품질 체크 결과는 runPeriodicQualityCheck 반환값 (QualityCheckSummary)에 집계됨.
        // PersonaActivityType에 QUALITY_CHECK이 없으므로 개별 저장은 생략.
        // 향후 별도 quality_check_results 테이블 추가 시 여기서 저장.
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
