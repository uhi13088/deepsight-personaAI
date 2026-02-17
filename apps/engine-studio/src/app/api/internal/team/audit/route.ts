import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import type { AuditLogEntry, AuditAction, AuditTargetType, AuditSummary } from "@/lib/team"
import { prisma } from "@/lib/prisma"

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

// ── Helpers ─────────────────────────────────────────────────────

function toAuditLogEntry(row: {
  id: string
  userId: string
  action: string
  targetType: string
  targetId: string | null
  details: unknown
  ipAddress: string | null
  createdAt: Date
  user: { name: string | null }
}): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.createdAt.getTime(),
    actorId: row.userId,
    actorName: row.user.name ?? row.userId,
    action: row.action as AuditAction,
    targetType: row.targetType as AuditTargetType,
    targetId: row.targetId ?? "",
    details: (row.details as Record<string, string>) ?? {},
    ip: row.ipAddress,
  }
}

// ── GET ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const actor = searchParams.get("actor")
    const action = searchParams.get("action") as AuditAction | null
    const targetType = searchParams.get("targetType") as AuditTargetType | null
    const keyword = searchParams.get("keyword")
    const limit = parseInt(searchParams.get("limit") ?? "50", 10)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    // Build where clause
    const where: Record<string, unknown> = {}

    if (actor) {
      where.userId = actor
    }
    if (action) {
      where.action = action
    }
    if (targetType) {
      where.targetType = targetType
    }
    if (keyword) {
      where.OR = [
        { action: { contains: keyword, mode: "insensitive" } },
        { targetType: { contains: keyword, mode: "insensitive" } },
        { details: { string_contains: keyword } },
      ]
    }

    // Fetch filtered entries + total count in parallel
    const [rows, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    const entries = rows.map(toAuditLogEntry)

    // Build summary from all records (unfiltered)
    const [allRows, allCount] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count(),
    ])

    const actionCounts: Partial<Record<AuditAction, number>> = {}
    const targetTypeCounts: Partial<Record<AuditTargetType, number>> = {}
    const actorMap = new Map<string, { actorId: string; actorName: string; count: number }>()

    let periodStart: number | null = null
    let periodEnd: number | null = null

    for (const row of allRows) {
      const a = row.action as AuditAction
      actionCounts[a] = (actionCounts[a] ?? 0) + 1

      const tt = row.targetType as AuditTargetType
      targetTypeCounts[tt] = (targetTypeCounts[tt] ?? 0) + 1

      const existing = actorMap.get(row.userId)
      if (existing) {
        existing.count += 1
      } else {
        actorMap.set(row.userId, {
          actorId: row.userId,
          actorName: row.user.name ?? row.userId,
          count: 1,
        })
      }

      const ts = row.createdAt.getTime()
      if (periodStart === null || ts < periodStart) periodStart = ts
      if (periodEnd === null || ts > periodEnd) periodEnd = ts
    }

    const topActors = Array.from(actorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const recentActivity = allRows.slice(0, 10).map(toAuditLogEntry)

    const summary: AuditSummary = {
      totalEntries: allCount,
      actionCounts,
      topActors,
      recentActivity,
      targetTypeCounts,
      periodStart,
      periodEnd,
    }

    return NextResponse.json<ApiResponse<AuditGetResponse>>({
      success: true,
      data: {
        entries,
        totalCount,
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

// ── POST ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecordEntryBody

    if (!body.actorId || !body.action || !body.targetType || !body.targetId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "actorId, action, targetType, targetId는 필수 항목입니다",
          },
        },
        { status: 400 }
      )
    }

    const created = await prisma.auditLog.create({
      data: {
        userId: body.actorId,
        action: body.action,
        targetType: body.targetType,
        targetId: body.targetId,
        details: body.details ?? undefined,
        ipAddress: body.ip ?? undefined,
      },
      include: { user: { select: { name: true } } },
    })

    const entry: AuditLogEntry = toAuditLogEntry(created)

    return NextResponse.json<ApiResponse<AuditLogEntry>>({
      success: true,
      data: entry,
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
