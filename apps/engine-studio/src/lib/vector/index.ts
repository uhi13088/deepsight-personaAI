/**
 * 6D Vector 관련 함수 모음
 * @module lib/vector
 */

// utils.ts에서 벡터 관련 함수들을 re-export
export {
  calculateCosineSimilarity,
  calculateWeightedSimilarity,
  normalizeVector,
  vectorToMatchScore,
  VECTOR_DIMENSION_LABELS,
  VECTOR_PRESETS,
  type Vector6D,
  type VectorDimension,
} from "@/lib/utils"

// 추가 벡터 유틸리티 함수들

/**
 * 두 벡터 간의 유클리디안 거리 계산
 */
export function calculateEuclideanDistance(
  v1: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  },
  v2: { depth: number; lens: number; stance: number; scope: number; taste: number; purpose: number }
): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
  let sum = 0

  for (const dim of dimensions) {
    sum += (v1[dim] - v2[dim]) ** 2
  }

  return Math.sqrt(sum)
}

/**
 * 벡터의 크기(magnitude) 계산
 */
export function calculateMagnitude(v: {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
  let sum = 0

  for (const dim of dimensions) {
    sum += v[dim] ** 2
  }

  return Math.sqrt(sum)
}

/**
 * 벡터 값이 유효한 범위(0~1) 내에 있는지 검증
 */
export function isValidVector(v: {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}): boolean {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

  for (const dim of dimensions) {
    if (v[dim] < 0 || v[dim] > 1) {
      return false
    }
  }

  return true
}

/**
 * 벡터 값을 유효한 범위(0~1)로 클램핑
 */
export function clampVector(v: {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}): { depth: number; lens: number; stance: number; scope: number; taste: number; purpose: number } {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
  const result = { ...v }

  for (const dim of dimensions) {
    result[dim] = Math.max(0, Math.min(1, v[dim]))
  }

  return result
}

/**
 * 기본 벡터 (모든 차원이 0.5)
 */
export const DEFAULT_VECTOR = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
} as const
