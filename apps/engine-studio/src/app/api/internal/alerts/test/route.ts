import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { sendAlert } from "@/lib/notifications"
import type { AlertChannel, AlertSeverity, AlertCategory } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/internal/alerts/test
 *
 * 테스트 알림 전송. 실제 Slack/Email 채널로 테스트 메시지를 보내고 결과를 반환.
 *
 * Body:
 * - channel?: "slack" | "email" | "all" (기본: "all")
 * - severity?: "critical" | "warning" | "info" (기본: "info")
 */
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const channel: AlertChannel = body.channel ?? "all"
    const severity: AlertSeverity = body.severity ?? "info"
    const category: AlertCategory = "system"

    const result = await sendAlert({
      channel,
      severity,
      category,
      title: "테스트 알림",
      body: `이것은 DeepSight 알림 시스템 테스트입니다. (${new Date().toISOString()})`,
    })

    // AlertLog에 기록
    await prisma.alertLog.create({
      data: {
        severity,
        category,
        channel,
        title: "테스트 알림",
        body: "테스트 알림 전송",
        success: result.success,
        error: result.channels.slack?.error ?? result.channels.email?.error ?? null,
        metadata: { type: "test", channels: result.channels },
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ALERT_TEST_ERROR", message } },
      { status: 500 }
    )
  }
}
