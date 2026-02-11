// ═══════════════════════════════════════════════════════════════
// Internal API Types — Engine Studio
// ═══════════════════════════════════════════════════════════════

// ── Shared API Response Wrapper ────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrev: boolean
}

// ── Persona List API ────────────────────────────────────────────

export type PersonaSortField =
  | "createdAt"
  | "name"
  | "paradoxScore"
  | "validationScore"
  | "qualityScore"

export type SortOrder = "asc" | "desc"

export interface PersonaListParams {
  // Basic filters
  status?: string // ACTIVE, DRAFT, ARCHIVED, etc.
  source?: string // MANUAL, INCUBATOR, etc.
  search?: string // name, description keyword search
  archetype?: string // comma-separated archetype IDs

  // Vector range filters (JSON-encoded)
  vectorFilters?: string // JSON: { l1?: { [dim]: { min, max } }, l2?: ..., l3?: ... }

  // Paradox score filters
  paradoxMin?: string // 0.0~1.0
  paradoxMax?: string // 0.0~1.0

  // Cross-axis pattern filters (JSON-encoded)
  crossAxisFilters?: string // JSON: [{ axisId, minScore, maxScore }]

  // Sorting
  sort?: PersonaSortField
  order?: SortOrder

  // Pagination
  page?: string // default: "1"
  limit?: string // default: "20", max: 100
}

export interface VectorRangeFilter {
  l1?: Partial<Record<string, { min?: number; max?: number }>>
  l2?: Partial<Record<string, { min?: number; max?: number }>>
  l3?: Partial<Record<string, { min?: number; max?: number }>>
}

export interface CrossAxisFilter {
  axisId: string
  minScore?: number
  maxScore?: number
}

export interface PersonaListItem {
  id: string
  name: string
  role: string
  expertise: string[]
  description: string | null
  profileImageUrl: string | null
  status: string
  source: string
  archetypeId: string | null
  paradoxScore: number | null
  dimensionalityScore: number | null
  qualityScore: number | null
  validationScore: number | null
  vectors: {
    l1: Record<string, number> | null
    l2: Record<string, number> | null
    l3: Record<string, number> | null
  }
  createdAt: string
  updatedAt: string
}

export interface PersonaListResponse {
  personas: PersonaListItem[]
  pagination: PaginationMeta
  filterStats: {
    totalMatched: number
    statusDistribution: Record<string, number>
  }
}
