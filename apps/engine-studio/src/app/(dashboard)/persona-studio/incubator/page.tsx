"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Header } from "@/components/layout/header"
import type { IncubatorDashboard } from "@/lib/incubator/dashboard"

import { OperationStatus, SettingsPanel } from "./incubator-batch-panel"
import { MetricCards, AlertsSection, TrendSection } from "./incubator-progress"
import { StrategyTab, QualityTab, GoldenSamplesTab, LifecycleTab } from "./incubator-results"

type TabKey = "strategy" | "quality" | "goldenSamples" | "lifecycle"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "strategy", label: "생성 전략" },
  { key: "quality", label: "품질 메트릭" },
  { key: "goldenSamples", label: "Golden Samples" },
  { key: "lifecycle", label: "라이프사이클" },
]

const AUTO_RUN_KEY = "incubator-auto-run"
const AUTO_INTERVAL_KEY = "incubator-auto-interval"

export default function IncubatorPage() {
  const [data, setData] = useState<IncubatorDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("strategy")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [batchTriggering, setBatchTriggering] = useState(false)
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<Array<{
    name: string
    status: string
    failReason: string | null
  }> | null>(null)

  // Auto-run state
  const [autoRun, setAutoRun] = useState(false)
  const [autoInterval, setAutoInterval] = useState(15 * 60 * 1000)
  const [countdown, setCountdown] = useState(0)
  const nextRunRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // DB enabled 상태 + localStorage에서 auto-run 설정 복원
  useEffect(() => {
    // DB의 enabled 플래그를 기준으로 초기화 (Cron과 동기화)
    fetch("/api/internal/incubator/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_settings" }),
    })
      .then((r) => r.json())
      .then((d: { success: boolean; data?: { enabled?: boolean } }) => {
        if (d.success && d.data) {
          const dbEnabled = d.data.enabled !== false
          setAutoRun(dbEnabled)
          try {
            localStorage.setItem(AUTO_RUN_KEY, String(dbEnabled))
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        // fallback: localStorage
        try {
          const saved = localStorage.getItem(AUTO_RUN_KEY)
          const savedInterval = localStorage.getItem(AUTO_INTERVAL_KEY)
          if (saved === "true") setAutoRun(true)
          if (savedInterval) setAutoInterval(Number(savedInterval))
        } catch {
          /* ignore */
        }
      })
    try {
      const savedInterval = localStorage.getItem(AUTO_INTERVAL_KEY)
      if (savedInterval) setAutoInterval(Number(savedInterval))
    } catch {
      /* ignore */
    }
  }, [])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch("/api/internal/incubator/dashboard")
      .then((r) => r.json())
      .then(
        (d: {
          success: boolean
          data?: IncubatorDashboard
          error?: { code: string; message: string }
        }) => {
          if (d.success && d.data) {
            setData(d.data)
          } else {
            setError(d.error?.message ?? "인큐베이터 대시보드 로드 실패")
          }
        }
      )
      .catch(() => {
        setError("인큐베이터 대시보드 로드 실패")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const triggerBatch = useCallback(async () => {
    setBatchTriggering(true)
    setBatchMessage(null)
    setBatchResults(null)
    try {
      const res = await fetch("/api/internal/incubator/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_batch" }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: {
          message: string
          generated?: number
          passed?: number
          failed?: number
          durationMs?: number
          results?: Array<{
            name: string
            status: string
            failReason: string | null
          }>
        }
      }
      if (json.success && json.data) {
        setBatchMessage(json.data.message)
        if (json.data.results) {
          setBatchResults(json.data.results)
        }
        fetchData()
      } else {
        setBatchMessage("배치 실행 실패")
      }
    } catch {
      setBatchMessage("배치 트리거 실패")
    } finally {
      setBatchTriggering(false)
    }
  }, [fetchData])

  // Auto-run effect
  useEffect(() => {
    // Clear previous timers
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    if (!autoRun) {
      setCountdown(0)
      return
    }

    // Save to localStorage
    try {
      localStorage.setItem(AUTO_RUN_KEY, "true")
      localStorage.setItem(AUTO_INTERVAL_KEY, String(autoInterval))
    } catch {
      /* ignore */
    }

    // Set next run time
    nextRunRef.current = Date.now() + autoInterval

    // Auto-trigger interval
    intervalRef.current = setInterval(() => {
      nextRunRef.current = Date.now() + autoInterval
      void triggerBatch()
    }, autoInterval)

    // Countdown ticker (every second)
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, nextRunRef.current - Date.now())
      setCountdown(remaining)
    }, 1000)

    setCountdown(autoInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [autoRun, autoInterval, triggerBatch])

  function toggleAutoRun() {
    const next = !autoRun
    setAutoRun(next)
    try {
      localStorage.setItem(AUTO_RUN_KEY, String(next))
    } catch {
      /* ignore */
    }
    // DB의 enabled 플래그도 동기화 → Vercel Cron이 수동 모드를 존중하도록
    void fetch("/api/internal/incubator/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_settings", settings: { enabled: next } }),
    })
  }

  if (loading) {
    return (
      <>
        <Header
          title="Incubator Dashboard"
          description="Daily Batch 워크플로우 및 자가발전 시스템"
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header
          title="Incubator Dashboard"
          description="Daily Batch 워크플로우 및 자가발전 시스템"
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-red-400">{error ?? "데이터를 불러올 수 없습니다"}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Incubator Dashboard" description="Daily Batch 워크플로우 및 자가발전 시스템" />

      <div className="space-y-6 p-6">
        {/* 운영 상태 히어로 */}
        <OperationStatus
          data={data}
          autoRun={autoRun}
          autoInterval={autoInterval}
          countdown={countdown}
          batchTriggering={batchTriggering}
          batchMessage={batchMessage}
          batchResults={batchResults}
          onToggleAutoRun={toggleAutoRun}
          onChangeInterval={setAutoInterval}
          onTriggerBatch={triggerBatch}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* 설정 패널 */}
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

        {/* 핵심 지표 카드 */}
        <MetricCards data={data} />

        {/* 알림 */}
        {data.alerts.length > 0 && <AlertsSection alerts={data.alerts} />}

        {/* 7일 추이 */}
        <TrendSection dailyTrend={data.dailyTrend} />

        {/* 탭 네비게이션 */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "strategy" && <StrategyTab strategy={data.strategy} />}
        {activeTab === "quality" && <QualityTab quality={data.quality} />}
        {activeTab === "goldenSamples" && <GoldenSamplesTab metrics={data.goldenSamples} />}
        {activeTab === "lifecycle" && <LifecycleTab lifecycle={data.lifecycle} />}
      </div>
    </>
  )
}
