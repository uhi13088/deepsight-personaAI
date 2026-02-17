import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { prisma } from "@/lib/prisma"
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

// ── Response / Request types ────────────────────────────────────

interface MonitoringResponse {
  metrics: MetricDataPoint[]
  logs: LogEntry[]
  alerts: ThresholdAlert[]
  thresholds: MetricThreshold[]
  layout: DashboardLayout
}

interface MonitoringPostRequest {
  action: "create_alert" | "refresh_metrics" | "acknowledge_alert"
  // For create_alert
  metricType?: string
  value?: number
  source?: string
  // For acknowledge_alert
  alertId?: string
}

// ── Conversion helpers ──────────────────────────────────────────

function systemMetricToDataPoint(row: {
  id: string
  metricType: string
  value: unknown
  unit: string
  tags: unknown
  recordedAt: Date
}): MetricDataPoint {
  return {
    metricType: row.metricType as MetricDataPoint["metricType"],
    value: Number(row.value),
    source: (row.tags as Record<string, string>)?.source ?? "unknown",
    timestamp: row.recordedAt.getTime(),
    labels: (row.tags as Record<string, string>) ?? {},
  }
}

function systemLogToLogEntry(row: {
  id: string
  level: string
  service: string
  message: string
  metadata: unknown
  traceId: string | null
  createdAt: Date
}): LogEntry {
  return {
    id: row.id,
    timestamp: row.createdAt.getTime(),
    level: row.level as LogEntry["level"],
    service: row.service,
    message: row.message,
    metadata: (row.metadata as Record<string, string>) ?? {},
    traceId: row.traceId ?? null,
  }
}

// ── Seed helpers (when DB tables are empty) ─────────────────────

async function seedInitialMetrics(): Promise<void> {
  const seedData = [
    { metricType: "cpu", value: 72.5, unit: "%", tags: { source: "server-1", env: "prod" } },
    { metricType: "memory", value: 68.3, unit: "%", tags: { source: "server-1", env: "prod" } },
    { metricType: "disk", value: 54.2, unit: "%", tags: { source: "server-1", env: "prod" } },
    { metricType: "network", value: 45.8, unit: "%", tags: { source: "server-1", env: "prod" } },
    {
      metricType: "api_latency",
      value: 320,
      unit: "ms",
      tags: { source: "api-gateway", env: "prod" },
    },
    {
      metricType: "error_rate",
      value: 0.8,
      unit: "%",
      tags: { source: "api-gateway", env: "prod" },
    },
  ]

  await prisma.systemMetric.createMany({ data: seedData })
}

async function seedInitialLogs(): Promise<void> {
  const now = new Date()
  const seedData = [
    {
      level: "error",
      service: "api-gateway",
      message: "Connection timeout to database pool",
      metadata: { host: "db-primary" },
      traceId: "trace-001",
      createdAt: new Date(now.getTime() - 1000),
    },
    {
      level: "warn",
      service: "worker",
      message: "Queue depth exceeding threshold",
      metadata: { queue: "persona-processing" },
      traceId: "trace-002",
      createdAt: new Date(now.getTime() - 5000),
    },
    {
      level: "info",
      service: "api-gateway",
      message: "Health check passed",
      metadata: {},
      traceId: null,
      createdAt: new Date(now.getTime() - 10000),
    },
    {
      level: "error",
      service: "matching-engine",
      message: "Vector computation failed for persona batch",
      metadata: { batchId: "batch-42" },
      traceId: "trace-003",
      createdAt: new Date(now.getTime() - 15000),
    },
    {
      level: "info",
      service: "worker",
      message: "Backup job completed successfully",
      metadata: {},
      traceId: null,
      createdAt: new Date(now.getTime() - 20000),
    },
    {
      level: "debug",
      service: "api-gateway",
      message: "Request processed in 120ms",
      metadata: {},
      traceId: "trace-004",
      createdAt: new Date(now.getTime() - 30000),
    },
    {
      level: "warn",
      service: "matching-engine",
      message: "Slow query detected: persona search took 2.3s",
      metadata: { queryId: "q-789" },
      traceId: "trace-005",
      createdAt: new Date(now.getTime() - 45000),
    },
    {
      level: "fatal",
      service: "worker",
      message: "Out of memory error — process restarting",
      metadata: { pid: "12345" },
      traceId: null,
      createdAt: new Date(now.getTime() - 60000),
    },
  ]

  await prisma.systemLog.createMany({ data: seedData })
}

// ── DB loaders ──────────────────────────────────────────────────

async function loadMetrics(): Promise<MetricDataPoint[]> {
  let rows = await prisma.systemMetric.findMany({
    orderBy: { recordedAt: "desc" },
    take: 100,
  })

  if (rows.length === 0) {
    await seedInitialMetrics()
    rows = await prisma.systemMetric.findMany({
      orderBy: { recordedAt: "desc" },
      take: 100,
    })
  }

  return rows.map(systemMetricToDataPoint)
}

async function loadLogs(): Promise<LogEntry[]> {
  let rows = await prisma.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  if (rows.length === 0) {
    await seedInitialLogs()
    rows = await prisma.systemLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  }

  return rows.map(systemLogToLogEntry)
}

async function loadThresholds(): Promise<MetricThreshold[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "MONITORING", key: "thresholds" } },
  })

  if (!row) return DEFAULT_METRIC_THRESHOLDS

  return row.value as unknown as MetricThreshold[]
}

async function loadLayout(): Promise<DashboardLayout> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "MONITORING", key: "layout" } },
  })

  if (!row) return { ...DEFAULT_DASHBOARD_LAYOUT, updatedAt: Date.now() }

  return row.value as unknown as DashboardLayout
}

async function loadAcknowledgedAlertIds(): Promise<Set<string>> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "MONITORING", key: "acknowledgedAlerts" } },
  })

  if (!row) return new Set()

  return new Set(row.value as unknown as string[])
}

async function saveAcknowledgedAlertIds(ids: string[]): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: "MONITORING", key: "acknowledgedAlerts" } },
    update: { value: ids },
    create: {
      category: "MONITORING",
      key: "acknowledgedAlerts",
      value: ids,
      description: "Acknowledged monitoring alert IDs",
    },
  })
}

function applyAcknowledgments(
  alerts: ThresholdAlert[],
  acknowledgedIds: Set<string>
): ThresholdAlert[] {
  return alerts.map((a) => (acknowledgedIds.has(a.id) ? acknowledgeThresholdAlert(a) : a))
}

async function buildFullResponse(): Promise<MonitoringResponse> {
  const [metrics, logs, thresholds, layout, acknowledgedIds] = await Promise.all([
    loadMetrics(),
    loadLogs(),
    loadThresholds(),
    loadLayout(),
    loadAcknowledgedAlertIds(),
  ])

  const rawAlerts = evaluateThresholds(metrics, thresholds)
  const alerts = applyAcknowledgments(rawAlerts, acknowledgedIds)

  return { metrics, logs, alerts, thresholds, layout }
}

// ── GET: Return full monitoring data ────────────────────────────

export async function GET() {
  try {
    const data = await buildFullResponse()

    return NextResponse.json<ApiResponse<MonitoringResponse>>({
      success: true,
      data,
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MonitoringPostRequest

    if (body.action === "refresh_metrics") {
      // Create new SystemMetric records with current values
      const newDataPoints = [
        createMetricDataPoint("cpu", 72.5, "server-1", { env: "prod" }),
        createMetricDataPoint("memory", 68.3, "server-1", { env: "prod" }),
        createMetricDataPoint("disk", 54.2, "server-1", { env: "prod" }),
        createMetricDataPoint("network", 45.8, "server-1", { env: "prod" }),
        createMetricDataPoint("api_latency", 320, "api-gateway", { env: "prod" }),
        createMetricDataPoint("error_rate", 0.8, "api-gateway", { env: "prod" }),
      ]

      await prisma.systemMetric.createMany({
        data: newDataPoints.map((dp) => ({
          metricType: dp.metricType,
          value: dp.value,
          unit: dp.metricType === "api_latency" ? "ms" : "%",
          tags: { source: dp.source, ...dp.labels },
        })),
      })

      const data = await buildFullResponse()

      return NextResponse.json<ApiResponse<MonitoringResponse>>({
        success: true,
        data,
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

      // Load existing acknowledged IDs, add the new one, and persist
      const existingIds = await loadAcknowledgedAlertIds()
      existingIds.add(body.alertId)
      await saveAcknowledgedAlertIds([...existingIds])

      // Recalculate alerts with acknowledgment status
      const [metrics, thresholds] = await Promise.all([loadMetrics(), loadThresholds()])
      const rawAlerts = evaluateThresholds(metrics, thresholds)
      const alerts = applyAcknowledgments(rawAlerts, existingIds)

      return NextResponse.json<ApiResponse<{ alerts: ThresholdAlert[] }>>({
        success: true,
        data: { alerts },
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

      // Create a new SystemMetric record
      const dataPoint = createMetricDataPoint(
        body.metricType as Parameters<typeof createMetricDataPoint>[0],
        body.value,
        body.source
      )

      await prisma.systemMetric.create({
        data: {
          metricType: dataPoint.metricType,
          value: dataPoint.value,
          unit: dataPoint.metricType === "api_latency" ? "ms" : "%",
          tags: { source: dataPoint.source, ...dataPoint.labels },
        },
      })

      // Evaluate thresholds against the new data point
      const thresholds = await loadThresholds()
      const newAlerts = evaluateThresholds([dataPoint], thresholds)

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
