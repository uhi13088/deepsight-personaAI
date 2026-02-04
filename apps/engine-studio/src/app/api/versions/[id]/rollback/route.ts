import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/versions/[id]/rollback - 버전 롤백
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // 현재 활성 버전 비활성화
    await prisma.version.updateMany({
      where: {
        status: "ACTIVE",
        environment: version.environment || "production",
      },
      data: { status: "DEPRECATED" },
    })

    // 롤백 대상 버전 활성화
    await prisma.version.update({
      where: { id },
      data: { status: "ACTIVE" },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VERSION_ROLLBACK",
        targetType: "VERSION",
        targetId: id,
        details: {
          tag: version.tag,
          name: version.name,
          environment: version.environment,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `${version.tag} 버전으로 롤백되었습니다`,
        rollbackedTo: {
          id: version.id,
          tag: version.tag,
          name: version.name,
        },
      },
    })
  } catch (error) {
    console.error("[API] POST /api/versions/[id]/rollback error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 롤백에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
