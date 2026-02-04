import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const createVersionSchema = z.object({
  tag: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  branch: z.string().default("main"),
  commitHash: z.string().optional(),
})

// GET /api/versions - 버전, 커밋, 브랜치 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 버전 목록 조회
    const versions = await prisma.version.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdByUser: {
          select: { name: true },
        },
      },
    })

    // 커밋 목록 조회 (최근 50개)
    const commits = await prisma.commit.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // 브랜치 목록 조회
    const branches = await prisma.branch.findMany({
      orderBy: { isDefault: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        versions: versions.map((v) => ({
          id: v.id,
          tag: v.tag,
          name: v.name,
          description: v.description,
          commitHash: v.commitHash,
          branch: v.branch,
          createdBy: v.createdByUser?.name || "Unknown",
          createdAt: v.createdAt.toISOString(),
          environment: v.environment,
          status: v.status,
          changes: {
            added: v.addedCount,
            modified: v.modifiedCount,
            deleted: v.deletedCount,
          },
          components: v.components,
        })),
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
    console.error("[API] GET /api/versions error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "버전 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/versions - 새 버전 생성
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
    const parsed = createVersionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { tag, name, description, branch, commitHash } = parsed.data

    // 이미 존재하는 태그인지 확인
    const existingVersion = await prisma.version.findUnique({
      where: { tag },
    })

    if (existingVersion) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_TAG", message: "이미 존재하는 태그입니다" } },
        { status: 400 }
      )
    }

    // 버전 생성
    const version = await prisma.version.create({
      data: {
        tag,
        name,
        description: description || "",
        branch,
        commitHash: commitHash || `${Date.now().toString(16)}`,
        createdById: session.user.id,
        status: "active",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        components: [],
      },
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
        action: "VERSION_CREATE",
        targetType: "VERSION",
        targetId: version.id,
        details: { tag, name, branch },
      },
    })

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
      message: "버전이 생성되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/versions error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "버전 생성에 실패했습니다" } },
      { status: 500 }
    )
  }
}
