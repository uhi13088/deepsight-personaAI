import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import { prisma } from "@/lib/prisma"
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
  IncidentTimelineEntry,
} from "@/lib/operations"
import type { Prisma } from "@/generated/prisma"
import { DEMO_DETECTION_RULES } from "@/lib/demo-fixtures"

// ── Severity/Phase mapping ────────────────────────────────────

const SEVERITY_TO_DB: Record<IncidentSeverity, string> = {
  P0: "CRITICAL",
  P1: "HIGH",
  P2: "MEDIUM",
  P3: "LOW",
}

const DB_TO_SEVERITY: Record<string, IncidentSeverity> = {
  CRITICAL: "P0",
  HIGH: "P1",
  MEDIUM: "P2",
  LOW: "P3",
}

const PHASE_TO_DB: Record<IncidentPhase, string> = {
  detected: "REPORTED",
  triaged: "INVESTIGATING",
  investigating: "INVESTIGATING",
  mitigating: "FIXING",
  resolved: "RESOLVED",
  postmortem: "CLOSED",
}

const DB_TO_PHASE: Record<string, IncidentPhase> = {
  REPORTED: "detected",
  INVESTIGATING: "investigating",
  IDENTIFIED: "investigating",
  FIXING: "mitigating",
  RESOLVED: "resolved",
  CLOSED: "postmortem",
}

// ── DB → Lib conversion ─────────────────────────────────────────

interface DbIncidentRow {
  id: string
  title: string
  description: string
  severity: string
  status: string
  affectedSystems: string[]
  resolution: string | null
  reportedById: string
  createdAt: Date
  resolvedAt: Date | null
  timeline: Array<{
    id: string
    action: string
    description: string
    performedById: string
    createdAt: Date
  }>
}

function dbIncidentToLib(row: DbIncidentRow): Incident {
  const timelineEntries: IncidentTimelineEntry[] = row.timeline.map((t) => ({
    timestamp: t.createdAt.getTime(),
    phase: DB_TO_PHASE[t.action] ?? "detected",
    actor: t.performedById,
    description: t.description,
  }))

  return {
    id: row.id,
    title: row.title,
    severity: DB_TO_SEVERITY[row.severity] ?? "P3",
    phase: DB_TO_PHASE[row.status] ?? "detected",
    detectedAt: row.createdAt.getTime(),
    resolvedAt: row.resolvedAt?.getTime() ?? null,
    commander: null,
    affectedServices: row.affectedSystems,
    timeline: timelineEntries,
    rootCause: null,
    mitigation: row.resolution,
  }
}

interface DbPostMortemRow {
  id: string
  incidentId: string
  rootCause: string
  affectedUsers: number
  downtimeMinutes: number
  dataLoss: boolean
  actionItems: unknown
  lessons: string[]
  createdAt: Date
  incident: {
    title: string
    affectedSystems: string[]
    timeline: Array<{
      id: string
      action: string
      description: string
      performedById: string
      createdAt: Date
    }>
  }
}

function dbPostMortemToLib(row: DbPostMortemRow): PostMortem {
  const timeline: IncidentTimelineEntry[] = row.incident.timeline.map((t) => ({
    timestamp: t.createdAt.getTime(),
    phase: DB_TO_PHASE[t.action] ?? "detected",
    actor: t.performedById,
    description: t.description,
  }))

  return {
    incidentId: row.incidentId,
    title: `${row.incident.title} 포스트모템`,
    summary: row.rootCause,
    timeline,
    rootCause: row.rootCause,
    impact: {
      affectedUsers: row.affectedUsers,
      affectedServices: row.incident.affectedSystems,
      downtimeMinutes: row.downtimeMinutes,
      dataLoss: row.dataLoss,
    },
    actionItems: (row.actionItems as PostMortem["actionItems"]) ?? [],
    lessonsLearned: row.lessons,
    createdAt: row.createdAt.getTime(),
  }
}

// ── Load detection rules from SystemConfig ──────────────────────

async function loadDetectionRules(): Promise<DetectionRule[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: "INCIDENT", key: "detectionRules" } },
  })
  if (row) {
    return row.value as unknown as DetectionRule[]
  }
  return DEMO_DETECTION_RULES
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const [dbIncidents, dbPostMortems, detectionRules] = await Promise.all([
      prisma.incident.findMany({
        include: {
          timeline: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.postMortem.findMany({
        include: {
          incident: {
            include: {
              timeline: { orderBy: { createdAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      loadDetectionRules(),
    ])

    const incidents = dbIncidents.map((row) => dbIncidentToLib(row as unknown as DbIncidentRow))
    const postMortems = dbPostMortems.map((row) =>
      dbPostMortemToLib(row as unknown as DbPostMortemRow)
    )

    const incidentsBySeverity: Record<IncidentSeverity, number> = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0,
    }
    for (const inc of incidents) {
      incidentsBySeverity[inc.severity]++
    }

    return NextResponse.json<ApiResponse<IncidentResponse>>({
      success: true,
      data: {
        incidents,
        postMortems,
        detectionRules,
        stats: {
          totalIncidents: incidents.length,
          mttrMinutes: calculateMTTR(incidents),
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as IncidentPostRequest

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

      // Use lib function for business logic
      const libIncident = createIncident(
        body.title,
        body.severity,
        body.affectedServices ?? [],
        "operator"
      )

      // Persist to DB
      const dbSeverity = SEVERITY_TO_DB[body.severity] ?? "LOW"
      const created = await prisma.incident.create({
        data: {
          title: body.title,
          description: `${body.title} - 자동 생성`,
          severity: dbSeverity as Prisma.IncidentCreateInput["severity"],
          status: "REPORTED" as Prisma.IncidentCreateInput["status"],
          affectedSystems: body.affectedServices ?? [],
          reportedById: "operator",
        },
        include: {
          timeline: { orderBy: { createdAt: "asc" } },
        },
      })

      // Add initial timeline entry
      await prisma.incidentTimeline.create({
        data: {
          incidentId: created.id,
          action: "REPORTED",
          description: `장애 감지: ${body.title}`,
          performedById: "operator",
        },
      })

      // Return lib-format incident with DB id
      const result: Incident = {
        ...libIncident,
        id: created.id,
      }

      return NextResponse.json<ApiResponse<Incident>>({
        success: true,
        data: result,
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

      const dbIncident = await prisma.incident.findUnique({
        where: { id: body.incidentId },
        include: { timeline: { orderBy: { createdAt: "asc" } } },
      })

      if (!dbIncident) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `장애를 찾을 수 없습니다: ${body.incidentId}` },
          },
          { status: 404 }
        )
      }

      // Convert to lib type, apply phase change
      const libIncident = dbIncidentToLib(dbIncident as unknown as DbIncidentRow)
      const updated = advanceIncidentPhase(
        libIncident,
        body.nextPhase,
        body.actor ?? "operator",
        body.description ?? `${body.nextPhase} 단계로 전환`
      )

      // Persist phase change to DB
      const dbStatus = PHASE_TO_DB[body.nextPhase] ?? "REPORTED"
      const updateData: Record<string, unknown> = {
        status: dbStatus as Prisma.IncidentUpdateInput["status"],
      }

      if (body.nextPhase === "resolved" || body.nextPhase === "postmortem") {
        updateData.resolvedAt = new Date()
      }

      await prisma.incident.update({
        where: { id: body.incidentId },
        data: updateData as Prisma.IncidentUpdateInput,
      })

      // Add timeline entry
      await prisma.incidentTimeline.create({
        data: {
          incidentId: body.incidentId,
          action: dbStatus,
          description: body.description ?? `${body.nextPhase} 단계로 전환`,
          performedById: body.actor ?? "operator",
        },
      })

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

      const dbIncident = await prisma.incident.findUnique({
        where: { id: body.incidentId },
        include: { timeline: { orderBy: { createdAt: "asc" } } },
      })

      if (!dbIncident) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `장애를 찾을 수 없습니다: ${body.incidentId}` },
          },
          { status: 404 }
        )
      }

      // Use lib function for business logic
      const libIncident = dbIncidentToLib(dbIncident as unknown as DbIncidentRow)
      const pm = createPostMortem(
        libIncident,
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

      // Persist to DB
      await prisma.postMortem.create({
        data: {
          incidentId: body.incidentId,
          rootCause: body.rootCause,
          affectedUsers: body.affectedUsers ?? 0,
          downtimeMinutes: body.downtimeMinutes ?? 0,
          dataLoss: false,
          actionItems: pm.actionItems as unknown as Prisma.InputJsonValue,
          lessons: pm.lessonsLearned,
        },
      })

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
