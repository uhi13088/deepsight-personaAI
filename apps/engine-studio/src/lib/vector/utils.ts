// ═══════════════════════════════════════════════════════════════
// Vector Utility Functions
// 구현계획서 Phase 1, Task 1-1
// ═══════════════════════════════════════════════════════════════

/**
 * Clamp value to [0.0, 1.0] range
 */
export function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Validate that all vector dimensions are in [0.0, 1.0]
 */
export function validateVector(
  vector: Record<string, number>,
  context: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [key, value] of Object.entries(vector)) {
    if (typeof value !== "number") {
      errors.push(`${context}.${key}: not a number (got ${typeof value})`)
    } else if (Number.isNaN(value)) {
      errors.push(`${context}.${key}: NaN`)
    } else if (value < 0 || value > 1) {
      errors.push(`${context}.${key}: out of range [0.0, 1.0] (got ${value})`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`)
  }
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0))
}

/**
 * Cosine similarity between two vectors (0.0~1.0)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`)
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  if (magA === 0 || magB === 0) return 0
  return dotProduct / (magA * magB)
}
