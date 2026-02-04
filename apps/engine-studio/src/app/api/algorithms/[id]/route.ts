import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { AlgorithmStatus, AlgorithmType, ChangeType } from "@prisma/client"

const updateAlgorithmSchema = z.object({
  name: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  algorithmType: z.enum(["COSINE", "WEIGHTED", "CONTEXT", "HYBRID"]).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  weights: z.record(z.string(), z.number()).optional(),
  contextRules: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["DRAFT", "TESTING", "ACTIVE", "DEPRECATED"]).optional(),
  changeSummary: z.string().optional(),
  changeType: z.enum(["MAJOR", "MINOR", "PATCH", "ROLLBACK"]).optional(),
})

// GET /api/algorithms/[id] - 단일 알고리즘 조회
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

    const algorithm = await prisma.matchingAlgorithm.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { matchingLogs: true },
        },
      },
    })

    if (!algorithm) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "알고리즘을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: algorithm.id,
        name: algorithm.name,
        version: algorithm.version,
        algorithmType: algorithm.algorithmType,
        status: algorithm.status,
        parameters: algorithm.parameters,
        weights: algorithm.weights,
        contextRules: algorithm.contextRules,
        deployedEnv: algorithm.deployedEnv,
        performanceMetrics: algorithm.performanceMetrics,
        matchCount: algorithm._count.matchingLogs,
        versions: algorithm.versions.map((v) => ({
          id: v.id,
          version: v.version,
          parentVersion: v.parentVersion,
          changeType: v.changeType,
          changeSummary: v.changeSummary,
          changeDetails: v.changeDetails,
          parametersSnapshot: v.parametersSnapshot,
          weightsSnapshot: v.weightsSnapshot,
          deployedTo: v.deployedTo,
          createdAt: v.createdAt.toISOString(),
        })),
        createdAt: algorithm.createdAt.toISOString(),
        updatedAt: algorithm.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/algorithms/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알고리즘 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/algorithms/[id] - 알고리즘 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (!["ADMIN", "AI_ENGINEER"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateAlgorithmSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.matchingAlgorithm.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "알고리즘을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const {
      name,
      version,
      algorithmType,
      parameters,
      weights,
      contextRules,
      status,
      changeSummary,
      changeType,
    } = parsed.data

    // 트랜잭션으로 알고리즘 업데이트 + 버전 기록
    const [algorithm] = await prisma.$transaction([
      prisma.matchingAlgorithm.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(version && { version }),
          ...(algorithmType && { algorithmType: algorithmType as AlgorithmType }),
          ...(parameters && { parameters: parameters as object }),
          ...(weights && { weights: weights as object }),
          ...(contextRules && { contextRules: contextRules as object }),
          ...(status && { status: status as AlgorithmStatus }),
        },
      }),
      // 버전 기록 생성
      prisma.algorithmVersion.create({
        data: {
          algorithmId: id,
          version: version || existing.version,
          parentVersion: existing.version,
          changeType: (changeType || "PATCH") as ChangeType,
          changeSummary: changeSummary || "알고리즘 업데이트",
          changeDetails: { updated: Object.keys(parsed.data) },
          parametersSnapshot: (parameters || existing.parameters) as object,
          weightsSnapshot: (weights || existing.weights) as object,
          contextRulesSnapshot: (contextRules || existing.contextRules) as object,
        },
      }),
    ])

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ALGORITHM_UPDATE",
        targetType: "ALGORITHM",
        targetId: id,
        details: { changes: Object.keys(parsed.data), version: algorithm.version },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: algorithm.id,
        name: algorithm.name,
        version: algorithm.version,
        status: algorithm.status,
        updatedAt: algorithm.updatedAt.toISOString(),
      },
      message: "알고리즘이 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/algorithms/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알고리즘 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/algorithms/[id] - 알고리즘 삭제 (DEPRECATED 처리)
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

    await prisma.matchingAlgorithm.update({
      where: { id },
      data: { status: "DEPRECATED" },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ALGORITHM_DELETE",
        targetType: "ALGORITHM",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "알고리즘이 비활성화되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/algorithms/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알고리즘 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
