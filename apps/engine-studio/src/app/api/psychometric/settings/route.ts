import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { Prisma } from "@prisma/client"

const settingsSchema = z.object({
  key: z.enum(["dimension_weights", "learning_settings"]),
  value: z.record(z.string(), z.unknown()),
})

// GET /api/psychometric/settings - 심리측정 설정 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const [weightSettings, learningSettings] = await Promise.all([
      prisma.systemConfig
        .findFirst({
          where: { category: "PSYCHOMETRIC", key: "dimension_weights" },
        })
        .catch(() => null),
      prisma.systemConfig
        .findFirst({
          where: { category: "PSYCHOMETRIC", key: "learning_settings" },
        })
        .catch(() => null),
    ])

    // 기본값
    const defaultWeights = {
      depth: 1.0,
      lens: 1.0,
      stance: 1.0,
      scope: 1.0,
      taste: 1.0,
      purpose: 1.0,
    }

    const defaultLearning = {
      learningRate: 0.01,
      batchSize: 32,
      epochs: 100,
      convergenceThreshold: 0.001,
      adaptiveRate: true,
      feedbackWeight: 0.7,
    }

    return NextResponse.json({
      success: true,
      data: {
        weights: (weightSettings?.value as Record<string, unknown>) ?? defaultWeights,
        learning: (learningSettings?.value as Record<string, unknown>) ?? defaultLearning,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/psychometric/settings error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/psychometric/settings - 심리측정 설정 저장
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { key, value } = parsed.data
    const description = key === "dimension_weights" ? "차원 가중치 설정" : "학습 파라미터 설정"

    await prisma.systemConfig.upsert({
      where: {
        category_key: { category: "PSYCHOMETRIC", key },
      },
      create: {
        category: "PSYCHOMETRIC",
        key,
        value: value as Prisma.InputJsonValue,
        description,
      },
      update: {
        value: value as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      success: true,
      message: "설정이 저장되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/psychometric/settings error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설정 저장에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
