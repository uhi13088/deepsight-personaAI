import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runIncubatorBatch } from "@/lib/incubator/run-batch"
import type { ApiResponse } from "@/types"
import type { BatchRunResult } from "@/lib/incubator/run-batch"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5분: 다수 페르소나 생성 허용

/**
 * GET /api/cron/incubator-batch
 *
 * 인큐베이터 일일 배치 자동 실행 (Vercel Cron).
 * 매일 자정 UTC (= 오전 9시 KST) 에 실행됩니다.
 */
export async function GET(request: NextRequest) {
  // Auth check (fail-closed: CRON_SECRET 없으면 거부)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "CRON_SECRET not configured" } },
      { status: 500 }
    )
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    )
  }

  try {
    // 설정에서 enabled, dailyLimit, passThreshold 조회
    const configRows = await prisma.systemConfig
      .findMany({ where: { category: "INCUBATOR" } })
      .catch(() => [])
    const configMap = Object.fromEntries(configRows.map((r) => [r.key, r.value]))

    // 인큐베이터 비활성화 상태면 실행 스킵
    const isEnabled = configMap.enabled !== false && configMap.enabled !== "false"
    if (!isEnabled) {
      console.log("[IncubatorBatch] 인큐베이터가 비활성화 상태입니다. 실행 건너뜀.")
      return NextResponse.json<ApiResponse<{ skipped: boolean; reason: string }>>({
        success: true,
        data: { skipped: true, reason: "incubator_disabled" },
      })
    }

    const dailyLimit = (configMap.dailyLimit as number) ?? 10
    const passThreshold = (configMap.passThreshold as number) ?? 0.9

    const result = await runIncubatorBatch({
      dailyLimit,
      passThreshold,
      batchIdPrefix: "batch-cron",
    })

    return NextResponse.json<ApiResponse<BatchRunResult>>({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "인큐베이터 배치 실행 실패"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "BATCH_ERROR", message } },
      { status: 500 }
    )
  }
}
