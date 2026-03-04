import { NextRequest, NextResponse } from "next/server"
import { runAutoCurationAll } from "@/lib/content/auto-curation"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * GET /api/cron/content-auto-curation
 *
 * 매일 새벽 3시: ConsumptionLog(rating >= 0.7) → PersonaCuratedContent(PENDING) 자동 생성.
 * CRON_SECRET 인증 필요.
 */
export async function GET(request: NextRequest) {
  try {
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

    const startedAt = Date.now()
    const result = await runAutoCurationAll()
    const durationMs = Date.now() - startedAt

    return NextResponse.json({
      success: true,
      data: {
        totalPersonas: result.totalPersonas,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
        durationMs,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "AUTO_CURATION_ERROR", message } },
      { status: 500 }
    )
  }
}
