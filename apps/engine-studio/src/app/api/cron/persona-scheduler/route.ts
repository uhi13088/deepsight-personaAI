import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 min for processing many personas

/**
 * GET /api/cron/persona-scheduler
 *
 * External cron trigger for autonomous persona scheduler.
 * Called hourly by Vercel Cron / GitHub Actions / etc.
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

    // Call the scheduler endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/persona-world/scheduler`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "SCHEDULED" }),
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      data: {
        executedAt: new Date().toISOString(),
        schedulerResult: result,
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
