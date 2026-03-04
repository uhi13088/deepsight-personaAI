"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import {
  Search,
  Filter,
  Target,
  Brain,
  Layers,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react"

// ── 타입 ──────────────────────────────────────────────────────

interface PoolQuestion {
  id: string
  questionText: string
  questionOrder: number
  onboardingLevel: string
  questionType: string
  targetDimensions: string[]
  options: unknown
  poolCategory: string
  isAdaptive: boolean
  informationGain: number
  minPriorAnswers: number
}

interface PoolStats {
  total: number
  byCategory: Record<string, number>
  adaptive: number
  nonAdaptive: number
}

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  deepening: "Deepening",
  cross_layer: "Cross-Layer",
  verification: "Verification",
  narrative: "Narrative",
}

const CATEGORY_COLORS: Record<string, string> = {
  core: "bg-blue-100 text-blue-700",
  deepening: "bg-purple-100 text-purple-700",
  cross_layer: "bg-amber-100 text-amber-700",
  verification: "bg-green-100 text-green-700",
  narrative: "bg-pink-100 text-pink-700",
}

const LEVEL_LABELS: Record<string, string> = {
  QUICK: "Phase 1",
  STANDARD: "Phase 2",
  DEEP: "Phase 3",
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function QuestionPoolPage() {
  const [questions, setQuestions] = useState<PoolQuestion[]>([])
  const [stats, setStats] = useState<PoolStats | null>(null)
  const [loading, setLoading] = useState(true)

  // 필터
  const [filterCategory, setFilterCategory] = useState("")
  const [filterLevel, setFilterLevel] = useState("")
  const [filterAdaptive, setFilterAdaptive] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // 확장된 질문 (상세 보기)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 편집 중인 질문
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    poolCategory: string
    isAdaptive: boolean
    informationGain: number
    minPriorAnswers: number
  } | null>(null)

  // 데이터 로드
  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set("category", filterCategory)
      if (filterLevel) params.set("level", filterLevel)
      if (filterAdaptive) params.set("adaptive", filterAdaptive)
      if (searchQuery) params.set("search", searchQuery)

      const res = await fetch(`/api/internal/user-insight/question-pool?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        setQuestions(json.data.questions)
        setStats(json.data.stats)
      }
    } catch {
      // 에러 무시
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterLevel, filterAdaptive, searchQuery])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  // 편집 시작
  const handleEdit = (q: PoolQuestion) => {
    setEditingId(q.id)
    setEditForm({
      poolCategory: q.poolCategory,
      isAdaptive: q.isAdaptive,
      informationGain: q.informationGain,
      minPriorAnswers: q.minPriorAnswers,
    })
  }

  // 편집 저장
  const handleSave = async () => {
    if (!editingId || !editForm) return
    try {
      const res = await fetch(`/api/internal/user-insight/question-pool`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      })
      const json = await res.json()
      if (json.success) {
        setEditingId(null)
        setEditForm(null)
        await fetchQuestions()
      }
    } catch {
      // 에러 무시
    }
  }

  // 편집 취소
  const handleCancel = () => {
    setEditingId(null)
    setEditForm(null)
  }

  return (
    <>
      <Header title="Question Pool" description="적응형 온보딩 질문 풀 관리 (45문항)" />

      <div className="space-y-6 p-6">
        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              icon={<Layers className="h-4 w-4 text-blue-500" />}
              label="전체 질문"
              value={stats.total}
            />
            <StatCard
              icon={<Target className="h-4 w-4 text-purple-500" />}
              label="적응형"
              value={stats.adaptive}
              sub={`/ ${stats.total}`}
            />
            <StatCard
              icon={<Brain className="h-4 w-4 text-amber-500" />}
              label="Core"
              value={stats.byCategory.core ?? 0}
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-green-500" />}
              label="Deepening"
              value={stats.byCategory.deepening ?? 0}
            />
            <StatCard
              icon={<CheckCircle className="h-4 w-4 text-pink-500" />}
              label="Verification"
              value={(stats.byCategory.verification ?? 0) + (stats.byCategory.narrative ?? 0)}
              sub="+ Narrative"
            />
          </div>
        )}

        {/* 필터 바 */}
        <div className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="질문 검색..."
              className="border-border bg-background w-full rounded-md border py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground h-4 w-4" />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
            >
              <option value="">카테고리 전체</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
            >
              <option value="">레벨 전체</option>
              <option value="QUICK">QUICK (Phase 1)</option>
              <option value="STANDARD">STANDARD (Phase 2)</option>
              <option value="DEEP">DEEP (Phase 3)</option>
            </select>

            <select
              value={filterAdaptive}
              onChange={(e) => setFilterAdaptive(e.target.value)}
              className="border-border bg-background rounded-md border px-2 py-1.5 text-xs"
            >
              <option value="">적응형 전체</option>
              <option value="true">적응형만</option>
              <option value="false">기존만</option>
            </select>
          </div>
        </div>

        {/* 질문 테이블 */}
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-left text-xs">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">질문</th>
                <th className="px-4 py-2.5 font-medium">레벨</th>
                <th className="px-4 py-2.5 font-medium">카테고리</th>
                <th className="px-4 py-2.5 font-medium">대상 차원</th>
                <th className="px-4 py-2.5 font-medium">적응형</th>
                <th className="px-4 py-2.5 font-medium">Info Gain</th>
                <th className="px-4 py-2.5 font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-4 py-12 text-center text-sm">
                    로딩 중...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <AlertCircle className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">질문이 없습니다</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    isExpanded={expandedId === q.id}
                    isEditing={editingId === q.id}
                    editForm={editingId === q.id ? editForm : null}
                    onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    onEdit={() => handleEdit(q)}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onFormChange={setEditForm}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── 통계 카드 ────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
}) {
  return (
    <div className="border-border rounded-lg border p-3">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold">{value}</span>
        {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
      </div>
    </div>
  )
}

// ── 질문 행 ──────────────────────────────────────────────────

function QuestionRow({
  question: q,
  isExpanded,
  isEditing,
  editForm,
  onToggleExpand,
  onEdit,
  onSave,
  onCancel,
  onFormChange,
}: {
  question: PoolQuestion
  isExpanded: boolean
  isEditing: boolean
  editForm: {
    poolCategory: string
    isAdaptive: boolean
    informationGain: number
    minPriorAnswers: number
  } | null
  onToggleExpand: () => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onFormChange: (
    form: {
      poolCategory: string
      isAdaptive: boolean
      informationGain: number
      minPriorAnswers: number
    } | null
  ) => void
}) {
  return (
    <>
      <tr className="border-border hover:bg-muted/30 border-t text-sm transition-colors">
        <td className="text-muted-foreground px-4 py-2.5 text-xs">{q.questionOrder}</td>
        <td className="max-w-xs px-4 py-2.5">
          <button onClick={onToggleExpand} className="flex items-start gap-1 text-left">
            {isExpanded ? (
              <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span className="line-clamp-2 text-sm">{q.questionText}</span>
          </button>
        </td>
        <td className="px-4 py-2.5">
          <span className="text-muted-foreground text-xs">
            {LEVEL_LABELS[q.onboardingLevel] ?? q.onboardingLevel}
          </span>
        </td>
        <td className="px-4 py-2.5">
          {isEditing && editForm ? (
            <select
              value={editForm.poolCategory}
              onChange={(e) => onFormChange({ ...editForm, poolCategory: e.target.value })}
              className="border-border bg-background rounded border px-1.5 py-0.5 text-xs"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[q.poolCategory] ?? "bg-gray-100 text-gray-700"}`}
            >
              {CATEGORY_LABELS[q.poolCategory] ?? q.poolCategory}
            </span>
          )}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap gap-1">
            {q.targetDimensions.map((dim) => (
              <span
                key={dim}
                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
              >
                {dim}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-2.5 text-center">
          {isEditing && editForm ? (
            <input
              type="checkbox"
              checked={editForm.isAdaptive}
              onChange={(e) => onFormChange({ ...editForm, isAdaptive: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
          ) : (
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                q.isAdaptive ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {q.isAdaptive ? "✓" : "–"}
            </span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {isEditing && editForm ? (
            <input
              type="number"
              value={editForm.informationGain}
              onChange={(e) =>
                onFormChange({
                  ...editForm,
                  informationGain: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)),
                })
              }
              step={0.05}
              min={0}
              max={1}
              className="border-border bg-background w-16 rounded border px-1.5 py-0.5 text-xs"
            />
          ) : (
            <span className="text-muted-foreground text-xs">{q.informationGain.toFixed(2)}</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {isEditing ? (
            <div className="flex gap-1">
              <button
                onClick={onSave}
                className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
              >
                저장
              </button>
              <button
                onClick={onCancel}
                className="text-muted-foreground rounded px-2 py-0.5 text-xs hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="text-muted-foreground rounded px-2 py-0.5 text-xs hover:bg-gray-100 hover:text-blue-600"
            >
              편집
            </button>
          )}
        </td>
      </tr>

      {/* 확장 상세 */}
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={8} className="px-8 py-3">
            <QuestionDetail question={q} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── 질문 상세 (확장 패널) ────────────────────────────────────

function QuestionDetail({ question: q }: { question: PoolQuestion }) {
  const options = (q.options ?? []) as Array<{
    key: string
    label: string
    l1Weights?: Record<string, number>
    l2Weights?: Record<string, number>
    l3Weights?: Record<string, number>
  }>

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex gap-4 text-xs">
        <span>타입: {q.questionType}</span>
        <span>최소 사전답변: {q.minPriorAnswers}</span>
        <span>정보 이득: {q.informationGain.toFixed(2)}</span>
      </div>

      {options.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium">선택지 ({options.length}개)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt) => (
              <div key={opt.key} className="border-border rounded-md border p-2">
                <p className="mb-1 text-xs font-medium">
                  [{opt.key}] {opt.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {opt.l1Weights &&
                    Object.entries(opt.l1Weights).map(([dim, w]) => (
                      <span
                        key={dim}
                        className={`rounded px-1 py-0.5 text-[10px] ${
                          w > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        L1.{dim}: {w > 0 ? "+" : ""}
                        {w}
                      </span>
                    ))}
                  {opt.l2Weights &&
                    Object.entries(opt.l2Weights).map(([dim, w]) => (
                      <span
                        key={dim}
                        className={`rounded px-1 py-0.5 text-[10px] ${
                          w > 0 ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        L2.{dim}: {w > 0 ? "+" : ""}
                        {w}
                      </span>
                    ))}
                  {opt.l3Weights &&
                    Object.entries(opt.l3Weights).map(([dim, w]) => (
                      <span
                        key={dim}
                        className={`rounded px-1 py-0.5 text-[10px] ${
                          w > 0 ? "bg-purple-50 text-purple-700" : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        L3.{dim}: {w > 0 ? "+" : ""}
                        {w}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
