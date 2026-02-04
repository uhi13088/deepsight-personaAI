import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { BackupType, BackupStatus } from "@prisma/client"

const createBackupSchema = z.object({
  backupType: z.enum(["FULL", "INCREMENTAL", "DIFFERENTIAL"]),
  notes: z.string().optional(),
})

// GET /api/operations/backup - 백업 기록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 관리자만 백업 기록 조회 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: { backupType?: BackupType; status?: BackupStatus } = {}

    if (type && type !== "all") {
      where.backupType = type as BackupType
    }

    if (status && status !== "all") {
      where.status = status as BackupStatus
    }

    const [backups, total] = await Promise.all([
      prisma.backupRecord.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.backupRecord.count({ where }),
    ])

    const data = backups.map((backup) => ({
      id: backup.id,
      backupType: backup.backupType,
      status: backup.status,
      size: backup.size ? Number(backup.size) : null,
      location: backup.location,
      notes: backup.notes,
      startedAt: backup.startedAt.toISOString(),
      completedAt: backup.completedAt?.toISOString() || null,
      duration: backup.completedAt
        ? Math.round((backup.completedAt.getTime() - backup.startedAt.getTime()) / 1000)
        : null,
    }))

    // 통계
    const [lastBackup, totalSize, recentBackups] = await Promise.all([
      prisma.backupRecord.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
      }),
      prisma.backupRecord.aggregate({
        where: { status: "COMPLETED" },
        _sum: { size: true },
      }),
      prisma.backupRecord.count({
        where: {
          status: "COMPLETED",
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data,
      stats: {
        lastBackupAt: lastBackup?.completedAt?.toISOString() || null,
        totalBackupSize: totalSize._sum.size ? Number(totalSize._sum.size) : 0,
        backupsLast7Days: recentBackups,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/operations/backup error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "백업 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// POST /api/operations/backup - 백업 시작
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createBackupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    // 진행 중인 백업이 있는지 확인
    const inProgress = await prisma.backupRecord.findFirst({
      where: { status: "IN_PROGRESS" },
    })

    if (inProgress) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "이미 진행 중인 백업이 있습니다" } },
        { status: 409 }
      )
    }

    const backup = await prisma.backupRecord.create({
      data: {
        backupType: parsed.data.backupType as BackupType,
        notes: parsed.data.notes,
        status: "IN_PROGRESS",
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BACKUP_START",
        targetType: "BACKUP",
        targetId: backup.id,
        details: { backupType: backup.backupType },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: backup.id,
        backupType: backup.backupType,
        status: backup.status,
        startedAt: backup.startedAt.toISOString(),
      },
      message: "백업이 시작되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/operations/backup error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "백업 시작에 실패했습니다" } },
      { status: 500 }
    )
  }
}
