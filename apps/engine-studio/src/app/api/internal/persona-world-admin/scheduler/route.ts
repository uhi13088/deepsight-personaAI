import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import {
  getSchedulerStatus,
  triggerSchedulerNow,
  resumePersona,
  pausePersona,
  triggerNewsArticle,
  runDailyNewsReactionPipeline,
} from "@/lib/persona-world/admin/scheduler-service"

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const data = await getSchedulerStatus()
    return NextResponse.json({ success: true, data })
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
        try {
          const data = await triggerSchedulerNow()
          return NextResponse.json({ success: true, data })
        } catch (schedulerError) {
          const msg =
            schedulerError instanceof Error ? schedulerError.message : "Unknown scheduler error"
          console.error("[Scheduler] runScheduler failed:", schedulerError)
          return NextResponse.json(
            { success: false, error: { code: "SCHEDULER_RUN_ERROR", message: msg } },
            { status: 500 }
          )
        }
      }

      case "resume_persona": {
        if (!personaId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "personaId required" } },
            { status: 400 }
          )
        }
        const data = await resumePersona(personaId)
        return NextResponse.json({ success: true, data })
      }

      case "pause_persona": {
        if (!personaId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "personaId required" } },
            { status: 400 }
          )
        }
        const data = await pausePersona(personaId)
        return NextResponse.json({ success: true, data })
      }

      case "trigger_news_article": {
        const { articleId } = body as { action: string; articleId?: string }
        if (!articleId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "articleId required" } },
            { status: 400 }
          )
        }

        const result = await triggerNewsArticle(articleId)
        if (!result) {
          return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "NewsArticle not found" } },
            { status: 404 }
          )
        }

        return NextResponse.json({ success: true, data: result })
      }

      case "daily_news": {
        const { dailyBudget, maxPerPersona, withinHours } = body as {
          action: string
          dailyBudget?: number
          maxPerPersona?: number
          withinHours?: number
        }

        const data = await runDailyNewsReactionPipeline({
          dailyBudget,
          maxPerPersona,
          withinHours,
        })
        return NextResponse.json({ success: true, data })
      }

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
