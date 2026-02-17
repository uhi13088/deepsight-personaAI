"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity,
  AlertTriangle,
  Users,
  Zap,
  DollarSign,
  Clock,
  GitCompare,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { searchLogs, DEFAULT_METRIC_THRESHOLDS } from "@/lib/operations"
import type {
  MetricDataPoint,
  ThresholdAlert,
  LogEntry,
  LogSearchFilter,
  MetricType,
  MetricThreshold,
  DashboardLayout,
  DashboardPanel,
} from "@/lib/operations"

// ── Metric type config ─────────────────────────────────────────

const METRIC_CONFIG: Record<MetricType, { label: string; unit: string; icon: React.ElementType }> =
  {
    active_personas: { label: "활성 페르소나", unit: "개", icon: Users },
    llm_calls: { label: "LLM 호출 (24h)", unit: "회", icon: Zap },
    llm_cost: { label: "LLM 비용 (24h)", unit: "USD", icon: DollarSign },
    llm_error_rate: { label: "LLM 에러율", unit: "%", icon: AlertTriangle },
    avg_latency: { label: "평균 응답시간", unit: "ms", icon: Clock },
    matching_count: { label: "매칭 요청 (24h)", unit: "회", icon: GitCompare },
  }

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  debug: "text-gray-400",
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  fatal: "text-red-600",
}

// ── API response type ──────────────────────────────────────────

interface MonitoringData {
  metrics: MetricDataPoint[]
  logs: LogEntry[]
  alerts: ThresholdAlert[]
  thresholds: MetricThreshold[]
  layout: DashboardLayout
}

export default function MonitoringPage() {
  // ── State ────────────────────────────────────────────────────
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Log search state
  const [logLevelFilter, setLogLevelFilter] = useState<LogEntry["level"] | "">("")
  const [logServiceFilter, setLogServiceFilter] = useState("")
  const [logKeyword, setLogKeyword] = useState("")

  // ── Fetch data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/operations/monitoring")
      const json = (await res.json()) as {
        success: boolean
        data?: MonitoringData
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
        setError(null)
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

  // ── Derived data ─────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    if (!data) return []
    const filter: LogSearchFilter = {
      startTime: null,
      endTime: null,
      levels: logLevelFilter ? [logLevelFilter] : [],
      services: logServiceFilter ? [logServiceFilter] : [],
      keyword: logKeyword || null,
      traceId: null,
      limit: 50,
    }
    return searchLogs(data.logs, filter)
  }, [data, logLevelFilter, logServiceFilter, logKeyword])

  const availableServices = useMemo(() => {
    if (!data) return []
    const services = new Set(data.logs.map((l) => l.service))
    return Array.from(services).sort()
  }, [data])

  // ── Handlers ─────────────────────────────────────────────────

  const handleRefreshMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/operations/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_metrics" }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: MonitoringData
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // silent fail on refresh
    }
  }, [])

  const handleAcknowledgeAlert = useCallback(
    async (alertId: string) => {
      try {
        const res = await fetch("/api/internal/operations/monitoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "acknowledge_alert", alertId }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) {
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [fetchData]
  )

  // ── Helper to get metric value ───────────────────────────────

  const getMetricValue = useCallback(
    (type: MetricType): number => {
      if (!data) return 0
      const point = data.metrics.find((m) => m.metricType === type)
      return point?.value ?? 0
    },
    [data]
  )

  const getMetricStatus = useCallback(
    (type: MetricType): "normal" | "warning" | "critical" => {
      const value = getMetricValue(type)
      const threshold = DEFAULT_METRIC_THRESHOLDS.find((t) => t.metricType === type)
      if (!threshold) return "normal"
      if (
        threshold.comparison === "above"
          ? value >= threshold.criticalLevel
          : value <= threshold.criticalLevel
      )
        return "critical"
      if (
        threshold.comparison === "above"
          ? value >= threshold.warningLevel
          : value <= threshold.warningLevel
      )
        return "warning"
      return "normal"
    },
    [getMetricValue]
  )

  // ── Loading state ───────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header title="System Monitoring" description="실시간 시스템 모니터링 대시보드" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  // ── Error state ─────────────────────────────────────────────

  if (error) {
    return (
      <>
        <Header title="System Monitoring" description="실시간 시스템 모니터링 대시보드" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  if (!data) return null

  return (
    <>
      <Header title="System Monitoring" description="실시간 시스템 모니터링 대시보드" />

      <div className="space-y-6 p-6">
        {/* ── Dashboard Header ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium">{data.layout.name}</span>
            <Badge variant="muted">{data.layout.panels.length} 패널</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefreshMetrics}>
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            새로고침
          </Button>
        </div>

        {/* ── 6 Metric Cards Grid ───────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {(
            [
              "active_personas",
              "llm_calls",
              "llm_cost",
              "llm_error_rate",
              "avg_latency",
              "matching_count",
            ] as MetricType[]
          ).map((type) => {
            const config = METRIC_CONFIG[type]
            const value = getMetricValue(type)
            const status = getMetricStatus(type)
            const Icon = config.icon

            return (
              <div key={type} className="bg-card rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground text-xs">{config.label}</span>
                  </div>
                  {status === "critical" && <Badge variant="destructive">Critical</Badge>}
                  {status === "warning" && <Badge variant="warning">Warning</Badge>}
                  {status === "normal" && <Badge variant="success">Normal</Badge>}
                </div>
                <p className="text-2xl font-bold">
                  {type === "llm_cost"
                    ? `$${value.toFixed(2)}`
                    : type === "llm_error_rate"
                      ? value.toFixed(1)
                      : type === "avg_latency"
                        ? Math.round(value).toLocaleString()
                        : value.toLocaleString()}
                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                    {type === "llm_cost" ? "" : config.unit}
                  </span>
                </p>
              </div>
            )
          })}
        </div>

        {/* ── Threshold Alerts ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-medium">임계값 알림</h3>
              <Badge variant="muted">{data.alerts.length}건</Badge>
            </div>
          </div>

          {data.alerts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              현재 활성 알림이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {alert.level === "critical" ? (
                      <XCircle className="h-4 w-4 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    <div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-muted-foreground text-xs">
                        소스: {alert.source} | 값: {alert.currentValue} | 임계값: {alert.threshold}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.level === "critical" ? "destructive" : "warning"}>
                      {alert.level}
                    </Badge>
                    {alert.acknowledged ? (
                      <Badge variant="muted">확인됨</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        확인
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Log Search ────────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-medium">로그 검색</h3>
            <Badge variant="muted">{filteredLogs.length}건</Badge>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              value={logLevelFilter}
              onChange={(e) => setLogLevelFilter(e.target.value as LogEntry["level"] | "")}
            >
              <option value="">전체 레벨</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="fatal">Fatal</option>
            </select>

            <select
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              value={logServiceFilter}
              onChange={(e) => setLogServiceFilter(e.target.value)}
            >
              <option value="">전체 서비스</option>
              {availableServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="키워드 검색..."
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              value={logKeyword}
              onChange={(e) => setLogKeyword(e.target.value)}
            />
          </div>

          {/* Log entries */}
          <div className="space-y-1">
            {filteredLogs.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">검색 결과가 없습니다</p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded px-2 py-1.5 text-xs hover:bg-white/5"
                >
                  <span className="text-muted-foreground w-16 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`w-10 shrink-0 font-semibold uppercase ${LEVEL_COLORS[log.level]}`}
                  >
                    {log.level}
                  </span>
                  <span className="text-muted-foreground w-24 shrink-0">{log.service}</span>
                  <span className="flex-1">{log.message}</span>
                  {log.traceId && (
                    <span className="text-muted-foreground shrink-0 font-mono">{log.traceId}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Dashboard Panels Layout ───────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">대시보드 패널 구성</h3>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {data.layout.panels.map((panel: DashboardPanel) => (
              <div key={panel.id} className="rounded-md border px-3 py-2 text-xs">
                <p className="font-medium">{panel.title}</p>
                <p className="text-muted-foreground">
                  차트: {panel.chartType} | 메트릭: {panel.metricTypes.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
