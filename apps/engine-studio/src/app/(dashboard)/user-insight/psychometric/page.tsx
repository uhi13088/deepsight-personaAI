"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  predictL1FromL2,
  detectReversals,
  extractLatentTraits,
} from "@/lib/user-insight/psychometric"
import type { PsychometricMapping, LatentTrait } from "@/lib/user-insight/psychometric"
import { L1_DIMENSIONS, L2_DIMENSIONS } from "@/constants/v3/dimensions"
import type { CoreTemperamentVector } from "@/types"
import { AlertTriangle, Eye, EyeOff, Sparkles } from "lucide-react"

const TRAIT_SOURCE_CONFIG = {
  explicit: { label: "명시적", icon: Eye, variant: "info" as const, desc: "설문 응답 기반" },
  implicit: {
    label: "숨겨진",
    icon: EyeOff,
    variant: "warning" as const,
    desc: "행동 데이터 기반",
  },
  mixed: {
    label: "혼합",
    icon: Sparkles,
    variant: "success" as const,
    desc: "설문+행동 모두 높음",
  },
}

interface PsychometricConfig {
  mappings: PsychometricMapping[]
  reversalThreshold: number
}

export default function PsychometricPage() {
  const [config, setConfig] = useState<PsychometricConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // L2 OCEAN 슬라이더 입력
  const [l2, setL2] = useState<CoreTemperamentVector>({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  })

  // 반전 탐지용 explicit/implicit 점수
  const [explicit, setExplicit] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const d of L1_DIMENSIONS) init[d.key] = 0.5
    return init
  })
  const [implicit, setImplicit] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const d of L1_DIMENSIONS) init[d.key] = 0.5
    return init
  })

  // Fetch config from API
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/user-insight/psychometric")
      const json = (await res.json()) as {
        success: boolean
        data?: PsychometricConfig
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setConfig(json.data)
      } else {
        setError(json.error?.message ?? "데이터를 불러오지 못했습니다")
      }
    } catch {
      setError("서버와 통신 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  // L2→L1 예측 (client-side for responsiveness)
  const predictedL1 = useMemo(() => predictL1FromL2(l2), [l2])

  // 반전 탐지
  const reversals = useMemo(() => detectReversals(explicit, implicit), [explicit, implicit])
  const reversalCount = reversals.filter((r) => r.isReversal).length

  // 잠재 특성
  const latentTraits = useMemo(() => extractLatentTraits(explicit, implicit), [explicit, implicit])

  if (loading) {
    return (
      <>
        <Header
          title="Psychometric Simulator"
          description="OCEAN→L1 매핑, 반전 탐지, 잠재 특성 분석"
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header
          title="Psychometric Simulator"
          description="OCEAN→L1 매핑, 반전 탐지, 잠재 특성 분석"
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  if (!config) return null

  const { mappings, reversalThreshold } = config

  return (
    <>
      <Header
        title="Psychometric Simulator"
        description="OCEAN→L1 매핑, 반전 탐지, 잠재 특성 분석"
      />

      <div className="space-y-6 p-6">
        {/* OCEAN → L1 매핑 테이블 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-medium">OCEAN → L1 상관 매핑</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="px-3 py-2 text-left font-medium">L2 (OCEAN)</th>
                  {L1_DIMENSIONS.map((d) => (
                    <th key={d.key} className="px-3 py-2 text-center font-medium">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => {
                  const l2Def = L2_DIMENSIONS.find((d) => d.key === mapping.l2Dimension)
                  return (
                    <tr key={mapping.l2Dimension} className="border-border border-b last:border-0">
                      <td className="px-3 py-2.5 font-medium">
                        {l2Def?.label ?? mapping.l2Dimension}
                      </td>
                      {L1_DIMENSIONS.map((l1d) => {
                        const corr = mapping.l1Correlations.find((c) => c.dimension === l1d.key)
                        if (!corr)
                          return (
                            <td
                              key={l1d.key}
                              className="text-muted-foreground px-3 py-2.5 text-center"
                            >
                              —
                            </td>
                          )
                        const isPositive = corr.coefficient > 0
                        const absVal = Math.abs(corr.coefficient)
                        const intensity = Math.round(absVal * 100)
                        return (
                          <td key={l1d.key} className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                isPositive
                                  ? absVal >= 0.6
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-emerald-500/10 text-emerald-400/70"
                                  : absVal >= 0.6
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-red-500/10 text-red-400/70"
                              }`}
                            >
                              {isPositive ? "+" : "\u2212"}
                              {intensity}%
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 인터랙티브 예측기 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* L2 입력 */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-4 text-sm font-medium">L2 OCEAN 입력</h3>
            <div className="space-y-4">
              {L2_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{dim.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {l2[dim.key as keyof CoreTemperamentVector].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[l2[dim.key as keyof CoreTemperamentVector] * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setL2((prev) => ({ ...prev, [dim.key]: v / 100 }))}
                  />
                  <div className="text-muted-foreground flex justify-between text-[10px]">
                    <span>{dim.low}</span>
                    <span>{dim.high}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* L1 예측 결과 */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-4 text-sm font-medium">예측된 L1 Social Persona</h3>
            <div className="space-y-3">
              {L1_DIMENSIONS.map((dim) => {
                const value = predictedL1[dim.key as keyof typeof predictedL1] ?? null
                return (
                  <div key={dim.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{dim.label}</span>
                      <span className="text-xs font-medium">
                        {value !== null ? value.toFixed(2) : "\u2014"}
                      </span>
                    </div>
                    <div className="bg-muted h-2 rounded-full">
                      {value !== null && (
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${value * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="text-muted-foreground flex justify-between text-[10px]">
                      <span>{dim.low}</span>
                      <span>{dim.high}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 반전 탐지 */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">반전 탐지 (Δ ≥ {reversalThreshold})</h3>
            {reversalCount > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {reversalCount}개 반전 감지
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {L1_DIMENSIONS.map((dim) => {
              const rev = reversals.find((r) => r.dimension === dim.key)
              return (
                <div
                  key={dim.key}
                  className="grid grid-cols-[120px_1fr_1fr_60px] items-center gap-3"
                >
                  <span className="text-xs font-medium">{dim.label}</span>
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground text-[10px]">설문 (Explicit)</div>
                    <Slider
                      value={[explicit[dim.key] * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) =>
                        setExplicit((prev) => ({ ...prev, [dim.key]: v / 100 }))
                      }
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground text-[10px]">행동 (Implicit)</div>
                    <Slider
                      value={[implicit[dim.key] * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) =>
                        setImplicit((prev) => ({ ...prev, [dim.key]: v / 100 }))
                      }
                    />
                  </div>
                  <div className="text-right">
                    {rev && (
                      <span
                        className={`text-xs font-medium ${
                          rev.isReversal ? "text-amber-400" : "text-muted-foreground"
                        }`}
                      >
                        Δ{rev.delta.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 잠재 특성 카드 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-medium">잠재 특성 분석</h3>
          {latentTraits.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              슬라이더를 조절하여 잠재 특성을 발견하세요. (명시적 ≥0.8, 숨겨진: 명시적&lt;0.5 +
              행동&gt;0.7, 혼합: 양쪽 ≥0.6)
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {latentTraits.map((trait: LatentTrait, i: number) => {
                const cfg = TRAIT_SOURCE_CONFIG[trait.source]
                const Icon = cfg.icon
                return (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <span className="text-xs font-medium">
                        {(trait.strength * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">{trait.description}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
