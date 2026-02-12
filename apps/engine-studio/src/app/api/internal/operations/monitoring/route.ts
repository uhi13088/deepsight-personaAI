import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createMetricDataPoint,
  evaluateThresholds,
  buildMonitoringDashboard,
  DEFAULT_METRIC_THRESHOLDS,
  DEFAULT_DASHBOARD_LAYOUT,
} from "@/lib/operations"
import type { MonitoringDashboardData, LogEntry, ThresholdAlert } from "@/lib/operations"

// ── Sample data ─────────────────────────────────────────────────

function buildSampleLogs(): LogEntry[] {
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
  ]
}

function buildSampleMetrics() {
  return [
    createMetricDataPoint("cpu", 72.5, "server-1", { env: "prod" }),
    createMetricDataPoint("memory", 68.3, "server-1", { env: "prod" }),
    createMetricDataPoint("disk", 54.2, "server-1", { env: "prod" }),
    createMetricDataPoint("network", 45.8, "server-1", { env: "prod" }),
    createMetricDataPoint("api_latency", 320, "api-gateway", { env: "prod" }),
    createMetricDataPoint("error_rate", 0.8, "api-gateway", { env: "prod" }),
  ]
}

// ── GET: Return monitoring dashboard data ──────────────────────

export async function GET() {
  try {
    const metrics = buildSampleMetrics()
    const logs = buildSampleLogs()
    const dashboard = buildMonitoringDashboard(
      metrics,
      logs,
      DEFAULT_METRIC_THRESHOLDS,
      DEFAULT_DASHBOARD_LAYOUT
    )

    return NextResponse.json<ApiResponse<MonitoringDashboardData>>({
      success: true,
      data: dashboard,
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

// ── POST: Create alert ─────────────────────────────────────────

interface CreateAlertRequest {
  metricType: string
  value: number
  source: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAlertRequest

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
    const alerts = evaluateThresholds([dataPoint], DEFAULT_METRIC_THRESHOLDS)

    return NextResponse.json<ApiResponse<{ alerts: ThresholdAlert[] }>>({
      success: true,
      data: { alerts },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알림 생성 실패" },
      },
      { status: 500 }
    )
  }
}
