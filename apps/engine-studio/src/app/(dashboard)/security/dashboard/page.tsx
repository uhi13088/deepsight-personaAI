"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Snowflake,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
} from "lucide-react"

// ── 타입 ──────────────────────────────────────────────────────

interface SecurityAlert {
  id: string
  layer: string
  severity: "info" | "warning" | "critical"
  title: string
  message: string
  timestamp: number
  personaId: string | null
  autoResolvable: boolean
}

interface SecurityDashboard {
  overallStatus: "healthy" | "warning" | "critical" | "frozen"
  updatedAt: number
  gateGuard: {
    totalChecks: number
    verdictCounts: Record<string, number>
    blockRate: number
    avgProcessingTimeMs: number
  }
  integrity: {
    factbookIntact: boolean
    driftStatus: string
    driftSimilarity: number
    collectiveAnomaly: string
    collectiveAverageMood: number
    alertLevel: string
  }
  outputSentinel: {
    totalChecks: number
    pendingQuarantineCount: number
    totalQuarantineCount: number
  }
  killSwitch: {
    emergencyFreeze: boolean
    freezeReason: string | null
    enabledFeatureCount: number
    totalFeatureCount: number
  }
  provenance: {
    totalEntries: number
    averageTrust: number
    quarantinedCount: number
  }
  alerts: SecurityAlert[]
  summary: string
}

// ── 컴포넌트 ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  healthy: { icon: ShieldCheck, color: "text-green-500", bg: "bg-green-500/10", label: "Healthy" },
  warning: {
    icon: ShieldAlert,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Warning",
  },
  critical: { icon: ShieldX, color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
  frozen: { icon: Snowflake, color: "text-blue-500", bg: "bg-blue-500/10", label: "Frozen" },
} as const

const SEVERITY_BADGE = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
} as const

const LAYER_LABEL: Record<string, string> = {
  gate_guard: "Gate Guard",
  integrity_monitor: "Integrity",
  output_sentinel: "Output",
  kill_switch: "Kill Switch",
}

export default function SecurityDashboardPage() {
  const [data, setData] = useState<SecurityDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/security/dashboard")
      const json = (await res.json()) as {
        success: boolean
        data?: SecurityDashboard
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
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <>
        <Header title="Security Dashboard" description="보안 3계층 통합 모니터링" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="Security Dashboard" description="보안 3계층 통합 모니터링" />
        <div className="space-y-6 p-6">
          <div className="text-destructive">{error ?? "No data"}</div>
        </div>
      </>
    )
  }

  const statusConfig = STATUS_CONFIG[data.overallStatus]
  const StatusIcon = statusConfig.icon

  return (
    <>
      <Header title="Security Dashboard" description="보안 3계층 통합 모니터링" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <div className={`flex items-center gap-4 rounded-lg border p-6 ${statusConfig.bg}`}>
          <StatusIcon className={`h-12 w-12 ${statusConfig.color}`} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{statusConfig.label}</h2>
              {data.killSwitch.emergencyFreeze && (
                <Badge variant="destructive">Emergency Freeze Active</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{data.summary}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Updated: {new Date(data.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Gate Guard */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Gate Guard</span>
              <Shield className="text-muted-foreground h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{data.gateGuard.totalChecks}</div>
            <p className="text-muted-foreground text-xs">
              차단률: {(data.gateGuard.blockRate * 100).toFixed(1)}%
            </p>
          </div>

          {/* Integrity */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Integrity</span>
              <Badge
                variant={data.integrity.alertLevel === "normal" ? "secondary" : "destructive"}
                className="text-xs"
              >
                {data.integrity.alertLevel}
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {data.integrity.factbookIntact ? "Intact" : "Tampered"}
            </div>
            <p className="text-muted-foreground text-xs">
              Drift: {data.integrity.driftStatus} (
              {(data.integrity.driftSimilarity * 100).toFixed(0)}
              %)
            </p>
          </div>

          {/* Output Sentinel */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Output Sentinel</span>
              <Badge
                variant={
                  data.outputSentinel.pendingQuarantineCount > 0 ? "destructive" : "secondary"
                }
                className="text-xs"
              >
                {data.outputSentinel.pendingQuarantineCount} pending
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {data.outputSentinel.totalQuarantineCount}
            </div>
            <p className="text-muted-foreground text-xs">격리 총 건수</p>
          </div>

          {/* Kill Switch */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Kill Switch</span>
              {data.killSwitch.emergencyFreeze ? (
                <Snowflake className="h-4 w-4 text-blue-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="mt-2 text-2xl font-bold">
              {data.killSwitch.enabledFeatureCount}/{data.killSwitch.totalFeatureCount}
            </div>
            <p className="text-muted-foreground text-xs">활성 기능</p>
          </div>
        </div>

        {/* Collective Anomaly (AC3) */}
        {data.integrity.collectiveAnomaly !== "none" && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">집단 이상 감지</span>
              <Badge className="bg-yellow-500/10 text-yellow-600">
                {data.integrity.collectiveAnomaly === "depression" ? "우울 경향" : "과흥분 경향"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              전체 페르소나 평균 mood: {data.integrity.collectiveAverageMood.toFixed(3)} —{" "}
              {data.integrity.collectiveAnomaly === "depression"
                ? "평균 기분이 0.3 이하로 떨어졌습니다"
                : "평균 기분이 0.9 이상으로 올랐습니다"}
            </p>
          </div>
        )}

        {/* Alerts (AC1) */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-lg font-semibold">보안 알림 ({data.alerts.length})</h3>
          {data.alerts.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
              <span>활성 보안 알림이 없습니다</span>
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 rounded-md border p-3">
                  {alert.severity === "critical" ? (
                    <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  ) : alert.severity === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  ) : (
                    <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{alert.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${SEVERITY_BADGE[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {LAYER_LABEL[alert.layer] ?? alert.layer}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
