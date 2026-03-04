import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ── GET: 질문 풀 조회 (필터 지원) ──────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ("redirect" in authResult) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "로그인 필요" } },
      { status: 401 }
    )
  }

  const { searchParams } = request.nextUrl
  const category = searchParams.get("category") // core, deepening, cross_layer, verification, narrative
  const level = searchParams.get("level") // QUICK, STANDARD, DEEP
  const adaptive = searchParams.get("adaptive") // true, false
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}

  if (category) {
    where.poolCategory = category
  }
  if (level) {
    where.onboardingLevel = level
  }
  if (adaptive === "true") {
    where.isAdaptive = true
  } else if (adaptive === "false") {
    where.isAdaptive = false
  }
  if (search) {
    where.questionText = { contains: search, mode: "insensitive" }
  }

  const questions = await prisma.psychProfileTemplate.findMany({
    where,
    orderBy: { questionOrder: "asc" },
  })

  const stats = {
    total: questions.length,
    byCategory: {
      core: questions.filter((q) => q.poolCategory === "core").length,
      deepening: questions.filter((q) => q.poolCategory === "deepening").length,
      cross_layer: questions.filter((q) => q.poolCategory === "cross_layer").length,
      verification: questions.filter((q) => q.poolCategory === "verification").length,
      narrative: questions.filter((q) => q.poolCategory === "narrative").length,
    },
    adaptive: questions.filter((q) => q.isAdaptive).length,
    nonAdaptive: questions.filter((q) => !q.isAdaptive).length,
  }

  const data = questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionOrder: q.questionOrder,
    onboardingLevel: q.onboardingLevel,
    questionType: q.questionType,
    targetDimensions: q.targetDimensions,
    options: q.options,
    poolCategory: q.poolCategory,
    isAdaptive: q.isAdaptive,
    informationGain: Number(q.informationGain),
    minPriorAnswers: q.minPriorAnswers,
  }))

  const response: ApiResponse<{ questions: typeof data; stats: typeof stats }> = {
    success: true,
    data: { questions: data, stats },
  }

  return NextResponse.json(response)
}

// ── PATCH: 질문 적응형 속성 업데이트 ────────────────────────────

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth()
  if ("redirect" in authResult) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "로그인 필요" } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { id, poolCategory, isAdaptive, informationGain, minPriorAnswers } = body as {
    id: string
    poolCategory?: string
    isAdaptive?: boolean
    informationGain?: number
    minPriorAnswers?: number
  }

  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "id 필요" } },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = {}
  if (poolCategory !== undefined) updateData.poolCategory = poolCategory
  if (isAdaptive !== undefined) updateData.isAdaptive = isAdaptive
  if (informationGain !== undefined) updateData.informationGain = informationGain
  if (minPriorAnswers !== undefined) updateData.minPriorAnswers = minPriorAnswers

  const updated = await prisma.psychProfileTemplate.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      poolCategory: updated.poolCategory,
      isAdaptive: updated.isAdaptive,
      informationGain: Number(updated.informationGain),
      minPriorAnswers: updated.minPriorAnswers,
    },
  })
}
