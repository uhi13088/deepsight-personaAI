/**
 * 6D 코사인 유사도 기반 페르소나 매칭
 *
 * 유저의 6D 벡터와 페르소나들의 6D 벡터를 비교하여
 * 유사한 페르소나를 찾아 추천 피드를 생성
 */

export interface Vector6D {
  depth: number // 심층적(1) ↔ 직관적(0)
  lens: number // 논리적(1) ↔ 감성적(0)
  stance: number // 비판적(1) ↔ 수용적(0)
  scope: number // 디테일(1) ↔ 핵심(0)
  taste: number // 실험적(1) ↔ 클래식(0)
  purpose: number // 의미(1) ↔ 재미(0)
}

export interface PersonaWithVector {
  id: string
  name: string
  handle: string
  vector6d: Vector6D
  [key: string]: unknown
}

export interface SimilarityResult {
  persona: PersonaWithVector
  similarity: number
  reason: string
}

/**
 * 두 6D 벡터 간의 코사인 유사도 계산
 *
 * @param a - 첫 번째 벡터
 * @param b - 두 번째 벡터
 * @returns 0~1 사이의 유사도 (1에 가까울수록 유사)
 */
export function calculateCosineSimilarity(a: Vector6D, b: Vector6D): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (const dim of dimensions) {
    dotProduct += a[dim] * b[dim]
    magnitudeA += a[dim] * a[dim]
    magnitudeB += b[dim] * b[dim]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * 유클리드 거리 기반 유사도 계산 (대안)
 * 거리가 가까울수록 유사도가 높음
 */
export function calculateEuclideanSimilarity(a: Vector6D, b: Vector6D): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

  let sumSquares = 0
  for (const dim of dimensions) {
    sumSquares += Math.pow(a[dim] - b[dim], 2)
  }

  const distance = Math.sqrt(sumSquares)
  const maxDistance = Math.sqrt(6) // 모든 차원이 0~1이므로 최대 거리 = sqrt(6)

  return 1 - distance / maxDistance
}

/**
 * 가중치 기반 하이브리드 유사도 계산
 * 코사인 유사도와 유클리드 유사도를 혼합
 */
export function calculateHybridSimilarity(
  a: Vector6D,
  b: Vector6D,
  weights: { cosine: number; euclidean: number } = { cosine: 0.7, euclidean: 0.3 }
): number {
  const cosineSim = calculateCosineSimilarity(a, b)
  const euclideanSim = calculateEuclideanSimilarity(a, b)

  return cosineSim * weights.cosine + euclideanSim * weights.euclidean
}

/**
 * 유사도 점수를 바탕으로 추천 이유 생성
 */
export function generateRecommendationReason(
  userVector: Vector6D,
  personaVector: Vector6D,
  personaName: string
): string {
  const dimensions = [
    { key: "depth" as const, highLabel: "심층 분석", lowLabel: "직관적 감상" },
    { key: "lens" as const, highLabel: "논리적 시각", lowLabel: "감성적 시각" },
    { key: "stance" as const, highLabel: "비판적 관점", lowLabel: "수용적 관점" },
    { key: "scope" as const, highLabel: "디테일 중심", lowLabel: "핵심 중심" },
    { key: "taste" as const, highLabel: "실험적 취향", lowLabel: "클래식 취향" },
    { key: "purpose" as const, highLabel: "의미 추구", lowLabel: "재미 추구" },
  ]

  // 가장 유사한 차원 찾기
  let closestDim = dimensions[0]
  let closestDiff = Math.abs(userVector[closestDim.key] - personaVector[closestDim.key])

  for (const dim of dimensions) {
    const diff = Math.abs(userVector[dim.key] - personaVector[dim.key])
    if (diff < closestDiff) {
      closestDiff = diff
      closestDim = dim
    }
  }

  // 해당 차원의 값에 따른 라벨 선택
  const avgValue = (userVector[closestDim.key] + personaVector[closestDim.key]) / 2
  const label = avgValue > 0.5 ? closestDim.highLabel : closestDim.lowLabel

  const reasons = [
    `${personaName}님과 ${label} 스타일이 비슷해요!`,
    `${label}에 대한 취향이 잘 맞아요`,
    `${personaName}님도 ${label}을(를) 좋아해요`,
    `비슷한 ${label} 성향을 가지고 있어요`,
  ]

  return reasons[Math.floor(Math.random() * reasons.length)]
}

/**
 * 유저와 유사한 페르소나 목록 조회
 */
export function findSimilarPersonas(
  userVector: Vector6D,
  personas: PersonaWithVector[],
  options: {
    threshold?: number
    limit?: number
    excludeIds?: string[]
  } = {}
): SimilarityResult[] {
  const { threshold = 0.5, limit = 20, excludeIds = [] } = options

  const results: SimilarityResult[] = []

  for (const persona of personas) {
    if (excludeIds.includes(persona.id)) {
      continue
    }

    if (!persona.vector6d) {
      continue
    }

    const similarity = calculateHybridSimilarity(userVector, persona.vector6d)

    if (similarity >= threshold) {
      results.push({
        persona,
        similarity,
        reason: generateRecommendationReason(userVector, persona.vector6d, persona.name),
      })
    }
  }

  // 유사도 높은 순으로 정렬
  results.sort((a, b) => b.similarity - a.similarity)

  return results.slice(0, limit)
}

/**
 * 벡터 간 차이점 분석
 */
export function analyzeVectorDifference(
  a: Vector6D,
  b: Vector6D
): {
  dimension: keyof Vector6D
  diff: number
  label: string
}[] {
  const dimensions: { key: keyof Vector6D; label: string }[] = [
    { key: "depth", label: "분석 깊이" },
    { key: "lens", label: "시각 방식" },
    { key: "stance", label: "비평 태도" },
    { key: "scope", label: "관점 범위" },
    { key: "taste", label: "취향 성향" },
    { key: "purpose", label: "목적 지향" },
  ]

  return dimensions
    .map((dim) => ({
      dimension: dim.key,
      diff: Math.abs(a[dim.key] - b[dim.key]),
      label: dim.label,
    }))
    .sort((x, y) => y.diff - x.diff)
}

/**
 * JSON 객체를 Vector6D로 변환 (안전한 파싱)
 */
export function parseVector6D(obj: unknown): Vector6D | null {
  if (!obj || typeof obj !== "object") {
    return null
  }

  const vec = obj as Record<string, unknown>
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"]

  for (const dim of dimensions) {
    if (typeof vec[dim] !== "number") {
      return null
    }
  }

  return {
    depth: Number(vec.depth),
    lens: Number(vec.lens),
    stance: Number(vec.stance),
    scope: Number(vec.scope),
    taste: Number(vec.taste),
    purpose: Number(vec.purpose),
  }
}
