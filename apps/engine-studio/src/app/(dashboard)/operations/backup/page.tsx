"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  HardDrive,
  Shield,
  Clock,
  Play,
  Plus,
  CheckCircle,
  XCircle,
  ExternalLink,
  Database,
} from "lucide-react"
import type { BackupPolicy, BackupRecord, DRPlan, DRDrill, BackupMethod } from "@/lib/operations"

// ── Method labels ──────────────────────────────────────────────

const METHOD_LABELS: Record<
  BackupMethod,
  { label: string; variant: "info" | "warning" | "success" }
> = {
  full: { label: "Full", variant: "info" },
  incremental: { label: "Incremental", variant: "success" },
  differential: { label: "Differential", variant: "warning" },
}

// ── Helpers ────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// ── T186: 실측 용량 현황 타입 ──────────────────────────────────

interface CapacitySnapshot {
  activePersonas: number
  llmCallsLast30d: number
  llmCostLast30d: number
  matchingCountLast30d: number
  measuredAt: number
}

// ── API response type ──────────────────────────────────────────

interface BackupData {
  policies: BackupPolicy[]
  records: BackupRecord[]
  drPlan: DRPlan
  drDrills: DRDrill[]
  drillEvaluations: Array<{
    drillId: string
    evaluation: {
      rtoMet: boolean
      rpoMet: boolean
      overallPass: boolean
      summary: string
    }
  }>
  capacitySnapshot: CapacitySnapshot
}

// ── T185: DR 드릴 완료 입력 폼 상태 ───────────────────────────

interface DrillCompleteForm {
  actualRtoMinutes: string
  actualRpoMinutes: string
  findings: string
  improvements: string
}

const EMPTY_DRILL_FORM: DrillCompleteForm = {
  actualRtoMinutes: "",
  actualRpoMinutes: "",
  findings: "",
  improvements: "",
}

export default function BackupPage() {
  // ── State ────────────────────────────────────────────────────
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // T185: 완료 입력 폼 (drillId → 폼 상태)
  const [drillForms, setDrillForms] = useState<Record<string, DrillCompleteForm>>({})

  // ── Fetch data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/operations/backup")
      const json = (await res.json()) as {
        success: boolean
        data?: BackupData
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

  // ── DR Drill handlers ─────────────────────────────────────────

  const handleScheduleDrill = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/operations/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule_drill" }),
      })
      const json = (await res.json()) as { success: boolean }
      if (json.success) await fetchData()
    } catch {
      // silent fail
    }
  }, [fetchData])

  const handleStartDrill = useCallback(
    async (drillId: string) => {
      try {
        const res = await fetch("/api/internal/operations/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start_drill", drillId }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) await fetchData()
      } catch {
        // silent fail
      }
    },
    [fetchData]
  )

  const openCompleteForm = useCallback((drillId: string) => {
    setDrillForms((prev) => ({ ...prev, [drillId]: EMPTY_DRILL_FORM }))
  }, [])

  const cancelCompleteForm = useCallback((drillId: string) => {
    setDrillForms((prev) => {
      const next = { ...prev }
      delete next[drillId]
      return next
    })
  }, [])

  const handleCompleteDrill = useCallback(
    async (drillId: string) => {
      const form = drillForms[drillId]
      if (!form) return

      const actualRtoMinutes = Number(form.actualRtoMinutes)
      const actualRpoMinutes = Number(form.actualRpoMinutes)
      if (!actualRtoMinutes || !actualRpoMinutes) return

      const findings = form.findings
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
      const improvements = form.improvements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)

      try {
        const res = await fetch("/api/internal/operations/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete_drill",
            drillId,
            actualRtoMinutes,
            actualRpoMinutes,
            findings,
            improvements,
          }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) {
          cancelCompleteForm(drillId)
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [drillForms, cancelCompleteForm, fetchData]
  )

  // ── Loading / Error ──────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header title="Backup & Recovery" description="백업 정책, 재해복구 계획" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Backup & Recovery" description="백업 정책, 재해복구 계획" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  if (!data) return null

  return (
    <>
      <Header title="Backup & Recovery" description="백업 정책, 재해복구 계획" />

      <div className="space-y-6 p-6">
        {/* ── T184: Neon 자동백업 안내 배너 ────────────────── */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-300">
                Neon PostgreSQL이 자동으로 백업을 관리합니다
              </p>
              <p className="mt-1 text-xs text-blue-400/80">
                현재 플랜의 PITR(Point-in-Time Recovery) 정책에 따라 최근 7일 내 임의 시점으로
                복구할 수 있습니다. 아래 백업 정책은 참고용 정보이며, 실제 백업 및 복구는 Neon
                콘솔에서 관리하세요.
              </p>
              <a
                href="https://console.neon.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                Neon 콘솔 열기
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ── T186: 실측 용량 현황 (실 DB 쿼리) ──────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-medium">리소스 현황 (최근 30일 실측)</h3>
            <Badge variant="muted">
              {new Date(data.capacitySnapshot.measuredAt).toLocaleString()} 기준
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground">활성 페르소나</p>
              <p className="mt-1 text-2xl font-bold">{data.capacitySnapshot.activePersonas}</p>
              <p className="text-muted-foreground text-[10px]">개</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground">LLM 호출</p>
              <p className="mt-1 text-2xl font-bold">
                {data.capacitySnapshot.llmCallsLast30d.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-[10px]">회 / 30일</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground">LLM 비용</p>
              <p className="mt-1 text-2xl font-bold">
                ${data.capacitySnapshot.llmCostLast30d.toFixed(2)}
              </p>
              <p className="text-muted-foreground text-[10px]">USD / 30일</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground">매칭 횟수</p>
              <p className="mt-1 text-2xl font-bold">
                {data.capacitySnapshot.matchingCountLast30d.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-[10px]">회 / 30일</p>
            </div>
          </div>
        </div>

        {/* ── T184: 백업 정책 (참고용, 실행 버튼 없음) ────── */}
        <div>
          <h3 className="mb-1 text-sm font-medium">백업 정책 (참고용)</h3>
          <p className="text-muted-foreground mb-3 text-xs">
            실제 백업 실행은 Neon이 자동으로 처리합니다.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.policies.map((policy) => {
              const policyRecords = data.records.filter((r) => r.policyId === policy.id)
              const lastRecord = policyRecords.length > 0 ? policyRecords[0] : null

              return (
                <div key={policy.id} className="bg-card rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm font-medium">{policy.name}</span>
                    </div>
                    <Badge variant={METHOD_LABELS[policy.method].variant}>
                      {METHOD_LABELS[policy.method].label}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">대상</span>
                      <span>{policy.target}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">스케줄</span>
                      <span className="font-mono">{policy.cronSchedule}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">보존 기간</span>
                      <span>{policy.retentionDays}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">암호화</span>
                      <span>{policy.encryptionEnabled ? "활성" : "비활성"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">마지막 기록</span>
                      <span>
                        {lastRecord ? new Date(lastRecord.startedAt).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 백업 이력 ────────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-medium">백업 이력</h3>
            <Badge variant="muted">{data.records.length}건</Badge>
          </div>

          {data.records.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">
              백업 이력이 없습니다. Neon 콘솔에서 백업 상태를 확인하세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-2 py-2 text-left font-medium">상태</th>
                    <th className="text-muted-foreground px-2 py-2 text-left font-medium">방식</th>
                    <th className="text-muted-foreground px-2 py-2 text-left font-medium">대상</th>
                    <th className="text-muted-foreground px-2 py-2 text-left font-medium">크기</th>
                    <th className="text-muted-foreground px-2 py-2 text-left font-medium">
                      시작 시각
                    </th>
                    <th className="text-muted-foreground px-2 py-2 text-left font-medium">
                      소요 시간
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.slice(0, 15).map((record) => {
                    const duration =
                      record.completedAt && record.startedAt
                        ? Math.round((record.completedAt - record.startedAt) / 1000)
                        : null
                    return (
                      <tr key={record.id} className="border-border border-b last:border-0">
                        <td className="px-2 py-1.5">
                          {record.status === "completed" && (
                            <Badge variant="success">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              완료
                            </Badge>
                          )}
                          {record.status === "running" && (
                            <Badge variant="info">
                              <Play className="mr-1 h-3 w-3" />
                              실행중
                            </Badge>
                          )}
                          {record.status === "failed" && (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              실패
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge variant={METHOD_LABELS[record.method].variant}>
                            {METHOD_LABELS[record.method].label}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5">{record.target}</td>
                        <td className="px-2 py-1.5 font-mono">{formatBytes(record.sizeBytes)}</td>
                        <td className="text-muted-foreground px-2 py-1.5">
                          {new Date(record.startedAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5">{duration !== null ? `${duration}s` : "-"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── DR Plan ───────────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-medium">재해복구 (DR) 계획</h3>
            </div>
            <Button size="sm" variant="outline" onClick={handleScheduleDrill}>
              <Plus className="mr-1 h-3 w-3" />
              훈련 예약
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
            <div>
              <span className="text-muted-foreground">계획명</span>
              <p className="font-medium">{data.drPlan.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">시나리오</span>
              <p className="font-medium">{data.drPlan.scenario}</p>
            </div>
            <div>
              <span className="text-muted-foreground">RTO 목표</span>
              <p className="font-medium">{data.drPlan.rtoMinutes}분</p>
            </div>
            <div>
              <span className="text-muted-foreground">RPO 목표</span>
              <p className="font-medium">{data.drPlan.rpoMinutes}분</p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium">복구 단계</h4>
            <div className="space-y-1.5">
              {data.drPlan.steps.map((step) => (
                <div key={step.order} className="flex items-center gap-3 text-xs">
                  <span className="bg-muted flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium">
                    {step.order}
                  </span>
                  <span className="flex-1">{step.description}</span>
                  <span className="text-muted-foreground">{step.responsible}</span>
                  <span className="text-muted-foreground">{step.estimatedMinutes}분</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-xs font-medium">비상 연락처</h4>
            <div className="flex gap-3">
              {data.drPlan.contacts.map((contact) => (
                <div key={contact.email} className="rounded-md border px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{contact.name}</span>
                    {contact.isPrimary && <Badge variant="info">Primary</Badge>}
                  </div>
                  <p className="text-muted-foreground">{contact.role}</p>
                </div>
              ))}
            </div>
          </div>

          {data.drDrills.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium">DR 훈련 이력</h4>
              <div className="space-y-2">
                {data.drDrills.map((drill) => {
                  const evaluation = data.drillEvaluations.find((e) => e.drillId === drill.id)
                  const completeForm = drillForms[drill.id]

                  return (
                    <div key={drill.id} className="rounded-md border px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              drill.status === "completed"
                                ? "success"
                                : drill.status === "in_progress"
                                  ? "warning"
                                  : "muted"
                            }
                          >
                            {drill.status}
                          </Badge>
                          <span>{drill.scenario}</span>
                          {evaluation && (
                            <Badge
                              variant={
                                evaluation.evaluation.overallPass ? "success" : "destructive"
                              }
                            >
                              {evaluation.evaluation.overallPass ? "PASS" : "FAIL"}
                            </Badge>
                          )}
                          {evaluation && (
                            <span className="text-muted-foreground">
                              {evaluation.evaluation.summary}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {drill.status === "scheduled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartDrill(drill.id)}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              시작
                            </Button>
                          )}
                          {drill.status === "in_progress" && !completeForm && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCompleteForm(drill.id)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              완료 입력
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* T185: 완료 입력 폼 (인라인, 실측값만 저장) */}
                      {completeForm && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <p className="text-muted-foreground text-[10px]">
                            실제 측정값을 입력하세요. (자동 생성 없음)
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-muted-foreground mb-1 block text-[10px]">
                                실제 RTO (분) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                className="bg-background w-full rounded border px-2 py-1 text-xs"
                                value={completeForm.actualRtoMinutes}
                                onChange={(e) =>
                                  setDrillForms((prev) => ({
                                    ...prev,
                                    [drill.id]: {
                                      ...prev[drill.id],
                                      actualRtoMinutes: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="예: 28"
                              />
                            </div>
                            <div>
                              <label className="text-muted-foreground mb-1 block text-[10px]">
                                실제 RPO (분) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                className="bg-background w-full rounded border px-2 py-1 text-xs"
                                value={completeForm.actualRpoMinutes}
                                onChange={(e) =>
                                  setDrillForms((prev) => ({
                                    ...prev,
                                    [drill.id]: {
                                      ...prev[drill.id],
                                      actualRpoMinutes: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="예: 4"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-muted-foreground mb-1 block text-[10px]">
                              발견사항 (줄바꿈으로 구분)
                            </label>
                            <textarea
                              rows={2}
                              className="bg-background w-full rounded border px-2 py-1 text-xs"
                              value={completeForm.findings}
                              onChange={(e) =>
                                setDrillForms((prev) => ({
                                  ...prev,
                                  [drill.id]: { ...prev[drill.id], findings: e.target.value },
                                }))
                              }
                              placeholder="예: 페일오버 지연 5분 발생"
                            />
                          </div>
                          <div>
                            <label className="text-muted-foreground mb-1 block text-[10px]">
                              개선 사항 (줄바꿈으로 구분)
                            </label>
                            <textarea
                              rows={2}
                              className="bg-background w-full rounded border px-2 py-1 text-xs"
                              value={completeForm.improvements}
                              onChange={(e) =>
                                setDrillForms((prev) => ({
                                  ...prev,
                                  [drill.id]: { ...prev[drill.id], improvements: e.target.value },
                                }))
                              }
                              placeholder="예: 자동 페일오버 스크립트 개선"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelCompleteForm(drill.id)}
                            >
                              취소
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !completeForm.actualRtoMinutes || !completeForm.actualRpoMinutes
                              }
                              onClick={() => handleCompleteDrill(drill.id)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              저장
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
