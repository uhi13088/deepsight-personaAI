import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/versions/compare - 버전 비교
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
    const base = searchParams.get("base")
    const target = searchParams.get("target")

    if (!base || !target) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARAMS", message: "base와 target 파라미터가 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 버전 조회
    const [baseVersion, targetVersion] = await Promise.all([
      prisma.version.findUnique({ where: { tag: base } }),
      prisma.version.findUnique({ where: { tag: target } }),
    ])

    if (!baseVersion || !targetVersion) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VERSION_NOT_FOUND", message: "버전을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 두 버전 간의 커밋 조회
    const commits = await prisma.commit.findMany({
      where: {
        createdAt: {
          gt: baseVersion.createdAt,
          lte: targetVersion.createdAt,
        },
        branch: targetVersion.branch,
      },
      orderBy: { createdAt: "desc" },
    })

    // 변경 사항 집계
    const added: string[] = []
    const modified: string[] = []
    const deleted: string[] = []

    // 컴포넌트 비교
    const baseComponents = new Set(baseVersion.components)
    const targetComponents = new Set(targetVersion.components)

    targetComponents.forEach((comp) => {
      if (!baseComponents.has(comp)) {
        added.push(comp)
      }
    })

    baseComponents.forEach((comp) => {
      if (!targetComponents.has(comp)) {
        deleted.push(comp)
      } else {
        // 변경된 것으로 간주 (실제 구현 시 파일 해시 비교 필요)
        if (targetVersion.modifiedCount > 0) {
          modified.push(comp)
        }
      }
    })

    // 추가 변경 사항 (커밋 수 기반 추정)
    const totalFiles = commits.reduce((sum, c) => sum + c.filesChanged, 0)
    if (modified.length === 0 && totalFiles > 0) {
      modified.push(`${totalFiles}개 파일 변경`)
    }

    return NextResponse.json({
      success: true,
      data: {
        base: {
          tag: baseVersion.tag,
          name: baseVersion.name,
          createdAt: baseVersion.createdAt.toISOString(),
        },
        target: {
          tag: targetVersion.tag,
          name: targetVersion.name,
          createdAt: targetVersion.createdAt.toISOString(),
        },
        added,
        modified,
        deleted,
        commits: commits.map((c) => ({
          hash: c.hash,
          shortHash: c.hash.substring(0, 7),
          message: c.message,
          author: c.author,
          authorEmail: c.authorEmail,
          date: c.createdAt.toISOString(),
          branch: c.branch,
          filesChanged: c.filesChanged,
        })),
        summary: {
          totalCommits: commits.length,
          totalFilesChanged: totalFiles,
          addedComponents: added.length,
          modifiedComponents: modified.length,
          deletedComponents: deleted.length,
        },
      },
    })
  } catch (error) {
    console.error("[API] GET /api/versions/compare error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 비교에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
