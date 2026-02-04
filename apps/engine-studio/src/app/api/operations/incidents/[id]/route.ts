import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { IncidentStatus, IncidentSeverity } from "@prisma/client"

const updateIncidentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["REPORTED", "INVESTIGATING", "IDENTIFIED", "FIXING", "RESOLVED"]).optional(),
  affectedSystems: z.array(z.string()).optional(),
  resolution: z.string().optional(),
  timelineEntry: z
    .object({
      action: z.string(),
      description: z.string(),
    })
    .optional(),
})

// GET /api/operations/incidents/[id] - 단일 인시던트 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "인시던트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 보고자와 타임라인 사용자 정보 조회
    const userIds = [incident.reportedById, ...incident.timeline.map((t) => t.performedById)]
    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] } },
      select: { id: true, name: true, email: true, image: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    return NextResponse.json({
      success: true,
      data: {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        affectedSystems: incident.affectedSystems,
        reporter: userMap.get(incident.reportedById) || { id: incident.reportedById },
        resolution: incident.resolution,
        resolvedAt: incident.resolvedAt?.toISOString() || null,
        timeline: incident.timeline.map((t) => ({
          id: t.id,
          action: t.action,
          description: t.description,
          performedBy: userMap.get(t.performedById) || { id: t.performedById },
          createdAt: t.createdAt.toISOString(),
        })),
        createdAt: incident.createdAt.toISOString(),
        updatedAt: incident.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/operations/incidents/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "인시던트 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/operations/incidents/[id] - 인시던트 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateIncidentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.incident.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "인시던트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const { title, description, severity, status, affectedSystems, resolution, timelineEntry } =
      parsed.data

    // 인시던트 업데이트
    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(severity && { severity: severity as IncidentSeverity }),
        ...(status && { status: status as IncidentStatus }),
        ...(affectedSystems && { affectedSystems }),
        ...(resolution !== undefined && { resolution }),
        ...(status === "RESOLVED" && !existing.resolvedAt && { resolvedAt: new Date() }),
      },
    })

    // 타임라인 엔트리 추가
    if (timelineEntry) {
      await prisma.incidentTimeline.create({
        data: {
          incidentId: id,
          performedById: session.user.id,
          action: timelineEntry.action,
          description: timelineEntry.description,
        },
      })
    }

    // 상태 변경 시 자동 타임라인 기록
    if (status && status !== existing.status) {
      await prisma.incidentTimeline.create({
        data: {
          incidentId: id,
          performedById: session.user.id,
          action: "STATUS_CHANGE",
          description: `상태 변경: ${existing.status} → ${status}`,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "INCIDENT_UPDATE",
        targetType: "INCIDENT",
        targetId: id,
        details: { changes: Object.keys(parsed.data) },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: incident.id,
        title: incident.title,
        status: incident.status,
        severity: incident.severity,
        updatedAt: incident.updatedAt.toISOString(),
      },
      message: "인시던트가 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/operations/incidents/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "인시던트 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/operations/incidents/[id] - 인시던트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // 타임라인은 CASCADE로 자동 삭제됨
    await prisma.incident.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "INCIDENT_DELETE",
        targetType: "INCIDENT",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "인시던트가 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/operations/incidents/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "인시던트 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
