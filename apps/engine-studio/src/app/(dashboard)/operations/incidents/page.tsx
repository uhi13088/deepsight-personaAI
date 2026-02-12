"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  AlertTriangle,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
  BarChart3,
} from "lucide-react"
import { INCIDENT_SEVERITY_DEFINITIONS } from "@/lib/operations"
import type { Incident, IncidentSeverity, IncidentPhase, PostMortem } from "@/lib/operations"

// ── Severity badge mapping ─────────────────────────────────────

const SEVERITY_BADGE: Record<
  IncidentSeverity,
  { variant: "destructive" | "warning" | "info" | "muted"; label: string }
> = {
  P0: { variant: "destructive", label: "P0 Critical" },
  P1: { variant: "warning", label: "P1 High" },
  P2: { variant: "info", label: "P2 Medium" },
  P3: { variant: "muted", label: "P3 Low" },
}

const PHASE_ORDER: IncidentPhase[] = [
  "detected",
  "triaged",
  "investigating",
  "mitigating",
  "resolved",
]

const PHASE_LABELS: Record<IncidentPhase, string> = {
  detected: "탐지됨",
  triaged: "분류됨",
  investigating: "조사 중",
  mitigating: "완화 중",
  resolved: "해결됨",
  postmortem: "사후분석",
}

// ── API response type ──────────────────────────────────────────

interface IncidentData {
  incidents: Incident[]
  postMortems: PostMortem[]
  stats: {
    totalIncidents: number
    mttrMinutes: number
    incidentsBySeverity: Record<IncidentSeverity, number>
  }
}

export default function IncidentsPage() {
  // ── State ────────────────────────────────────────────────────
  const [data, setData] = useState<IncidentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedIncident, setExpandedIncident] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPostMortemForm, setShowPostMortemForm] = useState<string | null>(null)

  // Create form state
  const [newTitle, setNewTitle] = useState("")
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>("P2")
  const [newServices, setNewServices] = useState("")

  // Post-mortem form state
  const [pmRootCause, setPmRootCause] = useState("")
  const [pmAffectedUsers, setPmAffectedUsers] = useState(0)
  const [pmDowntime, setPmDowntime] = useState(0)

  // ── Fetch data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/operations/incidents")
      const json = (await res.json()) as {
        success: boolean
        data?: IncidentData
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Derived data ─────────────────────────────────────────────

  const activeIncidents = useMemo(
    () =>
      data ? data.incidents.filter((i) => i.phase !== "resolved" && i.phase !== "postmortem") : [],
    [data]
  )

  const incidentsBySeverity = useMemo(() => {
    if (!data) return { P0: 0, P1: 0, P2: 0, P3: 0 }
    return data.stats.incidentsBySeverity
  }, [data])

  const mttr = useMemo(() => {
    if (!data) return 0
    return data.stats.mttrMinutes
  }, [data])

  // ── Handlers ─────────────────────────────────────────────────

  const handleCreateIncident = useCallback(async () => {
    if (!newTitle.trim()) return
    const services = newServices
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const res = await fetch("/api/internal/operations/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_incident",
          title: newTitle,
          severity: newSeverity,
          affectedServices: services,
        }),
      })
      const json = (await res.json()) as { success: boolean }
      if (json.success) {
        setNewTitle("")
        setNewSeverity("P2")
        setNewServices("")
        setShowCreateForm(false)
        await fetchData()
      }
    } catch {
      // silent fail
    }
  }, [newTitle, newSeverity, newServices, fetchData])

  const handleAdvancePhase = useCallback(
    async (incidentId: string) => {
      if (!data) return
      const incident = data.incidents.find((i) => i.id === incidentId)
      if (!incident) return

      const currentIdx = PHASE_ORDER.indexOf(incident.phase)
      const nextPhase = PHASE_ORDER[currentIdx + 1]
      if (!nextPhase) return

      try {
        const res = await fetch("/api/internal/operations/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "advance_phase",
            incidentId,
            nextPhase,
            actor: incident.commander ?? "operator",
            description: `${PHASE_LABELS[nextPhase]} 단계로 전환`,
          }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) {
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [data, fetchData]
  )

  const handleCreatePostMortem = useCallback(
    async (incidentId: string) => {
      if (!pmRootCause.trim()) return

      try {
        const res = await fetch("/api/internal/operations/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_postmortem",
            incidentId,
            rootCause: pmRootCause,
            affectedUsers: pmAffectedUsers,
            downtimeMinutes: pmDowntime,
          }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) {
          setPmRootCause("")
          setPmAffectedUsers(0)
          setPmDowntime(0)
          setShowPostMortemForm(null)
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [pmRootCause, pmAffectedUsers, pmDowntime, fetchData]
  )

  // ── Loading state ───────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header title="Incident Management" description="장애 탐지, 대응, 사후 분석" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  // ── Error state ─────────────────────────────────────────────

  if (error) {
    return (
      <>
        <Header title="Incident Management" description="장애 탐지, 대응, 사후 분석" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  if (!data) return null

  return (
    <>
      <Header title="Incident Management" description="장애 탐지, 대응, 사후 분석" />

      <div className="space-y-6 p-6">
        {/* ── Stats Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2">
              <Shield className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">활성 장애</span>
            </div>
            <p className="text-2xl font-bold">{activeIncidents.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">평균 복구시간 (MTTR)</span>
            </div>
            <p className="text-2xl font-bold">
              {mttr}
              <span className="text-muted-foreground ml-1 text-sm font-normal">분</span>
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2">
              <BarChart3 className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">전체 장애</span>
            </div>
            <p className="text-2xl font-bold">{data.incidents.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2">
              <FileText className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">Post-Mortem</span>
            </div>
            <p className="text-2xl font-bold">{data.postMortems.length}</p>
          </div>
        </div>

        {/* ── Severity Distribution ─────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">등급별 장애 분포</h3>
          <div className="flex gap-4">
            {INCIDENT_SEVERITY_DEFINITIONS.map((def) => (
              <div key={def.level} className="flex items-center gap-2">
                <Badge variant={SEVERITY_BADGE[def.level].variant}>{def.level}</Badge>
                <span className="text-sm font-medium">{incidentsBySeverity[def.level]}</span>
                <span className="text-muted-foreground text-xs">
                  {def.label} ({def.responseTimeMinutes}분 이내 대응)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Create Incident Button/Form ───────────────────── */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">장애 목록</h3>
          <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            장애 생성
          </Button>
        </div>

        {showCreateForm && (
          <div className="bg-card rounded-lg border p-4">
            <h4 className="mb-3 text-sm font-medium">새 장애 생성</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                placeholder="장애 제목"
                className="border-border bg-background rounded-md border px-3 py-1.5 text-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <select
                className="border-border bg-background rounded-md border px-3 py-1.5 text-sm"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
              >
                {INCIDENT_SEVERITY_DEFINITIONS.map((def) => (
                  <option key={def.level} value={def.level}>
                    {def.level} - {def.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="영향 서비스 (쉼표 구분)"
                className="border-border bg-background rounded-md border px-3 py-1.5 text-sm"
                value={newServices}
                onChange={(e) => setNewServices(e.target.value)}
              />
              <Button onClick={handleCreateIncident}>생성</Button>
            </div>
          </div>
        )}

        {/* ── Incident List ─────────────────────────────────── */}
        <div className="space-y-3">
          {data.incidents.map((incident) => {
            const isExpanded = expandedIncident === incident.id
            const currentPhaseIdx = PHASE_ORDER.indexOf(incident.phase)
            const canAdvance = currentPhaseIdx < PHASE_ORDER.length - 1
            const isResolved = incident.phase === "resolved" || incident.phase === "postmortem"
            const hasPM = data.postMortems.some((pm) => pm.incidentId === incident.id)

            return (
              <div key={incident.id} className="bg-card rounded-lg border">
                {/* Header row */}
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={SEVERITY_BADGE[incident.severity].variant}>
                      {incident.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{incident.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {incident.id} | {incident.affectedServices.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={isResolved ? "success" : "warning"}>
                      {PHASE_LABELS[incident.phase]}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Detail panel */}
                {isExpanded && (
                  <div className="border-border space-y-4 border-t px-4 py-3">
                    {/* Timeline */}
                    <div>
                      <h4 className="mb-2 text-xs font-medium">타임라인</h4>

                      {/* Phase workflow indicator */}
                      <div className="mb-3 flex items-center gap-1">
                        {PHASE_ORDER.map((phase, idx) => {
                          const isActive = idx <= currentPhaseIdx
                          return (
                            <div key={phase} className="flex items-center gap-1">
                              <div
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  isActive
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {PHASE_LABELS[phase]}
                              </div>
                              {idx < PHASE_ORDER.length - 1 && (
                                <div
                                  className={`h-px w-4 ${isActive ? "bg-primary" : "bg-border"}`}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Timeline entries */}
                      <div className="space-y-1.5">
                        {incident.timeline.map((entry, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-xs">
                            <span className="text-muted-foreground w-16 shrink-0 font-mono">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                            <Badge variant="muted">{PHASE_LABELS[entry.phase]}</Badge>
                            <span className="text-muted-foreground">{entry.actor}</span>
                            <span className="flex-1">{entry.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">담당자</span>
                        <p className="font-medium">{incident.commander ?? "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">탐지 시각</span>
                        <p className="font-medium">
                          {new Date(incident.detectedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">근본 원인</span>
                        <p className="font-medium">{incident.rootCause ?? "분석 중"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">완화 조치</span>
                        <p className="font-medium">{incident.mitigation ?? "-"}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {canAdvance && (
                        <Button size="sm" onClick={() => handleAdvancePhase(incident.id)}>
                          <Play className="mr-1 h-3 w-3" />
                          다음 단계 ({PHASE_LABELS[PHASE_ORDER[currentPhaseIdx + 1]]})
                        </Button>
                      )}
                      {isResolved && !hasPM && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setShowPostMortemForm(
                              showPostMortemForm === incident.id ? null : incident.id
                            )
                          }
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Post-Mortem 작성
                        </Button>
                      )}
                      {hasPM && <Badge variant="success">Post-Mortem 완료</Badge>}
                    </div>

                    {/* Post-Mortem Form */}
                    {showPostMortemForm === incident.id && (
                      <div className="rounded-md border p-3">
                        <h4 className="mb-2 text-xs font-medium">Post-Mortem 작성</h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            placeholder="근본 원인"
                            className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
                            value={pmRootCause}
                            onChange={(e) => setPmRootCause(e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="영향 사용자 수"
                            className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
                            value={pmAffectedUsers}
                            onChange={(e) => setPmAffectedUsers(Number(e.target.value))}
                          />
                          <input
                            type="number"
                            placeholder="다운타임 (분)"
                            className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
                            value={pmDowntime}
                            onChange={(e) => setPmDowntime(Number(e.target.value))}
                          />
                          <Button size="sm" onClick={() => handleCreatePostMortem(incident.id)}>
                            Post-Mortem 생성
                          </Button>
                        </div>
                      </div>
                    )}
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
