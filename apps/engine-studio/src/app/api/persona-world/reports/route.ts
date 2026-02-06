import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { ReportTargetType, ReportReason, ReportStatus } from "@prisma/client"

// 신고 생성 스키마
const createReportSchema = z.object({
  reporterUserId: z.string().min(1, "신고자 ID는 필수입니다"),
  targetType: z.enum(["POST", "COMMENT"]),
  targetId: z.string().min(1, "대상 ID는 필수입니다"),
  reason: z.enum(["SPAM", "INAPPROPRIATE", "HARASSMENT", "MISINFORMATION", "OTHER"]),
  description: z.string().optional(),
})

// 신고 처리 스키마
const resolveReportSchema = z.object({
  status: z.enum(["REVIEWED", "RESOLVED", "DISMISSED"]),
  resolution: z.string().optional(),
})

// GET /api/persona-world/reports - 신고 목록 조회 (관리자용)
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
    const targetType = searchParams.get("targetType")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    const where: {
      status?: ReportStatus
      targetType?: ReportTargetType
    } = {}

    if (status) {
      where.status = status.toUpperCase() as ReportStatus
    }

    if (targetType) {
      where.targetType = targetType.toUpperCase() as ReportTargetType
    }

    const [reports, total] = await Promise.all([
      prisma.personaWorldReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.personaWorldReport.count({ where }),
    ])

    // 신고 대상 정보 조회
    const reportsWithTarget = await Promise.all(
      reports.map(async (report) => {
        let target = null
        if (report.targetType === "POST") {
          target = await prisma.personaPost.findUnique({
            where: { id: report.targetId },
            select: {
              id: true,
              content: true,
              type: true,
              persona: {
                select: { id: true, name: true, handle: true },
              },
            },
          })
        } else {
          target = await prisma.personaComment.findUnique({
            where: { id: report.targetId },
            select: {
              id: true,
              content: true,
              persona: {
                select: { id: true, name: true, handle: true },
              },
            },
          })
        }
        return { ...report, target }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        reports: reportsWithTarget,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("신고 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "신고 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/reports - 신고 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = createReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { reporterUserId, targetType, targetId, reason, description } = validationResult.data

    // 신고 대상 존재 확인
    if (targetType === "POST") {
      const post = await prisma.personaPost.findUnique({
        where: { id: targetId },
      })
      if (!post) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "신고 대상 포스트를 찾을 수 없습니다" },
          },
          { status: 404 }
        )
      }
    } else {
      const comment = await prisma.personaComment.findUnique({
        where: { id: targetId },
      })
      if (!comment) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "신고 대상 댓글을 찾을 수 없습니다" },
          },
          { status: 404 }
        )
      }
    }

    // 중복 신고 체크 (같은 유저가 같은 대상을 신고)
    const existingReport = await prisma.personaWorldReport.findFirst({
      where: {
        reporterUserId,
        targetType: targetType as ReportTargetType,
        targetId,
        status: "PENDING",
      },
    })

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE", message: "이미 신고한 내용입니다" },
        },
        { status: 409 }
      )
    }

    // 신고 생성
    const report = await prisma.personaWorldReport.create({
      data: {
        reporterUserId,
        targetType: targetType as ReportTargetType,
        targetId,
        reason: reason as ReportReason,
        description,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("신고 생성 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "신고 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/persona-world/reports - 신고 처리 (reportId query param)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("reportId")

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "reportId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = resolveReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const existingReport = await prisma.personaWorldReport.findUnique({
      where: { id: reportId },
    })

    if (!existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "신고를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    const { status, resolution } = validationResult.data

    // 신고가 RESOLVED되면 대상 숨김 처리
    if (status === "RESOLVED") {
      if (existingReport.targetType === "POST") {
        await prisma.personaPost.update({
          where: { id: existingReport.targetId },
          data: {
            isHidden: true,
            hiddenAt: new Date(),
            hiddenBy: session.user.id,
          },
        })
      } else {
        await prisma.personaComment.update({
          where: { id: existingReport.targetId },
          data: {
            isHidden: true,
            hiddenAt: new Date(),
            hiddenBy: session.user.id,
          },
        })
      }
    }

    const updatedReport = await prisma.personaWorldReport.update({
      where: { id: reportId },
      data: {
        status: status as ReportStatus,
        resolution,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedReport,
    })
  } catch (error) {
    console.error("신고 처리 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "신고 처리에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
