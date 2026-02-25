"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { DollarSign, Cpu, ArrowRightLeft, Settings2 } from "lucide-react"
import { estimateCost } from "@/lib/global-config"
import type {
  ModelConfig,
  ModelSpec,
  SupportedModel,
  MonthlyBudget,
  CallTypeInfo,
  CallTypeModelOverrides,
} from "@/lib/global-config"

// ── API response shape ───────────────────────────────────────
interface BudgetStatus {
  usagePercent: number
  remainingUsd: number
  exceeded: boolean
  triggeredAlerts: number[]
}

interface ModelConfigData {
  models: ModelSpec[]
  routingRules: ModelConfig["routingRules"]
  defaultModel: SupportedModel
  budget: MonthlyBudget
  budgetStatus: BudgetStatus
  callTypeOverrides: CallTypeModelOverrides
  knownCallTypes: CallTypeInfo[]
}

export default function ModelSettingsPage() {
  const [data, setData] = useState<ModelConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetLimit, setBudgetLimit] = useState<number>(500)

  // ── Fetch data from API ────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/global-config/models")
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setBudgetLimit(json.data.budget.limitUsd)
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

  // ── Model toggle ─────────────────────────────────────────────
  const handleToggleModel = useCallback(async (modelId: SupportedModel) => {
    try {
      const res = await fetch("/api/internal/global-config/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleModel", modelId }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // ── Budget slider ────────────────────────────────────────────
  const handleBudgetChange = useCallback((values: number[]) => {
    const newLimit = values[0]
    setBudgetLimit(newLimit)
  }, [])

  const handleBudgetCommit = useCallback(async (values: number[]) => {
    const newLimit = values[0]
    try {
      const res = await fetch("/api/internal/global-config/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateBudgetLimit", limitUsd: newLimit }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // ── Sync budget from actual LLM usage ──────────────────────────
  const handleSyncBudget = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/global-config/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "syncBudget" }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setBudgetLimit(json.data.budget.limitUsd)
      }
    } catch {
      // silently fail
    }
  }, [])

  // ── CallType model override ─────────────────────────────────
  const handleCallTypeModelChange = useCallback(
    async (callType: string, modelId: SupportedModel | "") => {
      if (!data) return
      const newOverrides = { ...data.callTypeOverrides }
      if (modelId === "") {
        delete newOverrides[callType]
      } else {
        newOverrides[callType] = modelId
      }
      try {
        const res = await fetch("/api/internal/global-config/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "updateCallTypeOverrides", overrides: newOverrides }),
        })
        const json = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        }
      } catch {
        // silently fail
      }
    },
    [data]
  )

  // ── Cost estimation helper ───────────────────────────────────
  const getCostPer1k = useCallback((model: ModelSpec) => {
    return estimateCost(model, 1000, 1000)
  }, [])

  // ── Strategy label mapping ───────────────────────────────────
  const strategyLabel = useCallback((strategy: string) => {
    switch (strategy) {
      case "cost_optimized":
        return "Cost Optimized"
      case "quality_first":
        return "Quality First"
      case "balanced":
        return "Balanced"
      default:
        return strategy
    }
  }, [])

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Model Settings" description="LLM 모델 선택 및 비용 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (error || !data) {
    return (
      <>
        <Header title="Model Settings" description="LLM 모델 선택 및 비용 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error ?? "데이터를 불러올 수 없습니다"}</div>
        </div>
      </>
    )
  }

  const {
    models: config_models,
    routingRules,
    budget,
    budgetStatus,
    callTypeOverrides,
    knownCallTypes,
  } = data
  const enabledModels = config_models.filter((m) => m.enabled)

  const progressPercent = Math.min(budgetStatus.usagePercent, 100)
  const progressColor = budgetStatus.exceeded
    ? "bg-red-500"
    : budgetStatus.usagePercent >= 80
      ? "bg-amber-500"
      : "bg-emerald-500"

  return (
    <>
      <Header title="Model Settings" description="LLM 모델 선택 및 비용 관리" />

      <div className="space-y-6 p-6">
        {/* ── Model Cards Grid ─────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">LLM Models</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {config_models.map((model) => (
              <div
                key={model.id}
                className={`rounded-lg border p-4 transition-colors ${
                  model.enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium">{model.displayName}</h4>
                  <Badge variant={model.enabled ? "success" : "muted"}>
                    {model.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-muted-foreground flex justify-between">
                    <span>Provider</span>
                    <span className="font-medium capitalize">{model.provider}</span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>Input / 1k tokens</span>
                    <span className="font-mono font-medium">
                      ${model.costPer1kInputTokens.toFixed(5)}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>Output / 1k tokens</span>
                    <span className="font-mono font-medium">
                      ${model.costPer1kOutputTokens.toFixed(5)}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>Max Context</span>
                    <span className="font-mono font-medium">
                      {(model.maxContextTokens / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>Capabilities</span>
                    <span className="font-medium">{model.capabilities.join(", ")}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={model.enabled ? "outline" : "default"}
                  className="mt-3 w-full"
                  onClick={() => handleToggleModel(model.id)}
                >
                  {model.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Model Cost Comparison Table ──────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Cost Comparison (per 1k tokens I/O)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">Model</th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Provider
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                    Input Cost
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                    Output Cost
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                    Total (1k I + 1k O)
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {config_models.map((model) => (
                  <tr key={model.id} className="border-border border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{model.displayName}</td>
                    <td className="text-muted-foreground px-3 py-2 capitalize">{model.provider}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      ${model.costPer1kInputTokens.toFixed(5)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      ${model.costPer1kOutputTokens.toFixed(5)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      ${getCostPer1k(model).toFixed(5)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={model.enabled ? "success" : "muted"} className="text-[10px]">
                        {model.enabled ? "ON" : "OFF"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Feature Model Mapping ─────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-1 flex items-center gap-2">
            <Settings2 className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Feature Model Mapping</h3>
          </div>
          <p className="text-muted-foreground mb-4 text-xs">
            기능별로 사용할 LLM 모델을 선택합니다. &quot;Default&quot;는 기본 모델(
            {data.defaultModel})을 사용합니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">Feature</th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Description
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">Model</th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {(knownCallTypes ?? []).map((ct) => {
                  const currentModel = callTypeOverrides?.[ct.callType] ?? ""
                  const resolvedName = currentModel
                    ? (config_models.find((m) => m.id === currentModel)?.displayName ??
                      currentModel)
                    : (config_models.find((m) => m.id === data.defaultModel)?.displayName ??
                      data.defaultModel)
                  return (
                    <tr key={ct.callType} className="border-border border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{ct.displayName}</div>
                        <code className="text-muted-foreground text-[10px]">{ct.callType}</code>
                      </td>
                      <td className="text-muted-foreground px-3 py-2">{ct.description}</td>
                      <td className="px-3 py-2">
                        <select
                          value={currentModel}
                          onChange={(e) =>
                            handleCallTypeModelChange(
                              ct.callType,
                              e.target.value as SupportedModel | ""
                            )
                          }
                          className="bg-background border-border w-full rounded border px-2 py-1.5 text-xs"
                        >
                          <option value="">
                            Default (
                            {config_models.find((m) => m.id === data.defaultModel)?.displayName})
                          </option>
                          {enabledModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.displayName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={currentModel ? "info" : "muted"} className="text-[10px]">
                          {currentModel ? resolvedName : "Default"}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Monthly Budget ──────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="text-muted-foreground h-4 w-4" />
              <h3 className="text-sm font-medium">Monthly Budget</h3>
            </div>
            <Button size="sm" variant="outline" onClick={handleSyncBudget}>
              <DollarSign className="mr-1 h-3.5 w-3.5" />
              비용 동기화
            </Button>
          </div>

          {/* Budget slider */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Budget Limit</span>
              <span className="font-mono font-medium">${budgetLimit.toFixed(0)}</span>
            </div>
            <Slider
              value={[budgetLimit]}
              min={50}
              max={5000}
              step={50}
              onValueChange={handleBudgetChange}
              onValueCommit={handleBudgetCommit}
            />
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>$50</span>
              <span>$5,000</span>
            </div>
          </div>

          {/* Usage dashboard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Current Spend: ${budget.currentSpendUsd.toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                Remaining: ${budgetStatus.remainingUsd.toFixed(2)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${progressColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium">
                {budgetStatus.usagePercent.toFixed(1)}% used
              </span>
              {budgetStatus.exceeded && <Badge variant="destructive">Budget Exceeded</Badge>}
              {!budgetStatus.exceeded && budgetStatus.usagePercent >= 80 && (
                <Badge variant="warning">High Usage</Badge>
              )}
            </div>

            {/* Alert thresholds */}
            {budgetStatus.triggeredAlerts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {budgetStatus.triggeredAlerts.map((percent) => (
                  <Badge key={percent} variant="warning" className="text-[10px]">
                    {percent}% Alert Triggered
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Model Routing Rules ─────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Model Routing Rules</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Task Type
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Primary Model
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Fallback Model
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Strategy
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                    Max Retries
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                    Timeout
                  </th>
                </tr>
              </thead>
              <tbody>
                {routingRules.map((rule) => (
                  <tr key={rule.taskType} className="border-border border-b last:border-0">
                    <td className="px-3 py-2">
                      <Badge variant="info" className="text-[10px]">
                        {rule.taskType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {config_models.find((m) => m.id === rule.primaryModel)?.displayName ??
                        rule.primaryModel}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {rule.fallbackModel
                        ? (config_models.find((m) => m.id === rule.fallbackModel)?.displayName ??
                          rule.fallbackModel)
                        : "None"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          rule.strategy === "quality_first"
                            ? "default"
                            : rule.strategy === "cost_optimized"
                              ? "success"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {strategyLabel(rule.strategy)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{rule.maxRetries}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {(rule.timeoutMs / 1000).toFixed(0)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
