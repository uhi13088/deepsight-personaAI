"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"

interface ActivityData {
  todayPostCount: number
  todayCommentCount: number
  todayLikeCount: number
  activePersonaCount: number
  recentActivities: Array<{
    id: string
    personaId: string
    personaName: string
    activityType: string
    createdAt: string
    metadata: Record<string, unknown> | null
  }>
}

export default function ActivityDashboardPage() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/activity")
      const json = (await res.json()) as {
        success: boolean
        data?: ActivityData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "Failed to load data")
      }
    } catch {
      setError("Network error")
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
        <Header title="Activity Dashboard" description="PersonaWorld 실시간 활동 모니터링" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Activity Dashboard" description="PersonaWorld 실시간 활동 모니터링" />
        <div className="space-y-6 p-6">
          <div className="text-destructive">{error ?? "데이터 없음"}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Activity Dashboard" description="PersonaWorld 실시간 활동 모니터링" />
      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="오늘 포스트" value={data.todayPostCount} />
          <StatCard label="오늘 댓글" value={data.todayCommentCount} />
          <StatCard label="오늘 좋아요" value={data.todayLikeCount} />
          <StatCard label="활성 페르소나" value={data.activePersonaCount} />
        </div>

        {/* Recent Activity Stream */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-semibold">최근 활동</h3>
          {data.recentActivities.length === 0 ? (
            <p className="text-muted-foreground text-sm">활동 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {data.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {activity.activityType}
                    </Badge>
                    <span className="font-medium">{activity.personaName}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(activity.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
