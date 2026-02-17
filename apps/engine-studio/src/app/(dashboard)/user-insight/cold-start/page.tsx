"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MODE_CONFIG,
  validateQuestionSet,
  inferVectorsFromAnswers,
} from "@/lib/user-insight/cold-start"
import type {
  OnboardingMode,
  QuestionSet,
  ColdStartQuestion,
  QuestionOption,
} from "@/lib/user-insight/cold-start"
import { L1_DIMENSIONS, L2_DIMENSIONS } from "@/constants/v3/dimensions"
import type { DimensionDef } from "@/constants/v3/dimensions"
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  ArrowRight,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react"

// ── 상수 ──────────────────────────────────────────────────────

const MODES: { key: OnboardingMode; label: string; desc: string }[] = [
  { key: "quick", label: "Quick", desc: "Phase 1" },
  { key: "standard", label: "Standard", desc: "Phase 1+2" },
  { key: "deep", label: "Deep", desc: "Phase 1+2+3" },
]

const ALL_DIMS = [
  ...L1_DIMENSIONS.map((d) => ({ ...d, layer: "L1" as const })),
  ...L2_DIMENSIONS.map((d) => ({ ...d, layer: "L2" as const })),
]

function getDimDef(key: string): DimensionDef | undefined {
  return ALL_DIMS.find((d) => d.key === key)
}

function getPhaseForOrder(order: number): number {
  if (order <= 8) return 1
  if (order <= 16) return 2
  return 3
}

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Phase 1 · L1 주력", color: "text-blue-400" },
  2: { label: "Phase 2 · L2 주력", color: "text-purple-400" },
  3: { label: "Phase 3 · 교차검증", color: "text-amber-400" },
}

// ── 벡터 델타 바 ─────────────────────────────────────────────

function WeightBar({ value, label }: { value: number; label: string }) {
  const absWidth = Math.min(Math.abs(value) * 250, 100) // scale for visibility
  const isPositive = value >= 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-16 truncate text-right">{label}</span>
      <div className="relative h-4 w-28">
        {/* center line */}
        <div className="bg-border absolute left-1/2 top-0 h-full w-px" />
        {/* bar */}
        <div
          className={`absolute top-0.5 h-3 rounded-sm ${isPositive ? "bg-emerald-500/70" : "bg-rose-500/70"}`}
          style={{
            width: `${absWidth / 2}%`,
            left: isPositive ? "50%" : undefined,
            right: isPositive ? undefined : "50%",
          }}
        />
      </div>
      <span
        className={`w-10 font-mono text-xs ${isPositive ? "text-emerald-400" : "text-rose-400"}`}
      >
        {value > 0 ? "+" : ""}
        {value}
      </span>
    </div>
  )
}

// ── 옵션 카드 ─────────────────────────────────────────────────

function OptionDetail({ option, label }: { option: QuestionOption; label: string }) {
  const l1Entries = Object.entries(option.l1Weights)
  const l2Entries = Object.entries(option.l2Weights)
  const hasWeights = l1Entries.length > 0 || l2Entries.length > 0

  return (
    <div className="bg-background/50 rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="bg-muted flex h-5 w-5 items-center justify-center rounded text-xs font-bold">
          {label}
        </span>
        <span className="text-sm">{option.text}</span>
      </div>
      {hasWeights && (
        <div className="ml-7 space-y-0.5">
          {l1Entries.map(([dim, val]) => (
            <WeightBar key={dim} label={getDimDef(dim)?.label ?? dim} value={val} />
          ))}
          {l2Entries.map(([dim, val]) => (
            <WeightBar key={dim} label={getDimDef(dim)?.label ?? dim} value={val} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 질문 카드 ─────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  testMode,
  selectedOption,
  onSelectOption,
}: {
  question: ColdStartQuestion
  index: number
  testMode: boolean
  selectedOption: string | null
  onSelectOption: (questionId: string, optionId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-card rounded-lg border transition-all">
      {/* 헤더 */}
      <button
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={() => !testMode && setExpanded(!expanded)}
      >
        <span className="text-muted-foreground mt-0.5 font-mono text-sm">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">{question.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {question.targetLayers.map((layer) => (
              <Badge key={layer} variant={layer === "L1" ? "info" : "warning"}>
                {layer}
              </Badge>
            ))}
            {question.targetDimensions.map((dim) => {
              const def = getDimDef(dim)
              return (
                <span key={dim} className="text-muted-foreground text-xs">
                  {def?.label ?? dim}
                </span>
              )
            })}
          </div>
        </div>
        {!testMode && (
          <div className="text-muted-foreground mt-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        )}
      </button>

      {/* 테스트 모드: 선택지 버튼 */}
      {testMode && (
        <div className="space-y-2 px-4 pb-4">
          {question.options.map((opt, oi) => {
            const isSelected = selectedOption === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onSelectOption(question.id, opt.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent text-foreground"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {String.fromCharCode(65 + oi)}
                </span>
                <span className="flex-1">{opt.text}</span>
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      )}

      {/* 관리자 확장: 옵션별 벡터 상세 */}
      {expanded && !testMode && (
        <div className="border-border space-y-2 border-t px-4 py-3">
          {question.options.map((opt, oi) => (
            <OptionDetail key={opt.id} option={opt} label={String.fromCharCode(65 + oi)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 커버리지 바 차트 ──────────────────────────────────────────

function CoverageChart({
  dimCoverage,
  maxPerAxis,
}: {
  dimCoverage: Record<string, number>
  maxPerAxis: number
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">차원별 측정 커버리지</h3>
        <span className="text-muted-foreground text-xs">목표: 축당 {maxPerAxis}회</span>
      </div>
      <div className="space-y-4">
        {/* L1 */}
        <div>
          <p className="mb-2 text-xs font-medium text-blue-400">L1 Social Persona (7D)</p>
          <div className="space-y-1.5">
            {L1_DIMENSIONS.map((dim) => {
              const count = dimCoverage[dim.key] ?? 0
              const pct = Math.min((count / Math.max(maxPerAxis, 1)) * 100, 100)
              const isFull = count >= maxPerAxis
              return (
                <div key={dim.key} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 truncate text-xs">{dim.label}</span>
                  <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? "bg-emerald-500" : "bg-blue-500/60"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`w-8 text-right font-mono text-xs ${isFull ? "text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {count}/{maxPerAxis}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        {/* L2 */}
        <div>
          <p className="mb-2 text-xs font-medium text-purple-400">L2 OCEAN (5D)</p>
          <div className="space-y-1.5">
            {L2_DIMENSIONS.map((dim) => {
              const count = dimCoverage[dim.key] ?? 0
              const pct = Math.min((count / Math.max(maxPerAxis, 1)) * 100, 100)
              const isFull = count >= maxPerAxis
              return (
                <div key={dim.key} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 truncate text-xs">{dim.label}</span>
                  <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? "bg-emerald-500" : "bg-purple-500/60"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`w-8 text-right font-mono text-xs ${isFull ? "text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {count}/{maxPerAxis}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AI 프로필 요약 훅 ─────────────────────────────────────────

function useAiSummary() {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestSummary = useCallback(
    async (
      l1: Record<string, number>,
      l2: Record<string, number> | null,
      confidence: Record<string, number>
    ) => {
      setLoading(true)
      setError(null)
      setSummary(null)
      try {
        const res = await fetch("/api/internal/user-insight/cold-start/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ l1, l2, confidence }),
        })
        const json = (await res.json()) as {
          success: boolean
          data?: { summary: string }
          error?: { code: string; message: string }
        }
        if (json.success && json.data) {
          setSummary(json.data.summary)
        } else {
          setError(json.error?.message ?? "AI 요약 생성에 실패했습니다")
        }
      } catch {
        setError("AI 서버와 통신 중 오류가 발생했습니다")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setSummary(null)
    setError(null)
    setLoading(false)
  }, [])

  return { summary, loading, error, requestSummary, reset }
}

// ── 테스트 결과 패널 ──────────────────────────────────────────

function TestResultPanel({
  questions,
  answers,
}: {
  questions: ColdStartQuestion[]
  answers: Record<string, string>
}) {
  const answerList = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
    questionId,
    selectedOptionId,
  }))

  const result = inferVectorsFromAnswers(questions, answerList)
  const l1Result = L1_DIMENSIONS.map((dim) => ({
    ...dim,
    value: (result as Record<string, number>)[dim.key] ?? 0.5,
  }))
  const l2Result = result.l2
    ? L2_DIMENSIONS.map((dim) => ({
        ...dim,
        value: (result.l2 as Record<string, number>)[dim.key] ?? 0.5,
      }))
    : null

  // AI 요약
  const { summary, loading: aiLoading, error: aiError, requestSummary } = useAiSummary()

  const handleRequestSummary = useCallback(() => {
    const l1Map: Record<string, number> = {}
    for (const dim of l1Result) {
      l1Map[dim.key] = dim.value
    }
    const l2Map: Record<string, number> | null = l2Result
      ? Object.fromEntries(l2Result.map((d) => [d.key, d.value]))
      : null
    void requestSummary(l1Map, l2Map, result.confidence)
  }, [l1Result, l2Result, result.confidence, requestSummary])

  return (
    <div className="space-y-4">
      {/* AI 프로필 요약 */}
      <div className="bg-card rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-amber-400" />
            AI 프로필 분석
          </h3>
          {!summary && !aiLoading && (
            <Button variant="outline" size="sm" onClick={handleRequestSummary}>
              <Sparkles className="mr-1 h-3 w-3" />
              분석 요청
            </Button>
          )}
        </div>

        {/* 초기 상태 */}
        {!summary && !aiLoading && !aiError && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            벡터 결과를 AI가 자연어로 분석합니다. &quot;분석 요청&quot; 버튼을 눌러주세요.
          </p>
        )}

        {/* 로딩 */}
        {aiLoading && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <span className="text-muted-foreground text-sm">프로필 분석 중...</span>
          </div>
        )}

        {/* 에러 */}
        {aiError && (
          <div className="space-y-2">
            <p className="text-sm text-red-400">{aiError}</p>
            <Button variant="outline" size="sm" onClick={handleRequestSummary}>
              재시도
            </Button>
          </div>
        )}

        {/* 요약 결과 */}
        {summary && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{summary}</p>
            <button
              onClick={handleRequestSummary}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              다시 분석
            </button>
          </div>
        )}
      </div>

      {/* 벡터 결과 */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4" />
          추론된 벡터 결과
        </h3>

        {/* L1 */}
        <p className="mb-2 text-xs font-medium text-blue-400">L1 Social Persona</p>
        <div className="mb-4 space-y-1.5">
          {l1Result.map((dim) => (
            <div key={dim.key} className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 truncate text-xs">{dim.label}</span>
              <div className="relative h-4 flex-1">
                <div className="bg-muted absolute inset-0 rounded-full" />
                {/* marker at value position */}
                <div
                  className="absolute top-0 h-4 w-4 rounded-full border-2 border-blue-400 bg-blue-500"
                  style={{ left: `calc(${dim.value * 100}% - 8px)` }}
                />
                {/* low/high labels */}
                <span className="text-muted-foreground absolute -bottom-3.5 left-0 text-[10px]">
                  {dim.low}
                </span>
                <span className="text-muted-foreground absolute -bottom-3.5 right-0 text-[10px]">
                  {dim.high}
                </span>
              </div>
              <span className="w-10 text-right font-mono text-xs text-blue-400">
                {dim.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* L2 */}
        {l2Result && (
          <>
            <p className="mb-2 mt-6 text-xs font-medium text-purple-400">L2 OCEAN</p>
            <div className="space-y-1.5">
              {l2Result.map((dim) => (
                <div key={dim.key} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 truncate text-xs">{dim.label}</span>
                  <div className="relative h-4 flex-1">
                    <div className="bg-muted absolute inset-0 rounded-full" />
                    <div
                      className="absolute top-0 h-4 w-4 rounded-full border-2 border-purple-400 bg-purple-500"
                      style={{ left: `calc(${dim.value * 100}% - 8px)` }}
                    />
                    <span className="text-muted-foreground absolute -bottom-3.5 left-0 text-[10px]">
                      {dim.low}
                    </span>
                    <span className="text-muted-foreground absolute -bottom-3.5 right-0 text-[10px]">
                      {dim.high}
                    </span>
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-purple-400">
                    {dim.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Confidence */}
        <div className="mt-6 border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs">신뢰도</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.confidence).map(([dim, conf]) => {
              const def = getDimDef(dim)
              if (!def || conf === 0) return null
              return (
                <div key={dim} className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">{def.label}</span>
                  <span
                    className={`font-mono ${conf >= 0.5 ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {Math.round(conf * 100)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────

export default function ColdStartPage() {
  const [activeMode, setActiveMode] = useState<OnboardingMode>("quick")
  const [sets, setSets] = useState<Record<OnboardingMode, QuestionSet> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 테스트 모드 상태
  const [testMode, setTestMode] = useState(false)
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({})

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/user-insight/cold-start")
      const json = (await res.json()) as {
        success: boolean
        data?: { sets: Record<OnboardingMode, QuestionSet> }
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setSets(json.data.sets)
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
    void fetchData()
  }, [fetchData])

  const currentSet = sets?.[activeMode] ?? null
  const config = MODE_CONFIG[activeMode]
  const validation = useMemo(
    () => (currentSet ? validateQuestionSet(currentSet) : { valid: false, errors: ["로딩 중"] }),
    [currentSet]
  )

  // 차원별 질문 수 카운트 (복합질문: 모든 대상 차원 카운트)
  const dimCoverage = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!currentSet) return counts
    for (const q of currentSet.questions) {
      for (const dim of q.targetDimensions) {
        counts[dim] = (counts[dim] ?? 0) + 1
      }
    }
    return counts
  }, [currentSet])

  // Phase별 그룹핑
  const questionsByPhase = useMemo(() => {
    if (!currentSet) return {}
    const groups: Record<number, ColdStartQuestion[]> = {}
    for (const q of currentSet.questions) {
      const phase = getPhaseForOrder(q.order)
      if (!groups[phase]) groups[phase] = []
      groups[phase].push(q)
    }
    return groups
  }, [currentSet])

  // 테스트 핸들러
  const handleSelectOption = useCallback((questionId: string, optionId: string) => {
    setTestAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }, [])

  const handleStartTest = useCallback(() => {
    setTestMode(true)
    setTestAnswers({})
  }, [])

  const handleResetTest = useCallback(() => {
    setTestMode(false)
    setTestAnswers({})
  }, [])

  const answeredCount = Object.keys(testAnswers).length
  const totalCount = currentSet?.questions.length ?? 0
  const allAnswered = answeredCount === totalCount && totalCount > 0

  if (loading) {
    return (
      <>
        <Header title="Cold Start Strategy" description="유저 온보딩 질문 설계 및 관리" />
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Cold Start Strategy" description="유저 온보딩 질문 설계 및 관리" />
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  if (!currentSet) return null

  return (
    <>
      <Header title="Cold Start Strategy" description="v3 하이브리드 복합질문 (L1+L2 동시측정)" />

      <div className="space-y-6 p-6">
        {/* 모드 탭 + 테스트 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {MODES.map((mode) => {
              const mc = MODE_CONFIG[mode.key]
              return (
                <button
                  key={mode.key}
                  onClick={() => {
                    setActiveMode(mode.key)
                    if (testMode) handleResetTest()
                  }}
                  className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                    activeMode === mode.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="font-medium">{mode.label}</span>
                  <span className="ml-2 text-xs opacity-60">
                    {mc.questionCount}문항 · {mc.minutes}분
                  </span>
                  <br />
                  <span className="text-xs opacity-40">{mode.desc}</span>
                </button>
              )
            })}
          </div>

          {testMode ? (
            <Button variant="outline" size="sm" onClick={handleResetTest}>
              <RotateCcw className="mr-1 h-4 w-4" />
              테스트 종료
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStartTest}
              disabled={currentSet.questions.length === 0}
            >
              <Play className="mr-1 h-4 w-4" />
              테스트 시작
            </Button>
          )}
        </div>

        {/* 모드 정보 카드 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">질문 수</p>
            <p className="mt-1 text-2xl font-bold">
              {currentSet.questions.length}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {config.questionCount}
              </span>
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">예상 소요시간</p>
            <p className="mt-1 text-2xl font-bold">{config.minutes}분</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">목표 정밀도</p>
            <p className="mt-1 text-2xl font-bold">{Math.round(config.precision * 100)}%</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">정보 밀도</p>
            <p className="mt-1 text-2xl font-bold">
              4<span className="text-muted-foreground text-sm font-normal"> bit/문항</span>
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">L1+L2 동시 측정</p>
          </div>
        </div>

        {/* 테스트 진행 바 */}
        {testMode && (
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>
                테스트 진행: {answeredCount}/{totalCount}
              </span>
              {allAnswered && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  완료
                </span>
              )}
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* 검증 상태 (관리 모드에서만) */}
        {!testMode && (
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              validation.valid
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {validation.valid ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {validation.valid
              ? "질문 세트가 유효합니다"
              : `${validation.errors.length}개 문제: ${validation.errors[0]}`}
          </div>
        )}

        <div className={testMode && allAnswered ? "grid grid-cols-[1fr_380px] gap-6" : ""}>
          {/* 질문 목록 (Phase별 그룹핑) */}
          <div className="space-y-6">
            {Object.entries(questionsByPhase)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([phaseStr, questions]) => {
                const phase = Number(phaseStr)
                const info = PHASE_LABELS[phase]
                return (
                  <div key={phase}>
                    {/* Phase 헤더 */}
                    <div className="mb-3 flex items-center gap-2">
                      <ArrowRight className={`h-4 w-4 ${info?.color ?? ""}`} />
                      <h3 className={`text-sm font-medium ${info?.color ?? ""}`}>
                        {info?.label ?? `Phase ${phase}`}
                      </h3>
                      <span className="text-muted-foreground text-xs">{questions.length}문항</span>
                    </div>
                    {/* 질문 카드 리스트 */}
                    <div className="space-y-2">
                      {questions.map((q, qi) => {
                        const globalIndex = currentSet.questions.findIndex((cq) => cq.id === q.id)
                        return (
                          <QuestionCard
                            key={q.id}
                            question={q}
                            index={globalIndex >= 0 ? globalIndex : qi}
                            testMode={testMode}
                            selectedOption={testAnswers[q.id] ?? null}
                            onSelectOption={handleSelectOption}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}

            {currentSet.questions.length === 0 && (
              <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
                질문이 없습니다. DB 마이그레이션(009_cold_start_v3.sql)을 실행하세요.
              </div>
            )}
          </div>

          {/* 테스트 결과 (모든 답변 완료 시) */}
          {testMode && allAnswered && (
            <div className="sticky top-6">
              <TestResultPanel questions={currentSet.questions} answers={testAnswers} />
            </div>
          )}
        </div>

        {/* 커버리지 차트 (관리 모드에서만) */}
        {!testMode && (
          <CoverageChart dimCoverage={dimCoverage} maxPerAxis={config.questionsPerAxis} />
        )}
      </div>
    </>
  )
}
