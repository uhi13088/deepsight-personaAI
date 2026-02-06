/**
 * 6D 벡터 병합 및 프로필 품질 관리 모듈
 *
 * 여러 소스(Cold Start, SNS 연동, 활동 기반)에서 추출된 벡터를 병합하고
 * 프로필 품질 레벨을 관리합니다.
 */

import type { OnboardingLevel } from "@prisma/client"

// ============================================
// 타입 정의
// ============================================

export interface Vector6D {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

export type ProfileQuality = "BASIC" | "STANDARD" | "ADVANCED" | "PREMIUM"

export interface MergeOptions {
  existingWeight?: number // 기존 벡터 가중치 (0.0~1.0)
  newWeight?: number // 신규 벡터 가중치 (0.0~1.0)
}

export interface ProfileQualityResult {
  quality: ProfileQuality
  confidenceScore: number
  upgradePath?: string
}

export interface DataSourceInfo {
  coldStart?: {
    level: OnboardingLevel
    completedAt: Date
    questionCount: number
  }
  sns?: {
    platforms: string[]
    lastSyncAt: Date
  }
  activity?: {
    likesGiven: number
    commentsGiven: number
    followedPersonas: string[]
    lastUpdatedAt: Date
  }
}

// ============================================
// 벡터 병합 함수
// ============================================

/**
 * 두 6D 벡터를 가중 평균으로 병합
 */
export function mergeVectors(
  existing: Partial<Vector6D> | null,
  newVector: Partial<Vector6D>,
  options: MergeOptions = {}
): Vector6D {
  const existingWeight = options.existingWeight ?? 0.6
  const newWeight = options.newWeight ?? 0.4

  // 기존 벡터가 없으면 새 벡터를 그대로 사용 (없는 값은 0.5로 기본값)
  if (!existing) {
    return normalizeVector({
      depth: newVector.depth ?? 0.5,
      lens: newVector.lens ?? 0.5,
      stance: newVector.stance ?? 0.5,
      scope: newVector.scope ?? 0.5,
      taste: newVector.taste ?? 0.5,
      purpose: newVector.purpose ?? 0.5,
    })
  }

  const dimensions: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]
  const result: Vector6D = {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
  }

  for (const dim of dimensions) {
    const existingVal = existing[dim] ?? 0.5
    const newVal = newVector[dim]

    if (newVal !== undefined) {
      // 두 값 모두 있으면 가중 평균
      const totalWeight = existingWeight + newWeight
      result[dim] = (existingVal * existingWeight + newVal * newWeight) / totalWeight
    } else {
      // 신규 값이 없으면 기존 값 유지
      result[dim] = existingVal
    }
  }

  return normalizeVector(result)
}

/**
 * 점진적 학습용 벡터 병합 (활동 기반 학습)
 * learningRate로 변화 속도 조절
 */
export function smoothMerge(
  current: Vector6D,
  inferred: Partial<Vector6D>,
  learningRate: number = 0.1
): Vector6D {
  const dimensions: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]
  const result = { ...current }

  for (const dim of dimensions) {
    const inferredVal = inferred[dim]
    if (inferredVal !== undefined) {
      // exponential moving average
      result[dim] = current[dim] * (1 - learningRate) + inferredVal * learningRate
    }
  }

  return normalizeVector(result)
}

/**
 * 벡터를 [0, 1] 범위로 정규화
 */
export function normalizeVector(vector: Vector6D): Vector6D {
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  return {
    depth: clamp(vector.depth),
    lens: clamp(vector.lens),
    stance: clamp(vector.stance),
    scope: clamp(vector.scope),
    taste: clamp(vector.taste),
    purpose: clamp(vector.purpose),
  }
}

// ============================================
// 프로필 품질 관리
// ============================================

/**
 * 데이터 소스 기반 프로필 품질 계산
 *
 * 품질 레벨:
 * - BASIC: Cold Start LIGHT만 완료
 * - STANDARD: Cold Start MEDIUM 또는 SNS 1개 연동
 * - ADVANCED: Cold Start DEEP 또는 SNS 2개+ 연동
 * - PREMIUM: Cold Start + SNS 복합
 */
export function calculateProfileQuality(sources: DataSourceInfo): ProfileQualityResult {
  const hasColdStart = !!sources.coldStart
  const coldStartLevel = sources.coldStart?.level
  const snsCount = sources.sns?.platforms.length ?? 0
  const hasActivity = !!sources.activity

  let quality: ProfileQuality = "BASIC"
  let confidenceScore = 0.5
  let upgradePath: string | undefined

  // PREMIUM: Cold Start + SNS 모두 있음
  if (hasColdStart && snsCount >= 1) {
    quality = "PREMIUM"
    confidenceScore = 0.95

    if (coldStartLevel === "LIGHT") {
      confidenceScore = 0.85
    } else if (coldStartLevel === "MEDIUM") {
      confidenceScore = 0.9
    }

    if (snsCount >= 2) {
      confidenceScore = Math.min(confidenceScore + 0.05, 1.0)
    }

    return { quality, confidenceScore }
  }

  // ADVANCED: Cold Start DEEP 또는 SNS 2개+
  if (coldStartLevel === "DEEP" || snsCount >= 2) {
    quality = "ADVANCED"
    confidenceScore = 0.85

    if (coldStartLevel === "DEEP") {
      upgradePath = "SNS 연동을 추가하면 PREMIUM으로 업그레이드됩니다"
    } else {
      upgradePath = "Cold Start 설문을 완료하면 PREMIUM으로 업그레이드됩니다"
    }

    return { quality, confidenceScore, upgradePath }
  }

  // STANDARD: Cold Start MEDIUM 또는 SNS 1개
  if (coldStartLevel === "MEDIUM" || snsCount === 1) {
    quality = "STANDARD"
    confidenceScore = 0.75

    if (coldStartLevel === "MEDIUM" && snsCount === 0) {
      upgradePath = "SNS 연동 또는 추가 설문으로 ADVANCED 업그레이드 가능"
    } else if (snsCount === 1 && !hasColdStart) {
      upgradePath = "Cold Start 설문을 완료하면 PREMIUM으로 업그레이드됩니다"
    }

    return { quality, confidenceScore, upgradePath }
  }

  // BASIC: Cold Start LIGHT 또는 아무것도 없음
  quality = "BASIC"
  confidenceScore = hasColdStart ? 0.6 : 0.5
  upgradePath = "더 많은 설문 응답 또는 SNS 연동으로 프로필을 강화하세요"

  // 활동 데이터가 있으면 신뢰도 약간 상승
  if (hasActivity) {
    confidenceScore = Math.min(confidenceScore + 0.05, 0.7)
  }

  return { quality, confidenceScore, upgradePath }
}

/**
 * Cold Start 레벨에 따른 질문 수 반환
 */
export function getQuestionCountForLevel(level: OnboardingLevel): number {
  switch (level) {
    case "LIGHT":
      return 12
    case "MEDIUM":
      return 30
    case "DEEP":
      return 60
    default:
      return 12
  }
}

/**
 * 예상 완료 시간 반환 (분)
 */
export function getEstimatedTimeForLevel(level: OnboardingLevel): number {
  switch (level) {
    case "LIGHT":
      return 2
    case "MEDIUM":
      return 5
    case "DEEP":
      return 15
    default:
      return 2
  }
}

// ============================================
// 벡터 유사도 계산
// ============================================

/**
 * 두 벡터 간 코사인 유사도 계산 (0~1)
 */
export function cosineSimilarity(v1: Vector6D, v2: Vector6D): number {
  const dimensions: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const dim of dimensions) {
    dotProduct += v1[dim] * v2[dim]
    norm1 += v1[dim] * v1[dim]
    norm2 += v2[dim] * v2[dim]
  }

  if (norm1 === 0 || norm2 === 0) return 0

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

/**
 * 두 벡터 간 유클리드 거리 계산 (0~sqrt(6))
 */
export function euclideanDistance(v1: Vector6D, v2: Vector6D): number {
  const dimensions: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]

  let sumSquares = 0
  for (const dim of dimensions) {
    const diff = v1[dim] - v2[dim]
    sumSquares += diff * diff
  }

  return Math.sqrt(sumSquares)
}

/**
 * 유사도 점수 (0~1, 높을수록 유사)
 * 유클리드 거리를 반전하여 유사도로 변환
 */
export function similarityScore(v1: Vector6D, v2: Vector6D): number {
  const maxDistance = Math.sqrt(6) // 6D 공간에서 최대 거리
  const distance = euclideanDistance(v1, v2)
  return 1 - distance / maxDistance
}
