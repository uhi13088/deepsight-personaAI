import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { DeploymentStatus } from "@prisma/client"

const updateDeploymentSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "ROLLED_BACK"]).optional(),
  notes: z.string().optional(),
})

// GET /api/deployments/[id] - 단일 배포 조회
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

    const deployment = await prisma.deployment.findUnique({
      where: { id },
    })

    if (!deployment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "배포를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 대상 정보 조회
    let targetInfo = null
    if (deployment.targetType === "PERSONA") {
      targetInfo = await prisma.persona.findUnique({
        where: { id: deployment.targetId },
        select: { id: true, name: true, status: true },
      })
    } else if (deployment.targetType === "ALGORITHM") {
      targetInfo = await prisma.matchingAlgorithm.findUnique({
        where: { id: deployment.targetId },
        select: { id: true, name: true, version: true, status: true },
      })
    }

    const deployedBy = await prisma.user.findUnique({
      where: { id: deployment.deployedById },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: deployment.id,
        targetType: deployment.targetType,
        targetId: deployment.targetId,
        targetInfo,
        environment: deployment.environment,
        status: deployment.status,
        version: deployment.version,
        notes: deployment.notes,
        deployedBy,
        createdAt: deployment.createdAt.toISOString(),
        completedAt: deployment.completedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/deployments/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/deployments/[id] - 배포 상태 업데이트
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (!["ADMIN", "AI_ENGINEER", "OPERATOR"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateDeploymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.deployment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "배포를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const { status, notes } = parsed.data

    // 상태 변경 검증
    if (status) {
      const validTransitions: Record<string, string[]> = {
        PENDING: ["IN_PROGRESS", "FAILED"],
        IN_PROGRESS: ["COMPLETED", "FAILED"],
        COMPLETED: ["ROLLED_BACK"],
        FAILED: ["PENDING"],
        ROLLED_BACK: [],
      }

      if (!validTransitions[existing.status].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_STATE_TRANSITION",
              message: `${existing.status}에서 ${status}로 변경할 수 없습니다`,
            },
          },
          { status: 400 }
        )
      }
    }

    const deployment = await prisma.deployment.update({
      where: { id },
      data: {
        ...(status && { status: status as DeploymentStatus }),
        ...(notes !== undefined && { notes }),
        ...((status === "COMPLETED" || status === "FAILED") && { completedAt: new Date() }),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DEPLOYMENT_UPDATE",
        targetType: "DEPLOYMENT",
        targetId: id,
        details: {
          changes: Object.keys(parsed.data),
          ...(status && { statusChange: `${existing.status} → ${status}` }),
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: deployment.id,
        status: deployment.status,
        completedAt: deployment.completedAt?.toISOString() || null,
      },
      message: "배포 상태가 업데이트되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/deployments/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 업데이트에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/deployments/[id] - 배포 삭제 (PENDING 상태만)
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

    const existing = await prisma.deployment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "배포를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // PENDING 상태만 삭제 가능
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_OPERATION", message: "대기 중인 배포만 삭제할 수 있습니다" },
        },
        { status: 400 }
      )
    }

    await prisma.deployment.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DEPLOYMENT_DELETE",
        targetType: "DEPLOYMENT",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "배포가 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/deployments/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
