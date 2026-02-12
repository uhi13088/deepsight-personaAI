// ═══════════════════════════════════════════════════════════════
// 3-Layer 벡터 생성기
// T52-AC2: 다양성 분석, 빈 영역 우선, L1+L2+L3 동시 생성
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
  PersonaArchetype,
} from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ExistingPersonaVectors {
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
}

export interface VectorCoverage {
  l1: Record<SocialDimension, { min: number; max: number; avg: number; count: number }>
  l2: Record<TemperamentDimension, { min: number; max: number; avg: number; count: number }>
  l3: Record<NarrativeDimension, { min: number; max: number; avg: number; count: number }>
  emptyRegions: EmptyRegion[]
  overallCoverage: number // 0.0~1.0
}

export interface EmptyRegion {
  layer: "L1" | "L2" | "L3"
  dimension: string
  range: [number, number]
  priority: number // 높을수록 채워야 할 필요성 큼
}

export interface GenerationConfig {
  archetype?: PersonaArchetype
  existingPersonas?: ExistingPersonaVectors[]
  diversityWeight?: number // 0.0~1.0, default 0.3
  seed?: number
}

const L1_KEYS: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]
const L2_KEYS: TemperamentDimension[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
]
const L3_KEYS: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]

// ── 다양성 분석 ───────────────────────────────────────────────

export function analyzeCoverage(personas: ExistingPersonaVectors[]): VectorCoverage {
  const l1Stats = {} as VectorCoverage["l1"]
  const l2Stats = {} as VectorCoverage["l2"]
  const l3Stats = {} as VectorCoverage["l3"]

  // Initialize stats
  for (const key of L1_KEYS) {
    l1Stats[key] = { min: 1, max: 0, avg: 0, count: 0 }
  }
  for (const key of L2_KEYS) {
    l2Stats[key] = { min: 1, max: 0, avg: 0, count: 0 }
  }
  for (const key of L3_KEYS) {
    l3Stats[key] = { min: 1, max: 0, avg: 0, count: 0 }
  }

  // Compute stats
  for (const p of personas) {
    for (const key of L1_KEYS) {
      const v = p.l1[key]
      const s = l1Stats[key]
      s.min = Math.min(s.min, v)
      s.max = Math.max(s.max, v)
      s.avg += v
      s.count++
    }
    for (const key of L2_KEYS) {
      const v = p.l2[key]
      const s = l2Stats[key]
      s.min = Math.min(s.min, v)
      s.max = Math.max(s.max, v)
      s.avg += v
      s.count++
    }
    for (const key of L3_KEYS) {
      const v = p.l3[key]
      const s = l3Stats[key]
      s.min = Math.min(s.min, v)
      s.max = Math.max(s.max, v)
      s.avg += v
      s.count++
    }
  }

  // Finalize averages
  for (const key of L1_KEYS) {
    if (l1Stats[key].count > 0) l1Stats[key].avg /= l1Stats[key].count
  }
  for (const key of L2_KEYS) {
    if (l2Stats[key].count > 0) l2Stats[key].avg /= l2Stats[key].count
  }
  for (const key of L3_KEYS) {
    if (l3Stats[key].count > 0) l3Stats[key].avg /= l3Stats[key].count
  }

  // Find empty regions
  const emptyRegions: EmptyRegion[] = []
  const BUCKET_SIZE = 0.25 // 4 buckets per dimension

  for (const key of L1_KEYS) {
    findEmptyBuckets(
      "L1",
      key,
      personas.map((p) => p.l1[key]),
      BUCKET_SIZE,
      emptyRegions
    )
  }
  for (const key of L2_KEYS) {
    findEmptyBuckets(
      "L2",
      key,
      personas.map((p) => p.l2[key]),
      BUCKET_SIZE,
      emptyRegions
    )
  }
  for (const key of L3_KEYS) {
    findEmptyBuckets(
      "L3",
      key,
      personas.map((p) => p.l3[key]),
      BUCKET_SIZE,
      emptyRegions
    )
  }

  // Overall coverage = covered buckets / total buckets
  const totalBuckets = (L1_KEYS.length + L2_KEYS.length + L3_KEYS.length) * 4
  const coveredBuckets = totalBuckets - emptyRegions.length
  const overallCoverage = personas.length === 0 ? 0 : coveredBuckets / totalBuckets

  return { l1: l1Stats, l2: l2Stats, l3: l3Stats, emptyRegions, overallCoverage }
}

function findEmptyBuckets(
  layer: "L1" | "L2" | "L3",
  dimension: string,
  values: number[],
  bucketSize: number,
  out: EmptyRegion[]
): void {
  const buckets = Math.ceil(1.0 / bucketSize)
  for (let i = 0; i < buckets; i++) {
    const lo = i * bucketSize
    const hi = Math.min((i + 1) * bucketSize, 1.0)
    const inBucket = values.filter((v) => v >= lo && v < hi).length
    if (inBucket === 0) {
      out.push({
        layer,
        dimension,
        range: [lo, hi],
        priority: 1.0 - (values.length > 0 ? inBucket / values.length : 0),
      })
    }
  }
}

// ── 다양성 기반 벡터 생성 ─────────────────────────────────────

export function generateDiverseVectors(config: GenerationConfig): {
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
} {
  const { archetype, existingPersonas = [], diversityWeight = 0.3 } = config

  // 아키타입이 있으면 범위 내에서, 없으면 전체 범위에서 생성
  const l1Ranges = archetype
    ? L1_KEYS.map((k) => ({ key: k, range: archetype.layer1[k] }))
    : L1_KEYS.map((k) => ({ key: k, range: [0.1, 0.9] as [number, number] }))
  const l2Ranges = archetype
    ? L2_KEYS.map((k) => ({ key: k, range: archetype.layer2[k] }))
    : L2_KEYS.map((k) => ({ key: k, range: [0.1, 0.9] as [number, number] }))
  const l3Ranges = archetype
    ? L3_KEYS.map((k) => ({ key: k, range: archetype.layer3[k] }))
    : L3_KEYS.map((k) => ({ key: k, range: [0.0, 0.8] as [number, number] }))

  // Diversity bias: 기존 페르소나가 있으면 빈 영역 우선
  const coverage = existingPersonas.length > 0 ? analyzeCoverage(existingPersonas) : undefined

  const l1 = {} as SocialPersonaVector
  for (const { key, range } of l1Ranges) {
    l1[key] = generateDimensionValue(range, "L1", key, coverage, diversityWeight)
  }

  const l2 = {} as CoreTemperamentVector
  for (const { key, range } of l2Ranges) {
    l2[key] = generateDimensionValue(range, "L2", key, coverage, diversityWeight)
  }

  const l3 = {} as NarrativeDriveVector
  for (const { key, range } of l3Ranges) {
    l3[key] = generateDimensionValue(range, "L3", key, coverage, diversityWeight)
  }

  return { l1, l2, l3 }
}

function generateDimensionValue(
  range: [number, number],
  layer: "L1" | "L2" | "L3",
  dimension: string,
  coverage: VectorCoverage | undefined,
  diversityWeight: number
): number {
  const [min, max] = range

  if (!coverage || diversityWeight === 0) {
    return randomClamp(min, max)
  }

  // 빈 영역이 있으면 해당 영역으로 bias
  const emptyInDim = coverage.emptyRegions.filter(
    (r) => r.layer === layer && r.dimension === dimension
  )

  if (emptyInDim.length > 0 && Math.random() < diversityWeight) {
    // 빈 영역 중 범위와 겹치는 것 찾기
    const overlapping = emptyInDim.filter((r) => r.range[0] < max && r.range[1] > min)
    if (overlapping.length > 0) {
      const target = overlapping[Math.floor(Math.random() * overlapping.length)]
      const lo = Math.max(min, target.range[0])
      const hi = Math.min(max, target.range[1])
      return randomClamp(lo, hi)
    }
  }

  return randomClamp(min, max)
}

function randomClamp(min: number, max: number): number {
  const v = min + Math.random() * (max - min)
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}

// ── 벡터 간 거리 계산 (유클리드) ──────────────────────────────

export function calculateVectorDistance(
  a: ExistingPersonaVectors,
  b: ExistingPersonaVectors
): number {
  let sum = 0
  for (const key of L1_KEYS) {
    sum += (a.l1[key] - b.l1[key]) ** 2
  }
  for (const key of L2_KEYS) {
    sum += (a.l2[key] - b.l2[key]) ** 2
  }
  for (const key of L3_KEYS) {
    sum += (a.l3[key] - b.l3[key]) ** 2
  }
  return Math.sqrt(sum)
}

// ── 최소 거리 확인 (다양성 보장) ──────────────────────────────

export function checkMinDistance(
  candidate: ExistingPersonaVectors,
  existing: ExistingPersonaVectors[],
  minDistance: number = 0.3
): boolean {
  if (existing.length === 0) return true
  return existing.every((e) => calculateVectorDistance(candidate, e) >= minDistance)
}
