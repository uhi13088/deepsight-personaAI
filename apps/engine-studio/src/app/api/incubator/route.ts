import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 오늘 날짜 범위 생성
function getTodayRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

// 시간 포맷
function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 날짜 포맷
function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  })
}

// 기본 설정
const DEFAULT_SETTINGS = {
  enabled: false,
  runTime: "03:00",
  dailyLimit: 5,
  minPassScore: 70,
  autoApproveScore: 85,
}

// 설정 조회 헬퍼
async function getSettings() {
  const settingsConfig = await prisma.systemConfig.findUnique({
    where: {
      category_key: {
        category: "INCUBATOR",
        key: "settings",
      },
    },
  })

  return (settingsConfig?.value as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS
}

// GET /api/incubator - 인큐베이터 통계 및 오늘의 페르소나
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "stats" // stats, today, history

    const { start: todayStart, end: todayEnd } = getTodayRange()
    const settings = await getSettings()

    if (view === "stats") {
      // 오늘 통계
      const todayLogs = await prisma.incubatorLog.findMany({
        where: {
          batchDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      })

      const todayGenerated = todayLogs.length
      const todayPassed = todayLogs.filter(
        (l) => l.status === "PASSED" || l.status === "APPROVED"
      ).length
      const todayFailed = todayLogs.filter(
        (l) => l.status === "FAILED" || l.status === "REJECTED"
      ).length
      const todayPending = todayLogs.filter((l) => l.status === "PENDING").length

      // 주간 통계 (7일)
      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - 6)

      const weeklyLogs = await prisma.incubatorLog.findMany({
        where: {
          batchDate: {
            gte: weekStart,
            lt: todayEnd,
          },
        },
      })

      // 주간 평균 점수 계산
      const weeklyScores = weeklyLogs
        .filter((l) => l.consistencyScore != null)
        .map((l) => {
          const consistency = Number(l.consistencyScore) || 0
          const vectorAlignment = Number(l.vectorAlignmentScore) || 0
          const toneMatch = Number(l.toneMatchScore) || 0
          const reasoning = Number(l.reasoningQualityScore) || 0
          return (consistency + vectorAlignment + toneMatch + reasoning) * 25
        })

      const weeklyAvgScore =
        weeklyScores.length > 0
          ? Math.round(weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length)
          : 0

      const weeklyPassed = weeklyLogs.filter(
        (l) => l.status === "PASSED" || l.status === "APPROVED"
      ).length
      const weeklyPassRate =
        weeklyLogs.length > 0 ? Math.round((weeklyPassed / weeklyLogs.length) * 100) : 0

      // 마지막 실행 시간 계산
      const lastLog = await prisma.incubatorLog.findFirst({
        orderBy: { createdAt: "desc" },
      })

      // 다음 실행 시간 계산
      const runTime = settings.runTime || "03:00"
      const [runHour, runMinute] = runTime.split(":").map(Number)
      const nextRun = new Date()
      nextRun.setHours(runHour, runMinute, 0, 0)
      if (nextRun <= new Date()) {
        nextRun.setDate(nextRun.getDate() + 1)
      }

      return NextResponse.json({
        success: true,
        data: {
          enabled: settings.enabled,
          lastRun: lastLog ? formatTime(lastLog.createdAt) : null,
          nextRun: formatTime(nextRun),
          todayGenerated,
          todayPassed,
          todayFailed,
          todayPending,
          weeklyStats: {
            avgScore: weeklyAvgScore,
            passRate: weeklyPassRate,
          },
        },
      })
    }

    if (view === "today") {
      // 오늘 생성된 페르소나
      const todayLogs = await prisma.incubatorLog.findMany({
        where: {
          batchDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        orderBy: { createdAt: "desc" },
      })

      const data = todayLogs.map((log) => {
        const vector = (log.generatedVector as Record<string, number>) || {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
        }

        const config = (log.personaConfig as Record<string, string>) || {}

        const consistency = Number(log.consistencyScore) || 0
        const vectorAlignment = Number(log.vectorAlignmentScore) || 0
        const toneMatch = Number(log.toneMatchScore) || 0
        const reasoning = Number(log.reasoningQualityScore) || 0
        const overall = Math.round((consistency + vectorAlignment + toneMatch + reasoning) * 25)

        const testResults = log.testResults as Record<string, unknown> | null

        return {
          id: log.id,
          personaName: config.name || `Persona-${log.id.slice(-6)}`,
          status: log.status,
          scores: {
            consistency,
            vectorAlignment,
            toneMatch,
            reasoning,
            overall,
          },
          vector,
          createdAt: formatTime(log.createdAt),
          failReason:
            log.status === "FAILED" || log.status === "REJECTED"
              ? (testResults?.failReason as string) || "검증 실패"
              : null,
        }
      })

      return NextResponse.json({
        success: true,
        data,
        total: data.length,
      })
    }

    if (view === "history") {
      const days = parseInt(searchParams.get("days") || "7")
      const historyStart = new Date(todayStart)
      historyStart.setDate(historyStart.getDate() - days + 1)

      const logs = await prisma.incubatorLog.findMany({
        where: {
          batchDate: {
            gte: historyStart,
            lt: todayEnd,
          },
        },
        orderBy: { batchDate: "desc" },
      })

      // 날짜별 그룹화
      const historyMap = new Map<
        string,
        {
          date: string
          generated: number
          passed: number
          failed: number
          scores: number[]
        }
      >()

      for (let i = 0; i < days; i++) {
        const date = new Date(todayStart)
        date.setDate(date.getDate() - i)
        const dateStr = formatDate(date)
        historyMap.set(dateStr, {
          date: dateStr,
          generated: 0,
          passed: 0,
          failed: 0,
          scores: [],
        })
      }

      logs.forEach((log) => {
        const dateStr = formatDate(log.batchDate)
        const entry = historyMap.get(dateStr)
        if (entry) {
          entry.generated++
          if (log.status === "PASSED" || log.status === "APPROVED") {
            entry.passed++
          } else if (log.status === "FAILED" || log.status === "REJECTED") {
            entry.failed++
          }

          const consistency = Number(log.consistencyScore) || 0
          const vectorAlignment = Number(log.vectorAlignmentScore) || 0
          const toneMatch = Number(log.toneMatchScore) || 0
          const reasoning = Number(log.reasoningQualityScore) || 0
          const overall = (consistency + vectorAlignment + toneMatch + reasoning) * 25
          entry.scores.push(overall)
        }
      })

      const history = Array.from(historyMap.values()).map((entry) => ({
        date: entry.date,
        generated: entry.generated,
        passed: entry.passed,
        failed: entry.failed,
        avgScore:
          entry.scores.length > 0
            ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
            : 0,
      }))

      return NextResponse.json({
        success: true,
        data: history,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "유효하지 않은 view 파라미터입니다" },
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("[API] GET /api/incubator error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "인큐베이터 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
