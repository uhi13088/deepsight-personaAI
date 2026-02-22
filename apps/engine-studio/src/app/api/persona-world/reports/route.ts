import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ReportDataProvider, ReportInput } from "@/lib/persona-world/moderation/report-handler"
import { submitReport } from "@/lib/persona-world/moderation/report-handler"
import { verifyInternalToken } from "@/lib/internal-auth"

// 유효한 카테고리 목록
const VALID_CATEGORIES = [
  "INAPPROPRIATE_CONTENT",
  "WRONG_INFORMATION",
  "CHARACTER_BREAK",
  "REPETITIVE_CONTENT",
  "UNPLEASANT_INTERACTION",
  "TECHNICAL_ISSUE",
] as const

// 카테고리 → DB reason 매핑
const CATEGORY_TO_REASON: Record<string, string> = {
  INAPPROPRIATE_CONTENT: "INAPPROPRIATE",
  WRONG_INFORMATION: "MISINFORMATION",
  CHARACTER_BREAK: "OTHER",
  REPETITIVE_CONTENT: "SPAM",
  UNPLEASANT_INTERACTION: "HARASSMENT",
  TECHNICAL_ISSUE: "OTHER",
}

// Prisma 기반 ReportDataProvider 구현
const prismaReportProvider: ReportDataProvider = {
  async createReport(data) {
    const report = await prisma.personaWorldReport.create({
      data: {
        reporterUserId: data.reporterUserId,
        targetType: data.targetType as "POST" | "COMMENT",
        targetId: data.targetId,
        reason: data.reason as "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "MISINFORMATION" | "OTHER",
        description: data.description,
        status: data.status as "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED",
        resolution: data.resolution,
        resolvedAt: data.resolvedAt,
      },
    })
    return { id: report.id }
  },

  async countRecentReports(userId: string, windowHours: number) {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)
    return prisma.personaWorldReport.count({
      where: {
        reporterUserId: userId,
        createdAt: { gte: since },
      },
    })
  },

  async countReportsForTarget(targetId: string) {
    return prisma.personaWorldReport.count({
      where: { targetId },
    })
  },

  async hideTarget(targetType: string, targetId: string) {
    if (targetType === "POST") {
      await prisma.personaPost.update({
        where: { id: targetId },
        data: { isHidden: true },
      })
    } else if (targetType === "COMMENT") {
      await prisma.personaComment.update({
        where: { id: targetId },
        data: { isHidden: true },
      })
    }
  },

  async getReportStats() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [pendingCount, resolvedToday, totalReports, byReason] = await Promise.all([
      prisma.personaWorldReport.count({ where: { status: "PENDING" } }),
      prisma.personaWorldReport.count({
        where: { status: "RESOLVED", resolvedAt: { gte: todayStart } },
      }),
      prisma.personaWorldReport.count(),
      prisma.personaWorldReport.groupBy({
        by: ["reason"],
        _count: { id: true },
      }),
    ])

    const byCategory: Record<string, number> = {}
    for (const item of byReason) {
      byCategory[item.reason] = item._count.id
    }

    return { pendingCount, resolvedToday, totalReports, byCategory }
  },
}

/**
 * POST /api/persona-world/reports
 * 유저 신고 제출
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, targetType, targetId, category, description } = body

    // 필수 필드 검증
    if (!userId || !targetType || !targetId || !category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_PARAM",
            message: "userId, targetType, targetId, category required",
          },
        },
        { status: 400 }
      )
    }

    // targetType 검증
    if (!["POST", "COMMENT"].includes(targetType)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TARGET", message: "targetType must be POST or COMMENT" },
        },
        { status: 400 }
      )
    }

    // 카테고리 검증
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CATEGORY", message: `Invalid category: ${category}` },
        },
        { status: 400 }
      )
    }

    const input: ReportInput = {
      reporterUserId: userId,
      targetType,
      targetId,
      category,
      description,
    }

    const result = await submitReport(prismaReportProvider, input)

    if (!result.reportId) {
      // Rate limit 초과
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: result.message } },
        { status: 429 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[reports] POST error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Report submission failed" } },
      { status: 500 }
    )
  }
}
