import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runPeriodicQualityCheck } from "@/lib/persona-world/quality-runner"
import type { QualityRunnerDataProvider } from "@/lib/persona-world/quality-runner"

interface PersonaQualityRow {
  id: string
  name: string
  status: string
  qualityScore: { toNumber(): number } | null
  consistencyScore: { toNumber(): number } | null
  lastValidationDate: Date | null
}

export async function GET() {
  try {
    const activePersonas = (await prisma.persona.findMany({
      where: { status: { in: ["ACTIVE", "STANDARD"] } },
      select: {
        id: true,
        name: true,
        status: true,
        qualityScore: true,
        consistencyScore: true,
        lastValidationDate: true,
      },
      orderBy: { name: "asc" },
    })) as PersonaQualityRow[]

    const results = activePersonas.map((p) => ({
      personaId: p.id,
      personaName: p.name,
      personaStatus: p.status,
      checkedAt: (p.lastValidationDate ?? new Date()).toISOString(),
      metadata:
        p.consistencyScore !== null || p.qualityScore !== null
          ? {
              voiceCheck:
                p.consistencyScore !== null
                  ? {
                      similarity: Number(p.consistencyScore),
                      status:
                        Number(p.consistencyScore) >= 0.85
                          ? "ok"
                          : Number(p.consistencyScore) >= 0.55
                            ? "warning"
                            : "fail",
                    }
                  : undefined,
              qualityGate:
                p.qualityScore !== null
                  ? {
                      score: Number(p.qualityScore) / 100,
                      status:
                        Number(p.qualityScore) >= 85
                          ? "ok"
                          : Number(p.qualityScore) >= 55
                            ? "warning"
                            : "fail",
                    }
                  : undefined,
            }
          : null,
    }))

    let lastCheckAt: string | null = null
    if (results.length > 0) {
      lastCheckAt = results.reduce(
        (latest: string, r: { checkedAt: string }) => (r.checkedAt > latest ? r.checkedAt : latest),
        results[0].checkedAt
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        totalChecked: results.length,
        lastCheckAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "QUALITY_READ_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body as { action: string }

    if (action === "run_check") {
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
          // 품질 체크 결과는 runPeriodicQualityCheck 반환값에 집계됨.
          // PersonaActivityType에 QUALITY_CHECK이 없으므로 개별 저장 생략.
        },
      }

      const summary = await runPeriodicQualityCheck(dataProvider)

      return NextResponse.json({
        success: true,
        data: {
          message: "Quality check completed",
          totalChecked: summary.totalChecked,
          stats: summary.stats,
          alerts: summary.alerts,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "QUALITY_ERROR", message } },
      { status: 500 }
    )
  }
}
