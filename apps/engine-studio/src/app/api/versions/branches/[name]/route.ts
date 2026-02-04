import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/versions/branches/[name] - 브랜치 상세 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { name } = await params
    const decodedName = decodeURIComponent(name)

    const branch = await prisma.branch.findUnique({
      where: { name: decodedName },
    })

    if (!branch) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "브랜치를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 해당 브랜치의 커밋 조회
    const commits = await prisma.commit.findMany({
      where: { branch: decodedName },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: {
        branch: {
          name: branch.name,
          lastCommit: branch.lastCommitMessage,
          lastCommitDate: branch.lastCommitDate.toISOString(),
          author: branch.lastCommitAuthor,
          isProtected: branch.isProtected,
          isDefault: branch.isDefault,
          aheadBehind: {
            ahead: branch.aheadCount,
            behind: branch.behindCount,
          },
        },
        commits: commits.map((c) => ({
          hash: c.hash,
          shortHash: c.hash.substring(0, 7),
          message: c.message,
          author: c.author,
          date: c.createdAt.toISOString(),
          filesChanged: c.filesChanged,
        })),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/versions/branches/[name] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "브랜치 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/versions/branches/[name] - 브랜치 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { name } = await params
    const decodedName = decodeURIComponent(name)

    const branch = await prisma.branch.findUnique({
      where: { name: decodedName },
    })

    if (!branch) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "브랜치를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 보호된 브랜치 또는 기본 브랜치 삭제 방지
    if (branch.isProtected) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "PROTECTED_BRANCH", message: "보호된 브랜치는 삭제할 수 없습니다" },
        },
        { status: 400 }
      )
    }

    if (branch.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DEFAULT_BRANCH", message: "기본 브랜치는 삭제할 수 없습니다" },
        },
        { status: 400 }
      )
    }

    await prisma.branch.delete({
      where: { name: decodedName },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BRANCH_DELETE",
        targetType: "BRANCH",
        targetId: branch.id,
        details: { name: decodedName },
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: "브랜치가 삭제되었습니다" },
    })
  } catch (error) {
    console.error("[API] DELETE /api/versions/branches/[name] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "브랜치 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
