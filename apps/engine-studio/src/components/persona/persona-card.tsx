"use client"

import { useState } from "react"
import Link from "next/link"
import { User, BarChart3, Sparkles, Pencil, Trash2, ArrowUpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ARCHETYPE_LABELS } from "@/constants/v3/interpretation-tables"
import type { PersonaListItem } from "@/types"

const CURRENT_ENGINE_VERSION = "4.0"

// ── Engine Version → Badge variant 매핑 ─────────────────────
const ENGINE_VERSION_BADGE: Record<
  string,
  { variant: "success" | "warning" | "muted"; label: string }
> = {
  "4.0": { variant: "success", label: "v4.0" },
  "3.0": { variant: "warning", label: "v3.0" },
}

function getEngineVersionBadge(version: string | null) {
  if (!version) return { variant: "muted" as const, label: "v?" }
  return ENGINE_VERSION_BADGE[version] ?? { variant: "muted" as const, label: `v${version}` }
}

// ── Status → Badge variant 매핑 ─────────────────────────────
const STATUS_BADGE: Record<
  string,
  { variant: "success" | "warning" | "info" | "muted" | "outline"; label: string }
> = {
  ACTIVE: { variant: "success", label: "Active" },
  DRAFT: { variant: "warning", label: "Draft" },
  REVIEW: { variant: "info", label: "Review" },
  STANDARD: { variant: "success", label: "Standard" },
  LEGACY: { variant: "muted", label: "Legacy" },
  DEPRECATED: { variant: "muted", label: "Deprecated" },
  PAUSED: { variant: "outline", label: "Paused" },
  ARCHIVED: { variant: "muted", label: "Archived" },
}

// ── L1 차원 약어 (카드에 주요 성향 2~3개 표시용) ──────────────
const L1_TOP_DIMS: { key: string; lowLabel: string; highLabel: string }[] = [
  { key: "depth", lowLabel: "직관", highLabel: "심층" },
  { key: "lens", lowLabel: "감성", highLabel: "논리" },
  { key: "stance", lowLabel: "수용", highLabel: "비판" },
  { key: "taste", lowLabel: "클래식", highLabel: "실험" },
]

function getTopTraits(l1: Record<string, number> | null): string[] {
  if (!l1) return []
  return L1_TOP_DIMS.filter((d) => l1[d.key] !== undefined)
    .sort((a, b) => Math.abs(l1[b.key] - 0.5) - Math.abs(l1[a.key] - 0.5))
    .slice(0, 3)
    .map((d) => (l1[d.key] >= 0.5 ? d.highLabel : d.lowLabel))
}

function formatParadox(score: number | null): string {
  if (score === null) return "-"
  return (score * 100).toFixed(0) + "%"
}

interface PersonaCardProps {
  persona: PersonaListItem
  onDelete?: (id: string, name: string) => void
  onUpgrade?: (id: string) => void
}

export function PersonaCard({ persona, onDelete, onUpgrade }: PersonaCardProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const statusInfo = STATUS_BADGE[persona.status] ?? {
    variant: "muted" as const,
    label: persona.status,
  }
  const topTraits = getTopTraits(persona.vectors.l1)
  const archetypeLabel = persona.archetypeId
    ? (ARCHETYPE_LABELS[persona.archetypeId] ?? persona.archetypeId)
    : null
  const engineBadge = getEngineVersionBadge(persona.engineVersion)
  const needsUpgrade = persona.engineVersion !== CURRENT_ENGINE_VERSION

  async function handleUpgrade(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isUpgrading) return
    setIsUpgrading(true)
    try {
      const res = await fetch(`/api/internal/personas/${persona.id}/upgrade`, { method: "POST" })
      if (res.ok) {
        onUpgrade?.(persona.id)
      }
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <div className="border-border bg-card group flex flex-col rounded-lg border transition-all hover:shadow-md">
      {/* 카드 본문 (클릭 → 상세) */}
      <Link
        href={`/persona-studio/edit/${persona.id}`}
        className="hover:border-primary/40 flex flex-1 flex-col p-4"
      >
        {/* Header: Avatar + Name + Status */}
        <div className="mb-3 flex items-start gap-3">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            {persona.profileImageUrl ? (
              <img
                src={persona.profileImageUrl}
                alt={persona.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <User className="text-muted-foreground h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="group-hover:text-primary truncate text-sm font-semibold transition-colors">
                {persona.name}
              </h3>
              <Badge variant={statusInfo.variant} className="shrink-0">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="text-muted-foreground text-xs">{persona.role}</p>
              <Badge variant={engineBadge.variant} className="h-4 px-1 text-[9px]">
                {engineBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        {persona.description && (
          <p className="text-muted-foreground mb-3 line-clamp-2 text-xs">{persona.description}</p>
        )}

        {/* Archetype */}
        {archetypeLabel && (
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span className="text-xs text-amber-400">{archetypeLabel}</span>
          </div>
        )}

        {/* Top Traits */}
        {topTraits.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {topTraits.map((trait) => (
              <span
                key={trait}
                className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Paradox + Expertise */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <BarChart3 className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-[10px]">
              Paradox {formatParadox(persona.paradoxScore)}
            </span>
          </div>
          {persona.expertise.length > 0 && (
            <span className="text-muted-foreground truncate text-[10px]">
              {persona.expertise.slice(0, 2).join(", ")}
              {persona.expertise.length > 2 && ` +${persona.expertise.length - 2}`}
            </span>
          )}
        </div>
      </Link>

      {/* Footer: 수정 / [업그레이드] / 삭제 버튼 */}
      <div className="border-border flex items-center border-t">
        <Link
          href={`/persona-studio/edit/${persona.id}`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex flex-1 items-center justify-center gap-1 py-2 text-xs transition-colors"
        >
          <Pencil className="h-3 w-3" />
          수정
        </Link>
        {needsUpgrade && (
          <>
            <div className="border-border h-5 border-l" />
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="flex flex-1 items-center justify-center gap-1 py-2 text-xs text-amber-500 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
              title="v4.0으로 업그레이드"
            >
              <ArrowUpCircle className="h-3 w-3" />
              {isUpgrading ? "업그레이드 중..." : "업그레이드"}
            </button>
          </>
        )}
        <div className="border-border h-5 border-l" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete?.(persona.id, persona.name)
          }}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex flex-1 items-center justify-center gap-1 py-2 text-xs transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          삭제
        </button>
      </div>
    </div>
  )
}
