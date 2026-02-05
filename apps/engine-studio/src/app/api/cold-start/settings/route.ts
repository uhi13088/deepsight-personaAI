import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Cold Start 설정 저장소 (실제로는 DB에 저장해야 함)
// 여기서는 메모리에 임시 저장
let coldStartSettings = {
  autoSelectMode: true,
  skipIfReturningUser: true,
  fallbackMode: "LIGHT" as "LIGHT" | "MEDIUM" | "DEEP",
  minConfidenceThreshold: 70,
  modeConfig: {
    LIGHT: {
      enabled: true,
      minQuestions: 12,
      maxQuestions: 12,
      estimatedTime: "2분",
      expectedAccuracy: 72,
    },
    MEDIUM: {
      enabled: true,
      minQuestions: 30,
      maxQuestions: 30,
      estimatedTime: "5분",
      expectedAccuracy: 85,
    },
    DEEP: {
      enabled: true,
      minQuestions: 60,
      maxQuestions: 60,
      estimatedTime: "15분",
      expectedAccuracy: 94,
    },
  },
}

// GET /api/cold-start/settings - 설정 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { settings: coldStartSettings },
    })
  } catch (error) {
    console.error("[API] GET /api/cold-start/settings error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PUT /api/cold-start/settings - 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      autoSelectMode,
      skipIfReturningUser,
      fallbackMode,
      minConfidenceThreshold,
      modeConfig,
    } = body

    // 설정 업데이트
    if (autoSelectMode !== undefined) {
      coldStartSettings.autoSelectMode = autoSelectMode
    }
    if (skipIfReturningUser !== undefined) {
      coldStartSettings.skipIfReturningUser = skipIfReturningUser
    }
    if (fallbackMode && ["LIGHT", "MEDIUM", "DEEP"].includes(fallbackMode)) {
      coldStartSettings.fallbackMode = fallbackMode
    }
    if (
      minConfidenceThreshold !== undefined &&
      minConfidenceThreshold >= 50 &&
      minConfidenceThreshold <= 95
    ) {
      coldStartSettings.minConfidenceThreshold = minConfidenceThreshold
    }
    if (modeConfig) {
      coldStartSettings.modeConfig = { ...coldStartSettings.modeConfig, ...modeConfig }
    }

    return NextResponse.json({
      success: true,
      data: { settings: coldStartSettings },
    })
  } catch (error) {
    console.error("[API] PUT /api/cold-start/settings error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 업데이트에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
