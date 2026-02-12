import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createAuditLog, recordAuditEntry, searchAuditLog, getAuditSummary } from "@/lib/team"
import type { AuditLogEntry, AuditAction, AuditTargetType, AuditSummary } from "@/lib/team"

// ── Seed audit log (in-memory, persists within server session) ───
function initializeSeedAuditLog() {
  let log = createAuditLog()

  const now = Date.now()
  const entries: Array<{
    actorId: string
    actorName: string
    action: AuditAction
    targetType: AuditTargetType
    targetId: string
    details: Record<string, string>
    ip: string
    offset: number
  }> = [
    {
      actorId: "u1",
      actorName: "Admin",
      action: "team.created",
      targetType: "team",
      targetId: "team_1",
      details: { name: "DeepSight" },
      ip: "192.168.1.1",
      offset: -86400000 * 5,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "user.invited",
      targetType: "user",
      targetId: "u2",
      details: { email: "engineer@deepsight.ai", role: "ai_engineer" },
      ip: "192.168.1.1",
      offset: -86400000 * 4,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "user.invited",
      targetType: "user",
      targetId: "u3",
      details: { email: "content@deepsight.ai", role: "content_manager" },
      ip: "192.168.1.1",
      offset: -86400000 * 4,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
      details: { name: "심층 분석가" },
      ip: "10.0.0.5",
      offset: -86400000 * 3,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "persona.updated",
      targetType: "persona",
      targetId: "p1",
      details: { field: "vectors", description: "L1 벡터 조정" },
      ip: "10.0.0.5",
      offset: -86400000 * 2,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "matching.executed",
      targetType: "matching",
      targetId: "match_1",
      details: { mode: "single", score: "0.87" },
      ip: "10.0.0.5",
      offset: -86400000 * 2,
    },
    {
      actorId: "u3",
      actorName: "Lee Content",
      action: "content.created",
      targetType: "content",
      targetId: "c1",
      details: { title: "트렌드 리포트 2024" },
      ip: "10.0.0.10",
      offset: -86400000,
    },
    {
      actorId: "u3",
      actorName: "Lee Content",
      action: "content.published",
      targetType: "content",
      targetId: "c1",
      details: { title: "트렌드 리포트 2024" },
      ip: "10.0.0.10",
      offset: -86400000,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "settings.updated",
      targetType: "settings",
      targetId: "global",
      details: { key: "matching.threshold", oldValue: "0.5", newValue: "0.6" },
      ip: "192.168.1.1",
      offset: -43200000,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "persona.published",
      targetType: "persona",
      targetId: "p1",
      details: { name: "심층 분석가" },
      ip: "10.0.0.5",
      offset: -3600000,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "user.role_changed",
      targetType: "user",
      targetId: "u3",
      details: { from: "content_manager", to: "analyst" },
      ip: "192.168.1.1",
      offset: -1800000,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "matching.configured",
      targetType: "matching",
      targetId: "config_1",
      details: { parameter: "diversity_weight", value: "0.3" },
      ip: "10.0.0.5",
      offset: -600000,
    },
  ]

  for (const entry of entries) {
    const entryLog = recordAuditEntry(log, {
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      details: entry.details,
      ip: entry.ip,
    })
    // Override timestamp for demo
    const lastEntry = entryLog.entries[entryLog.entries.length - 1]
    lastEntry.timestamp = now + entry.offset
    log = entryLog
  }

  return log
}

let auditLog = initializeSeedAuditLog()

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
