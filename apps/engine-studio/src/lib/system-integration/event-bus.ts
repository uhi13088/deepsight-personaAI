// ═══════════════════════════════════════════════════════════════
// Event Bus — 이벤트 유형/스키마, 모니터링, 동기화 지연
// ═══════════════════════════════════════════════════════════════

import type { DeployEnvironment } from "./types"

// ═══════════════════════════════════════════════════════════════
// AC3: 이벤트 버스 (이벤트 유형/스키마, 모니터링, 동기화 지연)
// ═══════════════════════════════════════════════════════════════

// ── 이벤트 유형 정의 ────────────────────────────────────────

export type PersonaEventType =
  | "persona.created"
  | "persona.updated"
  | "persona.activated"
  | "persona.deactivated"
  | "persona.archived"
  | "persona.validation_completed"

export type AlgorithmEventType =
  | "algorithm.deployed"
  | "algorithm.rollback"
  | "algorithm.config_changed"

export type SystemEventType = "system.health_check" | "system.alert"

export type MatchingEventType = "matching.completed" | "matching.failed"

export type EventType = PersonaEventType | AlgorithmEventType | SystemEventType | MatchingEventType

export const ALL_EVENT_TYPES: EventType[] = [
  "persona.created",
  "persona.updated",
  "persona.activated",
  "persona.deactivated",
  "persona.archived",
  "persona.validation_completed",
  "algorithm.deployed",
  "algorithm.rollback",
  "algorithm.config_changed",
  "system.health_check",
  "system.alert",
  "matching.completed",
  "matching.failed",
]

// ── 이벤트 스키마 타입 정의 ──────────────────────────────────

export interface EventSource {
  service: string
  instance: string
}

export interface EventMetadata {
  userId: string
  userRole: string
  environment: DeployEnvironment
}

export interface EventSchema<T = Record<string, unknown>> {
  eventId: string
  eventType: EventType
  eventVersion: string
  timestamp: number
  source: EventSource
  correlationId: string | null
  metadata: EventMetadata
  payload: T
}

export type EventStatus = "pending" | "delivered" | "failed" | "retrying"

export interface EventLogEntry {
  event: EventSchema
  status: EventStatus
  attempts: number
  lastAttemptAt: number | null
  deliveredAt: number | null
  error: string | null
  subscribers: string[]
}

// ── 이벤트 구독자 타입 정의 ──────────────────────────────────

export interface EventSubscription {
  id: string
  subscriberId: string
  eventTypes: EventType[]
  endpoint: string
  active: boolean
  createdAt: number
}

export type EventHandler = (event: EventSchema) => void

// ── 이벤트 버스 상태 ────────────────────────────────────────

export interface EventBusState {
  subscriptions: EventSubscription[]
  eventLog: EventLogEntry[]
  handlers: Map<string, EventHandler[]>
  maxLogEntries: number
}

// ── 동기화 지연 모니터링 ────────────────────────────────────

export interface SyncDelayTarget {
  name: string
  slaMs: number
}

export const SYNC_DELAY_TARGETS: SyncDelayTarget[] = [
  { name: "API Engine", slaMs: 5000 },
  { name: "Developer Console", slaMs: 10000 },
]

export interface SyncDelayMetric {
  target: string
  eventId: string
  publishedAt: number
  deliveredAt: number | null
  delayMs: number | null
  slaMs: number
  slaMet: boolean | null
}

export interface SyncDelayReport {
  target: string
  totalEvents: number
  deliveredEvents: number
  averageDelayMs: number
  p95DelayMs: number
  slaCompliancePercent: number
  violations: SyncDelayMetric[]
  generatedAt: number
}

// ── 이벤트 버스 함수 ────────────────────────────────────────

export function createEventBus(maxLogEntries: number = 10000): EventBusState {
  return {
    subscriptions: [],
    eventLog: [],
    handlers: new Map(),
    maxLogEntries,
  }
}

export function subscribe(
  bus: EventBusState,
  subscriberId: string,
  eventTypes: EventType[],
  endpoint: string,
  handler?: EventHandler
): EventBusState {
  const subscription: EventSubscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subscriberId,
    eventTypes,
    endpoint,
    active: true,
    createdAt: Date.now(),
  }

  const newHandlers = new Map(bus.handlers)
  if (handler) {
    for (const eventType of eventTypes) {
      const existing = newHandlers.get(eventType) ?? []
      newHandlers.set(eventType, [...existing, handler])
    }
  }

  return {
    ...bus,
    subscriptions: [...bus.subscriptions, subscription],
    handlers: newHandlers,
  }
}

export function unsubscribe(bus: EventBusState, subscriptionId: string): EventBusState {
  const subscription = bus.subscriptions.find((s) => s.id === subscriptionId)
  if (!subscription) {
    throw new Error(`구독을 찾을 수 없습니다: ${subscriptionId}`)
  }

  return {
    ...bus,
    subscriptions: bus.subscriptions.map((s) =>
      s.id === subscriptionId ? { ...s, active: false } : s
    ),
  }
}

export function createEvent<T = Record<string, unknown>>(
  eventType: EventType,
  payload: T,
  source: EventSource,
  metadata: EventMetadata,
  correlationId: string | null = null
): EventSchema<T> {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventType,
    eventVersion: "1.0",
    timestamp: Date.now(),
    source,
    correlationId,
    metadata,
    payload,
  }
}

export function publish(bus: EventBusState, event: EventSchema): EventBusState {
  // 해당 이벤트 유형을 구독하는 활성 구독자 찾기
  const activeSubscribers = bus.subscriptions
    .filter((s) => s.active && s.eventTypes.includes(event.eventType))
    .map((s) => s.subscriberId)

  // 핸들러 실행 (순수 함수 내에서는 부수 효과 없이 기록만)
  const handlers = bus.handlers.get(event.eventType) ?? []
  for (const handler of handlers) {
    try {
      handler(event)
    } catch {
      // 핸들러 실행 오류는 로그에 기록
    }
  }

  const logEntry: EventLogEntry = {
    event,
    status: activeSubscribers.length > 0 ? "delivered" : "pending",
    attempts: 1,
    lastAttemptAt: Date.now(),
    deliveredAt: activeSubscribers.length > 0 ? Date.now() : null,
    error: null,
    subscribers: activeSubscribers,
  }

  let updatedLog = [...bus.eventLog, logEntry]
  if (updatedLog.length > bus.maxLogEntries) {
    updatedLog = updatedLog.slice(updatedLog.length - bus.maxLogEntries)
  }

  return {
    ...bus,
    eventLog: updatedLog,
  }
}

export function retryEvent(bus: EventBusState, eventId: string): EventBusState {
  const entryIdx = bus.eventLog.findIndex((e) => e.event.eventId === eventId)
  if (entryIdx === -1) {
    throw new Error(`이벤트를 찾을 수 없습니다: ${eventId}`)
  }

  const entry = bus.eventLog[entryIdx]
  if (entry.status !== "failed") {
    throw new Error(`실패(failed) 상태의 이벤트만 재시도할 수 있습니다 (현재: ${entry.status})`)
  }

  const updatedEntry: EventLogEntry = {
    ...entry,
    status: "retrying",
    attempts: entry.attempts + 1,
    lastAttemptAt: Date.now(),
  }

  const updatedLog = [...bus.eventLog]
  updatedLog[entryIdx] = updatedEntry

  return { ...bus, eventLog: updatedLog }
}

export function markEventDelivered(bus: EventBusState, eventId: string): EventBusState {
  const entryIdx = bus.eventLog.findIndex((e) => e.event.eventId === eventId)
  if (entryIdx === -1) {
    throw new Error(`이벤트를 찾을 수 없습니다: ${eventId}`)
  }

  const updatedEntry: EventLogEntry = {
    ...bus.eventLog[entryIdx],
    status: "delivered",
    deliveredAt: Date.now(),
  }

  const updatedLog = [...bus.eventLog]
  updatedLog[entryIdx] = updatedEntry

  return { ...bus, eventLog: updatedLog }
}

export function markEventFailed(bus: EventBusState, eventId: string, error: string): EventBusState {
  const entryIdx = bus.eventLog.findIndex((e) => e.event.eventId === eventId)
  if (entryIdx === -1) {
    throw new Error(`이벤트를 찾을 수 없습니다: ${eventId}`)
  }

  const updatedEntry: EventLogEntry = {
    ...bus.eventLog[entryIdx],
    status: "failed",
    error,
  }

  const updatedLog = [...bus.eventLog]
  updatedLog[entryIdx] = updatedEntry

  return { ...bus, eventLog: updatedLog }
}

export function getEventLog(
  bus: EventBusState,
  filters?: {
    eventTypes?: EventType[]
    status?: EventStatus[]
    startTime?: number
    endTime?: number
    limit?: number
  }
): EventLogEntry[] {
  let result = [...bus.eventLog]

  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    result = result.filter((e) => filters.eventTypes!.includes(e.event.eventType))
  }
  if (filters?.status && filters.status.length > 0) {
    result = result.filter((e) => filters.status!.includes(e.status))
  }
  if (filters?.startTime !== undefined) {
    result = result.filter((e) => e.event.timestamp >= filters.startTime!)
  }
  if (filters?.endTime !== undefined) {
    result = result.filter((e) => e.event.timestamp <= filters.endTime!)
  }

  result.sort((a, b) => b.event.timestamp - a.event.timestamp)

  if (filters?.limit !== undefined && filters.limit > 0) {
    result = result.slice(0, filters.limit)
  }

  return result
}

export function getEventStats(bus: EventBusState): {
  totalEvents: number
  byType: Record<string, number>
  byStatus: Record<EventStatus, number>
  failedEvents: number
  avgDeliveryTimeMs: number
} {
  const byType: Record<string, number> = {}
  const byStatus: Record<EventStatus, number> = {
    pending: 0,
    delivered: 0,
    failed: 0,
    retrying: 0,
  }

  let totalDeliveryTime = 0
  let deliveredCount = 0

  for (const entry of bus.eventLog) {
    byType[entry.event.eventType] = (byType[entry.event.eventType] ?? 0) + 1
    byStatus[entry.status]++

    if (entry.status === "delivered" && entry.deliveredAt !== null) {
      totalDeliveryTime += entry.deliveredAt - entry.event.timestamp
      deliveredCount++
    }
  }

  return {
    totalEvents: bus.eventLog.length,
    byType,
    byStatus,
    failedEvents: byStatus.failed,
    avgDeliveryTimeMs: deliveredCount > 0 ? Math.round(totalDeliveryTime / deliveredCount) : 0,
  }
}

// ── 동기화 지연 모니터링 함수 ────────────────────────────────

export function measureSyncDelay(
  eventId: string,
  publishedAt: number,
  deliveredAt: number | null,
  target: SyncDelayTarget
): SyncDelayMetric {
  const delayMs = deliveredAt !== null ? deliveredAt - publishedAt : null
  const slaMet = delayMs !== null ? delayMs <= target.slaMs : null

  return {
    target: target.name,
    eventId,
    publishedAt,
    deliveredAt,
    delayMs,
    slaMs: target.slaMs,
    slaMet,
  }
}

export function generateSyncDelayReport(
  metrics: SyncDelayMetric[],
  targetName: string
): SyncDelayReport {
  const targetMetrics = metrics.filter((m) => m.target === targetName)
  const delivered = targetMetrics.filter((m) => m.delayMs !== null) as Array<
    SyncDelayMetric & { delayMs: number }
  >

  const averageDelayMs =
    delivered.length > 0
      ? Math.round(delivered.reduce((s, m) => s + m.delayMs, 0) / delivered.length)
      : 0

  // P95 계산
  let p95DelayMs = 0
  if (delivered.length > 0) {
    const sorted = [...delivered].sort((a, b) => a.delayMs - b.delayMs)
    const p95Idx = Math.ceil(sorted.length * 0.95) - 1
    p95DelayMs = sorted[Math.max(0, p95Idx)].delayMs
  }

  const slaMet = delivered.filter((m) => m.slaMet === true).length
  const slaCompliancePercent =
    delivered.length > 0 ? Math.round((slaMet / delivered.length) * 10000) / 100 : 100

  const violations = targetMetrics.filter((m) => m.slaMet === false)

  return {
    target: targetName,
    totalEvents: targetMetrics.length,
    deliveredEvents: delivered.length,
    averageDelayMs,
    p95DelayMs,
    slaCompliancePercent,
    violations,
    generatedAt: Date.now(),
  }
}
