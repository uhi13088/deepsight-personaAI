"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, AlertTriangle, Info, XCircle, Filter } from "lucide-react"

interface AlertLogEntry {
  id: string
  severity: string
  category: string
  channel: string
  title: string
  body: string
  success: boolean
  error: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: typeof Bell }> = {
  critical: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", icon: XCircle },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    icon: AlertTriangle,
  },
  info: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", icon: Info },
}

const CATEGORY_LABELS: Record<string, string> = {
  security: "보안",
  cost: "비용",
  quality: "품질",
  system: "시스템",
}

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([])
  const [recentCount, setRecentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<AlertLogEntry | null>(null)

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (severityFilter) params.set("severity", severityFilter)
    if (categoryFilter) params.set("category", categoryFilter)

    try {
      const res = await fetch(`/api/internal/alerts/history?${params}`)
      const data = await res.json()
      if (data.success) {
        setAlerts(data.data.alerts)
        setRecentCount(data.data.recentCount)
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [severityFilter, categoryFilter])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  return (
    <>
      <Header
        title="Alert History"
        description={`알림 발송 이력${recentCount > 0 ? ` (최근 24시간: ${recentCount}건)` : ""}`}
      />

      <div className="space-y-4 p-6">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={severityFilter ?? ""}
            onChange={(e) => setSeverityFilter(e.target.value || null)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
          >
            <option value="">전체 심각도</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={categoryFilter ?? ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300"
          >
            <option value="">전체 카테고리</option>
            <option value="security">보안</option>
            <option value="cost">비용</option>
            <option value="quality">품질</option>
            <option value="system">시스템</option>
          </select>
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="py-12 text-center text-zinc-500">로딩 중...</div>
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" />
            알림 이력이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
              const Icon = style.icon

              return (
                <button
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-zinc-800/50 ${style.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-5 w-5 ${style.text}`} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-zinc-100">
                          {alert.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[alert.category] ?? alert.category}
                        </Badge>
                        <Badge
                          variant={alert.success ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {alert.success ? "성공" : "실패"}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {alert.channel} | {new Date(alert.createdAt).toLocaleString("ko-KR")}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Detail Modal */}
        {selectedAlert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setSelectedAlert(null)}
          >
            <div
              className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-100">{selectedAlert.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>
                  &times;
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-zinc-500">본문:</span>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-300">{selectedAlert.body}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-500">심각도:</span>
                    <span className="ml-2 text-zinc-300">{selectedAlert.severity}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">카테고리:</span>
                    <span className="ml-2 text-zinc-300">
                      {CATEGORY_LABELS[selectedAlert.category] ?? selectedAlert.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">채널:</span>
                    <span className="ml-2 text-zinc-300">{selectedAlert.channel}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">결과:</span>
                    <span
                      className={`ml-2 ${selectedAlert.success ? "text-green-400" : "text-red-400"}`}
                    >
                      {selectedAlert.success ? "성공" : "실패"}
                    </span>
                  </div>
                </div>
                {selectedAlert.error && (
                  <div>
                    <span className="text-zinc-500">에러:</span>
                    <p className="mt-1 text-red-400">{selectedAlert.error}</p>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">발송 시각:</span>
                  <span className="ml-2 text-zinc-300">
                    {new Date(selectedAlert.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
