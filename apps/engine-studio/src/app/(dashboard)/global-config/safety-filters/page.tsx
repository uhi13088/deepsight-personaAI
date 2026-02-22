"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Plus, Trash2, Play, AlertTriangle, Lock } from "lucide-react"
import type {
  SafetyFilterConfig,
  FilterLevel,
  FilterAction,
  ForbiddenWord,
  FilterEvaluationResult,
  FilterLogEntry,
} from "@/lib/global-config"

// ── 한국어 라벨 매핑 ────────────────────────────────────────────

const SEVERITY_LABEL: Record<ForbiddenWord["severity"], string> = {
  critical: "치명적",
  high: "높음",
  medium: "보통",
  low: "낮음",
}

const SEVERITY_VARIANT: Record<
  ForbiddenWord["severity"],
  "destructive" | "warning" | "info" | "muted"
> = {
  critical: "destructive",
  high: "warning",
  medium: "info",
  low: "muted",
}

const ACTION_LABEL: Record<FilterAction, string> = {
  block: "차단",
  warn: "경고",
  flag: "플래그",
  pass: "통과",
}

const ACTION_VARIANT: Record<FilterAction, "destructive" | "warning" | "info" | "success"> = {
  block: "destructive",
  warn: "warning",
  flag: "info",
  pass: "success",
}

// ── 카테고리 정의 ──────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "violence", label: "폭력" },
  { value: "self_harm", label: "자해" },
  { value: "discrimination", label: "차별" },
  { value: "hate_speech", label: "혐오 표현" },
  { value: "explicit", label: "음란" },
  { value: "illegal", label: "불법" },
  { value: "fraud", label: "사기" },
  { value: "harassment", label: "괴롭힘" },
  { value: "misinformation", label: "허위정보" },
  { value: "privacy", label: "개인정보" },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
)

// ── 필터 레벨 정의 ─────────────────────────────────────────────

const FILTER_LEVELS: { value: FilterLevel; label: string; description: string; detail: string }[] =
  [
    {
      value: "strict",
      label: "엄격",
      description: "가장 강력한 필터링",
      detail: "치명적·높음 → 차단 | 보통 → 경고 | 낮음 → 플래그",
    },
    {
      value: "moderate",
      label: "보통",
      description: "균형 잡힌 필터링",
      detail: "치명적 → 차단 | 높음 → 경고 | 보통 → 플래그 | 낮음 → 통과",
    },
    {
      value: "permissive",
      label: "관대",
      description: "최소한의 필터링",
      detail: "치명적 → 차단 | 높음 → 플래그 | 보통·낮음 → 통과",
    },
  ]

// ── API response shape ───────────────────────────────────────
interface LogSummary {
  totalEntries: number
  byAction: Record<FilterAction, number>
  byLevel: Record<FilterLevel, number>
  recentBlocks: FilterLogEntry[]
}

interface SafetyFilterData {
  config: SafetyFilterConfig
  logs: FilterLogEntry[]
  logSummary: LogSummary
}

export default function SafetyFiltersPage() {
  const [data, setData] = useState<SafetyFilterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── New word form state ────────────────────────────────────────
  const [newWord, setNewWord] = useState("")
  const [newCategory, setNewCategory] = useState(CATEGORY_OPTIONS[0].value)
  const [newSeverity, setNewSeverity] = useState<ForbiddenWord["severity"]>("medium")
  const [addError, setAddError] = useState<string | null>(null)

  // ── Test simulator state ───────────────────────────────────────
  const [testInput, setTestInput] = useState("")
  const [testResult, setTestResult] = useState<FilterEvaluationResult | null>(null)

  // ── Fetch data from API ────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/global-config/safety")
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
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

  // ── Filter level change ────────────────────────────────────────
  const handleLevelChange = useCallback(async (level: FilterLevel) => {
    setTestResult(null)
    try {
      const res = await fetch("/api/internal/global-config/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeLevel", level }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // ── Add forbidden word ─────────────────────────────────────────
  const handleAddWord = useCallback(async () => {
    if (!newWord.trim() || !newCategory.trim()) {
      setAddError("Word and category are required")
      return
    }
    try {
      const word: ForbiddenWord = {
        word: newWord.trim(),
        category: newCategory.trim(),
        severity: newSeverity,
        exactMatch: false,
      }
      const res = await fetch("/api/internal/global-config/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addWord", word }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setNewWord("")
        setNewCategory("")
        setNewSeverity("medium")
        setAddError(null)
      } else {
        setAddError(json.error?.message ?? "Failed to add word")
      }
    } catch {
      setAddError("Failed to add word")
    }
  }, [newWord, newCategory, newSeverity])

  // ── Remove forbidden word ──────────────────────────────────────
  const handleRemoveWord = useCallback(async (word: string, category: string) => {
    try {
      const res = await fetch("/api/internal/global-config/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeWord", word, category }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // Word not found - already removed
    }
  }, [])

  // ── Test simulator ─────────────────────────────────────────────
  const handleTestFilter = useCallback(async () => {
    if (!testInput.trim()) return
    try {
      const res = await fetch("/api/internal/global-config/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", input: testInput }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setTestResult(json.data.result)
        setData(json.data.filter)
      }
    } catch {
      // silently fail
    }
  }, [testInput])

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Safety Filters" description="안전 필터 강도 및 금기어 관리" />
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
        <Header title="Safety Filters" description="안전 필터 강도 및 금기어 관리" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error ?? "데이터를 불러올 수 없습니다"}</div>
        </div>
      </>
    )
  }

  const { config: filterConfig, logSummary } = data

  return (
    <>
      <Header title="Safety Filters" description="안전 필터 강도 및 금기어 관리" />

      <div className="space-y-6 p-6">
        {/* ── Filter Level Selector ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Filter Level</h3>
            <Badge
              variant={
                filterConfig.level === "strict"
                  ? "destructive"
                  : filterConfig.level === "moderate"
                    ? "warning"
                    : "info"
              }
            >
              {filterConfig.level}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FILTER_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => handleLevelChange(level.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  filterConfig.level === level.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <p className="text-sm font-medium">{level.label}</p>
                <p className="text-muted-foreground mt-1 text-xs">{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Forbidden Words Table ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="text-muted-foreground h-4 w-4" />
              <h3 className="text-sm font-medium">
                Forbidden Words ({filterConfig.forbiddenWords.length})
              </h3>
            </div>
          </div>

          {/* Add new word form */}
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Word</label>
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Enter word..."
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Category</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. violence"
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px]">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as ForbiddenWord["severity"])}
                className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <Button size="sm" onClick={handleAddWord}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {addError && <p className="mb-3 text-xs text-red-400">{addError}</p>}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">Word</th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Category
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                    Severity
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Match Type
                  </th>
                  <th className="text-muted-foreground px-3 py-2 text-center font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filterConfig.forbiddenWords.map((fw) => (
                  <tr
                    key={`${fw.word}-${fw.category}`}
                    className="border-border border-b last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">{fw.word}</td>
                    <td className="text-muted-foreground px-3 py-2">{fw.category}</td>
                    <td className="px-3 py-2">
                      <Badge variant={SEVERITY_VARIANT[fw.severity]} className="text-[10px]">
                        {fw.severity}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center text-[10px]">
                      {fw.exactMatch ? "Exact" : "Contains"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemoveWord(fw.word, fw.category)}
                      >
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Filter Log Summary ─────────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Filter Log Summary</h3>
            <Badge variant="muted">{logSummary.totalEntries} entries</Badge>
          </div>

          {/* Action stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["block", "warn", "flag", "pass"] as const).map((action) => (
              <div key={action} className="rounded-lg border p-3 text-center">
                <p className="text-muted-foreground text-[10px] uppercase">{action}</p>
                <p className="mt-1 text-lg font-bold">{logSummary.byAction[action]}</p>
              </div>
            ))}
          </div>

          {/* Recent blocks */}
          {logSummary.recentBlocks.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-xs font-medium">
                Recent Blocks ({logSummary.recentBlocks.length})
              </h4>
              <div className="space-y-1">
                {logSummary.recentBlocks.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded border px-3 py-1.5 text-xs"
                  >
                    <span className="truncate">{log.input}</span>
                    <div className="ml-2 flex items-center gap-2">
                      <span className="text-muted-foreground">{log.matchedWord ?? "N/A"}</span>
                      <Badge variant="destructive" className="text-[10px]">
                        {log.action}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Filter Test Simulator ──────────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Play className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Filter Test Simulator</h3>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-muted-foreground text-[10px]">Test Input</label>
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTestFilter()
                }}
                placeholder="Enter text to test against filters..."
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={handleTestFilter} disabled={!testInput.trim()}>
              <Play className="mr-1.5 h-4 w-4" />
              Evaluate
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className="mt-4 rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-medium">Result</h4>
                <Badge variant={ACTION_VARIANT[testResult.action]} className="text-sm">
                  {testResult.action.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-muted-foreground flex justify-between">
                  <span>Passed</span>
                  <span className={testResult.passed ? "text-emerald-400" : "text-red-400"}>
                    {testResult.passed ? "Yes" : "No"}
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Action</span>
                  <span className="font-medium">{testResult.action}</span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Matched Words</span>
                  <span className="font-medium">
                    {testResult.matchedWords.length > 0
                      ? testResult.matchedWords.map((m) => m.word).join(", ")
                      : "None"}
                  </span>
                </div>

                {testResult.matchedWords.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-muted-foreground text-[10px] font-medium">Matched Details</p>
                    {testResult.matchedWords.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant={SEVERITY_VARIANT[m.severity]} className="text-[10px]">
                          {m.severity}
                        </Badge>
                        <span>{m.word}</span>
                        <span className="text-muted-foreground">({m.category})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
