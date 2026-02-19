"use client"

import { useState, useCallback } from "react"
import { Search, Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ARCHETYPE_LABELS, CURRENT_ARCHETYPE_IDS } from "@/constants/v3/interpretation-tables"
import type { PersonaSortField, SortOrder, VectorRangeFilter, CrossAxisFilter } from "@/types"

// ── Filter State Type ───────────────────────────────────────
export interface PersonaFilterState {
  search: string
  status: string
  archetypeIds: string[]
  sort: PersonaSortField
  order: SortOrder
  paradoxRange: [number, number]
  vectorFilters: VectorRangeFilter
  crossAxisFilters: CrossAxisFilter[]
  page: number
  limit: number
}

export const DEFAULT_FILTERS: PersonaFilterState = {
  search: "",
  status: "all",
  archetypeIds: [],
  sort: "createdAt",
  order: "desc",
  paradoxRange: [0, 1],
  vectorFilters: {},
  crossAxisFilters: [],
  page: 1,
  limit: 20,
}

// ── Status Options ──────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "REVIEW", label: "Review" },
  { value: "STANDARD", label: "Standard" },
  { value: "ARCHIVED", label: "Archived" },
]

// ── Sort Options ────────────────────────────────────────────
const SORT_OPTIONS: { value: PersonaSortField; label: string }[] = [
  { value: "createdAt", label: "최신순" },
  { value: "name", label: "이름순" },
  { value: "paradoxScore", label: "Paradox Score" },
  { value: "qualityScore", label: "품질 점수" },
  { value: "validationScore", label: "일관성 점수" },
]

// ── L1 Vector Dimensions ────────────────────────────────────
const L1_DIMS = [
  { key: "depth", label: "분석 깊이", low: "직관적", high: "심층적" },
  { key: "lens", label: "판단 렌즈", low: "감성", high: "논리" },
  { key: "stance", label: "평가 태도", low: "수용적", high: "비판적" },
  { key: "scope", label: "관심 범위", low: "간결", high: "세밀" },
  { key: "taste", label: "취향 성향", low: "클래식", high: "도전적" },
  { key: "purpose", label: "소비 목적", low: "오락", high: "의미" },
  { key: "sociability", label: "사회적 성향", low: "독립적", high: "사교적" },
]

// ── L2 Vector Dimensions ────────────────────────────────────
const L2_DIMS = [
  { key: "openness", label: "개방성", low: "보수적", high: "개방적" },
  { key: "conscientiousness", label: "성실성", low: "즉흥적", high: "원칙적" },
  { key: "extraversion", label: "외향성", low: "내향적", high: "외향적" },
  { key: "agreeableness", label: "친화성", low: "경쟁적", high: "협조적" },
  { key: "neuroticism", label: "신경성", low: "안정", high: "불안정" },
]

// ── L3 Vector Dimensions ────────────────────────────────────
const L3_DIMS = [
  { key: "lack", label: "결핍", low: "충족", high: "결핍" },
  { key: "moralCompass", label: "도덕 나침반", low: "유연", high: "엄격" },
  { key: "volatility", label: "변동성", low: "안정", high: "폭발적" },
  { key: "growthArc", label: "성장 아크", low: "정체", high: "성장" },
]

// ═══════════════════════════════════════════════════════════════
// PersonaFilters Component
// ═══════════════════════════════════════════════════════════════

interface PersonaFiltersProps {
  filters: PersonaFilterState
  onFiltersChange: (filters: PersonaFilterState) => void
  totalCount: number
}

export function PersonaFilters({ filters, onFiltersChange, totalCount }: PersonaFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({})

  const update = useCallback(
    (partial: Partial<PersonaFilterState>) => {
      onFiltersChange({ ...filters, ...partial, page: 1 }) // Reset page on filter change
    },
    [filters, onFiltersChange]
  )

  const toggleArchetype = useCallback(
    (id: string) => {
      const next = filters.archetypeIds.includes(id)
        ? filters.archetypeIds.filter((a) => a !== id)
        : [...filters.archetypeIds, id]
      update({ archetypeIds: next })
    },
    [filters.archetypeIds, update]
  )

  const toggleLayer = useCallback((layer: string) => {
    setExpandedLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }, [])

  const updateVectorRange = useCallback(
    (layer: "l1" | "l2" | "l3", dim: string, range: [number, number]) => {
      const existing = filters.vectorFilters[layer] ?? {}
      const layerFilters: Record<string, { min?: number; max?: number }> = {}
      for (const [k, v] of Object.entries(existing)) {
        if (v) layerFilters[k] = v
      }
      if (range[0] === 0 && range[1] === 1) {
        delete layerFilters[dim]
      } else {
        layerFilters[dim] = { min: range[0], max: range[1] }
      }
      const nextFilters: VectorRangeFilter = { ...filters.vectorFilters, [layer]: layerFilters }
      if (Object.keys(layerFilters).length === 0) {
        delete nextFilters[layer]
      }
      update({ vectorFilters: nextFilters })
    },
    [filters.vectorFilters, update]
  )

  const resetFilters = useCallback(() => {
    onFiltersChange({ ...DEFAULT_FILTERS })
    setShowAdvanced(false)
    setExpandedLayers({})
  }, [onFiltersChange])

  // Count active filters
  const activeFilterCount =
    (filters.status !== "all" ? 1 : 0) +
    filters.archetypeIds.length +
    (filters.paradoxRange[0] > 0 || filters.paradoxRange[1] < 1 ? 1 : 0) +
    Object.keys(filters.vectorFilters).length +
    filters.crossAxisFilters.length

  return (
    <div className="space-y-4">
      {/* Search + Sort Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="이름, 설명으로 검색..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select value={filters.sort} onValueChange={(v) => update({ sort: v as PersonaSortField })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => update({ order: filters.order === "asc" ? "desc" : "asc" })}
          title={filters.order === "asc" ? "오름차순" : "내림차순"}
        >
          {filters.order === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant={activeFilterCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="mr-1 h-3.5 w-3.5" />
          필터{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.status === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => update({ status: opt.value })}
          >
            {opt.label}
          </button>
        ))}

        <span className="text-muted-foreground ml-auto text-xs">{totalCount}개 페르소나</span>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.archetypeIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {ARCHETYPE_LABELS[id] ?? id}
              <button onClick={() => toggleArchetype(id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {(filters.paradoxRange[0] > 0 || filters.paradoxRange[1] < 1) && (
            <Badge variant="secondary" className="gap-1">
              Paradox {filters.paradoxRange[0].toFixed(2)}~{filters.paradoxRange[1].toFixed(2)}
              <button onClick={() => update({ paradoxRange: [0, 1] })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground ml-2 text-xs underline"
          >
            모든 필터 초기화
          </button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="border-border bg-card/50 space-y-4 rounded-lg border p-4">
          {/* Archetype Filter */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">아키타입 (22종)</h4>
            <div className="flex flex-wrap gap-1.5">
              {CURRENT_ARCHETYPE_IDS.map((id) => (
                <button
                  key={id}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    filters.archetypeIds.includes(id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => toggleArchetype(id)}
                >
                  {ARCHETYPE_LABELS[id] ?? id}
                </button>
              ))}
            </div>
          </div>

          {/* Paradox Score Range */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Extended Paradox Score
              </h4>
              <span className="text-muted-foreground text-xs">
                {filters.paradoxRange[0].toFixed(2)} ~ {filters.paradoxRange[1].toFixed(2)}
              </span>
            </div>
            <Slider
              value={filters.paradoxRange}
              onValueChange={(v) => update({ paradoxRange: v as [number, number] })}
              min={0}
              max={1}
              step={0.05}
            />
            <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
              <span>0.0 낮음</span>
              <span>0.3 보통</span>
              <span>0.6 높음</span>
              <span>1.0</span>
            </div>
          </div>

          {/* Vector Range Filters */}
          {[
            { key: "l1" as const, label: "L1 Social Persona (7D)", dims: L1_DIMS },
            { key: "l2" as const, label: "L2 Core Temperament (5D)", dims: L2_DIMS },
            { key: "l3" as const, label: "L3 Narrative Drive (4D)", dims: L3_DIMS },
          ].map(({ key, label, dims }) => (
            <div key={key}>
              <button
                className="flex w-full items-center justify-between"
                onClick={() => toggleLayer(key)}
              >
                <h4 className="text-xs font-semibold uppercase tracking-wider">{label}</h4>
                {expandedLayers[key] ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {expandedLayers[key] && (
                <div className="mt-2 space-y-3">
                  {dims.map((dim) => {
                    const range = filters.vectorFilters[key]?.[dim.key]
                    const value: [number, number] = [range?.min ?? 0, range?.max ?? 1]
                    return (
                      <div key={dim.key}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs">{dim.label}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {value[0].toFixed(2)} ~ {value[1].toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-10 text-[10px]">{dim.low}</span>
                          <Slider
                            value={value}
                            onValueChange={(v) =>
                              updateVectorRange(key, dim.key, v as [number, number])
                            }
                            min={0}
                            max={1}
                            step={0.05}
                            className="flex-1"
                          />
                          <span className="text-muted-foreground w-10 text-right text-[10px]">
                            {dim.high}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const next = { ...filters.vectorFilters }
                      delete next[key]
                      update({ vectorFilters: next })
                    }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    범위 초기화
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
