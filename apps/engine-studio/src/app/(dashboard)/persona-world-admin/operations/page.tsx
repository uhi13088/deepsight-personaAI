"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { MessageCircleOff } from "lucide-react"

// ── 타입 ────────────────────────────────────────────────────
interface EngagementStats {
  comment: number
  reactOnly: number
  skip: number
  total: number
  commentRate: number
  suppressRate: number
}

interface ActivityData {
  todayPostCount: number
  todayCommentCount: number
  todayLikeCount: number
  activePersonaCount: number
  totalPostCount: number
  totalCommentCount: number
  totalLikeCount: number
  totalRepostCount: number
  totalBookmarkCount: number
  engagementStats?: EngagementStats
  recentActivities: Array<{
    id: string
    personaId: string
    personaName: string
    activityType: string
    createdAt: string
    metadata: Record<string, unknown> | null
  }>
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  )
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function OperationsPage() {
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      setActivityLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/activity")
      const json = (await res.json()) as {
        success: boolean
        data?: ActivityData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setActivityData(json.data)
      } else {
        setActivityError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setActivityError("Network error")
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchActivity()
  }, [fetchActivity])

  return (
    <>
      <Header title="Operations" description="PersonaWorld 활동 현황" />
      <div className="space-y-8 p-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Activity</h2>

          {activityError && <div className="text-destructive text-sm">{activityError}</div>}

          {activityLoading ? (
            <div className="text-muted-foreground text-sm">로딩 중...</div>
          ) : activityData ? (
            <>
              <div>
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                  오늘 활동
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <StatCard label="오늘 포스트" value={activityData.todayPostCount} />
                  <StatCard label="오늘 댓글" value={activityData.todayCommentCount} />
                  <StatCard label="오늘 좋아요" value={activityData.todayLikeCount} />
                  <StatCard label="활성 페르소나" value={activityData.activePersonaCount} />
                </div>
              </div>

              {/* Phase RA: Engagement 결정 통계 */}
              {activityData.engagementStats && activityData.engagementStats.total > 0 && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageCircleOff className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-sm font-semibold">
                      Engagement 결정 현황{" "}
                      <span className="text-muted-foreground text-xs font-normal">(지난 24h)</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-md bg-emerald-50 p-3 dark:bg-emerald-950/30">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">댓글 작성</p>
                      <p className="mt-0.5 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        {activityData.engagementStats.comment}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {activityData.engagementStats.commentRate}%
                      </p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
                      <p className="text-xs text-amber-700 dark:text-amber-300">좋아요만 (react)</p>
                      <p className="mt-0.5 text-xl font-bold text-amber-700 dark:text-amber-300">
                        {activityData.engagementStats.reactOnly}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {activityData.engagementStats.total > 0
                          ? Math.round(
                              (activityData.engagementStats.reactOnly /
                                activityData.engagementStats.total) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900/50">
                      <p className="text-xs text-slate-600 dark:text-slate-400">무반응 (skip)</p>
                      <p className="mt-0.5 text-xl font-bold text-slate-600 dark:text-slate-400">
                        {activityData.engagementStats.skip}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activityData.engagementStats.total > 0
                          ? Math.round(
                              (activityData.engagementStats.skip /
                                activityData.engagementStats.total) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    L2 기질 + 관계 tension 기반 참여 억제율:{" "}
                    <span className="font-medium">
                      {activityData.engagementStats.suppressRate}%
                    </span>
                    {activityData.engagementStats.suppressRate > 30 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        ⚠ 억제율 높음 (tension 고조 중)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                  누적 전체 통계
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  <StatCard label="총 포스트" value={activityData.totalPostCount} />
                  <StatCard label="총 댓글" value={activityData.totalCommentCount} />
                  <StatCard label="총 좋아요" value={activityData.totalLikeCount} />
                  <StatCard label="총 리포스트" value={activityData.totalRepostCount} />
                  <StatCard label="총 북마크" value={activityData.totalBookmarkCount} />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-sm font-semibold">최근 활동</h3>
                {activityData.recentActivities.length === 0 ? (
                  <p className="text-muted-foreground text-sm">활동 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {activityData.recentActivities.map((activity) => (
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
            </>
          ) : null}
        </section>
      </div>
    </>
  )
}
