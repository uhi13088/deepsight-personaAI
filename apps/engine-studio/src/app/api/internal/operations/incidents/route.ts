import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createIncident,
  advanceIncidentPhase,
  calculateMTTR,
  createPostMortem,
  INCIDENT_SEVERITY_DEFINITIONS,
} from "@/lib/operations"
import type {
  Incident,
  IncidentSeverity,
  IncidentPhase,
  PostMortem,
  DetectionRule,
} from "@/lib/operations"

// ── In-memory store ─────────────────────────────────────────────

interface IncidentStore {
  incidents: Incident[]
  postMortems: PostMortem[]
  detectionRules: DetectionRule[]
}

function buildInitialIncidents(): Incident[] {
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
        {
          timestamp: now - 35 * 60 * 1000,
          phase: "investigating",
          actor: "김운영",
          description: "DB 커넥션 풀 조사 시작",
        },
      ],
      rootCause: null,
      mitigation: null,
    },
    {
      id: "INC-1002",
      title: "페르소나 매칭 엔진 OOM",
      severity: "P0",
      phase: "mitigating",
      detectedAt: now - 90 * 60 * 1000,
      resolvedAt: null,
      commander: "박개발",
      affectedServices: ["matching-engine", "worker"],
      timeline: [
        {
          timestamp: now - 90 * 60 * 1000,
          phase: "detected",
          actor: "system",
          description: "OOM 에러 발생",
        },
        {
          timestamp: now - 85 * 60 * 1000,
          phase: "triaged",
          actor: "박개발",
          description: "P0 분류",
        },
        {
          timestamp: now - 80 * 60 * 1000,
          phase: "investigating",
          actor: "박개발",
          description: "메모리 릭 조사",
        },
        {
          timestamp: now - 60 * 60 * 1000,
          phase: "mitigating",
          actor: "박개발",
          description: "메모리 제한 상향 및 재배포",
        },
      ],
      rootCause: null,
      mitigation: null,
    },
    {
      id: "INC-1003",
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
          timestamp: now - 23.5 * 60 * 60 * 1000,
          phase: "triaged",
          actor: "이인프라",
          description: "P2 분류",
        },
        {
          timestamp: now - 23.25 * 60 * 60 * 1000,
          phase: "investigating",
          actor: "이인프라",
          description: "디스크 용량 조사",
        },
        {
          timestamp: now - 23.1 * 60 * 60 * 1000,
          phase: "mitigating",
          actor: "이인프라",
          description: "임시 스토리지 확보",
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
    {
      id: "INC-1004",
      title: "로그 수집기 지연",
      severity: "P3",
      phase: "resolved",
      detectedAt: now - 3 * 24 * 60 * 60 * 1000,
      resolvedAt: now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      commander: "최데브옵스",
      affectedServices: ["log-collector"],
      timeline: [
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000,
          phase: "detected",
          actor: "system",
          description: "로그 수집 지연 탐지",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
          phase: "triaged",
          actor: "최데브옵스",
          description: "P3 분류",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
          phase: "investigating",
          actor: "최데브옵스",
          description: "버퍼 크기 조사",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000,
          phase: "mitigating",
          actor: "최데브옵스",
          description: "버퍼 크기 증가",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          phase: "resolved",
          actor: "최데브옵스",
          description: "정상화 확인",
        },
      ],
      rootCause: "로그 버퍼 크기 부족",
      mitigation: "버퍼 크기 4배 증가",
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

function buildInitialStore(): IncidentStore {
  return {
    incidents: buildInitialIncidents(),
    postMortems: [],
    detectionRules: sampleRules,
  }
}

let store: IncidentStore | null = null

function getStore(): IncidentStore {
  if (!store) {
    store = buildInitialStore()
  }
  return store
}

// ── Response type ───────────────────────────────────────────────

interface IncidentResponse {
  incidents: Incident[]
  postMortems: PostMortem[]
  detectionRules: DetectionRule[]
  stats: {
    totalIncidents: number
    mttrMinutes: number
    incidentsBySeverity: Record<IncidentSeverity, number>
  }
}

// ── GET: Return incidents data ──────────────────────────────────

export async function GET() {
  try {
    const s = getStore()

    const incidentsBySeverity: Record<IncidentSeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 }
    for (const inc of s.incidents) {
      incidentsBySeverity[inc.severity]++
    }

    return NextResponse.json<ApiResponse<IncidentResponse>>({
      success: true,
      data: {
        incidents: s.incidents,
        postMortems: s.postMortems,
        detectionRules: s.detectionRules,
        stats: {
          totalIncidents: s.incidents.length,
          mttrMinutes: calculateMTTR(s.incidents),
          incidentsBySeverity,
        },
      },
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

// ── POST: Create incident, advance phase, or create post-mortem ─

interface IncidentPostRequest {
  action: "create_incident" | "advance_phase" | "create_postmortem"
  // For create_incident
  title?: string
  severity?: IncidentSeverity
  affectedServices?: string[]
  // For advance_phase
  incidentId?: string
  nextPhase?: IncidentPhase
  actor?: string
  description?: string
  // For create_postmortem
  rootCause?: string
  affectedUsers?: number
  downtimeMinutes?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IncidentPostRequest
    const s = getStore()

    if (body.action === "create_incident") {
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
        "operator"
      )
      s.incidents = [incident, ...s.incidents]

      return NextResponse.json<ApiResponse<Incident>>({
        success: true,
        data: incident,
      })
    }

    if (body.action === "advance_phase") {
      if (!body.incidentId || !body.nextPhase) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "incidentId, nextPhase가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const idx = s.incidents.findIndex((i) => i.id === body.incidentId)
      if (idx === -1) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `장애를 찾을 수 없습니다: ${body.incidentId}` },
          },
          { status: 404 }
        )
      }

      const updated = advanceIncidentPhase(
        s.incidents[idx],
        body.nextPhase,
        body.actor ?? "operator",
        body.description ?? `${body.nextPhase} 단계로 전환`
      )
      s.incidents[idx] = updated

      return NextResponse.json<ApiResponse<Incident>>({
        success: true,
        data: updated,
      })
    }

    if (body.action === "create_postmortem") {
      if (!body.incidentId || !body.rootCause) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "incidentId, rootCause가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const incident = s.incidents.find((i) => i.id === body.incidentId)
      if (!incident) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `장애를 찾을 수 없습니다: ${body.incidentId}` },
          },
          { status: 404 }
        )
      }

      const pm = createPostMortem(
        incident,
        body.rootCause,
        body.affectedUsers ?? 0,
        body.downtimeMinutes ?? 0,
        false,
        [
          {
            description: "모니터링 개선",
            assignee: "ops-team",
            dueDate: Date.now() + 7 * 86400000,
            priority: "high",
          },
        ],
        ["재발 방지 위해 알림 임계값 조정 필요"]
      )
      s.postMortems = [...s.postMortems, pm]

      return NextResponse.json<ApiResponse<PostMortem>>({
        success: true,
        data: pm,
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: create_incident, advance_phase, create_postmortem",
        },
      },
      { status: 400 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "장애 작업 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
