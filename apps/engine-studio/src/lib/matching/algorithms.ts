/**
 * 6D Vector Matching Algorithms
 * 프로덕션 수준의 페르소나 매칭 알고리즘
 */

export type Vector6D = {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

export type AlgorithmType = "COSINE" | "WEIGHTED" | "CONTEXT" | "HYBRID"

export type MatchingContext = {
  timeOfDay?: "morning" | "afternoon" | "evening" | "night"
  mood?: "relaxed" | "focused" | "adventurous" | "contemplative"
  contentType?: string
  genre?: string
}

const DIMENSIONS = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

/**
 * 벡터를 배열로 변환
 */
export function vectorToArray(vec: Vector6D): number[] {
  return DIMENSIONS.map((d) => vec[d])
}

/**
 * 코사인 유사도 계산
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * 가중 유클리디안 거리 기반 유사도
 */
export function weightedEuclideanSimilarity(
  vecA: number[],
  vecB: number[],
  weights: number[]
): number {
  let sum = 0
  let totalWeight = 0

  for (let i = 0; i < vecA.length; i++) {
    sum += weights[i] * Math.pow(vecA[i] - vecB[i], 2)
    totalWeight += weights[i]
  }

  // 최대 거리로 정규화 (각 차원의 최대 거리는 1)
  const maxDistance = Math.sqrt(totalWeight)
  const distance = Math.sqrt(sum)

  return 1 - distance / maxDistance
}

/**
 * 컨텍스트 기반 가중치 계산
 */
export function getContextWeights(context?: MatchingContext): number[] {
  // 기본 가중치 (균등)
  const weights = [1, 1, 1, 1, 1, 1]

  if (!context) return weights

  // 시간대별 가중치 조정
  if (context.timeOfDay) {
    switch (context.timeOfDay) {
      case "morning":
        // 아침: 분석적, 논리적 콘텐츠 선호
        weights[0] = 1.2 // depth
        weights[1] = 1.3 // lens (논리)
        break
      case "evening":
        // 저녁: 감성적, 오락 콘텐츠 선호
        weights[1] = 0.8 // lens (감성)
        weights[5] = 0.8 // purpose (오락)
        break
      case "night":
        // 밤: 실험적, 깊이 있는 콘텐츠
        weights[0] = 1.3 // depth
        weights[4] = 1.2 // taste (실험적)
        break
    }
  }

  // 무드별 가중치 조정
  if (context.mood) {
    switch (context.mood) {
      case "relaxed":
        weights[2] = 0.7 // stance (수용적)
        weights[5] = 0.7 // purpose (오락)
        break
      case "focused":
        weights[0] = 1.4 // depth
        weights[3] = 1.2 // scope (디테일)
        break
      case "adventurous":
        weights[4] = 1.5 // taste (실험적)
        weights[2] = 1.2 // stance (비판적)
        break
      case "contemplative":
        weights[0] = 1.3 // depth
        weights[5] = 1.4 // purpose (의미)
        break
    }
  }

  return weights
}

/**
 * 하이브리드 매칭 점수 계산
 * 코사인 유사도와 가중 유클리디안의 조합
 */
export function hybridSimilarity(
  vecA: number[],
  vecB: number[],
  weights: number[],
  cosineWeight = 0.6
): number {
  const cosine = cosineSimilarity(vecA, vecB)
  const euclidean = weightedEuclideanSimilarity(vecA, vecB, weights)

  return cosine * cosineWeight + euclidean * (1 - cosineWeight)
}

/**
 * 차원별 유사도 분석
 */
export function getDimensionBreakdown(
  userVec: Vector6D,
  personaVec: Vector6D
): Record<string, number> {
  const breakdown: Record<string, number> = {}

  DIMENSIONS.forEach((dim) => {
    // 1에서 차이를 빼서 유사도로 변환 (0~1 범위)
    breakdown[dim] = 1 - Math.abs(userVec[dim] - personaVec[dim])
  })

  return breakdown
}

/**
 * 매칭 점수 계산 (메인 함수)
 */
export function calculateMatchingScore(
  userVector: Vector6D,
  personaVector: Vector6D,
  algorithm: AlgorithmType = "COSINE",
  context?: MatchingContext,
  customWeights?: number[]
): {
  score: number
  breakdown: Record<string, number>
  algorithm: AlgorithmType
} {
  const userVec = vectorToArray(userVector)
  const personaVec = vectorToArray(personaVector)
  const weights = customWeights || getContextWeights(context)

  let score: number

  switch (algorithm) {
    case "COSINE":
      score = cosineSimilarity(userVec, personaVec)
      break
    case "WEIGHTED":
      score = weightedEuclideanSimilarity(userVec, personaVec, weights)
      break
    case "CONTEXT":
      score = weightedEuclideanSimilarity(userVec, personaVec, weights)
      break
    case "HYBRID":
      score = hybridSimilarity(userVec, personaVec, weights)
      break
    default:
      score = cosineSimilarity(userVec, personaVec)
  }

  return {
    score: score * 100, // 0-100 스케일
    breakdown: getDimensionBreakdown(userVector, personaVector),
    algorithm,
  }
}

/**
 * 다양성 점수 계산 (결과 다양화를 위해)
 */
export function calculateDiversityScore(
  selectedPersonas: Vector6D[],
  candidateVector: Vector6D
): number {
  if (selectedPersonas.length === 0) return 1

  const candidateVec = vectorToArray(candidateVector)
  let totalDiversity = 0

  selectedPersonas.forEach((selected) => {
    const selectedVec = vectorToArray(selected)
    // 선택된 것들과의 거리가 멀수록 다양성 점수 높음
    const similarity = cosineSimilarity(candidateVec, selectedVec)
    totalDiversity += 1 - similarity
  })

  return totalDiversity / selectedPersonas.length
}

/**
 * Top-N 매칭 결과 생성 (다양성 반영)
 */
export function selectTopNWithDiversity<T extends { vector: Vector6D; score: number }>(
  candidates: T[],
  n: number,
  diversityFactor = 0.3
): T[] {
  if (candidates.length <= n) return candidates

  const selected: T[] = []
  const remaining = [...candidates].sort((a, b) => b.score - a.score)

  // 첫 번째는 최고 점수
  selected.push(remaining.shift()!)

  while (selected.length < n && remaining.length > 0) {
    // 남은 후보들의 다양성 점수 계산
    const scoredCandidates = remaining.map((candidate, idx) => {
      const diversityScore = calculateDiversityScore(
        selected.map((s) => s.vector),
        candidate.vector
      )
      // 매칭 점수와 다양성 점수 조합
      const combinedScore =
        candidate.score * (1 - diversityFactor) + diversityScore * 100 * diversityFactor

      return { idx, combinedScore }
    })

    scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore)
    const bestIdx = scoredCandidates[0].idx

    selected.push(remaining.splice(bestIdx, 1)[0])
  }

  return selected
}
