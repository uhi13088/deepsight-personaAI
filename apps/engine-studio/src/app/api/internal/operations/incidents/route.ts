import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import {
  getIncidentsData,
  handleCreateIncident,
  handleAdvancePhase,
  handleCreatePostMortem,
  runAutoDetect,
  INCIDENT_SEVERITY_DEFINITIONS,
  type IncidentResponse,
  type IncidentPostRequest,
  type Incident,
  type PostMortem,
  type AutoDetectResponse,
} from "@/lib/operations/incidents-service"

// ── GET: Return incidents data ──────────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const data = await getIncidentsData()
    return NextResponse.json<ApiResponse<IncidentResponse>>({
      success: true,
      data,
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

// ── POST: Create incident, advance phase, create post-mortem, or auto-detect ─

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

      const result = await handleCreateIncident(body)
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

      const { incident, notFound } = await handleAdvancePhase(body)
      if (notFound) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `장애를 찾을 수 없습니다: ${body.incidentId}`,
            },
          },
          { status: 404 }
        )
      }

      return NextResponse.json<ApiResponse<Incident>>({
        success: true,
        data: incident!,
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

      const { postMortem, notFound } = await handleCreatePostMortem(body)
      if (notFound) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `장애를 찾을 수 없습니다: ${body.incidentId}`,
            },
          },
          { status: 404 }
        )
      }

      return NextResponse.json<ApiResponse<PostMortem>>({
        success: true,
        data: postMortem!,
      })
    }

    if (body.action === "auto_detect") {
      const result = await runAutoDetect()
      return NextResponse.json<ApiResponse<AutoDetectResponse>>({
        success: true,
        data: result,
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message:
            "유효한 action이 필요합니다: create_incident, advance_phase, create_postmortem, auto_detect",
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
