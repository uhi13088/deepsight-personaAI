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
import { DEMO_INCIDENTS, DEMO_DETECTION_RULES } from "@/lib/demo-fixtures"

// ── In-memory store ─────────────────────────────────────────────

interface IncidentStore {
  incidents: Incident[]
  postMortems: PostMortem[]
  detectionRules: DetectionRule[]
}

function buildInitialStore(): IncidentStore {
  return {
    incidents: [...DEMO_INCIDENTS],
    postMortems: [],
    detectionRules: [...DEMO_DETECTION_RULES],
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
