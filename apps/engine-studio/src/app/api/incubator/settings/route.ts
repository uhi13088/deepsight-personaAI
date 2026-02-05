import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 기본 설정
const DEFAULT_SETTINGS = {
  enabled: false,
  runTime: "03:00",
  dailyLimit: 5,
  minPassScore: 70,
  autoApproveScore: 85,
}

// GET /api/incubator/settings - 설정 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const settingsConfig = await prisma.systemConfig.findUnique({
      where: {
        category_key: {
          category: "INCUBATOR",
          key: "settings",
        },
      },
    })

    const settings = (settingsConfig?.value as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error("[API] GET /api/incubator/settings error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/incubator/settings - 설정 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { enabled, runTime, dailyLimit, minPassScore, autoApproveScore } = body

    // 기존 설정 조회
    const existingConfig = await prisma.systemConfig.findUnique({
      where: {
        category_key: {
          category: "INCUBATOR",
          key: "settings",
        },
      },
    })

    const existingSettings = (existingConfig?.value as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS

    // 설정 병합
    const newSettings = {
      enabled: enabled !== undefined ? enabled : existingSettings.enabled,
      runTime: runTime !== undefined ? runTime : existingSettings.runTime,
      dailyLimit: dailyLimit !== undefined ? dailyLimit : existingSettings.dailyLimit,
      minPassScore: minPassScore !== undefined ? minPassScore : existingSettings.minPassScore,
      autoApproveScore:
        autoApproveScore !== undefined ? autoApproveScore : existingSettings.autoApproveScore,
    }

    // 유효성 검증
    if (newSettings.dailyLimit < 1 || newSettings.dailyLimit > 20) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_DAILY_LIMIT", message: "일일 생성 수는 1~20 사이여야 합니다" },
        },
        { status: 400 }
      )
    }

    if (newSettings.minPassScore < 50 || newSettings.minPassScore > 95) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MIN_PASS_SCORE",
            message: "최소 통과 점수는 50~95 사이여야 합니다",
          },
        },
        { status: 400 }
      )
    }

    if (newSettings.autoApproveScore < newSettings.minPassScore) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_AUTO_APPROVE_SCORE",
            message: "자동 승인 점수는 최소 통과 점수 이상이어야 합니다",
          },
        },
        { status: 400 }
      )
    }

    // 설정 저장 (upsert)
    await prisma.systemConfig.upsert({
      where: {
        category_key: {
          category: "INCUBATOR",
          key: "settings",
        },
      },
      update: {
        value: newSettings,
      },
      create: {
        category: "INCUBATOR",
        key: "settings",
        value: newSettings,
        description: "인큐베이터 자동 생성 설정",
      },
    })

    return NextResponse.json({
      success: true,
      data: newSettings,
    })
  } catch (error) {
    console.error("[API] PATCH /api/incubator/settings error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 저장에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
