import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { DeploymentTarget, DeploymentEnv, DeploymentStatus } from "@prisma/client"

const createDeploymentSchema = z.object({
  targetType: z.enum(["PERSONA", "ALGORITHM", "CONFIG"]),
  targetId: z.string().min(1, "대상 ID는 필수입니다"),
  environment: z.enum(["DEV", "STG", "PROD"]),
  version: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/deployments - 배포 목록 조회
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
    const targetType = searchParams.get("targetType") as DeploymentTarget | null
    const environment = searchParams.get("environment") as DeploymentEnv | null
    const status = searchParams.get("status") as DeploymentStatus | null
    const limit = parseInt(searchParams.get("limit") || "50")

    const deployments = await prisma.deployment.findMany({
      where: {
        ...(targetType && { targetType }),
        ...(environment && { environment }),
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    // 대상 정보 조회를 위한 ID 그룹화
    const personaIds = deployments.filter((d) => d.targetType === "PERSONA").map((d) => d.targetId)
    const algorithmIds = deployments
      .filter((d) => d.targetType === "ALGORITHM")
      .map((d) => d.targetId)
    const userIds = [...new Set(deployments.map((d) => d.deployedById))]

    // 관련 데이터 조회
    const [personas, algorithms, users] = await Promise.all([
      personaIds.length > 0
        ? prisma.persona.findMany({
            where: { id: { in: personaIds } },
            select: { id: true, name: true },
          })
        : [],
      algorithmIds.length > 0
        ? prisma.matchingAlgorithm.findMany({
            where: { id: { in: algorithmIds } },
            select: { id: true, name: true, version: true },
          })
        : [],
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
    ])

    const personaMap = new Map(personas.map((p) => [p.id, p]))
    const algorithmMap = new Map(algorithms.map((a) => [a.id, a]))
    const userMap = new Map(users.map((u) => [u.id, u]))

    // 통계 계산
    const stats = {
      total: deployments.length,
      pending: deployments.filter((d) => d.status === "PENDING").length,
      inProgress: deployments.filter((d) => d.status === "IN_PROGRESS").length,
      completed: deployments.filter((d) => d.status === "COMPLETED").length,
      failed: deployments.filter((d) => d.status === "FAILED").length,
      byEnvironment: {
        DEV: deployments.filter((d) => d.environment === "DEV").length,
        STG: deployments.filter((d) => d.environment === "STG").length,
        PROD: deployments.filter((d) => d.environment === "PROD").length,
      },
    }

    return NextResponse.json({
      success: true,
      data: {
        deployments: deployments.map((d) => {
          let targetName = d.targetId
          if (d.targetType === "PERSONA") {
            targetName = personaMap.get(d.targetId)?.name || d.targetId
          } else if (d.targetType === "ALGORITHM") {
            const algo = algorithmMap.get(d.targetId)
            targetName = algo ? `${algo.name} v${algo.version}` : d.targetId
          }

          return {
            id: d.id,
            targetType: d.targetType,
            targetId: d.targetId,
            targetName,
            environment: d.environment,
            status: d.status,
            version: d.version,
            notes: d.notes,
            deployedBy: userMap.get(d.deployedById) || { id: d.deployedById },
            createdAt: d.createdAt.toISOString(),
            completedAt: d.completedAt?.toISOString() || null,
          }
        }),
        stats,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/deployments error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/deployments - 배포 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (!["ADMIN", "AI_ENGINEER", "OPERATOR"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    // PROD 배포는 ADMIN만 가능
    const body = await request.json()
    const parsed = createDeploymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { targetType, targetId, environment, version, notes } = parsed.data

    // PROD 환경 배포는 ADMIN만 가능
    if (environment === "PROD" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "프로덕션 배포는 관리자만 가능합니다" },
        },
        { status: 403 }
      )
    }

    // 대상이 존재하는지 확인
    if (targetType === "PERSONA") {
      const persona = await prisma.persona.findUnique({ where: { id: targetId } })
      if (!persona) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
          { status: 404 }
        )
      }
    } else if (targetType === "ALGORITHM") {
      const algorithm = await prisma.matchingAlgorithm.findUnique({ where: { id: targetId } })
      if (!algorithm) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "알고리즘을 찾을 수 없습니다" } },
          { status: 404 }
        )
      }
    }

    const deployment = await prisma.deployment.create({
      data: {
        targetType: targetType as DeploymentTarget,
        targetId,
        environment: environment as DeploymentEnv,
        version,
        notes,
        deployedById: session.user.id,
        status: "PENDING",
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DEPLOYMENT_CREATE",
        targetType: "DEPLOYMENT",
        targetId: deployment.id,
        details: { targetType, targetId, environment },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: deployment.id,
          targetType: deployment.targetType,
          targetId: deployment.targetId,
          environment: deployment.environment,
          status: deployment.status,
          createdAt: deployment.createdAt.toISOString(),
        },
        message: "배포가 생성되었습니다",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] POST /api/deployments error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
