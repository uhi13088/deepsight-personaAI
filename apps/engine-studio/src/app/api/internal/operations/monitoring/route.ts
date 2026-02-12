import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createMetricDataPoint,
  evaluateThresholds,
  DEFAULT_METRIC_THRESHOLDS,
  DEFAULT_DASHBOARD_LAYOUT,
  acknowledgeThresholdAlert,
} from "@/lib/operations"
import type {
  MetricDataPoint,
  LogEntry,
  ThresholdAlert,
  DashboardLayout,
  MetricThreshold,
} from "@/lib/operations"

// ── In-memory store ─────────────────────────────────────────────

interface MonitoringStore {
  metrics: MetricDataPoint[]
  logs: LogEntry[]
  alerts: ThresholdAlert[]
  thresholds: MetricThreshold[]
  layout: DashboardLayout
}

function buildInitialMetrics(): MetricDataPoint[] {
  return [
    createMetricDataPoint("cpu", 72.5, "server-1", { env: "prod" }),
    createMetricDataPoint("memory", 68.3, "server-1", { env: "prod" }),
    createMetricDataPoint("disk", 54.2, "server-1", { env: "prod" }),
    createMetricDataPoint("network", 45.8, "server-1", { env: "prod" }),
    createMetricDataPoint("api_latency", 320, "api-gateway", { env: "prod" }),
    createMetricDataPoint("error_rate", 0.8, "api-gateway", { env: "prod" }),
  ]
}

function buildInitialLogs(): LogEntry[] {
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

function buildInitialStore(): MonitoringStore {
  const metrics = buildInitialMetrics()
  const alerts = evaluateThresholds(metrics, DEFAULT_METRIC_THRESHOLDS)
  return {
    metrics,
    logs: buildInitialLogs(),
    alerts,
    thresholds: DEFAULT_METRIC_THRESHOLDS,
    layout: { ...DEFAULT_DASHBOARD_LAYOUT, updatedAt: Date.now() },
  }
}

let store: MonitoringStore | null = null

function getStore(): MonitoringStore {
  if (!store) {
    store = buildInitialStore()
  }
  return store
}

// ── Response type ───────────────────────────────────────────────

interface MonitoringResponse {
  metrics: MetricDataPoint[]
  logs: LogEntry[]
  alerts: ThresholdAlert[]
  thresholds: MetricThreshold[]
  layout: DashboardLayout
}

// ── GET: Return full monitoring data ────────────────────────────

export async function GET() {
  try {
    const s = getStore()

    return NextResponse.json<ApiResponse<MonitoringResponse>>({
      success: true,
      data: {
        metrics: s.metrics,
        logs: s.logs,
        alerts: s.alerts,
        thresholds: s.thresholds,
        layout: s.layout,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모니터링 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Create alert or refresh metrics or acknowledge alert ──

interface MonitoringPostRequest {
  action: "create_alert" | "refresh_metrics" | "acknowledge_alert"
  // For create_alert
  metricType?: string
  value?: number
  source?: string
  // For acknowledge_alert
  alertId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MonitoringPostRequest
    const s = getStore()

    if (body.action === "refresh_metrics") {
      // Regenerate metrics with slightly different values
      s.metrics = buildInitialMetrics()
      s.alerts = evaluateThresholds(s.metrics, s.thresholds)
      s.layout = { ...s.layout, updatedAt: Date.now() }

      return NextResponse.json<ApiResponse<MonitoringResponse>>({
        success: true,
        data: {
          metrics: s.metrics,
          logs: s.logs,
          alerts: s.alerts,
          thresholds: s.thresholds,
          layout: s.layout,
        },
      })
    }

    if (body.action === "acknowledge_alert") {
      if (!body.alertId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "alertId가 필요합니다" },
          },
          { status: 400 }
        )
      }
      s.alerts = s.alerts.map((a) => (a.id === body.alertId ? acknowledgeThresholdAlert(a) : a))

      return NextResponse.json<ApiResponse<{ alerts: ThresholdAlert[] }>>({
        success: true,
        data: { alerts: s.alerts },
      })
    }

    if (body.action === "create_alert") {
      if (!body.metricType || body.value === undefined || !body.source) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "metricType, value, source가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const dataPoint = createMetricDataPoint(
        body.metricType as Parameters<typeof createMetricDataPoint>[0],
        body.value,
        body.source
      )
      const newAlerts = evaluateThresholds([dataPoint], s.thresholds)

      return NextResponse.json<ApiResponse<{ alerts: ThresholdAlert[] }>>({
        success: true,
        data: { alerts: newAlerts },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: create_alert, refresh_metrics, acknowledge_alert",
        },
      },
      { status: 400 }
    )
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모니터링 작업 실패" },
      },
      { status: 500 }
    )
  }
}
