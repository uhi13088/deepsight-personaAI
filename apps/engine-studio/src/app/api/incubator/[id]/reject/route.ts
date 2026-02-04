import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/incubator/[id]/reject - 페르소나 거부
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { reason } = body as { reason?: string }

    // 인큐베이터 로그 조회
    const log = await prisma.incubatorLog.findUnique({
      where: { id },
    })

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "인큐베이터 로그를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    if (log.status === "APPROVED" || log.status === "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "이미 처리된 페르소나입니다",
          },
        },
        { status: 400 }
      )
    }

    // 기존 테스트 결과에 거부 사유 추가
    const existingResults = (log.testResults as Record<string, unknown>) || {}
    const updatedResults = {
      ...existingResults,
      failReason: reason || "수동 거부됨",
      rejectedAt: new Date().toISOString(),
      rejectedBy: session.user.email,
    }

    // 로그 상태 업데이트
    await prisma.incubatorLog.update({
      where: { id },
      data: {
        status: "REJECTED",
        testResults: updatedResults,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        logId: log.id,
        message: "페르소나가 거부되었습니다",
        reason: reason || "수동 거부됨",
      },
    })
  } catch (error) {
    console.error("[API] POST /api/incubator/[id]/reject error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 거부에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
