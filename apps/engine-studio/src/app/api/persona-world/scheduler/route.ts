import { NextRequest, NextResponse } from "next/server"
import { verifyInternalToken } from "@/lib/internal-auth"
import { executePwScheduler } from "@/lib/persona-world/pw-scheduler-service"
import type { SchedulerTrigger } from "@/lib/persona-world/types"

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
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))

    const trigger: SchedulerTrigger = body.trigger ?? "SCHEDULED"
    const currentHour: number = body.currentHour ?? new Date().getHours()
    const triggerData = body.triggerData

    const data = await executePwScheduler({
      trigger,
      currentHour,
      triggerData,
    })

    return NextResponse.json({
      success: true,
      data,
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
