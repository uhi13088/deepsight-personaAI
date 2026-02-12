import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createEventBus,
  subscribe,
  createEvent,
  publish,
  getEventStats,
} from "@/lib/system-integration"
import type { EventType } from "@/lib/system-integration"

interface EventStatsResponse {
  totalEvents: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  failedEvents: number
  avgDeliveryTimeMs: number
}

// GET — 이벤트 통계 반환
export async function GET() {
  try {
    // 샘플 이벤트 버스 생성 및 통계
    let bus = createEventBus(100)
    bus = subscribe(
      bus,
      "api-engine",
      ["persona.created", "persona.updated"],
      "https://api.deepsight.ai/webhooks"
    )

    const source = { service: "engine-studio", instance: "demo-001" }
    const metadata = {
      userId: "admin",
      userRole: "engineer",
      environment: "development" as const,
    }

    const events: EventType[] = [
      "persona.created",
      "persona.updated",
      "algorithm.deployed",
      "matching.completed",
      "system.health_check",
    ]

    for (const eventType of events) {
      const event = createEvent(eventType, { sample: true }, source, metadata)
      bus = publish(bus, event)
    }

    const stats = getEventStats(bus)

    return NextResponse.json<ApiResponse<EventStatsResponse>>({
      success: true,
      data: stats,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "이벤트 통계 조회 실패" },
      },
      { status: 500 }
    )
  }
}

interface PublishEventBody {
  eventType: EventType
  payload: Record<string, unknown>
}

// POST — 이벤트 발행
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublishEventBody

    if (!body.eventType || !body.payload) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "필수 필드가 누락되었습니다" },
        },
        { status: 400 }
      )
    }

    const source = { service: "engine-studio", instance: "api-001" }
    const metadata = {
      userId: "admin",
      userRole: "engineer",
      environment: "development" as const,
    }

    const event = createEvent(body.eventType, body.payload, source, metadata)

    return NextResponse.json<ApiResponse<typeof event>>({
      success: true,
      data: event,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "이벤트 발행 실패" },
      },
      { status: 500 }
    )
  }
}
