"use client"

import { useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Loader2, AlertTriangle, Save } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePersonaDetail } from "@/hooks/use-persona-detail"
import { LifecycleActions } from "@/components/persona/edit/lifecycle-actions"
import { DuplicateDialog } from "@/components/persona/edit/duplicate-dialog"
import { STATUS_LABELS, STATUS_COLORS, isActiveStatus, isEditable } from "@/lib/lifecycle"
import { PERSONA_ROLES, EXPERTISE_OPTIONS } from "@/types/persona-form"
import type { PersonaStatus } from "@prisma/client"
import type {
  ApiResponse,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"

// ── Dimension labels ────────────────────────────────────────

const L1_LABELS: Record<string, [string, string]> = {
  depth: ["직관적", "심층적"],
  lens: ["감성적", "논리적"],
  stance: ["수용적", "비판적"],
  scope: ["핵심", "디테일"],
  taste: ["클래식", "실험적"],
  purpose: ["오락", "의미추구"],
  sociability: ["내향", "외향"],
}

const L2_LABELS: Record<string, string> = {
  openness: "개방성",
  conscientiousness: "성실성",
  extraversion: "외향성",
  agreeableness: "우호성",
  neuroticism: "신경성",
}

const L3_LABELS: Record<string, string> = {
  lack: "결핍",
  moralCompass: "도덕 나침반",
  volatility: "변동성",
  growthArc: "성장 궤적",
}

// ── Tab type ────────────────────────────────────────────────

type TabId = "overview" | "vectors" | "prompt"

export default function PersonaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error, refetch } = usePersonaDetail(id)

  const [tab, setTab] = useState<TabId>("overview")
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Edit state
  const [editName, setEditName] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState<string | null>(null)
  const [editPrompt, setEditPrompt] = useState<string | null>(null)

  // ── Loading / Error ─────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Header title="페르소나 상세" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header title="페르소나 상세" />
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {error ?? "데이터를 찾을 수 없습니다."}
          </div>
          <Link href="/persona-studio/list" className="text-primary mt-4 inline-block text-sm">
            ← 목록으로
          </Link>
        </div>
      </>
    )
  }

  const status = data.status as PersonaStatus
  const editable = isEditable(status)
  const activeWarning = isActiveStatus(status)

  // Values with edit overrides
  const currentName = editName ?? data.name
  const currentDescription = editDescription ?? data.description ?? ""
  const currentPrompt = editPrompt ?? data.basePrompt

  const hasChanges = editName !== null || editDescription !== null || editPrompt !== null

  // ── Save handler ────────────────────────────────────────────
  const handleSave = async () => {
    if (!hasChanges) return

    if (activeWarning) {
      const confirmed = window.confirm(
        "이 페르소나는 현재 활성 상태입니다. 변경 사항이 즉시 반영됩니다. 계속하시겠습니까?"
      )
      if (!confirmed) return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const body: Record<string, unknown> = {}
      if (editName !== null) body.name = editName
      if (editDescription !== null) body.description = editDescription || null
      if (editPrompt !== null) body.basePrompt = editPrompt

      const res = await fetch(`/api/internal/personas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result: ApiResponse<{ id: string }> = await res.json()
      if (!result.success) throw new Error(result.error?.message ?? "저장 실패")

      // Reset edit state and refetch
      setEditName(null)
      setEditDescription(null)
      setEditPrompt(null)
      refetch()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "알 수 없는 오류")
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <Header title={data.name} description={`${data.role} · ${STATUS_LABELS[status]}`} />

      <div className="space-y-6 p-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/persona-studio/list"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)}>
              <Copy className="mr-1 h-3 w-3" />
              복제
            </Button>

            {hasChanges && editable && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                저장
              </Button>
            )}
          </div>
        </div>

        {/* Active Warning */}
        {activeWarning && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />이 페르소나는 활성 상태입니다. 변경 사항이
            사용자에게 즉시 반영됩니다.
          </div>
        )}

        {saveError && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        {/* Status + Lifecycle */}
        <div className="border-border rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-3">
            <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
            <span className="text-muted-foreground text-xs">v{data.promptVersion}</span>
            {data.parentPersonaId && (
              <span className="text-muted-foreground text-xs">
                복제됨 ·{" "}
                <Link
                  href={`/persona-studio/edit/${data.parentPersonaId}`}
                  className="text-primary"
                >
                  원본 보기
                </Link>
              </span>
            )}
          </div>
          <LifecycleActions personaId={id} status={data.status} onTransition={refetch} />
        </div>

        {/* Tabs */}
        <div className="border-border flex gap-1 border-b">
          {(["overview", "vectors", "prompt"] as TabId[]).map((t) => (
            <button
              key={t}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-primary border-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "overview" ? "기본 정보" : t === "vectors" ? "벡터" : "프롬프트"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <OverviewTab
            data={data}
            editable={editable}
            currentName={currentName}
            currentDescription={currentDescription}
            onNameChange={setEditName}
            onDescriptionChange={setEditDescription}
          />
        )}

        {tab === "vectors" && <VectorsTab data={data} />}

        {tab === "prompt" && (
          <PromptTab prompt={currentPrompt} editable={editable} onPromptChange={setEditPrompt} />
        )}
      </div>

      {/* Duplicate Dialog */}
      <DuplicateDialog
        personaId={id}
        personaName={data.name}
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={(newId) => {
          setDuplicateOpen(false)
          router.push(`/persona-studio/edit/${newId}`)
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab Components
// ═══════════════════════════════════════════════════════════════

interface OverviewTabProps {
  data: NonNullable<ReturnType<typeof usePersonaDetail>["data"]>
  editable: boolean
  currentName: string
  currentDescription: string
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
}

function OverviewTab({
  data,
  editable,
  currentName,
  currentDescription,
  onNameChange,
  onDescriptionChange,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">기본 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">이름</label>
            {editable ? (
              <Input value={currentName} onChange={(e) => onNameChange(e.target.value)} />
            ) : (
              <p className="text-sm">{currentName}</p>
            )}
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">역할</label>
            <p className="text-sm">
              {PERSONA_ROLES.find((r) => r.value === data.role)?.label ?? data.role}
            </p>
          </div>
          <div className="col-span-2">
            <label className="text-muted-foreground mb-1 block text-xs">설명</label>
            {editable ? (
              <Input
                value={currentDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="설명 (최대 100자)"
                maxLength={100}
              />
            ) : (
              <p className="text-muted-foreground text-sm">{currentDescription || "(설명 없음)"}</p>
            )}
          </div>
        </div>
      </section>

      {/* Expertise */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">전문분야</h3>
        <div className="flex flex-wrap gap-1.5">
          {data.expertise.map((e) => (
            <Badge key={e} variant="outline">
              {e}
            </Badge>
          ))}
          {data.expertise.length === 0 && (
            <span className="text-muted-foreground text-xs">(없음)</span>
          )}
        </div>
      </section>

      {/* Scores */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">점수</h3>
        <div className="grid grid-cols-4 gap-3">
          <ScoreCard label="Paradox" value={data.paradoxScore} />
          <ScoreCard label="Dimensionality" value={data.dimensionalityScore} />
          <ScoreCard label="Quality" value={data.qualityScore} />
          <ScoreCard label="Validation" value={data.validationScore} />
        </div>
      </section>

      {/* Timestamps */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">타임스탬프</h3>
        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
          <div>생성: {new Date(data.createdAt).toLocaleString("ko-KR")}</div>
          <div>수정: {new Date(data.updatedAt).toLocaleString("ko-KR")}</div>
          {data.activatedAt && (
            <div>활성화: {new Date(data.activatedAt).toLocaleString("ko-KR")}</div>
          )}
          {data.archivedAt && <div>보관: {new Date(data.archivedAt).toLocaleString("ko-KR")}</div>}
        </div>
      </section>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-border rounded-lg border p-3 text-center">
      <p className="text-muted-foreground text-[10px] uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {value !== null ? (value * 100).toFixed(0) + "%" : "-"}
      </p>
    </div>
  )
}

// ── Vectors Tab ─────────────────────────────────────────────

interface VectorsTabProps {
  data: NonNullable<ReturnType<typeof usePersonaDetail>["data"]>
}

function VectorsTab({ data }: VectorsTabProps) {
  return (
    <div className="space-y-6">
      {/* L1 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Layer 1: Social Persona (7D)</h3>
        <div className="space-y-2">
          {data.vectors.l1 &&
            Object.entries(data.vectors.l1).map(([key, val]) => {
              const labels = L1_LABELS[key]
              return (
                <DimensionBar
                  key={key}
                  label={key}
                  value={val}
                  lowLabel={labels?.[0]}
                  highLabel={labels?.[1]}
                />
              )
            })}
          {!data.vectors.l1 && <p className="text-muted-foreground text-xs">(벡터 없음)</p>}
        </div>
      </section>

      {/* L2 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Layer 2: Core Temperament (5D OCEAN)</h3>
        <div className="space-y-2">
          {data.vectors.l2 &&
            Object.entries(data.vectors.l2).map(([key, val]) => (
              <DimensionBar key={key} label={L2_LABELS[key] ?? key} value={val} />
            ))}
        </div>
      </section>

      {/* L3 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Layer 3: Narrative Drive (4D)</h3>
        <div className="space-y-2">
          {data.vectors.l3 &&
            Object.entries(data.vectors.l3).map(([key, val]) => (
              <DimensionBar key={key} label={L3_LABELS[key] ?? key} value={val} />
            ))}
        </div>
      </section>
    </div>
  )
}

function DimensionBar({
  label,
  value,
  lowLabel,
  highLabel,
}: {
  label: string
  value: number
  lowLabel?: string
  highLabel?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium">{label}</span>
      <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs">{value.toFixed(2)}</span>
      {lowLabel && highLabel && (
        <span className="text-muted-foreground w-16 shrink-0 text-[10px]">
          {value >= 0.5 ? highLabel : lowLabel}
        </span>
      )}
    </div>
  )
}

// ── Prompt Tab ──────────────────────────────────────────────

function PromptTab({
  prompt,
  editable,
  onPromptChange,
}: {
  prompt: string
  editable: boolean
  onPromptChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">시스템 프롬프트</h3>
      {editable ? (
        <textarea
          className="border-border bg-background min-h-[300px] w-full rounded-lg border p-3 font-mono text-xs"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
        />
      ) : (
        <pre className="border-border bg-muted overflow-x-auto whitespace-pre-wrap rounded-lg border p-3 text-xs">
          {prompt}
        </pre>
      )}
    </div>
  )
}
