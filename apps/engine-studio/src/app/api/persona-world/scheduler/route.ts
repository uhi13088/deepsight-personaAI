import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { runScheduler } from "@/lib/persona-world/scheduler"
import type { SchedulerPersona, SchedulerDataProvider } from "@/lib/persona-world/scheduler"
import type { SchedulerContext, SchedulerTrigger } from "@/lib/persona-world/types"
import type { ThreeLayerVector } from "@/types/persona-v3"

/**
 * POST /api/persona-world/scheduler
 *
 * 자율 활동 스케줄러 실행 (cron trigger).
 *
 * Body:
 * - trigger: SchedulerTrigger (기본 "SCHEDULED")
 * - currentHour: number (기본 현재 시각)
 * - triggerData?: { contentId?, userId?, personaId?, topicId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const trigger: SchedulerTrigger = body.trigger ?? "SCHEDULED"
    const currentHour: number = body.currentHour ?? new Date().getHours()
    const triggerData = body.triggerData

    const context: SchedulerContext = {
      trigger,
      currentHour,
      triggerData,
    }

    // DB provider 구현
    const provider: SchedulerDataProvider = {
      async getActiveStatusPersonas(): Promise<SchedulerPersona[]> {
        const personas = await prisma.persona.findMany({
          where: {
            status: { in: ["ACTIVE", "STANDARD"] },
          },
          include: {
            layerVectors: true,
          },
        })

        return personas.flatMap((p): SchedulerPersona[] => {
          const l1 = p.layerVectors.find((v) => v.layerType === "SOCIAL")
          const l2 = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
          const l3 = p.layerVectors.find((v) => v.layerType === "NARRATIVE")

          if (!l1 || !l2 || !l3) return []

          const vectors: ThreeLayerVector = {
            social: {
              depth: Number(l1.dim1 ?? 0.5),
              lens: Number(l1.dim2 ?? 0.5),
              stance: Number(l1.dim3 ?? 0.5),
              scope: Number(l1.dim4 ?? 0.5),
              taste: Number(l1.dim5 ?? 0.5),
              purpose: Number(l1.dim6 ?? 0.5),
              sociability: Number(l1.dim7 ?? 0.5),
            },
            temperament: {
              openness: Number(l2.dim1 ?? 0.5),
              conscientiousness: Number(l2.dim2 ?? 0.5),
              extraversion: Number(l2.dim3 ?? 0.5),
              agreeableness: Number(l2.dim4 ?? 0.5),
              neuroticism: Number(l2.dim5 ?? 0.5),
            },
            narrative: {
              lack: Number(l3.dim1 ?? 0.5),
              moralCompass: Number(l3.dim2 ?? 0.5),
              volatility: Number(l3.dim3 ?? 0.5),
              growthArc: Number(l3.dim4 ?? 0.5),
            },
          }

          return [
            {
              id: p.id,
              name: p.name,
              status: p.status,
              vectors,
              paradoxScore: Number(p.paradoxScore ?? 0),
            },
          ]
        })
      },

      async saveActivityLog({ personaId, decision, context: ctx, stateSnapshot }) {
        if (!decision.shouldPost && !decision.shouldInteract) return

        await prisma.personaActivityLog.create({
          data: {
            personaId,
            activityType: decision.shouldPost ? "POST_CREATED" : "POST_COMMENTED",
            trigger: ctx.trigger,
            postTypeReason: (decision.postTypeReason ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            stateSnapshot: stateSnapshot as unknown as Prisma.InputJsonValue,
          },
        })
      },
    }

    const result = await runScheduler(context, provider)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "SCHEDULER_ERROR", message },
      },
      { status: 500 }
    )
  }
}
