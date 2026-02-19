// ═══════════════════════════════════════════════════════════════
// Quarantine Queue API — 격리 큐 관리
// T148: 관리자 보안 대시보드
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { QuarantineStatus } from "@/generated/prisma"

interface QuarantineListResponse {
  entries: Array<{
    id: string
    content: string
    source: string
    personaId: string | null
    reason: string
    violations: Array<{ category: string; pattern: string; matched: string }>
    status: string
    reviewedBy: string | null
    reviewedAt: string | null
    createdAt: string
  }>
  total: number
  pendingCount: number
}

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")))

    const statusEnum = status?.toUpperCase() as QuarantineStatus | undefined
    const where = statusEnum ? { status: statusEnum } : {}

    const [entries, total, pendingCount] = await Promise.all([
      prisma.quarantineEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quarantineEntry.count({ where }),
      prisma.quarantineEntry.count({ where: { status: "PENDING" } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        entries: entries.map((e) => ({
          id: e.id,
          content: e.content,
          source: e.source,
          personaId: e.personaId,
          reason: e.reason,
          violations:
            (e.violations as Array<{ category: string; pattern: string; matched: string }>) ?? [],
          status: e.status,
          reviewedBy: e.reviewedBy,
          reviewedAt: e.reviewedAt?.toISOString() ?? null,
          createdAt: e.createdAt.toISOString(),
        })),
        total,
        pendingCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as {
      action: "approve" | "reject" | "delete"
      entryId: string
      reviewedBy?: string
    }

    const { action, entryId, reviewedBy = "admin" } = body

    if (!entryId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "entryId와 action이 필요합니다" },
        },
        { status: 400 }
      )
    }

    const statusMap = {
      approve: "APPROVED",
      reject: "REJECTED",
      delete: "DELETED",
    } as const

    const newStatus = statusMap[action]
    if (!newStatus) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "유효하지 않은 action" } },
        { status: 400 }
      )
    }

    await prisma.quarantineEntry.update({
      where: { id: entryId },
      data: {
        status: newStatus,
        reviewedBy,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { updated: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}
