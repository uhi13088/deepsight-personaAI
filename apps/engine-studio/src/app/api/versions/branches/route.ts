import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/versions/branches - 브랜치 목록 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const branches = await prisma.branch.findMany({
      orderBy: [{ isDefault: "desc" }, { lastCommitDate: "desc" }],
    })

    return NextResponse.json({
      success: true,
      data: {
        branches: branches.map((b) => ({
          name: b.name,
          lastCommit: b.lastCommitMessage,
          lastCommitDate: b.lastCommitDate.toISOString(),
          author: b.lastCommitAuthor,
          isProtected: b.isProtected,
          isDefault: b.isDefault,
          aheadBehind: {
            ahead: b.aheadCount,
            behind: b.behindCount,
          },
        })),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/versions/branches error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "브랜치 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/versions/branches - 새 브랜치 생성
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
    const { name, baseBranch } = body

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_NAME", message: "브랜치 이름이 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 이름 유효성 검사
    if (!/^[a-zA-Z0-9_/-]+$/.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_NAME",
            message: "브랜치 이름은 영문, 숫자, 밑줄, 슬래시, 하이픈만 사용할 수 있습니다",
          },
        },
        { status: 400 }
      )
    }

    // 중복 확인
    const existing = await prisma.branch.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE_NAME", message: "이미 존재하는 브랜치 이름입니다" },
        },
        { status: 400 }
      )
    }

    // 기본 브랜치 조회
    const base = baseBranch
      ? await prisma.branch.findUnique({ where: { name: baseBranch } })
      : await prisma.branch.findFirst({ where: { isDefault: true } })

    // 브랜치 생성
    const branch = await prisma.branch.create({
      data: {
        name,
        lastCommitMessage: base?.lastCommitMessage || "Initial commit",
        lastCommitAuthor: session.user.name || session.user.email || "Unknown",
        lastCommitDate: new Date(),
        isDefault: false,
        isProtected: false,
        aheadCount: 0,
        behindCount: 0,
      },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BRANCH_CREATE",
        targetType: "BRANCH",
        targetId: branch.id,
        details: { name, baseBranch: base?.name || "main" },
      },
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
      },
      message: "브랜치가 생성되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/versions/branches error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "브랜치 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
