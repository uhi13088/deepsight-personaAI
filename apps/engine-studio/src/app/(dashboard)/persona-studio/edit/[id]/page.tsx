"use client"

import { useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Loader2, AlertTriangle, Save } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePersonaDetail } from "@/hooks/use-persona-detail"
import { LifecycleActions } from "@/components/persona/edit/lifecycle-actions"
import { DuplicateDialog } from "@/components/persona/edit/duplicate-dialog"
import { STATUS_LABELS, STATUS_COLORS, isActiveStatus, isEditable } from "@/lib/lifecycle"
import type { PersonaStatus } from "@/generated/prisma"
import type { ApiResponse } from "@/types"

import { OverviewTab } from "./persona-metadata-form"
import { VectorsTab, MemoryTab, PressureTab } from "./persona-dimension-editor"
import { PromptTab, PreviewTab } from "./persona-lifecycle-actions"

// ── Tab type ────────────────────────────────────────────────

type TabId = "overview" | "vectors" | "pressure" | "prompt" | "preview" | "memory"

const TAB_LABELS: Record<TabId, string> = {
  overview: "기본 정보",
  vectors: "벡터",
  memory: "기억",
  pressure: "V_Final 시뮬레이터",
  prompt: "프롬프트",
  preview: "미리보기 테스트",
}

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
  const [editProfileImageUrl, setEditProfileImageUrl] = useState<string | null | undefined>(
    undefined
  )
  // TTS edit state (undefined = not edited, null = cleared, string/number = changed)
  const [editTtsProvider, setEditTtsProvider] = useState<string | null | undefined>(undefined)
  const [editTtsVoiceId, setEditTtsVoiceId] = useState<string | null | undefined>(undefined)
  const [editTtsSpeed, setEditTtsSpeed] = useState<number | null | undefined>(undefined)
  const [editTtsPitch, setEditTtsPitch] = useState<number | null | undefined>(undefined)
  const [editTtsLanguage, setEditTtsLanguage] = useState<string | null | undefined>(undefined)

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

  const hasTtsChanges =
    editTtsProvider !== undefined ||
    editTtsVoiceId !== undefined ||
    editTtsSpeed !== undefined ||
    editTtsPitch !== undefined ||
    editTtsLanguage !== undefined
  const hasChanges =
    editName !== null ||
    editDescription !== null ||
    editPrompt !== null ||
    editProfileImageUrl !== undefined ||
    hasTtsChanges

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
      if (editProfileImageUrl !== undefined) body.profileImageUrl = editProfileImageUrl
      if (editTtsProvider !== undefined) body.ttsProvider = editTtsProvider
      if (editTtsVoiceId !== undefined) body.ttsVoiceId = editTtsVoiceId
      if (editTtsSpeed !== undefined) body.ttsSpeed = editTtsSpeed
      if (editTtsPitch !== undefined) body.ttsPitch = editTtsPitch
      if (editTtsLanguage !== undefined) body.ttsLanguage = editTtsLanguage

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
      setEditProfileImageUrl(undefined)
      setEditTtsProvider(undefined)
      setEditTtsVoiceId(undefined)
      setEditTtsSpeed(undefined)
      setEditTtsPitch(undefined)
      setEditTtsLanguage(undefined)
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

            {editable && (
              <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
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
        <div className="border-border flex gap-1 overflow-x-auto border-b">
          {(["overview", "vectors", "memory", "pressure", "prompt", "preview"] as TabId[]).map(
            (t) => (
              <button
                key={t}
                className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? "text-primary border-primary border-b-2"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </button>
            )
          )}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <OverviewTab
            data={data}
            editable={editable}
            currentName={currentName}
            currentDescription={currentDescription}
            currentProfileImageUrl={
              editProfileImageUrl !== undefined ? editProfileImageUrl : data.profileImageUrl
            }
            onNameChange={setEditName}
            onDescriptionChange={setEditDescription}
            onProfileImageUrlChange={setEditProfileImageUrl}
            ttsEdits={{
              provider: editTtsProvider,
              voiceId: editTtsVoiceId,
              speed: editTtsSpeed,
              pitch: editTtsPitch,
              language: editTtsLanguage,
            }}
            onTtsChange={{
              setProvider: setEditTtsProvider,
              setVoiceId: setEditTtsVoiceId,
              setSpeed: setEditTtsSpeed,
              setPitch: setEditTtsPitch,
              setLanguage: setEditTtsLanguage,
            }}
          />
        )}

        {tab === "vectors" && <VectorsTab data={data} />}

        {tab === "memory" && <MemoryTab personaId={id} />}

        {tab === "pressure" && <PressureTab data={data} />}

        {tab === "prompt" && (
          <PromptTab prompt={currentPrompt} editable={editable} onPromptChange={setEditPrompt} />
        )}

        {tab === "preview" && <PreviewTab data={data} />}
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
