"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Trash2, RefreshCw, Filter } from "lucide-react"

interface QuarantineEntry {
  id: string
  content: string
  source: string
  personaId: string | null
  reason: string
  violations: Array<{ category: string; pattern: string; matched: string }>
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

interface QuarantineData {
  entries: QuarantineEntry[]
  total: number
  pendingCount: number
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-600",
  APPROVED: "bg-green-500/10 text-green-600",
  REJECTED: "bg-red-500/10 text-red-600",
  DELETED: "bg-muted text-muted-foreground",
}

export default function QuarantineQueuePage() {
  const [data, setData] = useState<QuarantineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/internal/security/quarantine?${params.toString()}`)
      const json = (await res.json()) as {
        success: boolean
        data?: QuarantineData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  async function handleAction(entryId: string, action: "approve" | "reject" | "delete") {
    setActionLoading(entryId)
    try {
      await fetch("/api/internal/security/quarantine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, entryId }),
      })
      void fetchData()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <>
      <Header title="Quarantine Queue" description="격리된 콘텐츠 검토 및 관리" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary */}
        {data && (
          <div className="flex gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">총 건수</div>
              <div className="text-2xl font-bold">{data.total}</div>
            </div>
            <div className="rounded-lg border border-yellow-500/30 p-4">
              <div className="text-sm text-yellow-600">대기 중</div>
              <div className="text-2xl font-bold text-yellow-600">{data.pendingCount}</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          {["", "PENDING", "APPROVED", "REJECTED", "DELETED"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : !data || data.entries.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">격리된 항목이 없습니다</div>
        ) : (
          <div className="space-y-3">
            {data.entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_BADGE[entry.status] ?? ""}>{entry.status}</Badge>
                      <span className="text-muted-foreground text-xs">{entry.source}</span>
                      {entry.personaId && (
                        <span className="text-muted-foreground text-xs">
                          Persona: {entry.personaId.slice(0, 8)}...
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{entry.reason}</p>
                    <div className="bg-muted/50 mt-2 max-h-20 overflow-hidden rounded p-2 text-xs">
                      {entry.content.length > 200
                        ? entry.content.slice(0, 200) + "..."
                        : entry.content}
                    </div>
                    {entry.violations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.violations.map((v, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {v.category}: {v.pattern}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {entry.status === "PENDING" && (
                    <div className="ml-4 flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600"
                        disabled={actionLoading === entry.id}
                        onClick={() => void handleAction(entry.id, "approve")}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={actionLoading === entry.id}
                        onClick={() => void handleAction(entry.id, "reject")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === entry.id}
                        onClick={() => void handleAction(entry.id, "delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
