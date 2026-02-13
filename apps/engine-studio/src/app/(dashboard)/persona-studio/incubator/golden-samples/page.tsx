"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

// ── 타입 ────────────────────────────────────────────────────────

interface GoldenSampleItem {
  id: string
  contentTitle: string
  contentType: string | null
  genre: string | null
  description: string | null
  testQuestion: string
  expectedReactions: Record<string, string> | null
  difficultyLevel: string
  validationDimensions: string[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface GoldenSampleMetrics {
  totalSamples: number
  activeSamples: number
  avgPassRate: number
  dimensionCoverage: Record<string, number>
  difficultyDistribution: Record<string, number>
  shouldExpand: boolean
  targetPoolSize: number
  expansionCount: number
}

interface FormData {
  contentTitle: string
  contentType: string
  genre: string
  description: string
  testQuestion: string
  expectedReactions: string // JSON 문자열
  difficultyLevel: string
  validationDimensions: string[]
}

const EMPTY_FORM: FormData = {
  contentTitle: "",
  contentType: "",
  genre: "",
  description: "",
  testQuestion: "",
  expectedReactions: "{}",
  difficultyLevel: "MEDIUM",
  validationDimensions: [],
}

const ALL_DIMENSIONS = ["depth", "lens", "purpose", "stance", "scope", "taste"]

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-emerald-500/10 text-emerald-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  HARD: "bg-red-500/10 text-red-400",
}

// ═══════════════════════════════════════════════════════════════

export default function GoldenSamplesPage() {
  const [samples, setSamples] = useState<GoldenSampleItem[]>([])
  const [metrics, setMetrics] = useState<GoldenSampleMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // 필터
  const [search, setSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("")
  const [activeOnly, setActiveOnly] = useState(false)

  // 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ── 데이터 로드 ────────────────────────────────────────────

  const fetchSamples = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    if (search) params.set("search", search)
    if (difficultyFilter) params.set("difficulty", difficultyFilter)
    if (activeOnly) params.set("activeOnly", "true")

    fetch(`/api/internal/incubator/golden-samples?${params}`)
      .then((r) => r.json())
      .then((d: { success: boolean; data?: { items: GoldenSampleItem[]; total: number } }) => {
        if (d.success && d.data) {
          setSamples(d.data.items)
          setTotal(d.data.total)
        } else {
          setError("데이터 로드 실패")
        }
      })
      .catch(() => setError("데이터 로드 실패"))
      .finally(() => setLoading(false))
  }, [page, search, difficultyFilter, activeOnly])

  const fetchMetrics = useCallback(() => {
    fetch("/api/internal/incubator/golden-samples/metrics")
      .then((r) => r.json())
      .then((d: { success: boolean; data?: GoldenSampleMetrics }) => {
        if (d.success && d.data) setMetrics(d.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchSamples()
  }, [fetchSamples])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // ── CRUD 핸들러 ──────────────────────────────────────────────

  function openCreateForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(sample: GoldenSampleItem) {
    setEditingId(sample.id)
    setForm({
      contentTitle: sample.contentTitle,
      contentType: sample.contentType ?? "",
      genre: sample.genre ?? "",
      description: sample.description ?? "",
      testQuestion: sample.testQuestion,
      expectedReactions: JSON.stringify(sample.expectedReactions ?? {}, null, 2),
      difficultyLevel: sample.difficultyLevel,
      validationDimensions: [...sample.validationDimensions],
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit() {
    setSaving(true)
    setFormError(null)

    try {
      let parsedReactions: Record<string, string>
      try {
        parsedReactions = JSON.parse(form.expectedReactions)
      } catch {
        setFormError("expectedReactions JSON 형식이 올바르지 않습니다")
        setSaving(false)
        return
      }

      const payload = {
        contentTitle: form.contentTitle,
        contentType: form.contentType || null,
        genre: form.genre || null,
        description: form.description || null,
        testQuestion: form.testQuestion,
        expectedReactions: parsedReactions,
        difficultyLevel: form.difficultyLevel,
        validationDimensions: form.validationDimensions,
      }

      const url = editingId
        ? `/api/internal/incubator/golden-samples/${editingId}`
        : "/api/internal/incubator/golden-samples"

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!data.success) {
        setFormError(data.error?.message ?? "저장 실패")
        setSaving(false)
        return
      }

      closeForm()
      fetchSamples()
      fetchMetrics()
    } catch {
      setFormError("저장 중 오류 발생")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 샘플을 비활성화하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/internal/incubator/golden-samples/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        fetchSamples()
        fetchMetrics()
      }
    } catch {
      // ignore
    }
  }

  async function handleToggleActive(sample: GoldenSampleItem) {
    try {
      const res = await fetch(`/api/internal/incubator/golden-samples/${sample.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sample.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        fetchSamples()
        fetchMetrics()
      }
    } catch {
      // ignore
    }
  }

  // ── 렌더링 ─────────────────────────────────────────────────

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header
        title="Golden Samples"
        description="페르소나 검증용 골든 샘플 관리 — 등록, 수정, 차원 커버리지 확인"
      />

      <div className="space-y-6 p-6">
        {/* 메트릭 카드 */}
        {metrics && <MetricsCards metrics={metrics} />}

        {/* 필터 + 생성 버튼 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="제목, 장르, 질문으로 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="bg-card border-border w-full rounded-lg border py-2 pl-10 pr-3 text-sm"
            />
          </div>

          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value)
              setPage(1)
            }}
            className="bg-card border-border rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">전체 난이도</option>
            <option value="EASY">EASY</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HARD">HARD</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked)
                setPage(1)
              }}
              className="rounded"
            />
            <span className="text-muted-foreground">활성만</span>
          </label>

          <button
            onClick={openCreateForm}
            className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />새 샘플
          </button>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">로딩 중...</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-400">{error}</div>
        ) : samples.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            등록된 골든 샘플이 없습니다. &quot;새 샘플&quot; 버튼으로 추가하세요.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-left text-xs">
                    <th className="px-4 py-3 font-medium">제목</th>
                    <th className="px-4 py-3 font-medium">장르</th>
                    <th className="px-4 py-3 font-medium">난이도</th>
                    <th className="px-4 py-3 font-medium">검증 차원</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">버전</th>
                    <th className="px-4 py-3 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {samples.map((sample) => (
                    <tr key={sample.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{sample.contentTitle}</p>
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {sample.testQuestion}
                          </p>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{sample.genre ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[sample.difficultyLevel] ?? ""}`}
                        >
                          {sample.difficultyLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sample.validationDimensions.map((dim) => (
                            <Badge key={dim} variant="outline" className="text-[10px]">
                              {dim}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(sample)}
                          className="cursor-pointer"
                          title={sample.isActive ? "클릭하여 비활성화" : "클릭하여 활성화"}
                        >
                          <Badge variant={sample.isActive ? "success" : "secondary"}>
                            {sample.isActive ? "활성" : "비활성"}
                          </Badge>
                        </button>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-center">
                        v{sample.version}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(sample)}
                            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                            title="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {sample.isActive && (
                            <button
                              onClick={() => handleDelete(sample.id, sample.contentTitle)}
                              className="rounded p-1 text-red-400 transition-colors hover:text-red-300"
                              title="비활성화"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  총 {total}개 중 {(page - 1) * pageSize + 1}~{Math.min(page * pageSize, total)}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-border rounded-lg border p-1.5 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-muted-foreground px-3 text-xs">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="border-border rounded-lg border p-1.5 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 생성/수정 폼 모달 */}
        {showForm && (
          <SampleForm
            form={form}
            setForm={setForm}
            isEditing={!!editingId}
            saving={saving}
            error={formError}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
        )}
      </div>
    </>
  )
}

// ── 메트릭 카드 ──────────────────────────────────────────────

function MetricsCards({ metrics }: { metrics: GoldenSampleMetrics }) {
  const dimEntries = Object.entries(metrics.dimensionCoverage).sort(([, a], [, b]) => b - a)

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* 풀 현황 */}
      <div className="bg-card rounded-lg border p-4">
        <p className="text-muted-foreground text-xs">전체 / 활성</p>
        <p className="mt-1 text-2xl font-bold text-blue-400">
          {metrics.activeSamples}
          <span className="text-muted-foreground text-sm font-normal">
            {" "}
            / {metrics.totalSamples}
          </span>
        </p>
      </div>

      {/* 난이도 분포 */}
      <div className="bg-card rounded-lg border p-4">
        <p className="text-muted-foreground text-xs">난이도 분포</p>
        <div className="mt-2 flex items-center gap-2">
          {["EASY", "MEDIUM", "HARD"].map((d) => (
            <span
              key={d}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[d]}`}
            >
              {d}: {metrics.difficultyDistribution[d] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* 차원 커버리지 */}
      <div className="bg-card rounded-lg border p-4">
        <p className="text-muted-foreground text-xs">차원 커버리지</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {dimEntries.map(([dim, cov]) => (
            <Badge key={dim} variant="outline" className="text-[10px]">
              {dim}: {Math.round(cov * 100)}%
            </Badge>
          ))}
        </div>
      </div>

      {/* 확장 필요 */}
      <div className="bg-card rounded-lg border p-4">
        <p className="text-muted-foreground text-xs">확장 상태</p>
        {metrics.shouldExpand ? (
          <div className="mt-1 flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              +{metrics.expansionCount}개 필요 (목표 {metrics.targetPoolSize})
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">충분 (목표 {metrics.targetPoolSize})</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 생성/수정 폼 ────────────────────────────────────────────

function SampleForm({
  form,
  setForm,
  isEditing,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  isEditing: boolean
  saving: boolean
  error: string | null
  onSubmit: () => void
  onClose: () => void
}) {
  function toggleDimension(dim: string) {
    setForm((prev) => ({
      ...prev,
      validationDimensions: prev.validationDimensions.includes(dim)
        ? prev.validationDimensions.filter((d) => d !== dim)
        : [...prev.validationDimensions, dim],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? "골든 샘플 수정" : "새 골든 샘플 등록"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              콘텐츠 제목 *
            </label>
            <input
              type="text"
              value={form.contentTitle}
              onChange={(e) => setForm((p) => ({ ...p, contentTitle: e.target.value }))}
              placeholder="예: 기생충"
              className="bg-background border-border w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* 장르 + 콘텐츠 타입 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">장르</label>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}
                placeholder="예: 드라마/스릴러"
                className="bg-background border-border w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                콘텐츠 타입
              </label>
              <input
                type="text"
                value={form.contentType}
                onChange={(e) => setForm((p) => ({ ...p, contentType: e.target.value }))}
                placeholder="예: 영화, 드라마, 도서"
                className="bg-background border-border w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">설명</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="샘플에 대한 간단한 설명"
              className="bg-background border-border w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* 테스트 질문 */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              테스트 질문 *
            </label>
            <textarea
              value={form.testQuestion}
              onChange={(e) => setForm((p) => ({ ...p, testQuestion: e.target.value }))}
              placeholder="페르소나에게 던질 질문을 입력하세요"
              rows={3}
              className="bg-background border-border w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* 예상 반응 (JSON) */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              예상 반응 (JSON)
            </label>
            <textarea
              value={form.expectedReactions}
              onChange={(e) => setForm((p) => ({ ...p, expectedReactions: e.target.value }))}
              placeholder={
                '{\n  "high-depth": "깊은 분석적 반응",\n  "low-depth": "가벼운 감상"\n}'
              }
              rows={6}
              className="bg-background border-border w-full rounded-lg border px-3 py-2 font-mono text-xs"
            />
            <p className="text-muted-foreground mt-1 text-[10px]">
              성향별 예상 응답을 JSON 형식으로 입력. 키: &quot;high-depth&quot;,
              &quot;low-lens&quot; 등
            </p>
          </div>

          {/* 난이도 */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">난이도</label>
            <div className="flex gap-2">
              {["EASY", "MEDIUM", "HARD"].map((d) => (
                <button
                  key={d}
                  onClick={() => setForm((p) => ({ ...p, difficultyLevel: d }))}
                  className={`rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors ${
                    form.difficultyLevel === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 검증 차원 */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              검증 차원
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DIMENSIONS.map((dim) => (
                <button
                  key={dim}
                  onClick={() => toggleDimension(dim)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.validationDimensions.includes(dim)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {dim}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="border-border hover:bg-accent rounded-lg border px-4 py-2 text-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || !form.contentTitle.trim() || !form.testQuestion.trim()}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "저장 중..." : isEditing ? "수정" : "등록"}
          </button>
        </div>
      </div>
    </div>
  )
}
