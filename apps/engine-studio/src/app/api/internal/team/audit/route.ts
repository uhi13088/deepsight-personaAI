import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createAuditLog, recordAuditEntry, searchAuditLog, getAuditSummary } from "@/lib/team"
import type { AuditLogEntry, AuditAction, AuditTargetType, AuditSummary } from "@/lib/team"

// ── Sample audit log (in-memory for demo) ───────────────────────
let auditLog = createAuditLog()
auditLog = recordAuditEntry(auditLog, {
  actorId: "u1",
  actorName: "Admin",
  action: "team.created",
  targetType: "team",
  targetId: "team_1",
  details: { name: "DeepSight" },
  ip: "192.168.1.1",
})

interface AuditGetResponse {
  entries: AuditLogEntry[]
  totalCount: number
  summary: AuditSummary
}

interface RecordEntryBody {
  actorId: string
  actorName: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  details?: Record<string, string>
  ip?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const actor = searchParams.get("actor")
    const action = searchParams.get("action") as AuditAction | null
    const targetType = searchParams.get("targetType") as AuditTargetType | null
    const keyword = searchParams.get("keyword")
    const limit = parseInt(searchParams.get("limit") ?? "50", 10)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    const result = searchAuditLog(auditLog, {
      dateRange: null,
      actors: actor ? [actor] : null,
      actions: action ? [action] : null,
      targetTypes: targetType ? [targetType] : null,
      keyword: keyword || null,
      limit,
      offset,
    })

    const summary = getAuditSummary(auditLog)

    return NextResponse.json<ApiResponse<AuditGetResponse>>({
      success: true,
      data: {
        entries: result.entries,
        totalCount: result.totalCount,
        summary,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "감사 로그 조회 실패" },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecordEntryBody

    if (!body.actorId || !body.actorName || !body.action || !body.targetType || !body.targetId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "actorId, actorName, action, targetType, targetId는 필수 항목입니다",
          },
        },
        { status: 400 }
      )
    }

    auditLog = recordAuditEntry(auditLog, {
      actorId: body.actorId,
      actorName: body.actorName,
      action: body.action,
      targetType: body.targetType,
      targetId: body.targetId,
      details: body.details,
      ip: body.ip,
    })

    const latestEntry = auditLog.entries[auditLog.entries.length - 1]

    return NextResponse.json<ApiResponse<AuditLogEntry>>({
      success: true,
      data: latestEntry,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "감사 로그 기록 실패" },
      },
      { status: 500 }
    )
  }
}
