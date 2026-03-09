// ═══════════════════════════════════════════════════════════════
// Vector Search — pgvector cosine distance queries (v4.1.1-B: T382)
// Raw SQL via Prisma $queryRaw for pgvector operator support
// ═══════════════════════════════════════════════════════════════

import { Prisma, PrismaClient } from "@/generated/prisma"

// ── Types ────────────────────────────────────────────────────

/** Layer type for vector search */
export type VectorSearchLayer = "SOCIAL" | "TEMPERAMENT" | "NARRATIVE"

/** Vector dimensions per layer: L1=7, L2=5, L3=4 */
const LAYER_DIMENSIONS: Record<VectorSearchLayer, number> = {
  SOCIAL: 7,
  TEMPERAMENT: 5,
  NARRATIVE: 4,
}

/** pgvector column name per layer */
const LAYER_COLUMN: Record<VectorSearchLayer, string> = {
  SOCIAL: "l1Vec",
  TEMPERAMENT: "l2Vec",
  NARRATIVE: "l3Vec",
}

/** Result of a similarity search */
export interface SimilarPersonaResult {
  personaId: string
  layerVectorId: string
  distance: number
}

/** Options for findSimilarPersonas */
export interface VectorSearchOptions {
  /** Target vector to search against */
  targetVector: number[]
  /** Which layer to search (SOCIAL/TEMPERAMENT/NARRATIVE) */
  layer: VectorSearchLayer
  /** Max results to return (default: 10) */
  topK?: number
  /** Max cosine distance threshold — only results closer than this are returned (default: none) */
  threshold?: number
  /** Persona IDs to exclude from results (e.g., self) */
  excludePersonaIds?: string[]
}

// ── Core Search Function ─────────────────────────────────────

/**
 * Find similar personas by pgvector cosine distance on a specific layer.
 *
 * Uses the `<=>` cosine distance operator.
 * Requires pgvector extension and populated l1Vec/l2Vec/l3Vec columns.
 */
export async function findSimilarPersonas(
  prisma: PrismaClient,
  options: VectorSearchOptions
): Promise<SimilarPersonaResult[]> {
  const { targetVector, layer, topK = 10, threshold, excludePersonaIds } = options

  // Validate vector dimensions
  const expectedDims = LAYER_DIMENSIONS[layer]
  if (targetVector.length !== expectedDims) {
    throw new Error(
      `Vector dimension mismatch: expected ${expectedDims} for ${layer}, got ${targetVector.length}`
    )
  }

  const column = LAYER_COLUMN[layer]
  const vectorStr = `[${targetVector.join(",")}]`

  // Build WHERE clauses
  const whereClauses: string[] = [`"layerType" = '${layer}'`, `"${column}" IS NOT NULL`]

  if (threshold !== undefined) {
    whereClauses.push(`"${column}" <=> '${vectorStr}'::vector < ${threshold}`)
  }

  if (excludePersonaIds && excludePersonaIds.length > 0) {
    const escaped = excludePersonaIds.map((id) => `'${id}'`).join(",")
    whereClauses.push(`"personaId" NOT IN (${escaped})`)
  }

  const whereSQL = whereClauses.join(" AND ")

  const results = await prisma.$queryRaw<
    Array<{ id: string; personaId: string; distance: number }>
  >(
    Prisma.sql`
      SELECT
        "id",
        "personaId",
        "${Prisma.raw(column)}" <=> ${vectorStr}::vector AS distance
      FROM "persona_layer_vectors"
      WHERE ${Prisma.raw(whereSQL)}
      ORDER BY "${Prisma.raw(column)}" <=> ${vectorStr}::vector ASC
      LIMIT ${topK}
    `
  )

  return results.map((r) => ({
    personaId: r.personaId,
    layerVectorId: r.id,
    distance: Number(r.distance),
  }))
}

// ── Utility: Convert dim columns to vector array ─────────────

/**
 * Convert a Prisma PersonaLayerVector row's dim1~dim7 to a number array.
 * Useful for building target vectors from existing DB rows.
 */
export function dimsToVector(
  row: {
    dim1: unknown
    dim2: unknown
    dim3: unknown
    dim4: unknown
    dim5: unknown
    dim6?: unknown
    dim7?: unknown
  },
  layer: VectorSearchLayer
): number[] {
  const count = LAYER_DIMENSIONS[layer]
  const result: number[] = []
  for (let i = 1; i <= count; i++) {
    const key = `dim${i}` as keyof typeof row
    const val = row[key]
    if (val === null || val === undefined) {
      result.push(0)
    } else if (typeof val === "object" && val !== null && "toNumber" in val) {
      result.push((val as { toNumber(): number }).toNumber())
    } else {
      result.push(Number(val))
    }
  }
  return result
}
