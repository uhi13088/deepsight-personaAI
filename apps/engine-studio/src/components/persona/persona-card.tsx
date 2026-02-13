"use client"

import Link from "next/link"
import { User, BarChart3, Sparkles, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ARCHETYPE_LABELS } from "@/constants/v3/interpretation-tables"
import type { PersonaListItem } from "@/types"

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
}

export function PersonaCard({ persona }: PersonaCardProps) {
  const statusInfo = STATUS_BADGE[persona.status] ?? {
    variant: "muted" as const,
    label: persona.status,
  }
  const topTraits = getTopTraits(persona.vectors.l1)
  const archetypeLabel = persona.archetypeId
    ? (ARCHETYPE_LABELS[persona.archetypeId] ?? persona.archetypeId)
    : null

  return (
    <Link
      href={`/persona-studio/edit/${persona.id}`}
      className="border-border bg-card hover:border-primary/40 group flex flex-col rounded-lg border p-4 transition-all hover:shadow-md"
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
          <p className="text-muted-foreground mt-0.5 text-xs">{persona.role}</p>
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

      {/* Footer: Paradox Score + Edit + Expertise */}
      <div className="border-border mt-auto flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <BarChart3 className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-[10px]">
              Paradox {formatParadox(persona.paradoxScore)}
            </span>
          </div>
          <span
            className="text-muted-foreground hover:text-primary flex items-center gap-0.5 text-[10px] transition-colors"
            title="수정"
          >
            <Pencil className="h-3 w-3" />
            수정
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
  )
}
