import { NextResponse } from "next/server"

/**
 * GET /api/health
 *
 * persona-world 시스템 진단 엔드포인트
 * - Engine API 연결 상태만 확인
 * - 환경변수 값은 노출하지 않음 (보안)
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // 1. 환경변수 설정 여부만 확인 (값은 노출하지 않음)
  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL?.trim()
  checks.envConfig = {
    ok: !!engineUrl,
    detail: engineUrl ? "configured" : "NEXT_PUBLIC_ENGINE_STUDIO_URL not set",
  }

  // 2. Engine Studio 연결 테스트
  if (engineUrl) {
    const targetUrl = engineUrl.startsWith("http") ? engineUrl : `https://${engineUrl}`
    try {
      const res = await fetch(`${targetUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      })
      checks.engineStudio = {
        ok: res.ok,
        detail: `status=${res.status}`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      checks.engineStudio = {
        ok: false,
        detail: `unreachable — ${msg}`,
      }
    }
  } else {
    checks.engineStudio = {
      ok: false,
      detail: "skipped (no engine URL)",
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "unhealthy",
      app: "persona-world",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
