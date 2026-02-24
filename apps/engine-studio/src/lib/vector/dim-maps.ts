/**
 * Dimension name → DB column (dim1~dim7) mappings for 3-Layer vectors.
 * Single source of truth — used by all API routes that convert LayerVector ↔ Record.
 */

export const L1_DIM_MAP: Record<string, string> = {
  depth: "dim1",
  lens: "dim2",
  stance: "dim3",
  scope: "dim4",
  taste: "dim5",
  purpose: "dim6",
  sociability: "dim7",
}

export const L2_DIM_MAP: Record<string, string> = {
  openness: "dim1",
  conscientiousness: "dim2",
  extraversion: "dim3",
  agreeableness: "dim4",
  neuroticism: "dim5",
}

export const L3_DIM_MAP: Record<string, string> = {
  lack: "dim1",
  moralCompass: "dim2",
  volatility: "dim3",
  growthArc: "dim4",
}

/**
 * Convert a Prisma LayerVector row into a semantic Record<string, number>.
 * Handles Prisma Decimal → number conversion automatically.
 */
export function layerVectorToRecord(
  layerVector: {
    dim1: unknown
    dim2: unknown
    dim3: unknown
    dim4: unknown
    dim5: unknown
    dim6: unknown
    dim7: unknown
  },
  dimMap: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [dimName, dimCol] of Object.entries(dimMap)) {
    const value = layerVector[dimCol as keyof typeof layerVector]
    if (value !== null && value !== undefined) {
      result[dimName] =
        typeof value === "object" && "toNumber" in value
          ? (value as { toNumber(): number }).toNumber()
          : Number(value)
    }
  }
  return result
}

type LayerType = "SOCIAL" | "TEMPERAMENT" | "NARRATIVE"

interface LayerVectorRow {
  layerType: string
  [key: string]: unknown
}

/**
 * Convert a layerVectors array to a Map keyed by layerType.
 * O(n) single pass instead of 3× O(n) .find() calls.
 */
export function layerVectorsToMap<T extends LayerVectorRow>(layerVectors: T[]): Map<LayerType, T> {
  const map = new Map<LayerType, T>()
  for (const v of layerVectors) {
    map.set(v.layerType as LayerType, v)
  }
  return map
}
