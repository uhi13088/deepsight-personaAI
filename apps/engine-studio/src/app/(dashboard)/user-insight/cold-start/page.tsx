"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MODE_CONFIG, validateQuestionSet } from "@/lib/user-insight/cold-start"
import type { OnboardingMode, QuestionSet, QuestionType } from "@/lib/user-insight/cold-start"
import { L1_DIMENSIONS, L2_DIMENSIONS } from "@/constants/v3/dimensions"
import { Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react"

const MODES: { key: OnboardingMode; label: string }[] = [
  { key: "quick", label: "Quick" },
  { key: "standard", label: "Standard" },
  { key: "deep", label: "Deep" },
]

const QUESTION_TYPES: { key: QuestionType; label: string }[] = [
  { key: "forced_choice", label: "A vs B" },
  { key: "scenario", label: "시나리오" },
  { key: "ab_review", label: "리뷰 선택" },
  { key: "reversal", label: "반전 탐지" },
]

const ALL_DIMENSIONS = [
  ...L1_DIMENSIONS.map((d) => ({ key: d.key, label: d.label, layer: "L1" as const })),
  ...L2_DIMENSIONS.map((d) => ({ key: d.key, label: d.label, layer: "L2" as const })),
]

export default function ColdStartPage() {
  const [activeMode, setActiveMode] = useState<OnboardingMode>("quick")
  const [sets, setSets] = useState<Record<OnboardingMode, QuestionSet> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 새 질문 입력 상태
  const [newText, setNewText] = useState("")
  const [newType, setNewType] = useState<QuestionType>("forced_choice")
  const [newDim, setNewDim] = useState(ALL_DIMENSIONS[0].key)
  const [newLayer, setNewLayer] = useState<"L1" | "L2">("L1")

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

  const handleAddQuestion = useCallback(async () => {
    if (!newText.trim()) return
    try {
      const res = await fetch("/api/internal/user-insight/cold-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_question",
          mode: activeMode,
          question: {
            text: newText.trim(),
            type: newType,
            targetDimension: newDim,
            targetLayer: newLayer,
            options: [
              { id: `opt_a_${Date.now()}`, text: "선택지 A", vectorDelta: { [newDim]: 0.3 } },
              { id: `opt_b_${Date.now()}`, text: "선택지 B", vectorDelta: { [newDim]: -0.3 } },
            ],
          },
        }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: { sets: Record<OnboardingMode, QuestionSet> }
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setSets(json.data.sets)
        setNewText("")
      }
    } catch {
      // 질문 추가 실패
    }
  }, [activeMode, newText, newType, newDim, newLayer])

  const handleRemove = useCallback(
    async (questionId: string) => {
      try {
        const res = await fetch("/api/internal/user-insight/cold-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "remove_question",
            mode: activeMode,
            questionId,
          }),
        })
        const json = (await res.json()) as {
          success: boolean
          data?: { sets: Record<OnboardingMode, QuestionSet> }
          error?: { code: string; message: string }
        }
        if (json.success && json.data) {
          setSets(json.data.sets)
        }
      } catch {
        // 질문 삭제 실패
      }
    },
    [activeMode]
  )

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (!currentSet || index === 0) return
      const ids = currentSet.questions.map((q) => q.id)
      ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
      try {
        const res = await fetch("/api/internal/user-insight/cold-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder_questions",
            mode: activeMode,
            questionIds: ids,
          }),
        })
        const json = (await res.json()) as {
          success: boolean
          data?: { sets: Record<OnboardingMode, QuestionSet> }
          error?: { code: string; message: string }
        }
        if (json.success && json.data) {
          setSets(json.data.sets)
        }
      } catch {
        // 순서 변경 실패
      }
    },
    [currentSet, activeMode]
  )

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (!currentSet || index >= currentSet.questions.length - 1) return
      const ids = currentSet.questions.map((q) => q.id)
      ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
      try {
        const res = await fetch("/api/internal/user-insight/cold-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder_questions",
            mode: activeMode,
            questionIds: ids,
          }),
        })
        const json = (await res.json()) as {
          success: boolean
          data?: { sets: Record<OnboardingMode, QuestionSet> }
          error?: { code: string; message: string }
        }
        if (json.success && json.data) {
          setSets(json.data.sets)
        }
      } catch {
        // 순서 변경 실패
      }
    },
    [currentSet, activeMode]
  )

  // 차원별 질문 수 카운트
  const dimCoverage = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!currentSet) return counts
    for (const q of currentSet.questions) {
      counts[q.targetDimension] = (counts[q.targetDimension] ?? 0) + 1
    }
    return counts
  }, [currentSet])

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
      <Header title="Cold Start Strategy" description="유저 온보딩 질문 설계 및 관리" />

      <div className="space-y-6 p-6">
        {/* 모드 탭 */}
        <div className="flex items-center gap-2">
          {MODES.map((mode) => {
            const mc = MODE_CONFIG[mode.key]
            return (
              <button
                key={mode.key}
                onClick={() => setActiveMode(mode.key)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeMode === mode.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <span>{mode.label}</span>
                <span className="ml-2 text-xs opacity-60">
                  {mc.questionCount}문항 · {mc.minutes}분
                </span>
              </button>
            )
          })}
        </div>

        {/* 모드 정보 카드 */}
        <div className="grid grid-cols-3 gap-4">
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
        </div>

        {/* 검증 상태 */}
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

        {/* 차원별 커버리지 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">차원별 질문 커버리지</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_DIMENSIONS.map((dim) => {
              const count = dimCoverage[dim.key] ?? 0
              return (
                <div key={dim.key} className="flex items-center gap-1.5">
                  <Badge variant={count > 0 ? "success" : "muted"}>{dim.layer}</Badge>
                  <span className="text-xs">{dim.label}</span>
                  <span
                    className={`text-xs font-medium ${count > 0 ? "text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 질문 추가 폼 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">질문 추가</h3>
          <div className="flex flex-wrap gap-3">
            <Input
              className="min-w-[300px] flex-1"
              placeholder="질문 텍스트를 입력하세요"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddQuestion()
              }}
            />
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={newType}
              onChange={(e) => setNewType(e.target.value as QuestionType)}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={newLayer}
              onChange={(e) => setNewLayer(e.target.value as "L1" | "L2")}
            >
              <option value="L1">L1</option>
              <option value="L2">L2</option>
            </select>
            <select
              className="border-border bg-background rounded-md border px-3 py-2 text-sm"
              value={newDim}
              onChange={(e) => setNewDim(e.target.value)}
            >
              {ALL_DIMENSIONS.filter((d) => d.layer === newLayer).map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => void handleAddQuestion()} disabled={!newText.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              추가
            </Button>
          </div>
        </div>

        {/* 질문 목록 테이블 */}
        <div className="bg-card rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">질문</th>
                <th className="px-4 py-3 text-left font-medium">유형</th>
                <th className="px-4 py-3 text-left font-medium">대상 차원</th>
                <th className="px-4 py-3 text-left font-medium">레이어</th>
                <th className="px-4 py-3 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {currentSet.questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                    질문이 없습니다. 위에서 질문을 추가하세요.
                  </td>
                </tr>
              ) : (
                currentSet.questions.map((q, i) => {
                  const dimDef = ALL_DIMENSIONS.find((d) => d.key === q.targetDimension)
                  const typeDef = QUESTION_TYPES.find((t) => t.key === q.type)
                  return (
                    <tr key={q.id} className="border-border border-b last:border-0">
                      <td className="text-muted-foreground px-4 py-3">{i + 1}</td>
                      <td className="max-w-[300px] truncate px-4 py-3">{q.text}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{typeDef?.label ?? q.type}</Badge>
                      </td>
                      <td className="px-4 py-3">{dimDef?.label ?? q.targetDimension}</td>
                      <td className="px-4 py-3">
                        <Badge variant={q.targetLayer === "L1" ? "info" : "warning"}>
                          {q.targetLayer}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => void handleMoveUp(i)}
                            disabled={i === 0}
                            className="text-muted-foreground hover:text-foreground rounded p-1 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleMoveDown(i)}
                            disabled={i >= currentSet.questions.length - 1}
                            className="text-muted-foreground hover:text-foreground rounded p-1 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleRemove(q.id)}
                            className="text-muted-foreground hover:text-destructive rounded p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
