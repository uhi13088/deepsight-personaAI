import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/versions/[id]/download - 버전 소스 다운로드
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

    // 버전 정보를 JSON으로 생성 (실제 구현 시 Git 연동 필요)
    const versionData = {
      version: {
        tag: version.tag,
        name: version.name,
        description: version.description,
        commitHash: version.commitHash,
        branch: version.branch,
        createdAt: version.createdAt.toISOString(),
        environment: version.environment,
        components: version.components,
      },
      exportedAt: new Date().toISOString(),
      note: "실제 구현 시 Git 저장소와 연동하여 소스 코드를 포함해야 합니다.",
    }

    const jsonString = JSON.stringify(versionData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VERSION_DOWNLOAD",
        targetType: "VERSION",
        targetId: id,
        details: { tag: version.tag },
      },
    })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${version.tag}-export.json"`,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/versions/[id]/download error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "다운로드에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
