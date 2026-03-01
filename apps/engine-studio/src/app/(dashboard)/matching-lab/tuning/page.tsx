"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { KNOWN_GENRES } from "@/lib/matching/tuning"
import type { TuningProfile, GenreWeightIssue, AutoTuningResult } from "@/lib/matching/tuning"
import {
  createMatchingABTest,
  startMatchingABTest,
  pauseMatchingABTest,
  completeMatchingABTest,
  rollbackMatchingABTest,
  evaluateABTestResult,
} from "@/lib/matching/guardrails"
import type {
  MatchingABTestConfig,
  ABTestType,
  ABTestMetrics,
  ABTestVerdict,
} from "@/lib/matching/guardrails"
import type { SocialDimension } from "@/types"
import {
  SlidersHorizontal,
  FlaskConical,
  TestTubes,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ShieldCheck,
} from "lucide-react"

const L1_DIMS: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]
const DIM_LABELS: Record<SocialDimension, string> = {
  depth: "분석 깊이",
  lens: "판단 렌즈",
  stance: "평가 태도",
  scope: "관심 범위",
  taste: "취향 성향",
  purpose: "소비 목적",
  sociability: "사회적 성향",
}

const AB_TEST_TYPES: Array<{ key: ABTestType; label: string }> = [
  { key: "tier", label: "Tier 비율" },
  { key: "weight", label: "가중치" },
  { key: "threshold", label: "임계값" },
  { key: "persona", label: "페르소나" },
  { key: "layer", label: "레이어" },
]

type ActiveTab = "parameters" | "genres" | "autotuning" | "abtest"

export default function TuningPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("parameters")

  // 튜닝 프로필 (API에서 로드)
  const [profile, setProfile] = useState<TuningProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 자동 튜닝
  const [autoTuningResult, setAutoTuningResult] = useState<AutoTuningResult | null>(null)
  const [autoTuningRunning, setAutoTuningRunning] = useState(false)
  const [tuningTarget, setTuningTarget] = useState<"quality" | "diversity" | "balanced">("balanced")

  // A/B 테스트
  const [abTests, setAbTests] = useState<MatchingABTestConfig[]>([])
  const [newTestName, setNewTestName] = useState("")
  const [newTestType, setNewTestType] = useState<ABTestType>("tier")
  const [verdicts, setVerdicts] = useState<Record<string, ABTestVerdict>>({})

  // 새 장르 추가 (KNOWN_GENRES에서 선택)
  const [selectedGenre, setSelectedGenre] = useState("")

  // 프로필 로드
  useEffect(() => {
    fetch("/api/internal/matching-lab/tuning")
      .then((r) => r.json())
      .then(
        (d: {
          success: boolean
          data?: { profile: TuningProfile }
          error?: { code: string; message: string }
        }) => {
          if (d.success && d.data) {
            setProfile(d.data.profile)
          } else {
            setError(d.error?.message ?? "튜닝 프로필 로드 실패")
          }
        }
      )
      .catch(() => {
        setError("튜닝 프로필 로드 실패")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // API PUT 호출 유틸리티
  const updateProfileViaAPI = useCallback(async (body: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/internal/matching-lab/tuning", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await response.json()) as {
        success: boolean
        data?: { profile: TuningProfile }
        error?: { code: string; message: string }
      }
      if (data.success && data.data) {
        setProfile(data.data.profile)
      }
    } catch {
      // 업데이트 실패 시 무시
    }
  }, [])

  // ── 하이퍼파라미터 핸들러 ──
  const handleParamChange = useCallback(
    (key: string, value: number) => {
      // 즉시 낙관적 업데이트
      setProfile((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          parameters: prev.parameters.map((p) =>
            p.key === key ? { ...p, value: Math.max(p.min, Math.min(p.max, value)) } : p
          ),
          updatedAt: Date.now(),
        }
      })
      void updateProfileViaAPI({ action: "update_parameter", key, value })
    },
    [updateProfileViaAPI]
  )

  // ── 장르 가중치 핸들러 ──
  const handleGenreWeightChange = useCallback(
    (genre: string, dim: SocialDimension, value: number) => {
      setProfile((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          genreWeights: prev.genreWeights.map((g) =>
            g.genre === genre
              ? { ...g, weights: { ...g.weights, [dim]: Math.max(0.5, Math.min(2.0, value)) } }
              : g
          ),
          updatedAt: Date.now(),
        }
      })
      void updateProfileViaAPI({
        action: "update_genre_weight",
        genre,
        dimension: dim,
        weight: value,
      })
    },
    [updateProfileViaAPI]
  )

  const handleAddGenre = useCallback(() => {
    if (!selectedGenre) return
    void updateProfileViaAPI({ action: "add_genre", genre: selectedGenre })
    setSelectedGenre("")
  }, [selectedGenre, updateProfileViaAPI])

  // 장르 프리셋 일괄 적용 (자동 가중치)
  const handleApplyPresets = useCallback(() => {
    void updateProfileViaAPI({ action: "apply_preset_weights" })
  }, [updateProfileViaAPI])

  // 현재 프로필에 없는 KNOWN_GENRES만 필터
  const availableGenres = KNOWN_GENRES.filter(
    (g) => !profile?.genreWeights.some((gw) => gw.genre === g.id)
  )

  // 검증/자동보정 상태
  const [validationIssues, setValidationIssues] = useState<GenreWeightIssue[]>([])

  const handleValidate = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/matching-lab/tuning", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate_weights" }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { issues?: GenreWeightIssue[] }
      }
      setValidationIssues(data.data?.issues ?? [])
    } catch {
      // 검증 실패 시 무시
    }
  }, [])

  const handleAutoCorrect = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/matching-lab/tuning", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_correct" }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { profile: TuningProfile; corrections?: GenreWeightIssue[] }
      }
      if (data.success && data.data) {
        setProfile(data.data.profile)
        setValidationIssues([])
      }
    } catch {
      // 보정 실패 시 무시
    }
  }, [])

  const handleRemoveGenre = useCallback(
    (genre: string) => {
      void updateProfileViaAPI({ action: "remove_genre", genre })
    },
    [updateProfileViaAPI]
  )

  // ── 자동 튜닝 핸들러 (서버 실행) ──
  const handleStartAutoTuning = useCallback(async () => {
    if (!profile || autoTuningRunning) return
    setAutoTuningRunning(true)
    try {
      const res = await fetch("/api/internal/matching-lab/tuning", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_auto_tuning",
          autoTuningConfig: {
            virtualUserCount: 50,
            method: "grid_search",
            targetMetric: tuningTarget,
          },
        }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { profile: TuningProfile; autoTuning?: AutoTuningResult }
      }
      if (data.success && data.data) {
        setProfile(data.data.profile)
        if (data.data.autoTuning) {
          setAutoTuningResult(data.data.autoTuning)
        }
      }
    } catch {
      // 자동 튜닝 실패
    } finally {
      setAutoTuningRunning(false)
    }
  }, [profile, autoTuningRunning, tuningTarget])

  // ── A/B 테스트 핸들러 ──
  const handleCreateABTest = useCallback(() => {
    if (!newTestName.trim()) return
    const test = createMatchingABTest(
      newTestName.trim(),
      newTestType,
      `${newTestName.trim()} 실험`,
      "기존 알고리즘",
      "신규 알고리즘"
    )
    setAbTests((prev) => [...prev, test])
    setNewTestName("")
  }, [newTestName, newTestType])

  const handleABTestAction = useCallback(
    (testId: string, action: "start" | "pause" | "complete" | "rollback") => {
      setAbTests((prev) =>
        prev.map((t) => {
          if (t.id !== testId) return t
          switch (action) {
            case "start":
              return startMatchingABTest(t)
            case "pause":
              return pauseMatchingABTest(t)
            case "complete":
              return completeMatchingABTest(t)
            case "rollback":
              return rollbackMatchingABTest(t)
            default:
              return t
          }
        })
      )
    },
    []
  )

  const handleEvaluateABTest = useCallback((testId: string) => {
    // 시뮬레이션용 가상 메트릭
    const mockMetrics: ABTestMetrics = {
      controlSamples: 150,
      treatmentSamples: 148,
      controlSatisfaction: 0.72,
      treatmentSatisfaction: 0.78,
      controlErrorRate: 0.03,
      treatmentErrorRate: 0.02,
      controlCtr: 0.31,
      treatmentCtr: 0.35,
      dimensionMetrics: L1_DIMS.map((dim) => ({
        dimension: dim,
        controlValue: 0.5 + Math.random() * 0.3,
        treatmentValue: 0.5 + Math.random() * 0.3,
        diff: 0,
        pValue: Math.random() * 0.1,
        significant: Math.random() > 0.5,
      })),
    }

    const verdict = evaluateABTestResult(mockMetrics)
    setVerdicts((prev) => ({ ...prev, [testId]: verdict }))
  }, [])

  const TABS: Array<{ key: ActiveTab; label: string; icon: React.ReactNode }> = [
    {
      key: "parameters",
      label: "하이퍼파라미터",
      icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
    },
    { key: "genres", label: "장르 가중치", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { key: "autotuning", label: "자동 튜닝", icon: <TestTubes className="h-3.5 w-3.5" /> },
    { key: "abtest", label: "A/B 테스트", icon: <TestTubes className="h-3.5 w-3.5" /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-red-400">{error ?? "프로필을 불러올 수 없습니다"}</div>
      </div>
    )
  }

  return (
    <>
      <Header title="Algorithm Tuning" description="매칭 알고리즘 하이퍼파라미터 조정" />

      <div className="space-y-6 p-6">
        {/* 탭 */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 하이퍼파라미터 탭 ── */}
        {activeTab === "parameters" && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-medium">
                매칭 하이퍼파라미터 ({profile.parameters.length}종)
              </h3>
              <div className="grid gap-6 lg:grid-cols-2">
                {profile.parameters.map((param) => (
                  <div key={param.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{param.label}</p>
                        <p className="text-muted-foreground text-xs">{param.description}</p>
                      </div>
                      <span className="font-mono text-lg font-bold">
                        {typeof param.value === "number" && param.value < 1
                          ? param.value.toFixed(2)
                          : param.value}
                      </span>
                    </div>
                    <Slider
                      value={[param.value * (param.max <= 1 ? 100 : 1)]}
                      min={param.min * (param.max <= 1 ? 100 : 1)}
                      max={param.max * (param.max <= 1 ? 100 : 1)}
                      step={param.step * (param.max <= 1 ? 100 : 1)}
                      onValueChange={([v]) =>
                        handleParamChange(param.key, param.max <= 1 ? v / 100 : v)
                      }
                    />
                    <div className="text-muted-foreground flex justify-between text-[10px]">
                      <span>{param.min}</span>
                      <span>{param.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 장르 가중치 탭 ── */}
        {activeTab === "genres" && (
          <div className="space-y-4">
            {/* 장르 추가 + 자동 가중치 */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-medium">장르 관리</h3>
              <div className="flex flex-wrap gap-2">
                <select
                  className="border-border bg-background min-w-[180px] rounded-md border px-3 py-2 text-sm"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option value="">장르 선택...</option>
                  {availableGenres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label} ({g.id})
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddGenre} disabled={!selectedGenre}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  추가
                </Button>
                <div className="border-border mx-1 border-l" />
                <Button size="sm" variant="outline" onClick={handleApplyPresets}>
                  <Wand2 className="mr-1 h-3.5 w-3.5" />
                  프리셋 초기화
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                엔진이 인식하는 공식 장르 목록에서 선택합니다. 프리셋 초기화: 모든 장르 가중치를
                추천값으로 복원합니다.
              </p>
            </div>

            {/* 수치 검증 / 자동 보정 */}
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">수치 검증</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleValidate}>
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    검증
                  </Button>
                  {validationIssues.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleAutoCorrect}>
                      <Wand2 className="mr-1 h-3.5 w-3.5" />
                      자동 보정
                    </Button>
                  )}
                </div>
              </div>
              {validationIssues.length > 0 ? (
                <div className="mt-3 space-y-1">
                  {validationIssues.map((issue, i) => (
                    <div
                      key={i}
                      className={`rounded px-3 py-1.5 text-xs ${
                        issue.type === "range"
                          ? "bg-red-500/10 text-red-400"
                          : issue.type === "imbalance"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      <span className="mr-1 font-medium uppercase">[{issue.type}]</span>
                      {issue.message}
                    </div>
                  ))}
                  <p className="text-muted-foreground mt-2 text-[10px]">
                    총 {validationIssues.length}건 — &quot;자동 보정&quot; 클릭 시 범위 클램핑 +
                    평균 정규화 + 과도 이탈 보간 수행
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground mt-2 text-xs">
                  &quot;검증&quot;을 클릭하면 범위 이탈, 차원 불균형, 프리셋 대비 과도 이탈을 자동
                  탐지합니다.
                </p>
              )}
            </div>

            {/* 장르×차원 가중치 테이블 */}
            <div className="bg-card overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="px-4 py-3 text-left font-medium">장르</th>
                    {L1_DIMS.map((dim) => (
                      <th key={dim} className="px-3 py-3 text-center text-xs font-medium">
                        {DIM_LABELS[dim]}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.genreWeights.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-muted-foreground px-4 py-8 text-center">
                        장르가 없습니다. 위에서 추가하세요.
                      </td>
                    </tr>
                  ) : (
                    profile.genreWeights.map((entry) => (
                      <tr key={entry.genre} className="border-border border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          <span>
                            {KNOWN_GENRES.find((g) => g.id === entry.genre)?.label ?? entry.genre}
                          </span>
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({entry.genre})
                          </span>
                        </td>
                        {L1_DIMS.map((dim) => {
                          const w = entry.weights[dim]
                          const color =
                            w >= 1.2
                              ? "text-blue-400"
                              : w <= 0.8
                                ? "text-amber-400"
                                : "text-muted-foreground"
                          return (
                            <td key={dim} className="px-3 py-3 text-center">
                              <input
                                type="number"
                                className={`border-border bg-background w-16 rounded border px-2 py-1 text-center text-xs ${color}`}
                                value={w}
                                min={0.5}
                                max={2.0}
                                step={0.1}
                                onChange={(e) =>
                                  handleGenreWeightChange(
                                    entry.genre,
                                    dim,
                                    parseFloat(e.target.value) || 1.0
                                  )
                                }
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => handleRemoveGenre(entry.genre)}
                            className="text-muted-foreground hover:text-destructive rounded p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground text-xs">
              가중치 범위: 0.5 ~ 2.0 (1.0 = 기본). 높은 값 = 해당 차원 강조, 낮은 값 = 약화
            </p>
          </div>
        )}

        {/* ── 자동 튜닝 탭 ── */}
        {activeTab === "autotuning" && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-medium">자동 튜닝</h3>
              <p className="text-muted-foreground mb-4 text-xs">
                가상 유저 50명을 생성하고 49개 파라미터 조합을 시뮬레이션하여 최적 하이퍼파라미터를
                자동으로 찾아 적용합니다.
              </p>

              <div className="mb-4 flex items-center gap-3">
                <select
                  className="border-border bg-background rounded-md border px-3 py-2 text-sm"
                  value={tuningTarget}
                  onChange={(e) =>
                    setTuningTarget(e.target.value as "quality" | "diversity" | "balanced")
                  }
                >
                  <option value="balanced">균형 (품질 + 다양성)</option>
                  <option value="quality">품질 중심</option>
                  <option value="diversity">다양성 중심</option>
                </select>
                <Button onClick={handleStartAutoTuning} disabled={autoTuningRunning}>
                  {autoTuningRunning ? (
                    <RotateCcw className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" />
                  )}
                  {autoTuningRunning ? "튜닝 중..." : "자동 튜닝 시작"}
                </Button>
              </div>

              {autoTuningResult && (
                <div className="space-y-3">
                  {/* 결과 요약 카드 */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-lg bg-emerald-500/10 p-3">
                      <p className="text-muted-foreground text-xs">최적 점수</p>
                      <p className="mt-1 text-sm font-bold text-emerald-400">
                        {Math.round(autoTuningResult.bestScore * 100)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <p className="text-muted-foreground text-xs">시뮬레이션</p>
                      <p className="mt-1 text-sm font-medium">{autoTuningResult.iterations}회</p>
                    </div>
                    <div className="rounded-lg bg-purple-500/10 p-3">
                      <p className="text-muted-foreground text-xs">소요 시간</p>
                      <p className="mt-1 text-sm font-medium">{autoTuningResult.durationMs}ms</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-3">
                      <p className="text-muted-foreground text-xs">적용</p>
                      <div className="mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">자동 적용됨</span>
                      </div>
                    </div>
                  </div>

                  {/* 최적 파라미터 */}
                  <div className="bg-background rounded-lg border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      최적 파라미터 (자동 적용됨)
                    </p>
                    <div className="space-y-1 text-xs">
                      {Object.entries(autoTuningResult.bestParameters).map(([key, value]) => {
                        const param = profile.parameters.find((p) => p.key === key)
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{param?.label ?? key}</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {typeof value === "number" && value < 1 ? value.toFixed(2) : value}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 상위 조합 결과 */}
                  <div className="bg-background rounded-lg border p-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      상위 조합 비교 (Top 5)
                    </p>
                    <div className="space-y-1">
                      {autoTuningResult.topResults.slice(0, 5).map((r, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                            i === 0 ? "bg-emerald-500/10 font-medium" : ""
                          }`}
                        >
                          <span className="text-muted-foreground">
                            {Object.entries(r.params)
                              .map(
                                ([k, v]) =>
                                  `${k}=${typeof v === "number" && v < 1 ? v.toFixed(2) : v}`
                              )
                              .join(", ")}
                          </span>
                          <span className={i === 0 ? "text-emerald-400" : "text-muted-foreground"}>
                            {Math.round(r.score * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!autoTuningResult && !autoTuningRunning && (
                <div className="flex flex-col items-center py-8 text-center">
                  <TestTubes className="text-muted-foreground mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">
                    최적화 목표를 선택하고 자동 튜닝을 시작하세요.
                    <br />
                    <span className="text-xs">
                      시뮬레이션 결과가 즉시 하이퍼파라미터에 자동 적용됩니다.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── A/B 테스트 탭 ── */}
        {activeTab === "abtest" && (
          <div className="space-y-4">
            {/* 새 A/B 테스트 생성 */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-medium">A/B 테스트 생성</h3>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-[200px] flex-1"
                  placeholder="테스트 이름"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateABTest()}
                />
                <select
                  className="border-border bg-background rounded-md border px-3 py-2 text-sm"
                  value={newTestType}
                  onChange={(e) => setNewTestType(e.target.value as ABTestType)}
                >
                  {AB_TEST_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleCreateABTest} disabled={!newTestName.trim()}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  생성
                </Button>
              </div>
            </div>

            {/* A/B 테스트 목록 */}
            {abTests.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <TestTubes className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  A/B 테스트를 생성하여 알고리즘 변경의 효과를 검증하세요
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {abTests.map((test) => {
                  const verdict = verdicts[test.id]
                  return (
                    <div key={test.id} className="bg-card rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{test.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {test.controlLabel} vs {test.treatmentLabel} · {test.trafficSplit[0]}/
                            {test.trafficSplit[1]} 분배
                          </p>
                        </div>
                        <Badge
                          variant={
                            test.status === "running"
                              ? "warning"
                              : test.status === "completed"
                                ? "success"
                                : test.status === "rolled_back"
                                  ? "destructive"
                                  : "muted"
                          }
                        >
                          {test.status}
                        </Badge>
                      </div>

                      <div className="mb-3 grid grid-cols-3 gap-3">
                        <div className="rounded bg-blue-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">유형</p>
                          <p className="text-xs font-medium capitalize">{test.type}</p>
                        </div>
                        <div className="rounded bg-purple-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">기간</p>
                          <p className="text-xs font-medium">{test.durationDays}일</p>
                        </div>
                        <div className="rounded bg-amber-500/10 p-2 text-center">
                          <p className="text-muted-foreground text-[10px]">메트릭</p>
                          <p className="text-xs font-medium">{test.metrics.length}종</p>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex flex-wrap gap-2">
                        {(test.status === "draft" || test.status === "paused") && (
                          <Button size="sm" onClick={() => handleABTestAction(test.id, "start")}>
                            <Play className="mr-1 h-3 w-3" />
                            시작
                          </Button>
                        )}
                        {test.status === "running" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleABTestAction(test.id, "pause")}
                            >
                              <Pause className="mr-1 h-3 w-3" />
                              일시중지
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleABTestAction(test.id, "complete")}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              완료
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleABTestAction(test.id, "rollback")}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              롤백
                            </Button>
                          </>
                        )}
                        {(test.status === "running" || test.status === "completed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEvaluateABTest(test.id)}
                          >
                            판정
                          </Button>
                        )}
                      </div>

                      {/* 판정 결과 */}
                      {verdict && (
                        <div
                          className={`mt-3 rounded-lg p-3 text-sm ${
                            verdict.winner === "treatment"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : verdict.winner === "control"
                                ? "bg-amber-500/10 text-amber-400"
                                : "text-muted-foreground bg-white/5"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {verdict.winner === "treatment" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              {verdict.winner === "treatment"
                                ? "신규 알고리즘 승리"
                                : verdict.winner === "control"
                                  ? "기존 알고리즘 유지"
                                  : "판정 불가"}
                            </span>
                            <span className="text-xs opacity-60">
                              신뢰도: {Math.round(verdict.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-xs">{verdict.recommendation}</p>
                          <p className="mt-1 text-[10px] opacity-60">
                            유의미한 차원: {verdict.significantDimensions}/{verdict.totalDimensions}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
