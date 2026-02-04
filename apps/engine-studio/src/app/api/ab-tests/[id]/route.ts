import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { ABTestStatus } from "@prisma/client"

const updateABTestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "RUNNING", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  controlConfig: z.record(z.string(), z.unknown()).optional(),
  testConfig: z.record(z.string(), z.unknown()).optional(),
  trafficSplit: z.number().min(0).max(1).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  results: z.record(z.string(), z.unknown()).optional(),
})

// GET /api/ab-tests/[id] - 단일 A/B 테스트 조회
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

    const test = await prisma.aBTest.findUnique({
      where: { id },
      include: {
        controlAlgorithm: {
          select: { id: true, name: true, version: true, algorithmType: true },
        },
        testAlgorithm: {
          select: { id: true, name: true, version: true, algorithmType: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!test) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "A/B 테스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
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
      },
    })
  } catch (error) {
    console.error("[API] GET /api/ab-tests/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "A/B 테스트 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/ab-tests/[id] - A/B 테스트 수정
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
    const parsed = updateABTestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.aBTest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "A/B 테스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const {
      name,
      description,
      status,
      controlConfig,
      testConfig,
      trafficSplit,
      startDate,
      endDate,
      results,
    } = parsed.data

    // 상태 변경 검증
    if (status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["RUNNING", "CANCELLED"],
        RUNNING: ["PAUSED", "COMPLETED", "CANCELLED"],
        PAUSED: ["RUNNING", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      }

      if (!validTransitions[existing.status].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_STATE_TRANSITION",
              message: `${existing.status}에서 ${status}로 변경할 수 없습니다`,
            },
          },
          { status: 400 }
        )
      }
    }

    const test = await prisma.aBTest.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status: status as ABTestStatus }),
        ...(controlConfig && { controlConfig: controlConfig as object }),
        ...(testConfig && { testConfig: testConfig as object }),
        ...(trafficSplit !== undefined && { trafficSplit }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(results && { results: results as object }),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ABTEST_UPDATE",
        targetType: "ABTEST",
        targetId: id,
        details: {
          changes: Object.keys(parsed.data),
          ...(status && { statusChange: `${existing.status} → ${status}` }),
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: test.id,
        name: test.name,
        status: test.status,
        trafficSplit: Number(test.trafficSplit),
        updatedAt: test.updatedAt.toISOString(),
      },
      message: "A/B 테스트가 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/ab-tests/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "A/B 테스트 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/ab-tests/[id] - A/B 테스트 삭제
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

    const existing = await prisma.aBTest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "A/B 테스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 실행 중인 테스트는 삭제 불가
    if (existing.status === "RUNNING") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_OPERATION", message: "실행 중인 테스트는 삭제할 수 없습니다" },
        },
        { status: 400 }
      )
    }

    await prisma.aBTest.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ABTEST_DELETE",
        targetType: "ABTEST",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "A/B 테스트가 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/ab-tests/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "A/B 테스트 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
