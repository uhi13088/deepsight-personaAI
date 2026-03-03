import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ── 타입 정의 ──────────────────────────────────────────────────

interface DailyCost {
  date: string
  totalCostUsd: number
  totalCalls: number
  totalTokens: number
}

interface CallTypeBreakdown {
  callType: string
  totalCalls: number
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  avgDurationMs: number
}

interface LlmCostsSummary {
  totalCostUsd: number
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgCostPerCall: number
  avgDurationMs: number
  errorCount: number
  errorRate: number
}

interface RecentCall {
  id: string
  personaId: string | null
  callType: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  durationMs: number
  status: string
  errorMessage: string | null
  createdAt: string
}

interface LlmCostsResponse {
  summary: LlmCostsSummary
  dailyCosts: DailyCost[]
  callTypeBreakdown: CallTypeBreakdown[]
  recentCalls: RecentCall[]
}

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/operations/llm-costs
// ═══════════════════════════════════════════════════════════════

const EMPTY_SUMMARY: LlmCostsSummary = {
  totalCostUsd: 0,
  totalCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  avgCostPerCall: 0,
  avgDurationMs: 0,
  errorCount: 0,
  errorRate: 0,
}

const EMPTY_RESPONSE: LlmCostsResponse = {
  summary: EMPTY_SUMMARY,
  dailyCosts: [],
  callTypeBreakdown: [],
  recentCalls: [],
}

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Number(searchParams.get("days") ?? "30"), 90)
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100)

    const since = new Date()
    since.setDate(since.getDate() - days)

    // 테이블 존재 여부 + 데이터 확인
    // count()는 SELECT COUNT(*) 이므로 컬럼 누락 영향 없음 (테이블 부재만 감지)
    let totalCount: number
    try {
      totalCount = await prisma.llmUsageLog.count({
        where: { createdAt: { gte: since } },
      })
    } catch (err) {
      console.error(
        "[llm-costs] count 실패 (테이블 미존재):",
        err instanceof Error ? err.message : err
      )
      return NextResponse.json({
        success: true,
        data: EMPTY_RESPONSE,
      } satisfies ApiResponse<LlmCostsResponse>)
    }

    // 데이터가 없으면 빈 응답 반환 (불필요한 쿼리 방지)
    if (totalCount === 0) {
      return NextResponse.json({
        success: true,
        data: EMPTY_RESPONSE,
      } satisfies ApiResponse<LlmCostsResponse>)
    }

    // 전체 요약 통계
    const aggregates = await prisma.llmUsageLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        durationMs: true,
      },
      _avg: { durationMs: true },
      _count: true,
    })

    const costAgg = await prisma.llmUsageLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { estimatedCostUsd: true },
    })

    const errorCount = await prisma.llmUsageLog.count({
      where: { createdAt: { gte: since }, status: "ERROR" },
    })

    const totalCalls = aggregates._count
    const totalCostUsd = Number(costAgg._sum.estimatedCostUsd ?? 0)

    const summary: LlmCostsSummary = {
      totalCostUsd,
      totalCalls,
      totalInputTokens: aggregates._sum.inputTokens ?? 0,
      totalOutputTokens: aggregates._sum.outputTokens ?? 0,
      totalTokens: aggregates._sum.totalTokens ?? 0,
      avgCostPerCall: totalCalls > 0 ? totalCostUsd / totalCalls : 0,
      avgDurationMs: Math.round(Number(aggregates._avg.durationMs ?? 0)),
      errorCount,
      errorRate: totalCalls > 0 ? errorCount / totalCalls : 0,
    }

    // 일별 비용 (groupBy raw query — Prisma의 날짜 groupBy 한계로 raw 사용)
    let dailyCosts: DailyCost[] = []
    try {
      const dailyRaw = await prisma.$queryRaw<
        { date: Date; total_cost: string; total_calls: bigint; total_tokens: bigint }[]
      >`
        SELECT
          DATE(created_at) as date,
          COALESCE(SUM(estimated_cost_usd), 0) as total_cost,
          COUNT(*) as total_calls,
          COALESCE(SUM(total_tokens), 0) as total_tokens
        FROM llm_usage_logs
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `

      dailyCosts = dailyRaw.map((row) => ({
        date: new Date(row.date).toISOString().split("T")[0],
        totalCostUsd: Number(row.total_cost),
        totalCalls: Number(row.total_calls),
        totalTokens: Number(row.total_tokens),
      }))
    } catch {
      // raw query 실패 시 빈 배열 유지
    }

    // callType별 통계
    let callTypeBreakdown: CallTypeBreakdown[] = []
    try {
      const typeRaw = await prisma.$queryRaw<
        {
          call_type: string
          total_calls: bigint
          total_cost: string
          total_input: bigint
          total_output: bigint
          avg_duration: string
        }[]
      >`
        SELECT
          call_type,
          COUNT(*) as total_calls,
          COALESCE(SUM(estimated_cost_usd), 0) as total_cost,
          COALESCE(SUM(input_tokens), 0) as total_input,
          COALESCE(SUM(output_tokens), 0) as total_output,
          COALESCE(AVG(duration_ms), 0) as avg_duration
        FROM llm_usage_logs
        WHERE created_at >= ${since}
        GROUP BY call_type
        ORDER BY total_cost DESC
      `

      callTypeBreakdown = typeRaw.map((row) => ({
        callType: row.call_type,
        totalCalls: Number(row.total_calls),
        totalCostUsd: Number(row.total_cost),
        totalInputTokens: Number(row.total_input),
        totalOutputTokens: Number(row.total_output),
        avgDurationMs: Math.round(Number(row.avg_duration)),
      }))
    } catch {
      // raw query 실패 시 빈 배열 유지
    }

    // 최근 호출 목록 (select 명시 — 마이그레이션 미적용 컬럼 SELECT 방지)
    const recentRaw = await prisma.llmUsageLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        personaId: true,
        callType: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
        durationMs: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    })

    const recentCalls: RecentCall[] = recentRaw.map((r) => ({
      id: r.id,
      personaId: r.personaId,
      callType: r.callType,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      totalTokens: r.totalTokens,
      estimatedCostUsd: Number(r.estimatedCostUsd),
      durationMs: r.durationMs,
      status: r.status,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        summary,
        dailyCosts,
        callTypeBreakdown,
        recentCalls,
      },
    } satisfies ApiResponse<LlmCostsResponse>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `LLM 비용 조회 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
