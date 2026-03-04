import { NextRequest, NextResponse } from "next/server"
import { verifyInternalToken } from "@/lib/internal-auth"
import { processAdaptiveOnboardingAnswer } from "@/lib/persona-world/onboarding/adaptive-engine"
import { buildAdaptiveProvider } from "../start/route"

/**
 * POST /api/persona-world/onboarding/adaptive/answer
 *
 * 적응형 온보딩 답변 제출 → 벡터 업데이트 → 다음 질문 or 완료.
 *
 * Body: { sessionId, questionId, value }
 * Response: { completed, nextQuestion?, progress, result? }
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { sessionId, questionId, value } = body as {
      sessionId: string
      questionId: string
      value: string | number | string[]
    }

    if (!sessionId || !questionId || value == null) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "sessionId, questionId, value 필요" },
        },
        { status: 400 }
      )
    }

    const provider = buildAdaptiveProvider()
    const result = await processAdaptiveOnboardingAnswer(sessionId, { questionId, value }, provider)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = message.includes("not found") ? 404 : 500
    return NextResponse.json(
      { success: false, error: { code: "ADAPTIVE_ANSWER_ERROR", message } },
      { status }
    )
  }
}
