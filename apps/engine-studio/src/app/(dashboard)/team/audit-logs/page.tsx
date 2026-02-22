"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Activity,
  Users,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import type { AuditLogEntry, AuditAction, AuditTargetType, AuditSummary } from "@/lib/team"

// ── Action labels ───────────────────────────────────────────────
const ACTION_LABELS: Record<AuditAction, string> = {
  "user.invited": "사용자 초대",
  "user.activated": "사용자 활성화",
  "user.deactivated": "사용자 비활성화",
  "user.reactivated": "사용자 재활성화",
  "user.role_changed": "역할 변경",
  "persona.created": "페르소나 생성",
  "persona.updated": "페르소나 수정",
  "persona.deleted": "페르소나 삭제",
  "persona.published": "페르소나 게시",
  "matching.executed": "매칭 실행",
  "matching.configured": "매칭 설정",
  "content.created": "콘텐츠 생성",
  "content.updated": "콘텐츠 수정",
  "content.deleted": "콘텐츠 삭제",
  "content.published": "콘텐츠 게시",
  "settings.updated": "설정 변경",
  "model.configured": "모델 설정",
  "api.key_created": "API 키 생성",
  "api.key_revoked": "API 키 폐기",
  "api.endpoint_configured": "엔드포인트 설정",
  "test.executed": "테스트 실행",
  "test.configured": "테스트 설정",
  "node_graph.created": "노드 그래프 생성",
  "node_graph.updated": "노드 그래프 수정",
  "node_graph.deleted": "노드 그래프 삭제",
  "node_graph.executed": "노드 그래프 실행",
  "team.created": "팀 생성",
  "team.updated": "팀 수정",
}

// ── 전체 AuditAction 목록 (필터 드롭다운용) ────────────────────
const ALL_AUDIT_ACTIONS: AuditAction[] = Object.keys(ACTION_LABELS) as AuditAction[]

// ── Target type labels ──────────────────────────────────────────
const TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  user: "사용자",
  persona: "페르소나",
  content: "콘텐츠",
  matching: "매칭",
  settings: "설정",
  api: "API",
  test: "테스트",
  node_graph: "노드 그래프",
  model: "모델",
  team: "팀",
}

// ── Action badge variants ───────────────────────────────────────
function getActionVariant(
  action: AuditAction
): "success" | "warning" | "destructive" | "info" | "muted" {
  if (action.includes("created") || action.includes("invited")) return "success"
  if (action.includes("deleted") || action.includes("deactivated") || action.includes("revoked"))
    return "destructive"
  if (action.includes("updated") || action.includes("configured") || action.includes("changed"))
    return "warning"
  if (action.includes("executed") || action.includes("published")) return "info"
  return "muted"
}

// ── API response type ───────────────────────────────────────────
interface AuditApiData {
  entries: AuditLogEntry[]
  totalCount: number
  summary: AuditSummary
}

const PAGE_SIZE = 50

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filter state ────────────────────────────────────────────
  const [filterActor, setFilterActor] = useState("")
  const [filterAction, setFilterAction] = useState<AuditAction | "">("")
  const [filterTargetType, setFilterTargetType] = useState<AuditTargetType | "">("")
  const [filterKeyword, setFilterKeyword] = useState("")

  // ── Pagination state ─────────────────────────────────────────
  const [page, setPage] = useState(0)

  // ── Expand state ────────────────────────────────────────────
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setPage(0)
  }, [filterActor, filterAction, filterTargetType, filterKeyword])

  // ── Fetch data from API ───────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterActor) params.set("actor", filterActor)
      if (filterAction) params.set("action", filterAction)
      if (filterTargetType) params.set("targetType", filterTargetType)
      if (filterKeyword) params.set("keyword", filterKeyword)
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String(page * PAGE_SIZE))

      const qs = params.toString()
      const res = await fetch(`/api/internal/team/audit${qs ? `?${qs}` : ""}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setError(null)
      } else {
        setError(json.error?.message ?? "데이터 로드 실패")
      }
    } catch {
      setError("서버 연결 실패")
    } finally {
      setLoading(false)
    }
  }, [filterActor, filterAction, filterTargetType, filterKeyword, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Unique actors from fetched data ───────────────────────────
  const uniqueActors = (() => {
    if (!data) return []
    const actorMap = new Map<string, string>()
    for (const actor of data.summary.topActors) {
      actorMap.set(actor.actorId, actor.actorName)
    }
    return Array.from(actorMap.entries()).map(([id, name]) => ({ id, name }))
  })()

  // ── CSV export via API ────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterActor) params.set("actor", filterActor)
      if (filterAction) params.set("action", filterAction)
      if (filterTargetType) params.set("targetType", filterTargetType)
      if (filterKeyword) params.set("keyword", filterKeyword)
      params.set("limit", "10000")
      params.set("offset", "0")

      const qs = params.toString()
      const res = await fetch(`/api/internal/team/audit${qs ? `?${qs}` : ""}`)
      const json = await res.json()

      if (!json.success) {
        alert(json.error?.message ?? "내보내기 실패")
        return
      }

      const exportData = json.data as AuditApiData
      const header = "id,timestamp,actorId,actorName,action,targetType,targetId,details,ip"
      const rows = exportData.entries.map((entry: AuditLogEntry) => {
        const detailsStr = Object.entries(entry.details)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ")

        const escapeCSV = (value: string): string => {
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }

        return [
          escapeCSV(entry.id),
          new Date(entry.timestamp).toISOString(),
          escapeCSV(entry.actorId),
          escapeCSV(entry.actorName),
          entry.action,
          entry.targetType,
          escapeCSV(entry.targetId),
          escapeCSV(detailsStr),
          entry.ip ?? "",
        ].join(",")
      })

      const csv = [header, ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("CSV 내보내기 실패")
    }
  }, [filterActor, filterAction, filterTargetType, filterKeyword])

  // ── Format timestamp ────────────────────────────────────────
  const formatTimestamp = useCallback((ts: number): string => {
    const date = new Date(ts)
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }, [])

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Audit Logs" description="전체 작업 감사 로그" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (error) {
    return (
      <>
        <Header title="Audit Logs" description="전체 작업 감사 로그" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  const entries = data?.entries ?? []
  const totalCount = data?.totalCount ?? 0
  const summary = data?.summary ?? {
    totalEntries: 0,
    actionCounts: {},
    topActors: [],
    recentActivity: [],
    targetTypeCounts: {},
    periodStart: null,
    periodEnd: null,
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <>
      <Header title="Audit Logs" description="전체 작업 감사 로그" />

      <div className="space-y-6 p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground h-4 w-4" />
              <p className="text-muted-foreground text-xs">전체 로그</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.totalEntries}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <p className="text-muted-foreground text-xs">액션 종류</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-400">
              {Object.keys(summary.actionCounts).length}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              <p className="text-muted-foreground text-xs">활동 사용자</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-purple-400">{summary.topActors.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <p className="text-muted-foreground text-xs">기간</p>
            </div>
            <p className="mt-1 text-sm font-medium">
              {summary.periodStart ? formatTimestamp(summary.periodStart).split(" ")[0] : "-"}
              {" ~ "}
              {summary.periodEnd ? formatTimestamp(summary.periodEnd).split(" ")[0] : "-"}
            </p>
          </div>
        </div>

        {/* Top actors */}
        {summary.topActors.length > 0 && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">상위 활동 사용자</h3>
            <div className="flex flex-wrap gap-3">
              {summary.topActors.map((actor) => (
                <div
                  key={actor.actorId}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">{actor.actorName}</span>
                  <Badge variant="secondary">{actor.count}건</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target type distribution */}
        {Object.keys(summary.targetTypeCounts).length > 0 && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">대상 유형별 분포</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(summary.targetTypeCounts) as Array<[AuditTargetType, number]>).map(
                ([targetType, count]) => (
                  <Badge key={targetType} variant="outline">
                    {TARGET_TYPE_LABELS[targetType]}: {count}건
                  </Badge>
                )
              )}
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="text-sm font-medium">필터</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                className="border-border bg-background w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                placeholder="키워드, 사용자명 검색..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
              />
            </div>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
            >
              <option value="">전체 사용자</option>
              {uniqueActors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as AuditAction | "")}
            >
              <option value="">전체 액션</option>
              {ALL_AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action]}
                </option>
              ))}
            </select>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={filterTargetType}
              onChange={(e) => setFilterTargetType(e.target.value as AuditTargetType | "")}
            >
              <option value="">전체 대상</option>
              {(Object.entries(TARGET_TYPE_LABELS) as Array<[AuditTargetType, string]>).map(
                ([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                )
              )}
            </select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              CSV 내보내기
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{totalCount}건 검색됨</p>
        </div>

        {/* Audit log table */}
        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground w-8 px-4 py-3 text-left text-xs font-medium" />
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    시간
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    사용자
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    액션
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    대상
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isExpanded = expandedEntry === entry.id
                  return (
                    <tr key={entry.id} className="border-border group border-b last:border-0">
                      <td className="px-4 py-3">
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{entry.actorName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getActionVariant(entry.action)}>
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground text-xs">
                          {TARGET_TYPE_LABELS[entry.targetType]}
                        </span>
                        <span className="text-muted-foreground mx-1 text-xs">/</span>
                        <span className="font-mono text-xs">{entry.targetId}</span>
                      </td>
                    </tr>
                  )
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center text-sm">
                      조건에 맞는 로그가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Expanded detail rows */}
          {entries.map((entry) => {
            if (expandedEntry !== entry.id) return null
            return (
              <div
                key={`detail-${entry.id}`}
                className="border-border bg-muted/30 border-t px-8 py-4"
              >
                <div className="grid grid-cols-2 gap-4 text-xs lg:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground mb-1">로그 ID</p>
                    <p className="font-mono">{entry.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">사용자 ID</p>
                    <p className="font-mono">{entry.actorId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">IP 주소</p>
                    <p className="font-mono">{entry.ip ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">타임스탬프</p>
                    <p className="font-mono">{entry.timestamp}</p>
                  </div>
                </div>
                {Object.keys(entry.details).length > 0 && (
                  <div className="mt-3">
                    <p className="text-muted-foreground mb-1 text-xs">상세 정보</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(entry.details).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-border flex items-center justify-between border-t px-4 py-3">
              <p className="text-muted-foreground text-xs">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} / {totalCount}건
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
