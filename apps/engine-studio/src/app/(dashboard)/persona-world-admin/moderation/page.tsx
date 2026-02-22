"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Report {
  id: string
  reporterType: string
  targetType: string
  targetId: string
  reason: string
  status: string
  createdAt: string
  targetContent?: string
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/moderation")
      const json = (await res.json()) as {
        success: boolean
        data?: { reports: Report[] }
        error?: { message: string }
      }
      if (json.success && json.data) {
        setReports(json.data.reports)
      } else {
        setError(json.error?.message ?? "Failed to load")
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

  async function handleAction(reportId: string, action: string) {
    await fetch("/api/internal/persona-world-admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reportId }),
    })
    void fetchData()
  }

  if (loading) {
    return (
      <>
        <Header title="Moderation" description="포스트/댓글 신고 관리" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Moderation" description="포스트/댓글 신고 관리" />
      <div className="space-y-6 p-6">
        {error && <div className="text-destructive">{error}</div>}

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">
              신고 대기열 ({reports.filter((r) => r.status === "PENDING").length})
            </h3>
          </div>

          {reports.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">신고 내역이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === "PENDING" ? "destructive" : "secondary"}>
                        {report.status}
                      </Badge>
                      <span className="text-sm font-medium">{report.reason}</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {report.targetType} | {new Date(report.createdAt).toLocaleString("ko-KR")}
                    </p>
                    {report.targetContent && (
                      <p className="text-muted-foreground max-w-md truncate text-xs">
                        {report.targetContent}
                      </p>
                    )}
                  </div>

                  {report.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(report.id, "dismiss")}
                      >
                        무시
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(report.id, "hide")}
                      >
                        숨김
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
