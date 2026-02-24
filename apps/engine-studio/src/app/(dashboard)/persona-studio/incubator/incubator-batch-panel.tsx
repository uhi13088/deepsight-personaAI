"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Play, Settings, Save, X, Power, Inbox, Timer } from "lucide-react"
import type { IncubatorDashboard } from "@/lib/incubator/dashboard"

// ── Types ────────────────────────────────────────────────────

export interface IncubatorSettings {
  generationCostKRW: number
  testCostKRW: number
  monthlyBudgetKRW: number
  dailyLimit: number
  passThreshold: number
  strategyWeights: { userDriven: number; exploration: number; gapFilling: number }
}

export const INTERVAL_OPTIONS = [
  { label: "5분", value: 5 * 60 * 1000 },
  { label: "15분", value: 15 * 60 * 1000 },
  { label: "30분", value: 30 * 60 * 1000 },
  { label: "1시간", value: 60 * 60 * 1000 },
]

// ── Helpers ──────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

// ── 운영 상태 히어로 ──────────────────────────────────────────

export function OperationStatus({
  data,
  autoRun,
  autoInterval,
  countdown,
  batchTriggering,
  batchMessage,
  batchResults,
  onToggleAutoRun,
  onChangeInterval,
  onTriggerBatch,
  onOpenSettings,
}: {
  data: IncubatorDashboard
  autoRun: boolean
  autoInterval: number
  countdown: number
  batchTriggering: boolean
  batchMessage: string | null
  batchResults: Array<{ name: string; status: string; failReason: string | null }> | null
  onToggleAutoRun: () => void
  onChangeInterval: (ms: number) => void
  onTriggerBatch: () => void
  onOpenSettings: () => void
}) {
  const isRunning = batchTriggering
  const statusColor = isRunning ? "bg-blue-500" : autoRun ? "bg-emerald-500" : "bg-gray-400"
  const statusLabel = isRunning ? "배치 실행 중" : autoRun ? "자동 실행 중" : "대기 중 (수동)"

  return (
    <div className="border-border bg-muted/50 rounded-xl border-2 border-dashed p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 왼쪽: 상태 + 지표 */}
        <div className="flex items-center gap-6">
          {/* 상태 표시 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`h-4 w-4 rounded-full ${statusColor}`} />
              {(isRunning || autoRun) && (
                <div
                  className={`absolute inset-0 h-4 w-4 animate-ping rounded-full ${statusColor} opacity-50`}
                />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">{statusLabel}</p>
              {data.lastBatchAt && (
                <p className="text-muted-foreground text-[10px]">
                  마지막 실행: {new Date(data.lastBatchAt).toLocaleString("ko-KR")}
                </p>
              )}
            </div>
          </div>

          {/* 진행도 */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-center">
              <p className="text-muted-foreground text-[10px]">오늘 생성</p>
              <p className="text-lg font-bold">
                {data.todayGenerated}
                <span className="text-muted-foreground text-xs font-normal">
                  /{data.dailyLimit}
                </span>
              </p>
            </div>
            <div className="bg-border h-8 w-px" />
            <div className="text-center">
              <p className="text-muted-foreground text-[10px]">대기 요청</p>
              <p className="text-lg font-bold">
                {data.pendingRequestCount > 0 ? (
                  <span className="text-amber-500">{data.pendingRequestCount}</span>
                ) : (
                  <span>0</span>
                )}
              </p>
            </div>
            {autoRun && countdown > 0 && !isRunning && (
              <>
                <div className="bg-border h-8 w-px" />
                <div className="text-center">
                  <p className="text-muted-foreground text-[10px]">다음 실행</p>
                  <p className="font-mono text-lg font-bold text-blue-500">
                    {formatCountdown(countdown)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 오른쪽: 컨트롤 */}
        <div className="flex items-center gap-3">
          {/* 자동 실행 토글 */}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Power
              className={`h-4 w-4 ${autoRun ? "text-emerald-500" : "text-muted-foreground"}`}
            />
            <button
              onClick={onToggleAutoRun}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                autoRun ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  autoRun ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <select
              value={autoInterval}
              onChange={(e) => onChangeInterval(Number(e.target.value))}
              className="border-border bg-background rounded-md border px-1.5 py-0.5 text-xs"
              disabled={!autoRun}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 수동 실행 */}
          <Button size="sm" onClick={onTriggerBatch} disabled={batchTriggering}>
            <Play className="mr-1 h-3.5 w-3.5" />
            {batchTriggering ? "생성 중..." : "배치 실행"}
          </Button>

          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="mr-1 h-3.5 w-3.5" />
            설정
          </Button>
        </div>
      </div>

      {/* 실행 중 메시지 */}
      {batchTriggering && (
        <div className="mt-3 flex items-center gap-2 text-sm text-blue-500">
          <Timer className="h-4 w-4 animate-spin" />
          페르소나 배치 생성 중 (LLM 호출 포함, 수 분 소요)...
        </div>
      )}
      {batchMessage && !batchTriggering && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle className="h-4 w-4" />
          {batchMessage}
        </div>
      )}

      {/* 개별 결과 (불합격 사유 포함) */}
      {batchResults && batchResults.length > 0 && !batchTriggering && (
        <div className="mt-3 space-y-1.5">
          {batchResults.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                r.status === "PASSED"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <span className="font-medium">{r.name}</span>
              <span className="text-[10px] opacity-70">—</span>
              <Badge
                variant={r.status === "PASSED" ? "success" : "destructive"}
                className="text-[10px]"
              >
                {r.status === "PASSED" ? "PASSED ✓" : "FAILED ✗"}
              </Badge>
              {r.failReason && (
                <span className="text-muted-foreground ml-1 text-[10px]">{r.failReason}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 대기 요청 안내 */}
      {data.pendingRequestCount > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <Inbox className="h-4 w-4 shrink-0" />
          사용자 페르소나 생성 요청 {data.pendingRequestCount}건 대기 중 — 다음 배치에서 처리됩니다
        </div>
      )}
    </div>
  )
}

// ── 설정 패널 ──────────────────────────────────────────────────

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<IncubatorSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/internal/incubator/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_settings" }),
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: IncubatorSettings }) => {
        if (json.success && json.data) {
          setSettings(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      await fetch("/api/internal/incubator/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", settings }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="bg-card text-muted-foreground rounded-lg border p-4 text-sm">
        설정을 불러오는 중...
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">인큐베이터 설정</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingField
          label="생성 비용 (KRW/개)"
          value={settings.generationCostKRW}
          onChange={(v) => setSettings({ ...settings, generationCostKRW: v })}
        />
        <SettingField
          label="테스트 비용 (KRW/개)"
          value={settings.testCostKRW}
          onChange={(v) => setSettings({ ...settings, testCostKRW: v })}
        />
        <SettingField
          label="월 예산 (KRW)"
          value={settings.monthlyBudgetKRW}
          onChange={(v) => setSettings({ ...settings, monthlyBudgetKRW: v })}
        />
        <SettingField
          label="일일 생성 한도"
          value={settings.dailyLimit}
          onChange={(v) => setSettings({ ...settings, dailyLimit: v })}
        />
        <SettingField
          label="합격 임계값"
          value={settings.passThreshold}
          onChange={(v) => setSettings({ ...settings, passThreshold: v })}
          step={0.05}
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium">전략 가중치</p>
        <div className="grid grid-cols-3 gap-3">
          <SettingField
            label="유저 기반"
            value={settings.strategyWeights.userDriven}
            onChange={(v) =>
              setSettings({
                ...settings,
                strategyWeights: { ...settings.strategyWeights, userDriven: v },
              })
            }
            step={0.05}
          />
          <SettingField
            label="탐험"
            value={settings.strategyWeights.exploration}
            onChange={(v) =>
              setSettings({
                ...settings,
                strategyWeights: { ...settings.strategyWeights, exploration: v },
              })
            }
            step={0.05}
          />
          <SettingField
            label="GAP 충전"
            value={settings.strategyWeights.gapFilling}
            onChange={(v) =>
              setSettings({
                ...settings,
                strategyWeights: { ...settings.strategyWeights, gapFilling: v },
              })
            }
            step={0.05}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? "저장 중..." : "저장"}
        </Button>
        {saved && <span className="text-xs text-emerald-500">저장 완료</span>}
      </div>
    </div>
  )
}

function SettingField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-[11px]">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border-border bg-background w-full rounded-md border px-2 py-1 text-sm"
      />
    </div>
  )
}
