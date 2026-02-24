// ═══════════════════════════════════════════════════════════════
// 매칭 시뮬레이터
// T57-AC2: 가상 유저 생성, 시뮬레이션 실행, 결과 분석
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@/types"
import type {
  PersonaCandidate,
  UserProfile,
  MatchResult,
  MatchingConfig,
} from "./three-tier-engine"
import { matchAll, DEFAULT_MATCHING_CONFIG } from "./three-tier-engine"
import { round, SOCIAL_DIM_LABELS } from "./utils"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface VirtualUser {
  id: string
  label: string
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  archetype?: string
  source: "manual" | "random" | "import"
}

export interface SimulationRun {
  id: string
  virtualUser: VirtualUser
  results: MatchResult[]
  topPersonaId: string | null
  topScore: number
  avgScore: number
  timestamp: number
}

export interface BatchSimulationResult {
  id: string
  runs: SimulationRun[]
  stats: BatchStats
  config: MatchingConfig
  timestamp: number
}

export interface BatchStats {
  totalUsers: number
  avgMatchScore: number
  medianMatchScore: number
  failureRate: number // score < threshold 비율
  topPersonaDistribution: Array<{ personaId: string; count: number; percentage: number }>
  scoreDistribution: ScoreDistribution
}

export interface ScoreDistribution {
  buckets: Array<{ min: number; max: number; count: number }>
  mean: number
  stdDev: number
}

export interface DimensionExplanation {
  dimension: string
  label: string
  userValue: number
  personaValue: number
  similarity: number
}

// ── 가상 유저 생성 ───────────────────────────────────────────

export function createManualVirtualUser(
  label: string,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: string
): VirtualUser {
  return {
    id: `vu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    l1,
    l2,
    l3,
    archetype,
    source: "manual",
  }
}

export function createRandomVirtualUser(label?: string): VirtualUser {
  return {
    id: `vu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: label ?? "Random User",
    l1: randomL1(),
    l2: randomL2(),
    l3: randomL3(),
    source: "random",
  }
}

function randomL1(): SocialPersonaVector {
  return {
    depth: randomDim(),
    lens: randomDim(),
    stance: randomDim(),
    scope: randomDim(),
    taste: randomDim(),
    purpose: randomDim(),
    sociability: randomDim(),
  }
}

function randomL2(): CoreTemperamentVector {
  return {
    openness: randomDim(),
    conscientiousness: randomDim(),
    extraversion: randomDim(),
    agreeableness: randomDim(),
    neuroticism: randomDim(),
  }
}

function randomL3(): NarrativeDriveVector {
  return {
    lack: randomDim(),
    moralCompass: randomDim(),
    volatility: randomDim(),
    growthArc: randomDim(),
  }
}

function randomDim(): number {
  return round(Math.random())
}

// ── 단일 시뮬레이션 ─────────────────────────────────────────

export function runSingleSimulation(
  virtualUser: VirtualUser,
  userProfile: UserProfile,
  personas: PersonaCandidate[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): SimulationRun {
  const results = matchAll(userProfile, personas, config)
  results.sort((a, b) => b.score - a.score)

  return {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    virtualUser,
    results,
    topPersonaId: results.length > 0 ? results[0].personaId : null,
    topScore: results.length > 0 ? results[0].score : 0,
    avgScore:
      results.length > 0 ? round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    timestamp: Date.now(),
  }
}

// ── 배치 시뮬레이션 ─────────────────────────────────────────

export function runBatchSimulation(
  runs: SimulationRun[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): BatchSimulationResult {
  return {
    id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    runs,
    stats: calculateBatchStats(runs, config.similarityThreshold),
    config,
    timestamp: Date.now(),
  }
}

// ── 배치 통계 ────────────────────────────────────────────────

export function calculateBatchStats(runs: SimulationRun[], threshold: number = 0.5): BatchStats {
  if (runs.length === 0) {
    return {
      totalUsers: 0,
      avgMatchScore: 0,
      medianMatchScore: 0,
      failureRate: 0,
      topPersonaDistribution: [],
      scoreDistribution: { buckets: [], mean: 0, stdDev: 0 },
    }
  }

  const topScores = runs.map((r) => r.topScore)
  const sorted = [...topScores].sort((a, b) => a - b)

  const mean = round(topScores.reduce((s, v) => s + v, 0) / topScores.length)
  const median =
    sorted.length % 2 === 0
      ? round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)]

  const failures = topScores.filter((s) => s < threshold).length
  const failureRate = round(failures / topScores.length)

  // 상위 페르소나 분포
  const personaCounts: Record<string, number> = {}
  for (const run of runs) {
    if (run.topPersonaId) {
      personaCounts[run.topPersonaId] = (personaCounts[run.topPersonaId] ?? 0) + 1
    }
  }
  const topPersonaDistribution = Object.entries(personaCounts)
    .map(([personaId, count]) => ({
      personaId,
      count,
      percentage: round(count / runs.length),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 점수 분포
  const buckets = [
    { min: 0, max: 0.2, count: 0 },
    { min: 0.2, max: 0.4, count: 0 },
    { min: 0.4, max: 0.6, count: 0 },
    { min: 0.6, max: 0.8, count: 0 },
    { min: 0.8, max: 1.0, count: 0 },
  ]
  for (const score of topScores) {
    const idx = Math.min(Math.floor(score * 5), 4)
    buckets[idx].count++
  }

  const variance = topScores.reduce((s, v) => s + (v - mean) ** 2, 0) / topScores.length
  const stdDev = round(Math.sqrt(variance))

  return {
    totalUsers: runs.length,
    avgMatchScore: mean,
    medianMatchScore: median,
    failureRate,
    topPersonaDistribution,
    scoreDistribution: { buckets, mean, stdDev },
  }
}

// ── 차원별 매칭 설명 (XAI) ───────────────────────────────────

export function generateDimensionExplanations(
  userL1: SocialPersonaVector,
  personaL1: SocialPersonaVector
): DimensionExplanation[] {
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]

  return dims
    .map((dim) => ({
      dimension: dim,
      label: SOCIAL_DIM_LABELS[dim] ?? dim,
      userValue: round(userL1[dim]),
      personaValue: round(personaL1[dim]),
      similarity: round(1 - Math.abs(userL1[dim] - personaL1[dim])),
    }))
    .sort((a, b) => b.similarity - a.similarity)
}
