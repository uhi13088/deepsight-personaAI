import { NextResponse } from "next/server"

/**
 * GET /api/health
 *
 * persona-world 시스템 진단 엔드포인트
 * - Engine API URL 설정 확인
 * - Engine Studio 연결 테스트
 *
 * 이 라우트는 filesystem route이므로 next.config.ts의 rewrite보다 우선합니다.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // 1. 환경변수 설정 확인
  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_API_URL?.trim()
  checks.envConfig = {
    ok: !!engineUrl,
    detail: engineUrl
      ? `NEXT_PUBLIC_ENGINE_API_URL = ${engineUrl}`
      : "NEXT_PUBLIC_ENGINE_API_URL is NOT SET — rewrites will fallback to localhost:3000",
  }

  // 2. Engine Studio 연결 테스트
  if (engineUrl) {
    const targetUrl = engineUrl.startsWith("http") ? engineUrl : `https://${engineUrl}`
    try {
      const res = await fetch(`${targetUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      })
      const body = await res.json()
      checks.engineStudio = {
        ok: res.ok,
        detail: `status=${res.status}, engine=${JSON.stringify(body.status ?? "unknown")}`,
      }
      // engine-studio의 checks도 포함
      if (body.checks) {
        checks.engineChecks = {
          ok: Object.values(body.checks as Record<string, { ok: boolean }>).every((c) => c.ok),
          detail: JSON.stringify(body.checks),
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      checks.engineStudio = {
        ok: false,
        detail: `Cannot reach ${targetUrl}/api/health — ${msg}`,
      }
    }
  } else {
    checks.engineStudio = {
      ok: false,
      detail: "Skipped (no ENGINE_API_URL configured)",
    }
  }

  // 3. Build-time vs Runtime 확인
  checks.runtime = {
    ok: true,
    detail: [
      `VERCEL: ${process.env.VERCEL ? "yes" : "no"}`,
      `NODE_ENV: ${process.env.NODE_ENV}`,
      `VERCEL_ENV: ${process.env.VERCEL_ENV ?? "n/a"}`,
    ].join(", "),
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
