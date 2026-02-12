"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"

interface DashboardStats {
  activePersonas: number
  matchingRate: string
  apiLatency: string
  systemHealth: string
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

  return (
    <>
      <Header title="Dashboard" description="시스템 상태, 매칭 성과, 최근 활동" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Active Personas"
            value={stats ? String(stats.activePersonas) : "—"}
          />
          <DashboardCard title="Matching Rate" value={stats?.matchingRate ?? "—"} />
          <DashboardCard title="API Latency" value={stats?.apiLatency ?? "—"} />
          <DashboardCard title="System Health" value={stats?.systemHealth ?? "—"} />
        </div>
      </div>
    </>
  )
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
