import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

interface NotificationItem {
  id: string
  level: "info" | "warning" | "critical"
  title: string
  message: string
  createdAt: string
  read: boolean
}

/**
 * GET /api/internal/notifications
 *
 * 시스템 상태 기반 알림 자동 생성 — DB 쿼리로 현재 상태 파악 후 알림 목록 반환
 */
export async function GET() {
  const notifications: NotificationItem[] = []
  let counter = 0

  function addNotif(level: NotificationItem["level"], title: string, message: string) {
    notifications.push({
      id: `notif-${++counter}`,
      level,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    })
  }

  try {
    // 1. 미해결 인시던트 확인
    try {
      const openIncidents = await prisma.incident.count({
        where: { status: { in: ["REPORTED", "INVESTIGATING", "FIXING"] } },
      })
      if (openIncidents > 0) {
        addNotif(
          openIncidents > 2 ? "critical" : "warning",
          `미해결 인시던트 ${openIncidents}건`,
          "Operations > Incident Management에서 확인하세요"
        )
      }
    } catch {
      // table may not exist
    }

    // 2. 긴급 동결 상태 확인
    try {
      const safetyConfig = await prisma.systemSafetyConfig.findUnique({
        where: { id: "singleton" },
      })
      if (safetyConfig?.emergencyFreeze) {
        addNotif(
          "critical",
          "긴급 동결 활성화됨",
          safetyConfig.freezeReason ?? "시스템 긴급 동결 중"
        )
      }
    } catch {
      // table may not exist
    }

    // 3. 오늘 에러 로그 확인
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const errorCount = await prisma.systemLog.count({
        where: { level: { in: ["error", "fatal"] }, createdAt: { gte: todayStart } },
      })
      if (errorCount > 0) {
        addNotif(
          errorCount > 10 ? "critical" : "warning",
          `오늘 에러 로그 ${errorCount}건`,
          "Operations > System Monitoring에서 확인하세요"
        )
      }
    } catch {
      // table may not exist
    }

    // 4. 일시중지된 페르소나 확인
    try {
      const pausedCount = await prisma.persona.count({ where: { status: "PAUSED" } })
      if (pausedCount > 0) {
        addNotif("info", `일시중지 페르소나 ${pausedCount}개`, "PW Admin > Scheduler에서 재개 가능")
      }
    } catch {
      // table may not exist
    }

    // 5. 미처리 신고 확인
    try {
      const pendingReports = await prisma.personaWorldReport.count({
        where: { status: "PENDING" },
      })
      if (pendingReports > 0) {
        addNotif(
          pendingReports > 5 ? "warning" : "info",
          `미처리 신고 ${pendingReports}건`,
          "PW Admin > Moderation에서 확인하세요"
        )
      }
    } catch {
      // table may not exist
    }

    return NextResponse.json<ApiResponse<{ notifications: NotificationItem[] }>>({
      success: true,
      data: { notifications },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "NOTIFICATION_ERROR", message } },
      { status: 500 }
    )
  }
}
