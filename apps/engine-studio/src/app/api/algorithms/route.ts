import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { AlgorithmStatus, AlgorithmType } from "@prisma/client"

const createAlgorithmSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  version: z.string().min(1, "버전은 필수입니다"),
  algorithmType: z.enum(["COSINE", "WEIGHTED", "CONTEXT", "HYBRID"]),
  parameters: z.record(z.string(), z.unknown()).optional(),
  weights: z.record(z.string(), z.number()).optional(),
  contextRules: z.record(z.string(), z.unknown()).optional(),
})

// GET /api/algorithms - 알고리즘 목록 조회
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
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const where: {
      status?: AlgorithmStatus
      algorithmType?: AlgorithmType
    } = {}

    if (status && status !== "all") {
      where.status = status as AlgorithmStatus
    }

    if (type && type !== "all") {
      where.algorithmType = type as AlgorithmType
    }

    const algorithms = await prisma.matchingAlgorithm.findMany({
      where,
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: { matchingLogs: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const data = algorithms.map((algo) => ({
      id: algo.id,
      name: algo.name,
      version: algo.version,
      algorithmType: algo.algorithmType,
      status: algo.status,
      parameters: algo.parameters,
      weights: algo.weights,
      contextRules: algo.contextRules,
      deployedEnv: algo.deployedEnv,
      performanceMetrics: algo.performanceMetrics,
      matchCount: algo._count.matchingLogs,
      recentVersions: algo.versions.map((v) => ({
        id: v.id,
        version: v.version,
        changeType: v.changeType,
        changeSummary: v.changeSummary,
        createdAt: v.createdAt.toISOString(),
      })),
      createdAt: algo.createdAt.toISOString(),
      updatedAt: algo.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    })
  } catch (error) {
    console.error("[API] GET /api/algorithms error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알고리즘 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/algorithms - 알고리즘 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // AI_ENGINEER 이상만 생성 가능
    if (!["ADMIN", "AI_ENGINEER"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createAlgorithmSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { name, version, algorithmType, parameters, weights, contextRules } = parsed.data

    const algorithm = await prisma.matchingAlgorithm.create({
      data: {
        name,
        version,
        algorithmType: algorithmType as AlgorithmType,
        parameters: (parameters || {}) as object,
        weights: (weights || {
          depth: 1,
          lens: 1,
          stance: 1,
          scope: 1,
          taste: 1,
          purpose: 1,
        }) as object,
        contextRules: (contextRules || {}) as object,
        status: "DRAFT",
      },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ALGORITHM_CREATE",
        targetType: "ALGORITHM",
        targetId: algorithm.id,
        details: { name, version, algorithmType },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: algorithm.id,
        name: algorithm.name,
        version: algorithm.version,
        algorithmType: algorithm.algorithmType,
        status: algorithm.status,
        createdAt: algorithm.createdAt.toISOString(),
      },
      message: "알고리즘이 생성되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/algorithms error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알고리즘 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
