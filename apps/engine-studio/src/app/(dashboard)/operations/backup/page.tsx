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
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react"
import type {
  BackupPolicy,
  BackupRecord,
  DRPlan,
  DRDrill,
  CapacityReport,
  BackupMethod,
} from "@/lib/operations"

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
  capacityReport: CapacityReport
}

export default function BackupPage() {
  // ── State ────────────────────────────────────────────────────
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // ── Handlers ─────────────────────────────────────────────────

  const handleCreateBackup = useCallback(
    async (policy: BackupPolicy) => {
      try {
        const res = await fetch("/api/internal/operations/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_backup", policyId: policy.id }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) {
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [fetchData]
  )

  const handleScheduleDrill = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/operations/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule_drill" }),
      })
      const json = (await res.json()) as { success: boolean }
      if (json.success) {
        await fetchData()
      }
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
        if (json.success) {
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [fetchData]
  )

  const handleCompleteDrill = useCallback(
    async (drillId: string) => {
      try {
        const res = await fetch("/api/internal/operations/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete_drill", drillId }),
        })
        const json = (await res.json()) as { success: boolean }
        if (json.success) {
          await fetchData()
        }
      } catch {
        // silent fail
      }
    },
    [fetchData]
  )

  // ── Loading state ───────────────────────────────────────────

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

  // ── Error state ─────────────────────────────────────────────

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
        {/* ── Backup Policy Cards ───────────────────────────── */}
        <div>
          <h3 className="mb-3 text-sm font-medium">백업 정책</h3>
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

                  <div className="mb-3 space-y-1 text-xs">
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
                      <span className="text-muted-foreground">압축</span>
                      <span>{policy.compressionEnabled ? "활성" : "비활성"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">마지막 백업</span>
                      <span>
                        {lastRecord ? new Date(lastRecord.startedAt).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCreateBackup(policy)}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    백업 실행
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Backup History Table ──────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-medium">백업 이력</h3>
              <Badge variant="muted">{data.records.length}건</Badge>
            </div>
          </div>

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
                        {record.status === "verifying" && <Badge variant="warning">검증중</Badge>}
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
              <span className="text-muted-foreground">RTO</span>
              <p className="font-medium">{data.drPlan.rtoMinutes}분</p>
            </div>
            <div>
              <span className="text-muted-foreground">RPO</span>
              <p className="font-medium">{data.drPlan.rpoMinutes}분</p>
            </div>
          </div>

          {/* DR Plan Steps */}
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

          {/* DR Contacts */}
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

          {/* DR Drills */}
          {data.drDrills.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium">DR 훈련 이력</h4>
              <div className="space-y-2">
                {data.drDrills.map((drill) => {
                  const evaluation = data.drillEvaluations.find((e) => e.drillId === drill.id)
                  return (
                    <div
                      key={drill.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                    >
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
                            variant={evaluation.evaluation.overallPass ? "success" : "destructive"}
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
                        {drill.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteDrill(drill.id)}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            완료
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Capacity Report ───────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-medium">용량 리포트</h3>
            <Badge variant="muted">
              헬스 스코어: {data.capacityReport.summary.overallHealthScore}/100
            </Badge>
          </div>

          {/* Health + Summary */}
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground text-xs">전체 헬스 스코어</p>
              <p
                className={`text-3xl font-bold ${
                  data.capacityReport.summary.overallHealthScore >= 80
                    ? "text-emerald-400"
                    : data.capacityReport.summary.overallHealthScore >= 60
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {data.capacityReport.summary.overallHealthScore}
              </p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground text-xs">예상 절감률</p>
              <p className="text-3xl font-bold text-blue-400">
                {data.capacityReport.summary.estimatedTotalSavingsPercent}%
              </p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-muted-foreground text-xs">위험 리소스</p>
              <p className="text-3xl font-bold">
                {data.capacityReport.summary.criticalResources.length}
              </p>
            </div>
          </div>

          {/* Forecasts */}
          {data.capacityReport.forecasts.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium">리소스 예측</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.capacityReport.forecasts.map((forecast) => (
                  <div key={forecast.metricType} className="rounded-md border px-3 py-2 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">{forecast.metricType}</span>
                      <Badge
                        variant={
                          forecast.trend === "increasing"
                            ? "warning"
                            : forecast.trend === "decreasing"
                              ? "success"
                              : "muted"
                        }
                      >
                        {forecast.trend === "increasing"
                          ? "증가"
                          : forecast.trend === "decreasing"
                            ? "감소"
                            : "안정"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">현재</span>
                      <span>{forecast.currentUsagePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">예측 (90일)</span>
                      <span>{forecast.projectedUsagePercent}%</span>
                    </div>
                    {forecast.daysUntilThreshold !== null && (
                      <div className="mt-1 flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{forecast.daysUntilThreshold}일 후 임계값 도달</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Optimizations */}
          {data.capacityReport.optimizations.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium">비용 최적화 권고</h4>
              <div className="space-y-2">
                {data.capacityReport.optimizations.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
                      <div>
                        <p className="font-medium">{opt.title}</p>
                        <p className="text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">-{opt.estimatedSavingsPercent}%</Badge>
                      <Badge
                        variant={
                          opt.effort === "low"
                            ? "success"
                            : opt.effort === "medium"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        노력: {opt.effort}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scaling Recommendations */}
          {data.capacityReport.scalingRecommendations.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium">스케일링 권고</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.capacityReport.scalingRecommendations.map((rec) => (
                  <div key={rec.metricType} className="rounded-md border px-3 py-2 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">{rec.metricType}</span>
                      <Badge
                        variant={
                          rec.direction === "scale_up"
                            ? "warning"
                            : rec.direction === "scale_down"
                              ? "info"
                              : "muted"
                        }
                      >
                        {rec.direction === "scale_up"
                          ? "확장"
                          : rec.direction === "scale_down"
                            ? "축소"
                            : "유지"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{rec.reason}</p>
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">현재: {rec.currentCapacity}</span>
                      <span>권장: {rec.recommendedCapacity}</span>
                    </div>
                    <Badge
                      variant={
                        rec.urgency === "immediate"
                          ? "destructive"
                          : rec.urgency === "soon"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {rec.urgency === "immediate"
                        ? "즉시"
                        : rec.urgency === "soon"
                          ? "조만간"
                          : "계획적"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
