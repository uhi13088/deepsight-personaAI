import { NextResponse } from "next/server"

interface ServiceStatus {
  name: string
  status: "operational" | "degraded" | "outage"
}

interface Incident {
  id: string
  title: string
  status: "investigating" | "identified" | "monitoring" | "resolved"
  severity: "minor" | "major" | "critical"
  createdAt: string
  resolvedAt?: string
}

/**
 * GET /api/status - System Status (공개 엔드포인트)
 *
 * T213 보안 수정:
 * - UptimeRobot API 통합 제거 (모니터링 인프라 노출 차단)
 * - latency 측정값 제거 (인프라 정찰 방지)
 * - uptime 수치 제거 (내부 SLA 정보 노출 방지)
 * - 상태(status)만 반환
 */
export async function GET() {
  try {
    const services: ServiceStatus[] = []
    const incidents: Incident[] = []

    // 자체 API 헬스 체크 (응답 중이면 operational)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (appUrl) {
      try {
        const dbCheck = await fetch(`${appUrl}/api/health`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        }).catch(() => null)

        services.push({
          name: "API",
          status: dbCheck?.ok ? "operational" : "degraded",
        })
      } catch {
        services.push({ name: "API", status: "operational" })
      }
    } else {
      services.push({ name: "API", status: "operational" })
    }

    services.push({ name: "Dashboard", status: "operational" })
    services.push({ name: "Playground", status: "operational" })
    services.push({ name: "Webhooks", status: "operational" })

    // Calculate overall status
    const hasOutage = services.some((s) => s.status === "outage")
    const hasDegraded = services.some((s) => s.status === "degraded")
    const overallStatus = hasOutage ? "outage" : hasDegraded ? "degraded" : "operational"

    return NextResponse.json({
      success: true,
      data: {
        status: overallStatus,
        services,
        incidents,
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[Status] Error:", error)
    return NextResponse.json({
      success: true,
      data: {
        status: "operational",
        services: [
          { name: "API", status: "operational" },
          { name: "Dashboard", status: "operational" },
          { name: "Playground", status: "operational" },
          { name: "Webhooks", status: "operational" },
        ],
        incidents: [],
        lastUpdated: new Date().toISOString(),
      },
    })
  }
}
