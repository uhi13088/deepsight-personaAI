import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { runEvolutionBatch } from "@/lib/persona-world/evolution"
import type { EvolutionRunnerDataProvider } from "@/lib/persona-world/evolution"
import { getEvolutionStage } from "@/lib/persona-world/evolution"
import type { NarrativeDriveVector } from "@/types/persona-v3"

/**
 * GET /api/internal/persona-world-admin/evolution
 *
 * 진화 현황 조회 — 전체 페르소나 스테이지 분포 + 최근 진화 로그
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const personas = await prisma.persona
      .findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        include: {
          layerVectors: {
            where: { layerType: "NARRATIVE" },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      })
      .catch(
        () =>
          [] as Array<{
            id: string
            name: string
            layerVectors: Array<{
              dim1: unknown
              dim2: unknown
              dim3: unknown
              dim4: unknown
              version: number
            }>
          }>
      )

    // 2. 스테이지 분포 집계
    const stageDistribution: Record<string, number> = {}
    const personaStages: Array<{
      id: string
      name: string
      growthArc: number
      stage: string
      version: number
    }> = []

    for (const p of personas) {
      const narr = p.layerVectors[0]
      const growthArc = narr ? Number(narr.dim4 ?? 0.5) : 0.5
      const stage = getEvolutionStage(growthArc)
      stageDistribution[stage.id] = (stageDistribution[stage.id] ?? 0) + 1
      personaStages.push({
        id: p.id,
        name: p.name,
        growthArc,
        stage: stage.id,
        version: narr?.version ?? 0,
      })
    }

    // 3. 최근 진화 로그 (최근 20건)
    const recentEvolutions = await prisma.personaActivityLog
      .findMany({
        where: {
          activityType: "SYSTEM",
          metadata: { path: ["type"], equals: "L3_EVOLUTION" },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      .catch(() => [] as Array<{ personaId: string; metadata: unknown; createdAt: Date }>)

    // 페르소나 이름 맵 (이미 조회한 데이터 활용)
    const personaNameMap = new Map(personas.map((p) => [p.id, p.name]))

    return NextResponse.json({
      success: true,
      data: {
        totalPersonas: personas.length,
        stageDistribution,
        personaStages: personaStages.sort((a, b) => b.growthArc - a.growthArc),
        recentEvolutions: recentEvolutions.map((log) => ({
          personaId: log.personaId,
          personaName: personaNameMap.get(log.personaId) ?? "알 수 없음",
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EVOLUTION_QUERY_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/internal/persona-world-admin/evolution
 *
 * 수동 진화 트리거 — 즉시 진화 배치 실행
 */
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json().catch(() => ({}))
    const periodDays = typeof body.periodDays === "number" ? body.periodDays : 7

    const provider = createEvolutionDataProvider()
    const result = await runEvolutionBatch(provider, { periodDays })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EVOLUTION_RUN_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── Data Provider (cron route와 동일) ────────────────────────

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
