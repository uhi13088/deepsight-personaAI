"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  L1_DIMENSIONS,
  L2_DIMENSIONS,
  L3_DIMENSIONS,
  DEFAULT_L1_VECTOR,
  DEFAULT_L2_VECTOR,
  DEFAULT_L3_VECTOR,
} from "@/constants/v3/dimensions"
import { generateDimensionExplanations } from "@/lib/matching/simulator"
import type { BatchStats } from "@/lib/matching/simulator"
import type { MatchResult, MatchingTier, PersonaCandidate } from "@/lib/matching/three-tier-engine"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@/types"
import { Shuffle, Play, Users, Target, ChevronDown, ChevronUp } from "lucide-react"

const TIER_LABELS: Record<MatchingTier, { label: string; color: string }> = {
  basic: { label: "Basic", color: "text-blue-400" },
  advanced: { label: "Advanced", color: "text-purple-400" },
  exploration: { label: "Exploration", color: "text-amber-400" },
}

export default function SimulatorPage() {
  // 유저 벡터 상태
  const [l1, setL1] = useState<SocialPersonaVector>({ ...DEFAULT_L1_VECTOR })
  const [l2, setL2] = useState<CoreTemperamentVector>({ ...DEFAULT_L2_VECTOR })
  const [l3, setL3] = useState<NarrativeDriveVector>({ ...DEFAULT_L3_VECTOR })
  const [activeLayer, setActiveLayer] = useState<"L1" | "L2" | "L3">("L1")

  // 시뮬레이션 결과
  const [results, setResults] = useState<MatchResult[]>([])
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null)
  const [batchSize, setBatchSize] = useState(20)
  const [isRunning, setIsRunning] = useState(false)

  // 페르소나 데이터 (API에서 로드)
  const [personas, setPersonas] = useState<PersonaCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 페르소나 목록 API 로드
  useEffect(() => {
    fetch("/api/internal/matching-lab/simulate")
      .then((r) => r.json())
      .then(
        (d: {
          success: boolean
          data?: { personas: PersonaCandidate[] }
          error?: { code: string; message: string }
        }) => {
          if (d.success && d.data) {
            setPersonas(d.data.personas)
          } else {
            setError(d.error?.message ?? "페르소나 목록 로드 실패")
          }
        }
      )
      .catch(() => {
        setError("페르소나 목록 로드 실패")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // 단일 매칭 실행 (API POST)
  const handleRunMatching = useCallback(async () => {
    setIsRunning(true)
    try {
      const response = await fetch("/api/internal/matching-lab/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          user: { l1, l2, l3 },
        }),
      })
      const data = (await response.json()) as {
        success: boolean
        data?: { mode: string; results?: MatchResult[] }
        error?: { code: string; message: string }
      }
      if (data.success && data.data?.results) {
        setResults(data.data.results)
        setBatchStats(null)
      }
    } catch {
      // 실행 실패 시 무시
    } finally {
      setIsRunning(false)
    }
  }, [l1, l2, l3])

  // 배치 시뮬레이션 (API POST)
  const handleRunBatch = useCallback(async () => {
    setIsRunning(true)
    try {
      const response = await fetch("/api/internal/matching-lab/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "batch",
          batchSize,
        }),
      })
      const data = (await response.json()) as {
        success: boolean
        data?: {
          mode: string
          stats?: {
            totalUsers: number
            avgMatchScore: number
            failureRate: number
          }
        }
        error?: { code: string; message: string }
      }
      if (data.success && data.data?.stats) {
        const stats = data.data.stats
        // API returns simplified stats; build BatchStats structure for UI
        setBatchStats({
          totalUsers: stats.totalUsers,
          avgMatchScore: stats.avgMatchScore,
          medianMatchScore: stats.avgMatchScore, // approximate with avg
          failureRate: stats.failureRate,
          topPersonaDistribution: [],
          scoreDistribution: {
            buckets: [
              { min: 0, max: 0.2, count: 0 },
              { min: 0.2, max: 0.4, count: 0 },
              { min: 0.4, max: 0.6, count: 0 },
              { min: 0.6, max: 0.8, count: 0 },
              { min: 0.8, max: 1.0, count: 0 },
            ],
            mean: stats.avgMatchScore,
            stdDev: 0,
          },
        })
        setResults([])
      }
    } catch {
      // 실행 실패 시 무시
    } finally {
      setIsRunning(false)
    }
  }, [batchSize])

  // 랜덤 벡터 생성
  const handleRandomize = useCallback(() => {
    const r = () => Math.round(Math.random() * 100) / 100
    setL1({
      depth: r(),
      lens: r(),
      stance: r(),
      scope: r(),
      taste: r(),
      purpose: r(),
      sociability: r(),
    })
    setL2({
      openness: r(),
      conscientiousness: r(),
      extraversion: r(),
      agreeableness: r(),
      neuroticism: r(),
    })
    setL3({ lack: r(), moralCompass: r(), volatility: r(), growthArc: r() })
  }, [])

  // 페르소나 이름 조회
  const getPersonaName = useCallback(
    (id: string) => personas.find((p) => p.id === id)?.name ?? id,
    [personas]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <>
      <Header title="Matching Simulator" description="페르소나↔유저 매칭 시뮬레이션" />

      <div className="space-y-6 p-6">
        {/* 유저 벡터 입력 */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">유저 벡터 입력</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleRandomize}>
                <Shuffle className="mr-1 h-3.5 w-3.5" />
                랜덤
              </Button>
            </div>
          </div>

          {/* 레이어 탭 */}
          <div className="mb-4 flex gap-2">
            {(["L1", "L2", "L3"] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeLayer === layer
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {layer}
                <span className="ml-1 opacity-60">
                  {layer === "L1" ? "7D" : layer === "L2" ? "5D" : "4D"}
                </span>
              </button>
            ))}
          </div>

          {/* 슬라이더 그리드 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeLayer === "L1" &&
              L1_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{dim.label}</span>
                    <span className="font-mono font-medium">
                      {l1[dim.key as SocialDimension].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[l1[dim.key as SocialDimension] * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setL1((prev) => ({ ...prev, [dim.key]: v / 100 }))}
                  />
                  <div className="text-muted-foreground flex justify-between text-[10px]">
                    <span>{dim.low}</span>
                    <span>{dim.high}</span>
                  </div>
                </div>
              ))}
            {activeLayer === "L2" &&
              L2_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{dim.label}</span>
                    <span className="font-mono font-medium">
                      {l2[dim.key as TemperamentDimension].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[l2[dim.key as TemperamentDimension] * 100]}
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
            {activeLayer === "L3" &&
              L3_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{dim.label}</span>
                    <span className="font-mono font-medium">
                      {l3[dim.key as NarrativeDimension].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[l3[dim.key as NarrativeDimension] * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setL3((prev) => ({ ...prev, [dim.key]: v / 100 }))}
                  />
                  <div className="text-muted-foreground flex justify-between text-[10px]">
                    <span>{dim.low}</span>
                    <span>{dim.high}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 실행 버튼 영역 */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleRunMatching} disabled={isRunning}>
            <Play className="mr-1.5 h-4 w-4" />
            단일 매칭 실행
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRunBatch} disabled={isRunning}>
              <Users className="mr-1.5 h-4 w-4" />
              배치 시뮬레이션
            </Button>
            <select
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
            >
              <option value={10}>10명</option>
              <option value={20}>20명</option>
              <option value={50}>50명</option>
              <option value={100}>100명</option>
            </select>
          </div>
        </div>

        {/* 단일 매칭 결과 */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">매칭 결과 ({results.length}건)</h3>
            {results.map((result, idx) => {
              const persona = personas.find((p) => p.id === result.personaId)
              const isExpanded = expandedResult === result.personaId
              const explanations = persona ? generateDimensionExplanations(l1, persona.l1) : []

              return (
                <div key={result.personaId} className="bg-card rounded-lg border">
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpandedResult(isExpanded ? null : result.personaId)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs font-medium">#{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{persona?.name ?? result.personaId}</p>
                        <p className="text-muted-foreground text-xs">{result.explanation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          result.tier === "basic"
                            ? "info"
                            : result.tier === "advanced"
                              ? "outline"
                              : "warning"
                        }
                      >
                        {TIER_LABELS[result.tier].label}
                      </Badge>
                      <span className="text-lg font-bold">{Math.round(result.score * 100)}%</span>
                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-border border-t px-4 py-3">
                      {/* Breakdown */}
                      <div className="mb-3 grid grid-cols-4 gap-3">
                        <div className="rounded bg-blue-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">벡터 유사도</p>
                          <p className="text-sm font-bold text-blue-400">
                            {Math.round(result.breakdown.vectorScore * 100)}%
                          </p>
                        </div>
                        <div className="rounded bg-purple-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">교차축</p>
                          <p className="text-sm font-bold text-purple-400">
                            {Math.round(result.breakdown.crossAxisScore * 100)}%
                          </p>
                        </div>
                        <div className="rounded bg-amber-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">역설 호환</p>
                          <p className="text-sm font-bold text-amber-400">
                            {Math.round(result.breakdown.paradoxCompatibility * 100)}%
                          </p>
                        </div>
                        <div className="rounded bg-emerald-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">보정</p>
                          <p className="text-sm font-bold text-emerald-400">
                            {result.breakdown.qualitativeBonus.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* 차원별 XAI */}
                      <div>
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          차원별 일치도 (L1)
                        </p>
                        <div className="space-y-1.5">
                          {explanations.map((exp) => (
                            <div key={exp.dimension} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground w-16 shrink-0">
                                {exp.label}
                              </span>
                              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full bg-blue-500/60"
                                  style={{ width: `${exp.similarity * 100}%` }}
                                />
                              </div>
                              <span className="w-10 text-right font-mono">
                                {Math.round(exp.similarity * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 배치 통계 */}
        {batchStats && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">
              배치 시뮬레이션 결과 ({batchStats.totalUsers}명)
            </h3>

            {/* KPI 카드 */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">평균 매칭 점수</p>
                <p className="mt-1 text-2xl font-bold">
                  {Math.round(batchStats.avgMatchScore * 100)}%
                </p>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">중앙값</p>
                <p className="mt-1 text-2xl font-bold">
                  {Math.round(batchStats.medianMatchScore * 100)}%
                </p>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">실패율 ({"<"}50%)</p>
                <p
                  className={`mt-1 text-2xl font-bold ${batchStats.failureRate > 0.3 ? "text-red-400" : "text-emerald-400"}`}
                >
                  {Math.round(batchStats.failureRate * 100)}%
                </p>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">표준편차</p>
                <p className="mt-1 text-2xl font-bold">
                  {batchStats.scoreDistribution.stdDev.toFixed(2)}
                </p>
              </div>
            </div>

            {/* 점수 분포 */}
            <div className="bg-card rounded-lg border p-4">
              <h4 className="mb-3 text-xs font-medium">점수 분포</h4>
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {batchStats.scoreDistribution.buckets.map((bucket) => {
                  const maxCount = Math.max(
                    ...batchStats.scoreDistribution.buckets.map((b) => b.count),
                    1
                  )
                  const height = (bucket.count / maxCount) * 100
                  return (
                    <div
                      key={`${bucket.min}-${bucket.max}`}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-muted-foreground text-[10px]">{bucket.count}</span>
                      <div
                        className="w-full rounded-t bg-blue-500/60"
                        style={{ height: `${height}%`, minHeight: bucket.count > 0 ? 4 : 0 }}
                      />
                      <span className="text-muted-foreground text-[10px]">
                        {Math.round(bucket.min * 100)}-{Math.round(bucket.max * 100)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top 페르소나 분포 */}
            {batchStats.topPersonaDistribution.length > 0 && (
              <div className="bg-card rounded-lg border p-4">
                <h4 className="mb-3 text-xs font-medium">상위 매칭 페르소나 분포</h4>
                <div className="space-y-2">
                  {batchStats.topPersonaDistribution.map((dist) => (
                    <div key={dist.personaId} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate">{getPersonaName(dist.personaId)}</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-purple-500/60"
                          style={{ width: `${dist.percentage * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-20 text-right text-xs">
                        {dist.count}명 ({Math.round(dist.percentage * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 빈 상태 */}
        {results.length === 0 && !batchStats && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="text-muted-foreground mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">유저 벡터를 설정하고 매칭을 실행하세요</p>
            <p className="text-muted-foreground mt-1 text-xs">
              단일 매칭 또는 배치 시뮬레이션으로 3-Tier 매칭 결과를 확인할 수 있습니다
            </p>
          </div>
        )}
      </div>
    </>
  )
}
