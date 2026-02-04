import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { ABTestType, ABTestStatus } from "@prisma/client"

const createABTestSchema = z.object({
  name: z.string().min(1, "테스트 이름은 필수입니다"),
  description: z.string().optional(),
  testType: z.enum(["ALGORITHM", "PERSONA"]),
  controlAlgorithmId: z.string().optional(),
  testAlgorithmId: z.string().optional(),
  controlConfig: z.record(z.string(), z.unknown()).optional(),
  testConfig: z.record(z.string(), z.unknown()).optional(),
  trafficSplit: z.number().min(0).max(1).default(0.5),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// GET /api/ab-tests - A/B 테스트 목록 조회
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
    const status = searchParams.get("status") as ABTestStatus | null
    const testType = searchParams.get("testType") as ABTestType | null

    const tests = await prisma.aBTest.findMany({
      where: {
        ...(status && { status }),
        ...(testType && { testType }),
      },
      include: {
        controlAlgorithm: {
          select: { id: true, name: true, version: true },
        },
        testAlgorithm: {
          select: { id: true, name: true, version: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // 통계 계산
    const stats = {
      total: tests.length,
      running: tests.filter((t) => t.status === "RUNNING").length,
      completed: tests.filter((t) => t.status === "COMPLETED").length,
      draft: tests.filter((t) => t.status === "DRAFT").length,
    }

    return NextResponse.json({
      success: true,
      data: {
        tests: tests.map((test) => ({
          id: test.id,
          name: test.name,
          description: test.description,
          testType: test.testType,
          status: test.status,
          controlAlgorithm: test.controlAlgorithm,
          testAlgorithm: test.testAlgorithm,
          controlConfig: test.controlConfig,
          testConfig: test.testConfig,
          trafficSplit: Number(test.trafficSplit),
          startDate: test.startDate?.toISOString() || null,
          endDate: test.endDate?.toISOString() || null,
          results: test.results,
          createdBy: test.createdBy,
          createdAt: test.createdAt.toISOString(),
          updatedAt: test.updatedAt.toISOString(),
        })),
        stats,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/ab-tests error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "A/B 테스트 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/ab-tests - A/B 테스트 생성
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = createABTestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      testType,
      controlAlgorithmId,
      testAlgorithmId,
      controlConfig,
      testConfig,
      trafficSplit,
      startDate,
      endDate,
    } = parsed.data

    const test = await prisma.aBTest.create({
      data: {
        name,
        description,
        testType: testType as ABTestType,
        controlAlgorithmId,
        testAlgorithmId,
        controlConfig: (controlConfig || {}) as object,
        testConfig: (testConfig || {}) as object,
        trafficSplit,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: session.user.id,
      },
      include: {
        controlAlgorithm: {
          select: { id: true, name: true, version: true },
        },
        testAlgorithm: {
          select: { id: true, name: true, version: true },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ABTEST_CREATE",
        targetType: "ABTEST",
        targetId: test.id,
        details: { name, testType },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: test.id,
          name: test.name,
          testType: test.testType,
          status: test.status,
          controlAlgorithm: test.controlAlgorithm,
          testAlgorithm: test.testAlgorithm,
          trafficSplit: Number(test.trafficSplit),
          createdAt: test.createdAt.toISOString(),
        },
        message: "A/B 테스트가 생성되었습니다",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] POST /api/ab-tests error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "A/B 테스트 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
