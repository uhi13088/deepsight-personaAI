/**
 * 시스템 통합 이벤트 버스 데모 데이터
 * ⚠️ DB 연동 전 UI 데모 전용
 */
import type { EventType } from "@/lib/system-integration"

// ── 이벤트 구독 시드 ────────────────────────────────────────

export const DEMO_EVENT_SUBSCRIPTIONS: Array<{
  subscriberId: string
  eventTypes: EventType[]
  endpoint: string
}> = [
  {
    subscriberId: "api-engine",
    eventTypes: ["persona.created", "persona.updated", "persona.activated", "algorithm.deployed"],
    endpoint: "https://api.example.com/webhooks",
  },
  {
    subscriberId: "dev-console",
    eventTypes: [
      "persona.created",
      "persona.activated",
      "algorithm.deployed",
      "algorithm.rollback",
    ],
    endpoint: "https://console.example.com/webhooks",
  },
  {
    subscriberId: "monitoring",
    eventTypes: ["system.health_check", "system.alert", "matching.failed"],
    endpoint: "https://monitor.example.com/webhooks",
  },
]

// ── 샘플 이벤트 시드 ────────────────────────────────────────

export const DEMO_SAMPLE_EVENTS: Array<{
  type: EventType
  payload: Record<string, unknown>
}> = [
  { type: "persona.created", payload: { name: "분석가 페르소나", id: "demo-p1" } },
  { type: "persona.activated", payload: { name: "큐레이터 페르소나", id: "demo-p2" } },
  { type: "algorithm.deployed", payload: { version: "v1.2.0", environment: "staging" } },
  { type: "matching.completed", payload: { userId: "demo-u1", matchCount: 5 } },
  { type: "system.health_check", payload: { status: "healthy", uptime: 99.9 } },
  { type: "persona.updated", payload: { name: "감성 공감러", id: "demo-p3", field: "vectors" } },
  { type: "matching.failed", payload: { userId: "demo-u2", error: "timeout" } },
  {
    type: "algorithm.config_changed",
    payload: { key: "threshold", oldValue: 0.5, newValue: 0.55 },
  },
]

// ── 이벤트 소스/메타 ────────────────────────────────────────

export const DEMO_EVENT_SOURCE = {
  service: "engine-studio",
  instance: "demo",
}

export const DEMO_EVENT_METADATA = {
  userId: "demo-admin",
  userRole: "engineer",
  environment: "development" as const,
}
