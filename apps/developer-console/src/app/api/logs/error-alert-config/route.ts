import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ErrorAlertConfig } from "@/services/logs-service"

/**
 * GET /api/logs/error-alert-config - 에러 알림 설정 조회
 * TODO: DB 저장 구현 시 organization별 설정으로 확장
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  const defaultConfig: ErrorAlertConfig = {
    enabled: false,
    errorRateThreshold: 10,
    consecutiveErrorCount: 5,
    notifyChannels: { email: true, slack: false, webhook: false },
  }

  return NextResponse.json({ success: true, data: defaultConfig })
}

/**
 * PUT /api/logs/error-alert-config - 에러 알림 설정 업데이트
 */
export async function PUT() {
  const { response } = await requireAuth()
  if (response) return response

  // TODO: DB 저장 구현
  return NextResponse.json({ success: true })
}
