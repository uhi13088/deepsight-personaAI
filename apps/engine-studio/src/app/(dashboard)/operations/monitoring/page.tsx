"use client"

import { useState, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Clock,
  Server,
  Wifi,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react"
import {
  createMetricDataPoint,
  evaluateThresholds,
  searchLogs,
  acknowledgeThresholdAlert,
  DEFAULT_METRIC_THRESHOLDS,
  DEFAULT_DASHBOARD_LAYOUT,
} from "@/lib/operations"
import type {
  MetricDataPoint,
  ThresholdAlert,
  LogEntry,
  LogSearchFilter,
  MetricType,
  DashboardPanel,
} from "@/lib/operations"

// ── Sample data generators ────────────────────────────────────

function generateSampleMetrics(): MetricDataPoint[] {
  return [
    createMetricDataPoint("cpu", 72.5, "server-1", { env: "prod" }),
    createMetricDataPoint("memory", 68.3, "server-1", { env: "prod" }),
    createMetricDataPoint("disk", 54.2, "server-1", { env: "prod" }),
    createMetricDataPoint("network", 45.8, "server-1", { env: "prod" }),
    createMetricDataPoint("api_latency", 320, "api-gateway", { env: "prod" }),
    createMetricDataPoint("error_rate", 0.8, "api-gateway", { env: "prod" }),
  ]
}

function generateSampleLogs(): LogEntry[] {
  const now = Date.now()
  return [
    {
      id: "log-1",
      timestamp: now - 1000,
      level: "error",
      service: "api-gateway",
      message: "Connection timeout to database pool",
      metadata: { host: "db-primary" },
      traceId: "trace-001",
    },
    {
      id: "log-2",
      timestamp: now - 5000,
      level: "warn",
      service: "worker",
      message: "Queue depth exceeding threshold",
      metadata: { queue: "persona-processing" },
      traceId: "trace-002",
    },
    {
      id: "log-3",
      timestamp: now - 10000,
      level: "info",
      service: "api-gateway",
      message: "Health check passed",
      metadata: {},
      traceId: null,
    },
    {
      id: "log-4",
      timestamp: now - 15000,
      level: "error",
      service: "matching-engine",
      message: "Vector computation failed for persona batch",
      metadata: { batchId: "batch-42" },
      traceId: "trace-003",
    },
    {
      id: "log-5",
      timestamp: now - 20000,
      level: "info",
      service: "worker",
      message: "Backup job completed successfully",
      metadata: {},
      traceId: null,
    },
    {
      id: "log-6",
      timestamp: now - 30000,
      level: "debug",
      service: "api-gateway",
      message: "Request processed in 120ms",
      metadata: {},
      traceId: "trace-004",
    },
    {
      id: "log-7",
      timestamp: now - 45000,
      level: "warn",
      service: "matching-engine",
      message: "Slow query detected: persona search took 2.3s",
      metadata: { queryId: "q-789" },
      traceId: "trace-005",
    },
    {
      id: "log-8",
      timestamp: now - 60000,
      level: "fatal",
      service: "worker",
      message: "Out of memory error — process restarting",
      metadata: { pid: "12345" },
      traceId: null,
    },
  ]
}

// ── Metric type config ─────────────────────────────────────────

const METRIC_CONFIG: Record<MetricType, { label: string; unit: string; icon: React.ElementType }> =
  {
    cpu: { label: "CPU 사용률", unit: "%", icon: Cpu },
    memory: { label: "메모리 사용률", unit: "%", icon: Server },
    disk: { label: "디스크 사용률", unit: "%", icon: HardDrive },
    network: { label: "네트워크", unit: "%", icon: Wifi },
    api_latency: { label: "API 응답시간", unit: "ms", icon: Clock },
    error_rate: { label: "에러율", unit: "%", icon: AlertTriangle },
  }

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  debug: "text-gray-400",
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  fatal: "text-red-600",
}

export default function MonitoringPage() {
  // ── State ────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<MetricDataPoint[]>(() => generateSampleMetrics())
  const [alerts, setAlerts] = useState<ThresholdAlert[]>(() =>
    evaluateThresholds(generateSampleMetrics(), DEFAULT_METRIC_THRESHOLDS)
  )
  const [logs] = useState<LogEntry[]>(() => generateSampleLogs())

  // Log search state
  const [logLevelFilter, setLogLevelFilter] = useState<LogEntry["level"] | "">("")
  const [logServiceFilter, setLogServiceFilter] = useState("")
  const [logKeyword, setLogKeyword] = useState("")

  // ── Derived data ─────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    const filter: LogSearchFilter = {
      startTime: null,
      endTime: null,
      levels: logLevelFilter ? [logLevelFilter] : [],
      services: logServiceFilter ? [logServiceFilter] : [],
      keyword: logKeyword || null,
      traceId: null,
      limit: 50,
    }
    return searchLogs(logs, filter)
  }, [logs, logLevelFilter, logServiceFilter, logKeyword])

  const availableServices = useMemo(() => {
    const services = new Set(logs.map((l) => l.service))
    return Array.from(services).sort()
  }, [logs])

  // ── Handlers ─────────────────────────────────────────────────

  const handleRefreshMetrics = useCallback(() => {
    const newMetrics = generateSampleMetrics()
    setMetrics(newMetrics)
    setAlerts(evaluateThresholds(newMetrics, DEFAULT_METRIC_THRESHOLDS))
  }, [])

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? acknowledgeThresholdAlert(a) : a)))
  }, [])

  // ── Helper to get metric value ───────────────────────────────

  const getMetricValue = useCallback(
    (type: MetricType): number => {
      const point = metrics.find((m) => m.metricType === type)
      return point?.value ?? 0
    },
    [metrics]
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

  return (
    <>
      <Header title="System Monitoring" description="실시간 시스템 모니터링 대시보드" />

      <div className="space-y-6 p-6">
        {/* ── Dashboard Header ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium">{DEFAULT_DASHBOARD_LAYOUT.name}</span>
            <Badge variant="muted">{DEFAULT_DASHBOARD_LAYOUT.panels.length} 패널</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefreshMetrics}>
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            새로고침
          </Button>
        </div>

        {/* ── 6 Metric Cards Grid ───────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {(["cpu", "memory", "disk", "network", "api_latency", "error_rate"] as MetricType[]).map(
            (type) => {
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
                    {value}
                    <span className="text-muted-foreground ml-1 text-sm font-normal">
                      {config.unit}
                    </span>
                  </p>
                </div>
              )
            }
          )}
        </div>

        {/* ── Threshold Alerts ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-medium">임계값 알림</h3>
              <Badge variant="muted">{alerts.length}건</Badge>
            </div>
          </div>

          {alerts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              현재 활성 알림이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
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
            {DEFAULT_DASHBOARD_LAYOUT.panels.map((panel: DashboardPanel) => (
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
