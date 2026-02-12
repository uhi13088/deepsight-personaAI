import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createIncident,
  buildIncidentDashboard,
  INCIDENT_SEVERITY_DEFINITIONS,
} from "@/lib/operations"
import type {
  Incident,
  IncidentSeverity,
  IncidentDashboardData,
  DetectionRule,
} from "@/lib/operations"

// ── Sample data ─────────────────────────────────────────────────

function buildSampleIncidents(): Incident[] {
  const now = Date.now()
  return [
    {
      id: "INC-1001",
      title: "API 게이트웨이 응답 지연",
      severity: "P1",
      phase: "investigating",
      detectedAt: now - 45 * 60 * 1000,
      resolvedAt: null,
      commander: "김운영",
      affectedServices: ["api-gateway", "matching-engine"],
      timeline: [
        {
          timestamp: now - 45 * 60 * 1000,
          phase: "detected",
          actor: "monitoring-bot",
          description: "API 응답시간 2초 초과 탐지",
        },
        {
          timestamp: now - 40 * 60 * 1000,
          phase: "triaged",
          actor: "김운영",
          description: "P1 분류, 담당자 배정",
        },
      ],
      rootCause: null,
      mitigation: null,
    },
    {
      id: "INC-1002",
      title: "백업 작업 실패",
      severity: "P2",
      phase: "resolved",
      detectedAt: now - 24 * 60 * 60 * 1000,
      resolvedAt: now - 23 * 60 * 60 * 1000,
      commander: "이인프라",
      affectedServices: ["backup-service"],
      timeline: [
        {
          timestamp: now - 24 * 60 * 60 * 1000,
          phase: "detected",
          actor: "cron-monitor",
          description: "일일 백업 실패 감지",
        },
        {
          timestamp: now - 23 * 60 * 60 * 1000,
          phase: "resolved",
          actor: "이인프라",
          description: "스토리지 확장 완료",
        },
      ],
      rootCause: "디스크 용량 부족",
      mitigation: "스토리지 볼륨 2배 확장",
    },
  ]
}

const sampleRules: DetectionRule[] = [
  {
    id: "rule_api_latency",
    name: "API 응답시간 초과",
    description: "API 응답시간이 2초를 초과하면 P1 장애 탐지",
    metricType: "api_latency",
    condition: "above",
    threshold: 2000,
    durationSeconds: 60,
    severity: "P1",
    enabled: true,
  },
]

// ── GET: Return incidents dashboard ────────────────────────────

export async function GET() {
  try {
    const incidents = buildSampleIncidents()
    const dashboard = buildIncidentDashboard(incidents, sampleRules)

    return NextResponse.json<ApiResponse<IncidentDashboardData>>({
      success: true,
      data: dashboard,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "장애 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Create incident ──────────────────────────────────────

interface CreateIncidentRequest {
  title: string
  severity: IncidentSeverity
  affectedServices: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateIncidentRequest

    if (!body.title || !body.severity) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "title, severity가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const validSeverities = INCIDENT_SEVERITY_DEFINITIONS.map((d) => d.level)
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: `유효한 severity: ${validSeverities.join(", ")}`,
          },
        },
        { status: 400 }
      )
    }

    const incident = createIncident(
      body.title,
      body.severity,
      body.affectedServices ?? [],
      "api-user"
    )

    return NextResponse.json<ApiResponse<Incident>>({
      success: true,
      data: incident,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "장애 생성 실패" },
      },
      { status: 500 }
    )
  }
}
