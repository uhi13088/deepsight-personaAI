import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/versions/[id] - 버전 상세 조회
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

    const version = await prisma.version.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { name: true },
        },
      },
    })

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "버전을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        version: {
          id: version.id,
          tag: version.tag,
          name: version.name,
          description: version.description,
          commitHash: version.commitHash,
          branch: version.branch,
          createdBy: version.createdByUser?.name || "Unknown",
          createdAt: version.createdAt.toISOString(),
          environment: version.environment,
          status: version.status,
          changes: {
            added: version.addedCount,
            modified: version.modifiedCount,
            deleted: version.deletedCount,
          },
          components: version.components,
        },
      },
    })
  } catch (error) {
    console.error("[API] GET /api/versions/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/versions/[id] - 버전 삭제
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

    const { id } = await params

    const version = await prisma.version.findUnique({
      where: { id },
    })

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "버전을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 버전 삭제 (실제로는 ARCHIVED 상태로 변경)
    await prisma.version.update({
      where: { id },
      data: { status: "ARCHIVED" },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VERSION_DELETE",
        targetType: "VERSION",
        targetId: id,
        details: { tag: version.tag, name: version.name },
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: "버전이 삭제되었습니다" },
    })
  } catch (error) {
    console.error("[API] DELETE /api/versions/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/versions/[id] - 버전 상태 업데이트
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
    const { status, environment } = body

    const version = await prisma.version.findUnique({
      where: { id },
    })

    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "버전을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 상태 검증
    if (status && !["ACTIVE", "DEPRECATED", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_STATUS", message: "유효하지 않은 상태입니다" },
        },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (environment !== undefined) updateData.environment = environment

    const updated = await prisma.version.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: { name: true },
        },
      },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VERSION_UPDATE",
        targetType: "VERSION",
        targetId: id,
        details: { changes: updateData } as object,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        version: {
          id: updated.id,
          tag: updated.tag,
          name: updated.name,
          description: updated.description,
          commitHash: updated.commitHash,
          branch: updated.branch,
          createdBy: updated.createdByUser?.name || "Unknown",
          createdAt: updated.createdAt.toISOString(),
          environment: updated.environment,
          status: updated.status,
          changes: {
            added: updated.addedCount,
            modified: updated.modifiedCount,
            deleted: updated.deletedCount,
          },
          components: updated.components,
        },
      },
    })
  } catch (error) {
    console.error("[API] PATCH /api/versions/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 업데이트에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
