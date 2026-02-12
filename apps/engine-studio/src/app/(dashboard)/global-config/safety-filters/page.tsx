"use client"

import { useState, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Plus, Trash2, Play, AlertTriangle, Lock } from "lucide-react"
import {
  createSafetyFilter,
  evaluateFilter,
  addForbiddenWord,
  removeForbiddenWord,
  getFilterLogSummary,
} from "@/lib/global-config"
import type {
  SafetyFilter,
  FilterLevel,
  FilterAction,
  ForbiddenWord,
  FilterEvaluationResult,
} from "@/lib/global-config"

// ── Severity badge variant mapping ──────────────────────────────
const SEVERITY_VARIANT: Record<
  ForbiddenWord["severity"],
  "destructive" | "warning" | "info" | "muted"
> = {
  critical: "destructive",
  high: "warning",
  medium: "info",
  low: "muted",
}

const ACTION_VARIANT: Record<FilterAction, "destructive" | "warning" | "info" | "success"> = {
  block: "destructive",
  warn: "warning",
  flag: "info",
  pass: "success",
}

const FILTER_LEVELS: { value: FilterLevel; label: string; description: string }[] = [
  { value: "strict", label: "Strict", description: "Most restrictive - blocks high severity" },
  { value: "moderate", label: "Moderate", description: "Balanced - warns on high severity" },
  {
    value: "permissive",
    label: "Permissive",
    description: "Least restrictive - flags high severity",
  },
]

export default function SafetyFiltersPage() {
  const [filter, setFilter] = useState<SafetyFilter>(() => {
    // Initialize with some sample log entries
    let f = createSafetyFilter()
    const samples = ["안녕하세요", "폭력적인 내용", "좋은 하루 되세요", "차별 발언", "도박 사이트"]
    for (const text of samples) {
      const { updatedFilter } = evaluateFilter(f, text)
      f = updatedFilter
    }
    return f
  })

  // ── New word form state ────────────────────────────────────────
  const [newWord, setNewWord] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newSeverity, setNewSeverity] = useState<ForbiddenWord["severity"]>("medium")
  const [addError, setAddError] = useState<string | null>(null)

  // ── Test simulator state ───────────────────────────────────────
  const [testInput, setTestInput] = useState("")
  const [testResult, setTestResult] = useState<FilterEvaluationResult | null>(null)

  const logSummary = useMemo(() => getFilterLogSummary(filter), [filter])

  // ── Filter level change ────────────────────────────────────────
  const handleLevelChange = useCallback((level: FilterLevel) => {
    setFilter((prev) => ({
      ...prev,
      config: { ...prev.config, level },
    }))
    setTestResult(null)
  }, [])

  // ── Add forbidden word ─────────────────────────────────────────
  const handleAddWord = useCallback(() => {
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
      setFilter((prev) => addForbiddenWord(prev, word))
      setNewWord("")
      setNewCategory("")
      setNewSeverity("medium")
      setAddError(null)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add word")
    }
  }, [newWord, newCategory, newSeverity])

  // ── Remove forbidden word ──────────────────────────────────────
  const handleRemoveWord = useCallback((word: string, category: string) => {
    try {
      setFilter((prev) => removeForbiddenWord(prev, word, category))
    } catch {
      // Word not found - already removed
    }
  }, [])

  // ── Test simulator ─────────────────────────────────────────────
  const handleTestFilter = useCallback(() => {
    if (!testInput.trim()) return
    const { result, updatedFilter } = evaluateFilter(filter, testInput)
    setTestResult(result)
    setFilter(updatedFilter)
  }, [filter, testInput])

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
                filter.config.level === "strict"
                  ? "destructive"
                  : filter.config.level === "moderate"
                    ? "warning"
                    : "info"
              }
            >
              {filter.config.level}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {FILTER_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => handleLevelChange(level.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  filter.config.level === level.value
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
                Forbidden Words ({filter.config.forbiddenWords.length})
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
                {filter.config.forbiddenWords.map((fw) => (
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
