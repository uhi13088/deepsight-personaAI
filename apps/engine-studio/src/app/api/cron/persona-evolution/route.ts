import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { runEvolutionBatch } from "@/lib/persona-world/evolution"
import type { EvolutionRunnerDataProvider } from "@/lib/persona-world/evolution"
import type { NarrativeDriveVector } from "@/types/persona-v3"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * GET /api/cron/persona-evolution
 *
 * 주간 L3 진화 배치. 외부 cron(Vercel/GH Actions)이 호출.
 * CRON_SECRET 인증 필요.
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

    const provider = createEvolutionDataProvider()
    const result = await runEvolutionBatch(provider)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EVOLUTION_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── Data Provider ────────────────────────────────────────────

function createEvolutionDataProvider(): EvolutionRunnerDataProvider {
  return {
    async getActivePersonasWithNarrative() {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        include: {
          layerVectors: {
            where: { layerType: "NARRATIVE" },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      })

      return personas
        .filter((p) => p.layerVectors.length > 0)
        .map((p) => {
          const narr = p.layerVectors[0]
          return {
            id: p.id,
            name: p.name,
            narrative: {
              lack: Number(narr.dim1 ?? 0.5),
              moralCompass: Number(narr.dim2 ?? 0.5),
              volatility: Number(narr.dim3 ?? 0.5),
              growthArc: Number(narr.dim4 ?? 0.5),
            },
            createdAt: p.createdAt,
          }
        })
    },

    async getActivityLogs(personaId, sinceDate) {
      const logs = await prisma.personaActivityLog.findMany({
        where: {
          personaId,
          createdAt: { gte: sinceDate },
        },
        orderBy: { createdAt: "asc" },
        select: {
          activityType: true,
          stateSnapshot: true,
          createdAt: true,
        },
      })

      return logs.map((l) => ({
        activityType: l.activityType,
        stateSnapshot: l.stateSnapshot,
        createdAt: l.createdAt,
      }))
    },

    async getCurrentNarrativeVersion(personaId) {
      const latest = await prisma.personaLayerVector.findFirst({
        where: { personaId, layerType: "NARRATIVE" },
        orderBy: { version: "desc" },
        select: { version: true },
      })
      return latest?.version ?? 1
    },

    async saveNewNarrativeVersion(personaId, newL3, previousVersion) {
      const newVersion = previousVersion + 1
      await prisma.personaLayerVector.create({
        data: {
          personaId,
          layerType: "NARRATIVE",
          version: newVersion,
          dim1: newL3.lack,
          dim2: newL3.moralCompass,
          dim3: newL3.volatility,
          dim4: newL3.growthArc,
        },
      })
      return { version: newVersion }
    },

    async saveEvolutionLog(params) {
      await prisma.personaActivityLog.create({
        data: {
          personaId: params.personaId,
          activityType: "SYSTEM",
          trigger: "SCHEDULED",
          metadata: {
            type: "L3_EVOLUTION",
            previousL3: params.previousL3,
            newL3: params.newL3,
            deltas: params.deltas,
            stageTransition: params.stageTransition,
            fromStage: params.fromStage,
            toStage: params.toStage,
            reason: params.reason,
            version: params.version,
          } as unknown as Prisma.InputJsonValue,
        },
      })
    },
  }
}
