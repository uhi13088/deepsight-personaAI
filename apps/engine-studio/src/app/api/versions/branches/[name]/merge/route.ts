import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/versions/branches/[name]/merge - 브랜치 병합
export async function POST(
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

    const body = await request.json().catch(() => ({}))
    const { targetBranch = "main" } = body as { targetBranch?: string }

    // 소스 브랜치 조회
    const sourceBranch = await prisma.branch.findUnique({
      where: { name: decodedName },
    })

    if (!sourceBranch) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SOURCE_NOT_FOUND", message: "소스 브랜치를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 대상 브랜치 조회
    const target = await prisma.branch.findUnique({
      where: { name: targetBranch },
    })

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "TARGET_NOT_FOUND", message: "대상 브랜치를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 같은 브랜치 병합 방지
    if (decodedName === targetBranch) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SAME_BRANCH", message: "같은 브랜치로는 병합할 수 없습니다" },
        },
        { status: 400 }
      )
    }

    // 병합 커밋 생성
    const mergeCommit = await prisma.commit.create({
      data: {
        hash: `merge-${Date.now().toString(16)}`,
        message: `Merge branch '${decodedName}' into ${targetBranch}`,
        author: session.user.name || session.user.email || "Unknown",
        authorEmail: session.user.email || "",
        branch: targetBranch,
        filesChanged: sourceBranch.aheadCount,
      },
    })

    // 대상 브랜치 업데이트
    await prisma.branch.update({
      where: { name: targetBranch },
      data: {
        lastCommitMessage: mergeCommit.message,
        lastCommitAuthor: mergeCommit.author,
        lastCommitDate: new Date(),
      },
    })

    // 소스 브랜치 ahead/behind 초기화
    await prisma.branch.update({
      where: { name: decodedName },
      data: {
        aheadCount: 0,
        behindCount: 0,
      },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BRANCH_MERGE",
        targetType: "BRANCH",
        targetId: sourceBranch.id,
        details: {
          sourceBranch: decodedName,
          targetBranch,
          mergeCommit: mergeCommit.hash,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `${decodedName} 브랜치가 ${targetBranch}에 병합되었습니다`,
        mergeCommit: {
          hash: mergeCommit.hash,
          shortHash: mergeCommit.hash.substring(0, 7),
          message: mergeCommit.message,
        },
      },
    })
  } catch (error) {
    console.error("[API] POST /api/versions/branches/[name]/merge error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "브랜치 병합에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
