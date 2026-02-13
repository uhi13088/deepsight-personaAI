import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  calculateGoldenSampleMetrics,
  shouldExpandGoldenSamples,
  type GoldenSample,
} from "@/lib/incubator/golden-sample"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/incubator/golden-samples/metrics
// 골든 샘플 풀 현황 + 차원 커버리지 + 확장 필요성
// ═══════════════════════════════════════════════════════════════

interface MetricsResponse {
  totalSamples: number
  activeSamples: number
  avgPassRate: number
  dimensionCoverage: Record<string, number>
  lastExpansionDate: string | null
  nextExpansionTarget: number
  difficultyDistribution: Record<string, number>
  shouldExpand: boolean
  targetPoolSize: number
  expansionCount: number
}

export async function GET() {
  try {
    const samples = await prisma.goldenSample.findMany()

    // GoldenSample 타입 맞추기 (DB → lib 타입)
    const libSamples: GoldenSample[] = samples.map((s) => ({
      id: s.id,
      contentTitle: s.contentTitle,
      genre: s.genre ?? "",
      testQuestion: s.testQuestion,
      expectedReactions: (s.expectedReactions as Record<string, string>) ?? {},
      difficultyLevel: s.difficultyLevel as "EASY" | "MEDIUM" | "HARD",
      validationDimensions: s.validationDimensions,
      version: s.version,
      isActive: s.isActive,
    }))

    // 현재 pass rate 데이터가 없으므로 빈 Map 전달
    const passRates = new Map<string, number>()
    const metrics = calculateGoldenSampleMetrics(libSamples, passRates)

    // 활성 페르소나 수 추정 (확장 전략 판단용)
    let activePersonaCount = 0
    try {
      activePersonaCount = await prisma.persona.count({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
      })
    } catch {
      // 페르소나 테이블 없을 수 있음
    }

    const activeSampleCount = samples.filter((s) => s.isActive).length
    const expansion = shouldExpandGoldenSamples(activePersonaCount, activeSampleCount)

    // 난이도 분포
    const difficultyDistribution: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 }
    for (const s of samples.filter((s) => s.isActive)) {
      difficultyDistribution[s.difficultyLevel] =
        (difficultyDistribution[s.difficultyLevel] ?? 0) + 1
    }

    const response: MetricsResponse = {
      totalSamples: metrics.totalSamples,
      activeSamples: metrics.activeSamples,
      avgPassRate: metrics.avgPassRate,
      dimensionCoverage: metrics.dimensionCoverage,
      lastExpansionDate: metrics.lastExpansionDate?.toISOString() ?? null,
      nextExpansionTarget: metrics.nextExpansionTarget,
      difficultyDistribution,
      shouldExpand: expansion.shouldExpand,
      targetPoolSize: expansion.targetPoolSize,
      expansionCount: expansion.expansionCount,
    }

    return NextResponse.json({
      success: true,
      data: response,
    } satisfies ApiResponse<MetricsResponse>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `골든 샘플 메트릭 조회 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
