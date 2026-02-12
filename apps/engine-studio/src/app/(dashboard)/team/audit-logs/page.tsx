"use client"

import { useState, useCallback, useMemo } from "react"
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
} from "lucide-react"
import {
  createAuditLog,
  recordAuditEntry,
  searchAuditLog,
  exportAuditLog,
  getAuditSummary,
} from "@/lib/team"
import type {
  AuditLog,
  AuditLogFilter,
  AuditAction,
  AuditTargetType,
  AuditSummary,
} from "@/lib/team"

// ── Action labels ───────────────────────────────────────────────
const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
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

// ── Sample audit log initialization ─────────────────────────────
function initializeAuditLog(): AuditLog {
  let log = createAuditLog()

  const now = Date.now()
  const entries: Array<{
    actorId: string
    actorName: string
    action: AuditAction
    targetType: AuditTargetType
    targetId: string
    details: Record<string, string>
    ip: string
    offset: number
  }> = [
    {
      actorId: "u1",
      actorName: "Admin",
      action: "team.created",
      targetType: "team",
      targetId: "team_1",
      details: { name: "DeepSight" },
      ip: "192.168.1.1",
      offset: -86400000 * 5,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "user.invited",
      targetType: "user",
      targetId: "u2",
      details: { email: "engineer@deepsight.ai", role: "ai_engineer" },
      ip: "192.168.1.1",
      offset: -86400000 * 4,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "user.invited",
      targetType: "user",
      targetId: "u3",
      details: { email: "content@deepsight.ai", role: "content_manager" },
      ip: "192.168.1.1",
      offset: -86400000 * 4,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "persona.created",
      targetType: "persona",
      targetId: "p1",
      details: { name: "심층 분석가" },
      ip: "10.0.0.5",
      offset: -86400000 * 3,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "persona.updated",
      targetType: "persona",
      targetId: "p1",
      details: { field: "vectors", description: "L1 벡터 조정" },
      ip: "10.0.0.5",
      offset: -86400000 * 2,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "matching.executed",
      targetType: "matching",
      targetId: "match_1",
      details: { mode: "single", score: "0.87" },
      ip: "10.0.0.5",
      offset: -86400000 * 2,
    },
    {
      actorId: "u3",
      actorName: "Lee Content",
      action: "content.created",
      targetType: "content",
      targetId: "c1",
      details: { title: "트렌드 리포트 2024" },
      ip: "10.0.0.10",
      offset: -86400000,
    },
    {
      actorId: "u3",
      actorName: "Lee Content",
      action: "content.published",
      targetType: "content",
      targetId: "c1",
      details: { title: "트렌드 리포트 2024" },
      ip: "10.0.0.10",
      offset: -86400000,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "settings.updated",
      targetType: "settings",
      targetId: "global",
      details: { key: "matching.threshold", oldValue: "0.5", newValue: "0.6" },
      ip: "192.168.1.1",
      offset: -43200000,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "persona.published",
      targetType: "persona",
      targetId: "p1",
      details: { name: "심층 분석가" },
      ip: "10.0.0.5",
      offset: -3600000,
    },
    {
      actorId: "u1",
      actorName: "Admin",
      action: "user.role_changed",
      targetType: "user",
      targetId: "u3",
      details: { from: "content_manager", to: "analyst" },
      ip: "192.168.1.1",
      offset: -1800000,
    },
    {
      actorId: "u2",
      actorName: "Kim Engineer",
      action: "matching.configured",
      targetType: "matching",
      targetId: "config_1",
      details: { parameter: "diversity_weight", value: "0.3" },
      ip: "10.0.0.5",
      offset: -600000,
    },
  ]

  for (const entry of entries) {
    const entryLog = recordAuditEntry(log, {
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      details: entry.details,
      ip: entry.ip,
    })
    // Override timestamp for demo
    const lastEntry = entryLog.entries[entryLog.entries.length - 1]
    lastEntry.timestamp = now + entry.offset
    log = entryLog
  }

  return log
}

// ── Unique action types for filter dropdown ─────────────────────
const FILTER_ACTION_TYPES: AuditAction[] = [
  "user.invited",
  "user.deactivated",
  "user.role_changed",
  "persona.created",
  "persona.updated",
  "persona.published",
  "matching.executed",
  "matching.configured",
  "content.created",
  "content.published",
  "settings.updated",
]

export default function AuditLogsPage() {
  const [auditLog] = useState<AuditLog>(() => initializeAuditLog())

  // ── Filter state ────────────────────────────────────────────
  const [filterActor, setFilterActor] = useState("")
  const [filterAction, setFilterAction] = useState<AuditAction | "">("")
  const [filterTargetType, setFilterTargetType] = useState<AuditTargetType | "">("")
  const [filterKeyword, setFilterKeyword] = useState("")

  // ── Expand state ────────────────────────────────────────────
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // ── Unique actors from log ──────────────────────────────────
  const uniqueActors = useMemo(() => {
    const actorMap = new Map<string, string>()
    for (const entry of auditLog.entries) {
      actorMap.set(entry.actorId, entry.actorName)
    }
    return Array.from(actorMap.entries()).map(([id, name]) => ({ id, name }))
  }, [auditLog])

  // ── Search filter ───────────────────────────────────────────
  const searchFilter = useMemo(
    (): AuditLogFilter => ({
      dateRange: null,
      actors: filterActor ? [filterActor] : null,
      actions: filterAction ? [filterAction] : null,
      targetTypes: filterTargetType ? [filterTargetType] : null,
      keyword: filterKeyword || null,
      limit: 100,
      offset: 0,
    }),
    [filterActor, filterAction, filterTargetType, filterKeyword]
  )

  // ── Filtered results ────────────────────────────────────────
  const filteredLog = useMemo(() => {
    return searchAuditLog(auditLog, searchFilter)
  }, [auditLog, searchFilter])

  // ── Summary stats ───────────────────────────────────────────
  const summary = useMemo((): AuditSummary => {
    return getAuditSummary(auditLog)
  }, [auditLog])

  // ── CSV export ──────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const csv = exportAuditLog(auditLog, searchFilter)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [auditLog, searchFilter])

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
                placeholder="키워드 검색..."
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
              {FILTER_ACTION_TYPES.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action] ?? action}
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
          <p className="text-muted-foreground mt-2 text-xs">{filteredLog.totalCount}건 검색됨</p>
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
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                    결과
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.entries.map((entry) => {
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
                      <td className="px-4 py-3">
                        <Badge variant="success">성공</Badge>
                      </td>
                    </tr>
                  )
                })}
                {filteredLog.entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center text-sm">
                      조건에 맞는 로그가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Expanded detail rows */}
          {filteredLog.entries.map((entry) => {
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
        </div>
      </div>
    </>
  )
}
