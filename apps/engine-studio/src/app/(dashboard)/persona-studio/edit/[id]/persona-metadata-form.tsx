"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { usePersonaDetail } from "@/hooks/use-persona-detail"
import { PERSONA_ROLES } from "@/types/persona-form"
import { computeActivityTraits, computeActiveHours } from "@/lib/persona-world/activity-mapper"
import type { ThreeLayerVector } from "@/types/persona-v3"

// ── Profile labels ───────────────────────────────────────────

const GENDER_LABELS: Record<string, string> = {
  MALE: "남성",
  FEMALE: "여성",
  NON_BINARY: "논바이너리",
  OTHER: "기타",
}

const EDUCATION_LABELS: Record<string, string> = {
  HIGH_SCHOOL: "고등학교",
  BACHELOR: "학사",
  MASTER: "석사",
  DOCTORATE: "박사",
  SELF_TAUGHT: "독학",
}

// ── Types ────────────────────────────────────────────────────

export type PersonaData = NonNullable<ReturnType<typeof usePersonaDetail>["data"]>

export interface OverviewTabProps {
  data: PersonaData
  editable: boolean
  currentName: string
  currentDescription: string
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
}

// ── OverviewTab ──────────────────────────────────────────────

export function OverviewTab({
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

      {/* Demographics / Profile */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">프로필</h3>
        <div className="grid grid-cols-3 gap-3">
          <ProfileField label="성별" value={GENDER_LABELS[data.gender ?? ""] ?? data.gender} />
          <ProfileField
            label="출생년도"
            value={data.birthDate ? new Date(data.birthDate).getFullYear().toString() : null}
          />
          <ProfileField label="국적" value={data.nationality} />
          <ProfileField label="활동 지역" value={data.region} />
          <ProfileField label="키" value={data.height ? `${data.height}cm` : null} />
          <ProfileField
            label="교육 수준"
            value={EDUCATION_LABELS[data.educationLevel ?? ""] ?? data.educationLevel}
          />
          <ProfileField
            label="사용 언어"
            value={data.languages.length > 0 ? data.languages.join(", ") : null}
          />
        </div>
        {data.knowledgeAreas.length > 0 && (
          <div className="mt-2">
            <label className="text-muted-foreground mb-1 block text-xs">전문 지식</label>
            <div className="flex flex-wrap gap-1.5">
              {data.knowledgeAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
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

      {/* Active Hours */}
      <ActiveHoursSection data={data} />

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

// ── Helper Components ────────────────────────────────────────

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

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="text-muted-foreground mb-0.5 block text-xs">{label}</label>
      <p className="text-sm">{value || "-"}</p>
    </div>
  )
}

// ── Active Hours Section ─────────────────────────────────────

function ActiveHoursSection({ data }: { data: PersonaData }) {
  const activeHours = useMemo(() => {
    const l1 = data.vectors.l1
    const l2 = data.vectors.l2
    const l3 = data.vectors.l3
    if (!l1 || !l2 || !l3) return null

    const vectors: ThreeLayerVector = {
      social: {
        depth: l1.depth ?? 0.5,
        lens: l1.lens ?? 0.5,
        stance: l1.stance ?? 0.5,
        scope: l1.scope ?? 0.5,
        taste: l1.taste ?? 0.5,
        purpose: l1.purpose ?? 0.5,
        sociability: l1.sociability ?? 0.5,
      },
      temperament: {
        openness: l2.openness ?? 0.5,
        conscientiousness: l2.conscientiousness ?? 0.5,
        extraversion: l2.extraversion ?? 0.5,
        agreeableness: l2.agreeableness ?? 0.5,
        neuroticism: l2.neuroticism ?? 0.5,
      },
      narrative: {
        lack: l3.lack ?? 0.5,
        moralCompass: l3.moralCompass ?? 0.5,
        volatility: l3.volatility ?? 0.5,
        growthArc: l3.growthArc ?? 0.5,
      },
    }

    const traits = computeActivityTraits(vectors, data.paradoxScore ?? 0)
    const hours = computeActiveHours(vectors, traits)

    // peakHour 계산 (activity-mapper 로직 재현)
    let peakHour = 12 + Math.round(l1.sociability * 10)
    if ((l2.extraversion ?? 0.5) < 0.3 && (l2.neuroticism ?? 0.5) > 0.5) {
      peakHour += 4
    }
    peakHour = peakHour % 24

    return { hours, peakHour, traits }
  }, [data.vectors, data.paradoxScore])

  if (!activeHours) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">활동 시간대</h3>
        <p className="text-muted-foreground text-xs">(벡터 데이터 없음)</p>
      </section>
    )
  }

  const { hours, peakHour } = activeHours
  const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i)

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">활동 시간대</h3>
      <p className="text-muted-foreground text-xs">벡터 기반 자동 계산 · 피크 시간 {peakHour}시</p>
      <div className="flex gap-0.5">
        {HOUR_LABELS.map((h) => {
          const isActive = hours.includes(h)
          const isPeak = h === peakHour
          return (
            <div key={h} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`h-6 w-full rounded-sm ${
                  isPeak ? "bg-blue-500" : isActive ? "bg-blue-500/30" : "bg-muted"
                }`}
                title={`${h}시${isPeak ? " (피크)" : isActive ? " (활동)" : ""}`}
              />
              {h % 6 === 0 && <span className="text-muted-foreground text-[9px]">{h}</span>}
            </div>
          )
        })}
      </div>
      <div className="text-muted-foreground flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" /> 피크
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-blue-500/30" /> 활동
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-muted inline-block h-2 w-2 rounded-sm" /> 비활동
        </span>
        <span className="ml-auto">
          활동 창: {Math.min(...hours)}시 ~ {Math.max(...hours)}시 ({hours.length}시간)
        </span>
      </div>
    </section>
  )
}
