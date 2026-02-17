"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"

interface DashboardStats {
  activePersonas: number
  totalPersonas: number
  matchingRate: string
  apiLatency: string
  systemHealth: string
  statusDistribution: Record<string, number>
}

const HEALTH_COLORS: Record<string, string> = {
  정상: "text-emerald-400",
  주의: "text-amber-400",
  경고: "text-red-400",
  초기화: "text-blue-400",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  REVIEW: "검토",
  ACTIVE: "활성",
  STANDARD: "표준",
  LEGACY: "레거시",
  DEPRECATED: "폐기",
  PAUSED: "일시정지",
  ARCHIVED: "보관",
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/dashboard")
      const json = (await res.json()) as {
        success: boolean
        data?: DashboardStats
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setStats(json.data)
      } else {
        setError(json.error?.message ?? "데이터를 불러오지 못했습니다")
      }
    } catch {
      setError("서버와 통신 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <>
        <Header title="Dashboard" description="시스템 상태, 매칭 성과, 최근 활동" />
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Dashboard" description="시스템 상태, 매칭 성과, 최근 활동" />
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  const healthColor = HEALTH_COLORS[stats?.systemHealth ?? ""] ?? ""

  return (
    <>
      <Header title="Dashboard" description="시스템 상태, 매칭 성과, 최근 활동" />
      <div className="space-y-6 p-6">
        {/* 주요 지표 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Active Personas"
            value={stats ? String(stats.activePersonas) : "—"}
            sub={stats ? `전체 ${stats.totalPersonas}개 중` : undefined}
          />
          <DashboardCard title="Matching Rate" value={stats?.matchingRate ?? "—"} sub="최근 30일" />
          <DashboardCard
            title="API Latency"
            value={stats?.apiLatency ?? "—"}
            sub="최근 100건 평균"
          />
          <DashboardCard
            title="System Health"
            value={stats?.systemHealth ?? "—"}
            valueClassName={healthColor}
          />
        </div>

        {/* 상태 분포 */}
        {stats && Object.keys(stats.statusDistribution).length > 0 && (
          <div className="border-border bg-card rounded-lg border p-4">
            <p className="text-muted-foreground mb-3 text-xs">페르소나 상태 분포</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.statusDistribution).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
                  <span className="font-mono font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function DashboardCard({
  title,
  value,
  sub,
  valueClassName,
}: {
  title: string
  value: string
  sub?: string
  valueClassName?: string
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClassName ?? ""}`}>{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  )
}
