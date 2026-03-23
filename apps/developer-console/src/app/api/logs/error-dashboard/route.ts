import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ErrorDashboardData } from "@/services/logs-service"

/**
 * GET /api/logs/error-dashboard - 에러 대시보드 데이터 조회
 * TODO: 실제 api_logs 테이블 기반 집계로 확장
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  const emptyDashboard: ErrorDashboardData = {
    errorRateTrend: [],
    errorsByType: [],
    errorsByEndpoint: [],
    topErrorMessages: [],
  }

  return NextResponse.json({ success: true, data: emptyDashboard })
}
