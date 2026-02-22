import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
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
  const { response } = await requireAuth()
  if (response) return response

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
      // actorName 검색: 이름이 매칭되는 userId 목록 먼저 조회
      const matchingUsers = await prisma.user.findMany({
        where: { name: { contains: keyword, mode: "insensitive" } },
        select: { id: true },
      })
      const matchingUserIds = matchingUsers.map((u) => u.id)

      const orConditions: Array<Record<string, unknown>> = [
        { action: { contains: keyword, mode: "insensitive" } },
        { targetType: { contains: keyword, mode: "insensitive" } },
        { targetId: { contains: keyword, mode: "insensitive" } },
      ]
      if (matchingUserIds.length > 0) {
        orConditions.push({ userId: { in: matchingUserIds } })
      }
      where.OR = orConditions
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

    // ── Summary: DB aggregation (전체 레코드 메모리 로드 대신 집계 쿼리 사용) ──
    const [
      allCount,
      actionCountRows,
      targetTypeCountRows,
      topActorRows,
      periodBounds,
      recentRows,
    ] = await Promise.all([
      prisma.auditLog.count(),
      // 액션별 카운트
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { _all: true },
      }),
      // 대상 유형별 카운트
      prisma.auditLog.groupBy({
        by: ["targetType"],
        _count: { _all: true },
      }),
      // Top actors (userId 기준 집계)
      prisma.auditLog.groupBy({
        by: ["userId"],
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
      // 전체 기간 범위
      prisma.auditLog.aggregate({
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      // 최근 활동 10건
      prisma.auditLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    // Top actors에 actorName 조회 (별도 쿼리로 최소화)
    const actorIds = topActorRows.map((r) => r.userId)
    const actorUsers =
      actorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : []
    const actorNameMap = new Map(actorUsers.map((u) => [u.id, u.name]))

    const actionCounts: Partial<Record<AuditAction, number>> = {}
    for (const row of actionCountRows) {
      actionCounts[row.action as AuditAction] = row._count._all
    }

    const targetTypeCounts: Partial<Record<AuditTargetType, number>> = {}
    for (const row of targetTypeCountRows) {
      targetTypeCounts[row.targetType as AuditTargetType] = row._count._all
    }

    const topActors = topActorRows.map((row) => ({
      actorId: row.userId,
      actorName: actorNameMap.get(row.userId) ?? row.userId,
      count: row._count._all,
    }))

    const summary: AuditSummary = {
      totalEntries: allCount,
      actionCounts,
      topActors,
      recentActivity: recentRows.map(toAuditLogEntry),
      targetTypeCounts,
      periodStart: periodBounds._min.createdAt?.getTime() ?? null,
      periodEnd: periodBounds._max.createdAt?.getTime() ?? null,
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
  const { response } = await requireAuth()
  if (response) return response

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
