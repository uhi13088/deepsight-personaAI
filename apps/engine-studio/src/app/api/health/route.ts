import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/health
 *
 * 시스템 상태 진단 엔드포인트
 * - DB 연결 테스트
 * - 기본 테이블 존재 여부
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // 1. DB 연결 테스트
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { ok: true, detail: "connected" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    checks.database = { ok: false, detail: msg }
  }

  // 2. 핵심 테이블 존재 여부 (DB 연결 성공 시)
  if (checks.database.ok) {
    try {
      const [personaCount, postCount] = await Promise.all([
        prisma.persona.count(),
        prisma.personaPost.count(),
      ])
      checks.tables = {
        ok: true,
        detail: `personas: ${personaCount}, posts: ${postCount}`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      checks.tables = { ok: false, detail: msg }
    }
  }

  // 3. 환경변수 확인 (값은 노출하지 않음)
  checks.env = {
    ok: !!process.env.DATABASE_URL && !!process.env.DIRECT_URL,
    detail: [
      `DATABASE_URL: ${process.env.DATABASE_URL ? "set" : "MISSING"}`,
      `DIRECT_URL: ${process.env.DIRECT_URL ? "set" : "MISSING"}`,
    ].join(", "),
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
