import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/event-bus - 이벤트 버스 전체 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 이벤트 목록 조회 (최근 50개)
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // 채널 목록 조회
    const channels = await prisma.eventChannel.findMany({
      orderBy: { name: "asc" },
    })

    // Dead Letter 목록 조회
    const deadLetters = await prisma.deadLetterEvent.findMany({
      orderBy: { failedAt: "desc" },
      take: 100,
    })

    // 통계 계산
    const total = events.length
    const success = events.filter((e) => e.status === "SUCCESS").length
    const failed = events.filter((e) => e.status === "FAILED").length
    const processing = events.filter((e) => e.status === "PROCESSING").length
    const avgProcessingTime =
      total > 0
        ? Math.round(events.reduce((acc, e) => acc + (e.processingTime || 0), 0) / total)
        : 0

    return NextResponse.json({
      success: true,
      data: {
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          source: e.source,
          target: e.target,
          payload: e.payload || {},
          status: e.status.toLowerCase(),
          priority: e.priority.toLowerCase(),
          timestamp: e.createdAt.toISOString(),
          processingTime: e.processingTime,
          error: e.error,
          retryCount: e.retryCount,
        })),
        channels: channels.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          source: c.source,
          target: c.target,
          eventTypes: c.eventTypes,
          status: c.status.toLowerCase(),
          messagesPerSecond: Number(c.messagesPerSecond),
          totalMessages: Number(c.totalMessages),
          errorRate: Number(c.errorRate),
        })),
        deadLetters: deadLetters.map((dl) => ({
          id: dl.id,
          originalEventId: dl.originalEventId,
          eventType: dl.eventType,
          error: dl.error,
          failedAt: dl.failedAt.toISOString(),
          retries: dl.retries,
          payload: dl.payload || {},
        })),
        stats: {
          total,
          success,
          failed,
          processing,
          avgProcessingTime,
        },
      },
    })
  } catch (error) {
    console.error("[API] GET /api/event-bus error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "이벤트 버스 데이터 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
