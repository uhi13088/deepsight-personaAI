"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Snowflake, Power, RefreshCw, AlertTriangle } from "lucide-react"

interface FeatureToggle {
  key: string
  enabled: boolean
  disabledReason?: string
  disabledAt?: number
  disabledBy?: string
}

interface SafetyConfig {
  emergencyFreeze: boolean
  freezeReason?: string
  freezeAt?: number
  featureToggles: Record<string, FeatureToggle>
  autoTriggers: Record<string, unknown>
  updatedAt: number
  updatedBy: string
}

const FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  diffusion: { label: "Diffusion", description: "기억/감정 확산 시스템" },
  reflection: { label: "Reflection", description: "페르소나 자기 성찰" },
  emotionalContagion: { label: "Emotional Contagion", description: "감정 전파 시스템" },
  arena: { label: "Arena", description: "페르소나 대전 테스트" },
  evolution: { label: "Evolution", description: "자가 발전 시스템" },
  autonomousPosting: { label: "Autonomous Posting", description: "자율 포스팅" },
}

export default function KillSwitchPage() {
  const [config, setConfig] = useState<SafetyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/safety-config")
      const json = (await res.json()) as {
        success: boolean
        data?: SafetyConfig
        error?: { message: string }
      }
      if (json.success && json.data) {
        setConfig(json.data)
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
    void fetchConfig()
  }, [fetchConfig])

  async function handleFreeze() {
    if (!confirm("정말 긴급 동결을 활성화하시겠습니까? 모든 페르소나 활동이 중단됩니다.")) return
    setActionLoading(true)
    try {
      await fetch("/api/internal/safety-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "freeze",
          reason: "Manual emergency freeze from admin dashboard",
          updatedBy: "admin",
        }),
      })
      void fetchConfig()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnfreeze() {
    setActionLoading(true)
    try {
      await fetch("/api/internal/safety-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unfreeze", updatedBy: "admin" }),
      })
      void fetchConfig()
    } finally {
      setActionLoading(false)
    }
  }

  async function toggleFeature(feature: string, enable: boolean) {
    setActionLoading(true)
    try {
      await fetch("/api/internal/safety-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: enable ? "enableFeature" : "disableFeature",
          feature,
          reason: enable ? undefined : `Disabled from admin dashboard`,
          updatedBy: "admin",
        }),
      })
      void fetchConfig()
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Kill Switch" description="시스템 안전 제어판" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      </>
    )
  }

  if (error || !config) {
    return (
      <>
        <Header title="Kill Switch" description="시스템 안전 제어판" />
        <div className="space-y-6 p-6">
          <div className="text-destructive">{error ?? "No data"}</div>
        </div>
      </>
    )
  }

  const toggles = Object.entries(config.featureToggles)

  return (
    <>
      <Header title="Kill Switch" description="시스템 안전 제어판 — 기능별 토글 + 긴급 동결" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={() => void fetchConfig()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Emergency Freeze */}
        <div
          className={`rounded-lg border p-6 ${
            config.emergencyFreeze
              ? "border-blue-500/50 bg-blue-500/5"
              : "border-green-500/50 bg-green-500/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.emergencyFreeze ? (
                <Snowflake className="h-8 w-8 text-blue-500" />
              ) : (
                <Power className="h-8 w-8 text-green-500" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {config.emergencyFreeze ? "Emergency Freeze Active" : "System Normal"}
                </h2>
                {config.emergencyFreeze && config.freezeReason && (
                  <p className="text-muted-foreground text-sm">사유: {config.freezeReason}</p>
                )}
                {config.emergencyFreeze && config.freezeAt && (
                  <p className="text-muted-foreground text-xs">
                    동결 시각: {new Date(config.freezeAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {config.emergencyFreeze ? (
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => void handleUnfreeze()}
              >
                동결 해제
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={() => void handleFreeze()}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                긴급 동결
              </Button>
            )}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-lg font-semibold">기능별 토글</h3>
          <div className="space-y-3">
            {toggles.map(([key, toggle]) => {
              const meta = FEATURE_LABELS[key] ?? { label: key, description: "" }
              const featureToggle = toggle as FeatureToggle
              return (
                <div key={key} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{meta.label}</span>
                      <Badge variant={featureToggle.enabled ? "secondary" : "destructive"}>
                        {featureToggle.enabled ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{meta.description}</p>
                    {!featureToggle.enabled && featureToggle.disabledReason && (
                      <p className="mt-1 text-xs text-red-500">
                        사유: {featureToggle.disabledReason}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={featureToggle.enabled ? "outline" : "default"}
                    disabled={actionLoading || config.emergencyFreeze}
                    onClick={() => void toggleFeature(key, !featureToggle.enabled)}
                  >
                    {featureToggle.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              )
            })}
          </div>
          {config.emergencyFreeze && (
            <p className="text-muted-foreground mt-3 text-xs">
              * 긴급 동결 상태에서는 개별 토글을 변경할 수 없습니다
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="text-muted-foreground text-xs">
          마지막 업데이트: {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy}
        </div>
      </div>
    </>
  )
}
