"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  EventType,
  EventStatus,
  EventLogEntry,
  EventSubscription,
  SyncDelayReport,
} from "@/lib/system-integration"
import {
  Radio,
  Activity,
  Bell,
  BellOff,
  Send,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
} from "lucide-react"

// ── 상수 ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EventStatus, { icon: React.ReactNode; color: string; label: string }> =
  {
    pending: {
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "text-muted-foreground",
      label: "Pending",
    },
    delivered: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      color: "text-emerald-400",
      label: "Delivered",
    },
    failed: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: "text-red-400",
      label: "Failed",
    },
    retrying: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      color: "text-amber-400",
      label: "Retrying",
    },
  }

const EVENT_TYPE_GROUPS: Record<string, EventType[]> = {
  Persona: [
    "persona.created",
    "persona.updated",
    "persona.activated",
    "persona.deactivated",
    "persona.archived",
    "persona.validation_completed",
  ],
  Algorithm: ["algorithm.deployed", "algorithm.rollback", "algorithm.config_changed"],
  System: ["system.health_check", "system.alert"],
  Matching: ["matching.completed", "matching.failed"],
}

// ── 타입 ──────────────────────────────────────────────────────

interface SyncDelayTarget {
  name: string
  slaMs: number
}

interface EventBusData {
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
  syncDelayTargets: SyncDelayTarget[]
}

// ── 페이지 ────────────────────────────────────────────────────

export default function EventBusPage() {
  const [data, setData] = useState<EventBusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all")
  const [syncReport, setSyncReport] = useState<SyncDelayReport | null>(null)

  // ── 데이터 로드 ─────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/system-integration/events")
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "데이터 로드 실패")
      }
    } catch {
      setError("서버 연결 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── 파생 상태 ───────────────────────────────────────────────

  const stats = data?.stats ?? {
    totalEvents: 0,
    byType: {},
    byStatus: { delivered: 0, failed: 0, pending: 0, retrying: 0 },
    failedEvents: 0,
    avgDeliveryTimeMs: 0,
  }

  const allEventTypes = data?.allEventTypes ?? []
  const syncDelayTargets = data?.syncDelayTargets ?? []
  const subscriptions = data?.subscriptions ?? []

  // 필터된 이벤트 로그 (클라이언트 사이드 필터링)
  const filteredLog = useMemo(() => {
    if (!data) return []
    let log = data.eventLog

    if (typeFilter !== "all") {
      log = log.filter((entry) => entry.event.eventType === typeFilter)
    }
    if (statusFilter !== "all") {
      log = log.filter((entry) => entry.status === statusFilter)
    }

    return log.slice(0, 50)
  }, [data, typeFilter, statusFilter])

  // ── 이벤트 발행 ─────────────────────────────────────────────

  const handlePublishEvent = useCallback(
    async (eventType: EventType) => {
      try {
        const res = await fetch("/api/internal/system-integration/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "publish",
            eventType,
            payload: { manual: true, timestamp: Date.now() },
          }),
        })
        const json = await res.json()
        if (json.success) {
          await fetchData()
        }
      } catch {
        // handle error silently
      }
    },
    [fetchData]
  )

  // ── 구독 해제 ───────────────────────────────────────────────

  const handleUnsubscribe = useCallback(
    async (subscriptionId: string) => {
      try {
        const res = await fetch("/api/internal/system-integration/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsubscribe",
            subscriptionId,
          }),
        })
        const json = await res.json()
        if (json.success) {
          await fetchData()
        }
      } catch {
        // handle error silently
      }
    },
    [fetchData]
  )

  // ── 새 구독 추가 ────────────────────────────────────────────

  const handleAddSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/system-integration/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_subscription",
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchData()
      }
    } catch {
      // handle error silently
    }
  }, [fetchData])

  // ── Sync Delay Report 생성 ──────────────────────────────────

  const handleGenerateSyncReport = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/system-integration/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_sync_report",
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSyncReport(json.data)
      }
    } catch {
      // handle error silently
    }
  }, [])

  // ── 로딩/에러 UI ──────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header title="Event Bus Monitor" description="실시간 이벤트 모니터링 및 동기화" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Event Bus Monitor" description="실시간 이벤트 모니터링 및 동기화" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Event Bus Monitor" description="실시간 이벤트 모니터링 및 동기화" />

      <div className="space-y-6 p-6">
        {/* ── 통계 카드 ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">Total Events</p>
            <p className="mt-1 text-2xl font-bold">{stats.totalEvents}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-emerald-400">Delivered</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.byStatus.delivered}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-red-400">Failed</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{stats.byStatus.failed}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">Pending</p>
            <p className="mt-1 text-2xl font-bold">{stats.byStatus.pending}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">Avg Delivery</p>
            <p className="mt-1 text-2xl font-bold">{stats.avgDeliveryTimeMs}ms</p>
          </div>
        </div>

        {/* ── 이벤트 발행 ─────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Publish Event</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EVENT_TYPE_GROUPS).map(([group, types]) => (
              <div key={group} className="flex items-center gap-1">
                <span className="text-muted-foreground mr-1 text-[10px]">{group}:</span>
                {types.slice(0, 2).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublishEvent(type)}
                    className="text-[10px]"
                  >
                    <Send className="mr-1 h-3 w-3" />
                    {type.split(".")[1]}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── 필터 + 이벤트 로그 ──────────────────────── */}
        <div className="bg-card rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Event Log</h3>
              <Badge variant="muted">{filteredLog.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-3.5 w-3.5" />
              <select
                className="border-border bg-background rounded border px-2 py-1 text-xs"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as EventType | "all")}
              >
                <option value="all">All Types</option>
                {allEventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                className="border-border bg-background rounded border px-2 py-1 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EventStatus | "all")}
              >
                <option value="all">All Status</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="retrying">Retrying</option>
              </select>
            </div>
          </div>

          <div className="divide-y">
            {filteredLog.length > 0 ? (
              filteredLog.map((entry) => {
                const statusInfo = STATUS_CONFIG[entry.status]
                return (
                  <div
                    key={entry.event.eventId}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={statusInfo.color}>{statusInfo.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium">
                            {entry.event.eventType}
                          </span>
                          <Badge
                            variant={
                              entry.status === "delivered"
                                ? "success"
                                : entry.status === "failed"
                                  ? "destructive"
                                  : entry.status === "retrying"
                                    ? "warning"
                                    : "muted"
                            }
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex gap-3 text-[10px]">
                          <span>{entry.event.source.service}</span>
                          <span>Attempts: {entry.attempts}</span>
                          {entry.subscribers.length > 0 && (
                            <span>Subscribers: {entry.subscribers.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-right text-[10px]">
                      <div>{new Date(entry.event.timestamp).toLocaleTimeString()}</div>
                      {entry.error && <div className="text-red-400">{entry.error}</div>}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Radio className="text-muted-foreground mb-3 h-8 w-8" />
                <p className="text-muted-foreground text-sm">No events match the current filters</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 구독 관리 ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Subscriptions</h3>
            <Button size="sm" variant="outline" onClick={handleAddSubscription}>
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              Add Subscription
            </Button>
          </div>
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                  sub.active ? "" : "opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {sub.active ? (
                    <Bell className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <BellOff className="text-muted-foreground h-4 w-4" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{sub.subscriberId}</span>
                      <Badge variant={sub.active ? "success" : "muted"}>
                        {sub.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[10px]">
                      {sub.endpoint} | {sub.eventTypes.length} event types
                    </div>
                  </div>
                </div>
                {sub.active && (
                  <Button size="sm" variant="outline" onClick={() => handleUnsubscribe(sub.id)}>
                    <BellOff className="mr-1 h-3 w-3" />
                    Unsubscribe
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sync Delay Report ───────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Sync Delay Report</h3>
            <Button size="sm" variant="outline" onClick={handleGenerateSyncReport}>
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Generate Report
            </Button>
          </div>

          {syncReport ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <p className="text-muted-foreground text-[10px]">Total Events</p>
                  <p className="text-sm font-bold text-blue-400">{syncReport.totalEvents}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                  <p className="text-muted-foreground text-[10px]">Delivered</p>
                  <p className="text-sm font-bold text-emerald-400">{syncReport.deliveredEvents}</p>
                </div>
                <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                  <p className="text-muted-foreground text-[10px]">Avg Delay</p>
                  <p className="text-sm font-bold text-purple-400">{syncReport.averageDelayMs}ms</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                  <p className="text-muted-foreground text-[10px]">SLA Compliance</p>
                  <p
                    className={`text-sm font-bold ${
                      syncReport.slaCompliancePercent >= 95
                        ? "text-emerald-400"
                        : syncReport.slaCompliancePercent >= 80
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {syncReport.slaCompliancePercent}%
                  </p>
                </div>
              </div>

              {syncReport.violations.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    SLA Violations ({syncReport.violations.length})
                  </p>
                  <div className="space-y-1">
                    {syncReport.violations.slice(0, 5).map((v) => (
                      <div
                        key={v.eventId}
                        className="flex items-center justify-between rounded bg-red-500/10 px-3 py-1.5 text-xs text-red-400"
                      >
                        <span className="font-mono">{v.eventId.slice(0, 20)}...</span>
                        <span>
                          {v.delayMs}ms (SLA: {v.slaMs}ms)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                Generate a report to analyze sync delay metrics
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Target SLA: {syncDelayTargets.map((t) => `${t.name} (${t.slaMs}ms)`).join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
