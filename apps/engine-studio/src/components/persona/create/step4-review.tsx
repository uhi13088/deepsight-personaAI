"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ARCHETYPE_LABELS } from "@/constants/v3/interpretation-tables"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { PERSONA_ROLES } from "@/types/persona-form"
import type { PersonaFormState, SaveAction, ApiResponse } from "@/types"

interface Step4Props {
  formState: PersonaFormState
  onPrev: () => void
}

export function Step4Review({ formState, onPrev }: Step4Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { basicInfo, vectors, prompt } = formState

  const paradoxProfile = useMemo(() => {
    const crossAxisProfile = calculateCrossAxisProfile(vectors.l1, vectors.l2, vectors.l3)
    return calculateExtendedParadoxScore(vectors.l1, vectors.l2, vectors.l3, crossAxisProfile)
  }, [vectors.l1, vectors.l2, vectors.l3])

  const roleLabel = PERSONA_ROLES.find((r) => r.value === basicInfo.role)?.label ?? basicInfo.role

  const handleSave = async (action: SaveAction) => {
    setSaving(true)
    setError(null)

    try {
      const body = {
        name: basicInfo.name.trim(),
        role: basicInfo.role,
        expertise: basicInfo.expertise,
        profileImageUrl: basicInfo.profileImageUrl || null,
        description: basicInfo.description.trim() || null,
        vectors: {
          l1: vectors.l1,
          l2: vectors.l2,
          l3: vectors.l3,
        },
        archetypeId: vectors.archetypeId,
        basePrompt: prompt.basePrompt,
        promptVersion: prompt.promptVersion,
        status: action === "ACTIVATE" ? "ACTIVE" : "DRAFT",
      }

      const response = await fetch("/api/internal/personas/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result: ApiResponse<{ id: string }> = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message ?? "저장 실패")
      }

      router.push("/persona-studio/list")
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Step 4: 리뷰 & 저장</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          입력한 정보를 최종 확인하고 저장하세요.
        </p>
      </div>

      {/* Review Sections */}
      <div className="space-y-4">
        {/* Basic Info */}
        <ReviewSection title="기본 정보">
          <ReviewRow label="이름" value={basicInfo.name} />
          <ReviewRow label="역할" value={roleLabel} />
          <ReviewRow
            label="전문분야"
            value={basicInfo.expertise.length > 0 ? basicInfo.expertise.join(", ") : "(없음)"}
          />
          {basicInfo.description && <ReviewRow label="설명" value={basicInfo.description} />}
        </ReviewSection>

        {/* Vectors */}
        <ReviewSection title="벡터 설계">
          {vectors.archetypeId && (
            <ReviewRow
              label="아키타입"
              value={ARCHETYPE_LABELS[vectors.archetypeId] ?? vectors.archetypeId}
            />
          )}
          <ReviewRow label="EPS" value={`${(paradoxProfile.overall * 100).toFixed(0)}%`} />
          <ReviewRow
            label="Dimensionality"
            value={`${(paradoxProfile.dimensionality * 100).toFixed(0)}%`}
          />
          <ReviewRow label="Dominant" value={paradoxProfile.dominant.layer} />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">L1</span>
              <p className="font-mono">
                {Object.values(vectors.l1)
                  .map((v) => v.toFixed(1))
                  .join(" ")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">L2</span>
              <p className="font-mono">
                {Object.values(vectors.l2)
                  .map((v) => v.toFixed(1))
                  .join(" ")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">L3</span>
              <p className="font-mono">
                {Object.values(vectors.l3)
                  .map((v) => v.toFixed(1))
                  .join(" ")}
              </p>
            </div>
          </div>
        </ReviewSection>

        {/* Prompt */}
        <ReviewSection title="프롬프트">
          <p className="text-muted-foreground text-xs">
            {prompt.basePrompt.length}자, v{prompt.promptVersion}
          </p>
          <pre className="bg-muted mt-2 max-h-40 overflow-auto rounded-md p-3 font-mono text-[10px]">
            {prompt.basePrompt.slice(0, 500)}
            {prompt.basePrompt.length > 500 && "..."}
          </pre>
        </ReviewSection>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Save Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onPrev} disabled={saving}>
          이전
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave("DRAFT")} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            임시 저장 (Draft)
          </Button>
          <Button onClick={() => handleSave("ACTIVATE")} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            활성화 (Activate)
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
