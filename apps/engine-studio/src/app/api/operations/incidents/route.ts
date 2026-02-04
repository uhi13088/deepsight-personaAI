import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { IncidentSeverity, IncidentStatus } from "@prisma/client"

const createIncidentSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  description: z.string().min(1, "설명은 필수입니다"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  affectedSystems: z.array(z.string()).optional(),
})

const updateIncidentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z
    .enum(["REPORTED", "INVESTIGATING", "IDENTIFIED", "FIXING", "RESOLVED", "CLOSED"])
    .optional(),
  resolution: z.string().optional(),
  affectedSystems: z.array(z.string()).optional(),
})

// GET /api/operations/incidents - 장애 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const severity = searchParams.get("severity")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: { status?: IncidentStatus; severity?: IncidentSeverity } = {}

    if (status && status !== "all") {
      where.status = status as IncidentStatus
    }

    if (severity && severity !== "all") {
      where.severity = severity as IncidentSeverity
    }

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          timeline: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.incident.count({ where }),
    ])

    const data = incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      affectedSystems: incident.affectedSystems,
      resolution: incident.resolution,
      reportedById: incident.reportedById,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
      updatedAt: incident.updatedAt.toISOString(),
      recentTimeline: incident.timeline.map((t) => ({
        id: t.id,
        action: t.action,
        description: t.description,
        performedById: t.performedById,
        createdAt: t.createdAt.toISOString(),
      })),
    }))

    // 통계
    const stats = await prisma.incident.groupBy({
      by: ["status"],
      _count: true,
    })

    const statusCounts = stats.reduce(
      (acc, item) => {
        acc[item.status.toLowerCase()] = item._count
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      success: true,
      data,
      stats: statusCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/operations/incidents error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "장애 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// POST /api/operations/incidents - 장애 보고
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createIncidentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const incident = await prisma.incident.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        severity: parsed.data.severity as IncidentSeverity,
        affectedSystems: parsed.data.affectedSystems || [],
        reportedById: session.user.id,
        status: "REPORTED",
      },
    })

    // 타임라인 첫 항목 생성
    await prisma.incidentTimeline.create({
      data: {
        incidentId: incident.id,
        action: "REPORTED",
        description: "장애가 보고되었습니다",
        performedById: session.user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "INCIDENT_CREATE",
        targetType: "INCIDENT",
        targetId: incident.id,
        details: { title: incident.title, severity: incident.severity },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt.toISOString(),
      },
      message: "장애가 보고되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/operations/incidents error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "장애 보고에 실패했습니다" } },
      { status: 500 }
    )
  }
}
