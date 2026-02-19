import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
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
  MetricThreshold,
  DashboardLayout,
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
  action: "refresh_metrics" | "acknowledge_alert"
  alertId?: string
}

// ── DB → LogEntry 변환 ─────────────────────────────────────────

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

// ── 실제 애플리케이션 메트릭 조회 ───────────────────────────────

async function loadMetrics(): Promise<MetricDataPoint[]> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const now = Date.now()

  const [activePersonaCount, llmTotal, llmErrorCount, llmAgg, matchingCount] = await Promise.all([
    // 활성 페르소나 수
    prisma.persona.count({ where: { status: "ACTIVE" } }),

    // LLM 호출 수 (24h)
    prisma.llmUsageLog.count({ where: { createdAt: { gte: dayAgo } } }),

    // LLM 에러 수 (24h)
    prisma.llmUsageLog.count({
      where: { createdAt: { gte: dayAgo }, status: "ERROR" },
    }),

    // LLM 집계: 비용 합계, 평균 응답시간
    prisma.llmUsageLog.aggregate({
      where: { createdAt: { gte: dayAgo } },
      _sum: { estimatedCostUsd: true },
      _avg: { durationMs: true },
    }),

    // 매칭 요청 수 (24h)
    prisma.matchingLog.count({ where: { createdAt: { gte: dayAgo } } }),
  ])

  const llmCost = llmAgg._sum.estimatedCostUsd ? Number(llmAgg._sum.estimatedCostUsd) : 0
  const avgLatency = llmAgg._avg.durationMs ?? 0
  const llmErrorRate = llmTotal > 0 ? (llmErrorCount / llmTotal) * 100 : 0

  return [
    createMetricDataPoint("active_personas", activePersonaCount, "database", {
      timestamp: String(now),
    }),
    createMetricDataPoint("llm_calls", llmTotal, "llm_usage_log", {
      period: "24h",
    }),
    createMetricDataPoint("llm_cost", llmCost, "llm_usage_log", {
      unit: "USD",
      period: "24h",
    }),
    createMetricDataPoint("llm_error_rate", llmErrorRate, "llm_usage_log", {
      period: "24h",
    }),
    createMetricDataPoint("avg_latency", avgLatency, "llm_usage_log", {
      unit: "ms",
      period: "24h",
    }),
    createMetricDataPoint("matching_count", matchingCount, "matching_log", {
      period: "24h",
    }),
  ]
}

async function loadLogs(): Promise<LogEntry[]> {
  const rows = await prisma.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  })

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
    where: {
      category_key: { category: "MONITORING", key: "acknowledgedAlerts" },
    },
  })

  if (!row) return new Set()

  return new Set(row.value as unknown as string[])
}

async function saveAcknowledgedAlertIds(ids: string[]): Promise<void> {
  await prisma.systemConfig.upsert({
    where: {
      category_key: { category: "MONITORING", key: "acknowledgedAlerts" },
    },
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
  const { response } = await requireAuth()
  if (response) return response

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
        error: {
          code: "INTERNAL_ERROR",
          message: "모니터링 데이터 조회 실패",
        },
      },
      { status: 500 }
    )
  }
}

// ── POST: Refresh metrics or acknowledge alert ──────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as MonitoringPostRequest

    if (body.action === "refresh_metrics") {
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
            error: {
              code: "INVALID_INPUT",
              message: "alertId가 필요합니다",
            },
          },
          { status: 400 }
        )
      }

      const existingIds = await loadAcknowledgedAlertIds()
      existingIds.add(body.alertId)
      await saveAcknowledgedAlertIds([...existingIds])

      const [metrics, thresholds] = await Promise.all([loadMetrics(), loadThresholds()])
      const rawAlerts = evaluateThresholds(metrics, thresholds)
      const alerts = applyAcknowledgments(rawAlerts, existingIds)

      return NextResponse.json<ApiResponse<{ alerts: ThresholdAlert[] }>>({
        success: true,
        data: { alerts },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: refresh_metrics, acknowledge_alert",
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
