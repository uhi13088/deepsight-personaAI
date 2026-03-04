import { NextRequest, NextResponse } from "next/server"
import { verifyInternalToken } from "@/lib/internal-auth"
import { computeAverageUncertainty, getTopUncertainDimensions } from "@deepsight/vector-core"
import { buildAdaptiveProgress } from "@/lib/persona-world/onboarding/adaptive-engine"
import { buildAdaptiveProvider } from "../start/route"

/**
 * GET /api/persona-world/onboarding/adaptive/status?sessionId=xxx
 *
 * 적응형 온보딩 세션 상태 조회.
 *
 * Response: { sessionId, status, progress, uncertainty }
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "sessionId 필요" } },
        { status: 400 }
      )
    }

    const provider = buildAdaptiveProvider()
    const session = await provider.loadSession(sessionId)

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "세션을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    const progress = buildAdaptiveProgress(session)
    const avgUncertainty = computeAverageUncertainty(session.uncertainty)
    const topUncertain = getTopUncertainDimensions(session.uncertainty, 5)

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        status: session.status,
        questionCount: session.questionCount,
        progress,
        uncertainty: {
          average: avgUncertainty,
          topUncertain,
        },
        currentVectors: {
          l1: session.currentL1,
          l2: session.currentL2,
          l3: session.currentL3,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ADAPTIVE_STATUS_ERROR", message } },
      { status: 500 }
    )
  }
}
