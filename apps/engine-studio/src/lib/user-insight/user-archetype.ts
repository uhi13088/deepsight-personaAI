// ═══════════════════════════════════════════════════════════════
// 유저 아키타입 분류
// T56-AC4: 10종 기본 아키타입, 규칙 기반 분류, 관리
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface UserArchetype {
  id: string
  name: string
  nameKo: string
  description: string
  referenceVector: Record<SocialDimension, number>
  thresholds: ArchetypeThreshold[]
  isCustom: boolean
}

export interface ArchetypeThreshold {
  dimension: SocialDimension
  operator: "gte" | "lte"
  value: number
}

export interface ClassificationResult {
  archetypeId: string
  archetypeName: string
  distance: number // 유클리드 거리 (낮을수록 유사)
  confidence: number // 0~1
  matchedThresholds: number // 규칙 매칭 수
  totalThresholds: number
}

export interface UserArchetypeProfile {
  userId: string
  primaryArchetype: ClassificationResult
  secondaryArchetype: ClassificationResult | null
  allScores: ClassificationResult[]
  classifiedAt: number
}

// ── 10종 기본 아키타입 ─────────────────────────────────────────

export const BASE_ARCHETYPES: UserArchetype[] = [
  {
    id: "analyst",
    name: "Analyst",
    nameKo: "분석가",
    description: "데이터와 논리를 중시하며, 깊은 분석과 체계적 사고를 선호",
    referenceVector: {
      depth: 0.8,
      lens: 0.9,
      stance: 0.6,
      scope: 0.8,
      taste: 0.4,
      purpose: 0.6,
      sociability: 0.3,
    },
    thresholds: [
      { dimension: "lens", operator: "gte", value: 0.7 },
      { dimension: "depth", operator: "gte", value: 0.7 },
    ],
    isCustom: false,
  },
  {
    id: "explorer",
    name: "Explorer",
    nameKo: "탐험가",
    description: "새로운 것을 추구하며, 실험적 취향과 의미 추구 성향",
    referenceVector: {
      depth: 0.5,
      lens: 0.4,
      stance: 0.4,
      scope: 0.5,
      taste: 0.9,
      purpose: 0.7,
      sociability: 0.5,
    },
    thresholds: [
      { dimension: "taste", operator: "gte", value: 0.7 },
      { dimension: "purpose", operator: "gte", value: 0.6 },
    ],
    isCustom: false,
  },
  {
    id: "empath",
    name: "Empath",
    nameKo: "감성인",
    description: "공감과 감정을 중시하며, 소통 지향적이고 수용적 태도",
    referenceVector: {
      depth: 0.4,
      lens: 0.1,
      stance: 0.2,
      scope: 0.4,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.8,
    },
    thresholds: [
      { dimension: "lens", operator: "lte", value: 0.3 },
      { dimension: "sociability", operator: "gte", value: 0.7 },
    ],
    isCustom: false,
  },
  {
    id: "critic",
    name: "Critic",
    nameKo: "비평가",
    description: "날카로운 평가와 비판적 시각으로 콘텐츠를 분석",
    referenceVector: {
      depth: 0.7,
      lens: 0.7,
      stance: 0.9,
      scope: 0.6,
      taste: 0.5,
      purpose: 0.6,
      sociability: 0.3,
    },
    thresholds: [
      { dimension: "stance", operator: "gte", value: 0.7 },
      { dimension: "lens", operator: "gte", value: 0.6 },
    ],
    isCustom: false,
  },
  {
    id: "minimalist",
    name: "Minimalist",
    nameKo: "효율러",
    description: "핵심만 원하며, 직관적이고 효율적인 콘텐츠 소비",
    referenceVector: {
      depth: 0.2,
      lens: 0.5,
      stance: 0.5,
      scope: 0.1,
      taste: 0.3,
      purpose: 0.2,
      sociability: 0.4,
    },
    thresholds: [
      { dimension: "scope", operator: "lte", value: 0.3 },
      { dimension: "depth", operator: "lte", value: 0.3 },
    ],
    isCustom: false,
  },
  {
    id: "storyteller",
    name: "Storyteller",
    nameKo: "스토리텔러",
    description: "서사와 맥락을 중시하며, 풍부한 디테일과 감성적 내러티브 선호",
    referenceVector: {
      depth: 0.8,
      lens: 0.3,
      stance: 0.3,
      scope: 0.9,
      taste: 0.5,
      purpose: 0.7,
      sociability: 0.5,
    },
    thresholds: [
      { dimension: "scope", operator: "gte", value: 0.7 },
      { dimension: "depth", operator: "gte", value: 0.7 },
    ],
    isCustom: false,
  },
  {
    id: "trendsetter",
    name: "Trendsetter",
    nameKo: "트렌드세터",
    description: "최신 유행을 추종하며, 실험적 취향과 사교적 소비 패턴",
    referenceVector: {
      depth: 0.3,
      lens: 0.4,
      stance: 0.3,
      scope: 0.4,
      taste: 0.9,
      purpose: 0.3,
      sociability: 0.7,
    },
    thresholds: [
      { dimension: "taste", operator: "gte", value: 0.7 },
      { dimension: "sociability", operator: "gte", value: 0.6 },
    ],
    isCustom: false,
  },
  {
    id: "classicist",
    name: "Classicist",
    nameKo: "클래시스트",
    description: "고전과 불변의 가치를 추구하며, 심층적이고 정제된 콘텐츠 선호",
    referenceVector: {
      depth: 0.7,
      lens: 0.6,
      stance: 0.5,
      scope: 0.6,
      taste: 0.1,
      purpose: 0.7,
      sociability: 0.3,
    },
    thresholds: [
      { dimension: "taste", operator: "lte", value: 0.3 },
      { dimension: "depth", operator: "gte", value: 0.6 },
    ],
    isCustom: false,
  },
  {
    id: "balancer",
    name: "Balancer",
    nameKo: "밸런서",
    description: "균형 잡힌 시각으로 다양한 관점을 수용, 극단을 피함",
    referenceVector: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    },
    thresholds: [], // 모든 차원이 0.35~0.65 범위면 매칭
    isCustom: false,
  },
  {
    id: "hybrid",
    name: "Hybrid",
    nameKo: "하이브리드",
    description: "복합 성향으로 단일 아키타입에 해당하지 않는 고유한 패턴",
    referenceVector: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    },
    thresholds: [], // fallback 아키타입
    isCustom: false,
  },
]

// ── 유클리드 거리 계산 ───────────────────────────────────────

export function euclideanDistance(
  a: Record<SocialDimension, number>,
  b: Record<SocialDimension, number>
): number {
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  const sumSq = dims.reduce((sum, dim) => sum + Math.pow((a[dim] ?? 0.5) - (b[dim] ?? 0.5), 2), 0)
  return round(Math.sqrt(sumSq))
}

// ── 규칙 기반 매칭 ─────────────────────────────────────────────

export function matchThresholds(
  vector: Record<SocialDimension, number>,
  thresholds: ArchetypeThreshold[]
): { matched: number; total: number } {
  if (thresholds.length === 0) return { matched: 0, total: 0 }

  let matched = 0
  for (const t of thresholds) {
    const value = vector[t.dimension] ?? 0.5
    if (t.operator === "gte" && value >= t.value) matched++
    else if (t.operator === "lte" && value <= t.value) matched++
  }

  return { matched, total: thresholds.length }
}

// ── 밸런서 특수 판별 ─────────────────────────────────────────

function isBalancedVector(vector: Record<SocialDimension, number>): boolean {
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  return dims.every((dim) => {
    const v = vector[dim] ?? 0.5
    return v >= 0.35 && v <= 0.65
  })
}

// ── 분류 ─────────────────────────────────────────────────────

export const DISTANCE_THRESHOLD = 0.6 // 이 이상이면 Hybrid

export function classifyUser(
  userVector: SocialPersonaVector,
  archetypes: UserArchetype[] = BASE_ARCHETYPES
): UserArchetypeProfile {
  const vectorRecord = userVector as Record<SocialDimension, number>
  const scores: ClassificationResult[] = []

  for (const archetype of archetypes) {
    if (archetype.id === "hybrid") continue // fallback이므로 스킵

    const distance = euclideanDistance(vectorRecord, archetype.referenceVector)

    // T220: 밸런서 특수 처리 — 거리 기반 보너스로 변경 (강제 distance=0.1 제거)
    if (archetype.id === "balancer") {
      const isBalanced = isBalancedVector(vectorRecord)
      // 균형 벡터면 distance에 0.7x 보너스 (다른 아키타입보다 항상 우선하지 않도록)
      const balancerDistance = isBalanced ? round(distance * 0.7) : distance
      const balancerConfidence = isBalanced
        ? round(Math.max(0, 1 - balancerDistance) * 0.6 + 0.4)
        : round(Math.max(0, 1 - distance))
      scores.push({
        archetypeId: archetype.id,
        archetypeName: archetype.nameKo,
        distance: balancerDistance,
        confidence: balancerConfidence,
        matchedThresholds: isBalanced ? 1 : 0,
        totalThresholds: 1,
      })
      continue
    }

    const { matched, total } = matchThresholds(vectorRecord, archetype.thresholds)
    const ruleScore = total > 0 ? matched / total : 0

    // 신뢰도: 거리(60%) + 규칙 매칭(40%)
    const distanceConfidence = Math.max(0, 1 - distance)
    const confidence = round(distanceConfidence * 0.6 + ruleScore * 0.4)

    scores.push({
      archetypeId: archetype.id,
      archetypeName: archetype.nameKo,
      distance,
      confidence,
      matchedThresholds: matched,
      totalThresholds: total,
    })
  }

  // 거리 기준 정렬 (가까운 순)
  scores.sort((a, b) => a.distance - b.distance)

  const primary = scores[0]
  const secondary = scores.length > 1 ? scores[1] : null

  // Hybrid fallback: 1위 거리가 threshold 초과 시
  if (primary.distance > DISTANCE_THRESHOLD) {
    const hybridResult: ClassificationResult = {
      archetypeId: "hybrid",
      archetypeName: "하이브리드",
      distance: primary.distance,
      confidence: round(0.5),
      matchedThresholds: 0,
      totalThresholds: 0,
    }

    return {
      userId: "",
      primaryArchetype: hybridResult,
      secondaryArchetype: primary,
      allScores: [hybridResult, ...scores],
      classifiedAt: Date.now(),
    }
  }

  return {
    userId: "",
    primaryArchetype: primary,
    secondaryArchetype: secondary,
    allScores: scores,
    classifiedAt: Date.now(),
  }
}

// ── 유저별 프로필 생성 ───────────────────────────────────────

export function createUserArchetypeProfile(
  userId: string,
  userVector: SocialPersonaVector,
  archetypes?: UserArchetype[]
): UserArchetypeProfile {
  const profile = classifyUser(userVector, archetypes)
  return { ...profile, userId }
}

// ── 커스텀 아키타입 생성 ─────────────────────────────────────

export function createCustomArchetype(
  name: string,
  nameKo: string,
  description: string,
  referenceVector: Record<SocialDimension, number>,
  thresholds: ArchetypeThreshold[] = []
): UserArchetype {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    nameKo,
    description,
    referenceVector,
    thresholds,
    isCustom: true,
  }
}

// ── 아키타입 목록에 추가 ─────────────────────────────────────

export function addArchetype(
  archetypes: UserArchetype[],
  archetype: UserArchetype
): UserArchetype[] {
  if (archetypes.some((a) => a.id === archetype.id)) {
    throw new Error(`아키타입 ID '${archetype.id}'가 이미 존재합니다`)
  }
  return [...archetypes, archetype]
}

// ── 아키타입 수정 ────────────────────────────────────────────

export function updateArchetype(
  archetypes: UserArchetype[],
  archetypeId: string,
  updates: Partial<
    Pick<UserArchetype, "name" | "nameKo" | "description" | "referenceVector" | "thresholds">
  >
): UserArchetype[] {
  const idx = archetypes.findIndex((a) => a.id === archetypeId)
  if (idx === -1) throw new Error(`아키타입 '${archetypeId}'를 찾을 수 없습니다`)

  const updated = { ...archetypes[idx], ...updates }
  return [...archetypes.slice(0, idx), updated, ...archetypes.slice(idx + 1)]
}

// ── 아키타입 제거 ────────────────────────────────────────────

export function removeArchetype(archetypes: UserArchetype[], archetypeId: string): UserArchetype[] {
  const target = archetypes.find((a) => a.id === archetypeId)
  if (!target) throw new Error(`아키타입 '${archetypeId}'를 찾을 수 없습니다`)
  if (!target.isCustom) throw new Error("기본 아키타입은 삭제할 수 없습니다")
  return archetypes.filter((a) => a.id !== archetypeId)
}

// ── 아키타입별 통계 ──────────────────────────────────────────

export interface ArchetypeStats {
  archetypeId: string
  archetypeName: string
  userCount: number
  avgConfidence: number
}

export function computeArchetypeStats(profiles: UserArchetypeProfile[]): ArchetypeStats[] {
  const groups: Record<string, { name: string; confidences: number[] }> = {}

  for (const profile of profiles) {
    const id = profile.primaryArchetype.archetypeId
    if (!groups[id]) {
      groups[id] = { name: profile.primaryArchetype.archetypeName, confidences: [] }
    }
    groups[id].confidences.push(profile.primaryArchetype.confidence)
  }

  return Object.entries(groups).map(([id, group]) => ({
    archetypeId: id,
    archetypeName: group.name,
    userCount: group.confidences.length,
    avgConfidence: round(group.confidences.reduce((a, b) => a + b, 0) / group.confidences.length),
  }))
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
