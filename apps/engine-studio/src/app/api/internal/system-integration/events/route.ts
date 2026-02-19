import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import {
  createEventBus,
  subscribe,
  unsubscribe,
  createEvent,
  publish,
  getEventLog,
  getEventStats,
  measureSyncDelay,
  generateSyncDelayReport,
  SYNC_DELAY_TARGETS,
  ALL_EVENT_TYPES,
} from "@/lib/system-integration"
import type {
  EventBusState,
  EventType,
  EventStatus,
  EventLogEntry,
  EventSubscription,
  SyncDelayReport,
} from "@/lib/system-integration"
import {
  DEMO_EVENT_SUBSCRIPTIONS,
  DEMO_SAMPLE_EVENTS,
  DEMO_EVENT_SOURCE,
  DEMO_EVENT_METADATA,
} from "@/lib/demo-fixtures"

// ── In-memory Store ────────────────────────────────────────────

let bus: EventBusState | null = null

function ensureSeedData(): EventBusState {
  if (bus) return bus

  bus = createEventBus(1000)

  // 구독자 추가
  for (const sub of DEMO_EVENT_SUBSCRIPTIONS) {
    bus = subscribe(bus, sub.subscriberId, sub.eventTypes, sub.endpoint)
  }

  // 샘플 이벤트 발행
  for (const { type, payload } of DEMO_SAMPLE_EVENTS) {
    const event = createEvent(type, payload, DEMO_EVENT_SOURCE, DEMO_EVENT_METADATA)
    bus = publish(bus, event)
  }

  return bus
}

// ── Serializable EventBusState ─────────────────────────────────
// The EventBusState has a Map (handlers) which cannot be serialized to JSON.
// We strip it from the response and send a serializable version.

interface SerializableEventBusResponse {
  subscriptions: EventSubscription[]
  eventLog: EventLogEntry[]
  stats: {
    totalEvents: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    failedEvents: number
    avgDeliveryTimeMs: number
  }
  allEventTypes: EventType[]
  syncDelayTargets: typeof SYNC_DELAY_TARGETS
}

// GET — 이벤트 버스 데이터 반환
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const currentBus = ensureSeedData()
    const stats = getEventStats(currentBus)

    return NextResponse.json<ApiResponse<SerializableEventBusResponse>>({
      success: true,
      data: {
        subscriptions: currentBus.subscriptions,
        eventLog: currentBus.eventLog,
        stats,
        allEventTypes: ALL_EVENT_TYPES,
        syncDelayTargets: SYNC_DELAY_TARGETS,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "이벤트 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── Action Types ───────────────────────────────────────────────

type EventAction =
  | {
      action: "publish"
      eventType: EventType
      payload?: Record<string, unknown>
    }
  | {
      action: "unsubscribe"
      subscriptionId: string
    }
  | {
      action: "add_subscription"
      subscriberId?: string
      eventTypes?: EventType[]
      endpoint?: string
    }
  | {
      action: "generate_sync_report"
    }
  | {
      action: "get_filtered_log"
      typeFilter?: EventType | "all"
      statusFilter?: EventStatus | "all"
      limit?: number
    }

// POST — 이벤트 액션 처리
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const currentBus = ensureSeedData()
    const body = (await request.json()) as EventAction

    switch (body.action) {
      case "publish": {
        if (!body.eventType) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_REQUEST", message: "eventType이 필요합니다" },
            },
            { status: 400 }
          )
        }
        const event = createEvent(
          body.eventType,
          body.payload ?? { manual: true, timestamp: Date.now() },
          DEMO_EVENT_SOURCE,
          DEMO_EVENT_METADATA
        )
        bus = publish(currentBus, event)
        return NextResponse.json<ApiResponse<{ eventId: string }>>({
          success: true,
          data: { eventId: event.eventId },
        })
      }

      case "unsubscribe": {
        if (!body.subscriptionId) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_REQUEST", message: "subscriptionId가 필요합니다" },
            },
            { status: 400 }
          )
        }
        bus = unsubscribe(currentBus, body.subscriptionId)
        return NextResponse.json<ApiResponse<{ success: boolean }>>({
          success: true,
          data: { success: true },
        })
      }

      case "add_subscription": {
        const subscriberId = body.subscriberId ?? `subscriber-${Date.now()}`
        const eventTypes: EventType[] = body.eventTypes ?? ["persona.created", "persona.updated"]
        const endpoint =
          body.endpoint ?? `https://webhook-${Math.random().toString(36).slice(2, 6)}.example.com`

        bus = subscribe(currentBus, subscriberId, eventTypes, endpoint)
        return NextResponse.json<ApiResponse<{ subscriptionId: string }>>({
          success: true,
          data: { subscriptionId: bus.subscriptions[bus.subscriptions.length - 1].id },
        })
      }

      case "generate_sync_report": {
        const metrics = currentBus.eventLog
          .filter((entry) => entry.status === "delivered")
          .map((entry) => {
            const target = SYNC_DELAY_TARGETS[0]
            return measureSyncDelay(
              entry.event.eventId,
              entry.event.timestamp,
              entry.deliveredAt,
              target
            )
          })

        if (metrics.length === 0) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: {
                code: "NO_DATA",
                message: "delivered 상태의 이벤트가 없어 리포트를 생성할 수 없습니다",
              },
            },
            { status: 400 }
          )
        }

        const report = generateSyncDelayReport(metrics, SYNC_DELAY_TARGETS[0].name)
        return NextResponse.json<ApiResponse<SyncDelayReport>>({
          success: true,
          data: report,
        })
      }

      case "get_filtered_log": {
        const filters: {
          eventTypes?: EventType[]
          status?: EventStatus[]
          limit?: number
        } = { limit: body.limit ?? 50 }

        if (body.typeFilter && body.typeFilter !== "all") {
          filters.eventTypes = [body.typeFilter]
        }
        if (body.statusFilter && body.statusFilter !== "all") {
          filters.status = [body.statusFilter]
        }

        const log = getEventLog(currentBus, filters)
        return NextResponse.json<ApiResponse<{ log: EventLogEntry[] }>>({
          success: true,
          data: { log },
        })
      }

      default:
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_ACTION", message: "지원하지 않는 액션입니다" },
          },
          { status: 400 }
        )
    }
  } catch (e) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: e instanceof Error ? e.message : "이벤트 액션 처리 실패",
        },
      },
      { status: 500 }
    )
  }
}
