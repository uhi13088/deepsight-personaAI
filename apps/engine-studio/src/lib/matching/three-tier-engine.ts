// ═══════════════════════════════════════════════════════════════
// 3-Tier 매칭 엔진
// T57-AC1: Basic(60%) + Advanced(10%) + Exploration(30%)
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  CrossAxisProfile,
  ParadoxProfile,
  VFinalResult,
} from "@/types"
import { cosineSimilarity } from "@/lib/vector/utils"
import { calculateVFinal, vFinalToVector } from "@/lib/vector/v-final"
import { L1_DIM_ORDER } from "@/lib/vector/projection"

// ── 타입 정의 ─────────────────────────────────────────────────

export type MatchingTier = "basic" | "advanced" | "exploration"

export interface MatchBreakdown {
  vectorScore: number // V_Final 코사인 유사도
  crossAxisScore: number // 83축 유사도/발산도
  paradoxCompatibility: number // 역설 호환성 (Advanced)
  qualitativeBonus: number // 비정량적 보정 (±0.1)
}

export interface MatchResult {
  personaId: string
  score: number // 0.0~1.0
  tier: MatchingTier
  breakdown: MatchBreakdown
  explanation: string
}

export interface MatchingConfig {
  tierWeights: Record<MatchingTier, number> // 피드 비율 (합 = 1.0)
  similarityThreshold: number // 최소 매칭 점수 (0~1)
  topN: number // 추천 수
  diversityFactor: number // 다양성 강제 (0~1)
}

export interface PersonaCandidate {
  id: string
  name: string
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  crossAxisProfile: CrossAxisProfile
  paradoxProfile: ParadoxProfile
  archetype?: string
}

export interface UserProfile {
  id: string
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  vFinal: VFinalResult
  crossAxisProfile: CrossAxisProfile
  paradoxProfile: ParadoxProfile
  recentPersonaIds?: string[] // 최근 접한 페르소나
}

// ── 기본 설정 ────────────────────────────────────────────────

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  tierWeights: { basic: 0.6, advanced: 0.1, exploration: 0.3 },
  similarityThreshold: 0.5,
  topN: 5,
  diversityFactor: 0.3,
}

// ── Tier 1: Basic Matching ───────────────────────────────────

export function calculateBasicScore(
  userVFinal: number[],
  personaVFinal: number[],
  userCAP: CrossAxisProfile,
  personaCAP: CrossAxisProfile,
  userEPS?: ParadoxProfile,
  personaEPS?: ParadoxProfile
): { score: number; breakdown: MatchBreakdown } {
  const vectorScore = Math.max(0, cosineSimilarity(userVFinal, personaVFinal))
  const crossAxisScore = calculateCrossAxisSimilarity(userCAP, personaCAP)

  // Paradox 호환성: 제공되면 5% 반영, 없으면 기존과 동일
  const paradoxCompat =
    userEPS && personaEPS ? calculateParadoxCompatibility(userEPS, personaEPS) : 0
  const hasParadox = userEPS && personaEPS

  // V_Final 65% + 교차축 30% + Paradox 5% (Paradox 없으면 V_Final 70% + 교차축 30%)
  const score = hasParadox
    ? round(0.65 * vectorScore + 0.3 * crossAxisScore + 0.05 * paradoxCompat)
    : round(0.7 * vectorScore + 0.3 * crossAxisScore)

  return {
    score,
    breakdown: {
      vectorScore: round(vectorScore),
      crossAxisScore: round(crossAxisScore),
      paradoxCompatibility: round(paradoxCompat),
      qualitativeBonus: 0,
    },
  }
}

// ── Tier 2: Advanced Matching ────────────────────────────────

export function calculateAdvancedScore(
  userVFinal: number[],
  personaVFinal: number[],
  userCAP: CrossAxisProfile,
  personaCAP: CrossAxisProfile,
  userEPS: ParadoxProfile,
  personaEPS: ParadoxProfile
): { score: number; breakdown: MatchBreakdown } {
  const vectorScore = Math.max(0, cosineSimilarity(userVFinal, personaVFinal))
  const crossAxisScore = calculateCrossAxisSimilarity(userCAP, personaCAP)
  const paradoxCompat = calculateParadoxCompatibility(userEPS, personaEPS)

  const score = round(0.5 * vectorScore + 0.3 * crossAxisScore + 0.2 * paradoxCompat)

  return {
    score,
    breakdown: {
      vectorScore: round(vectorScore),
      crossAxisScore: round(crossAxisScore),
      paradoxCompatibility: round(paradoxCompat),
      qualitativeBonus: 0,
    },
  }
}

// ── Tier 3: Exploration Matching ─────────────────────────────

export function calculateExplorationScore(
  userCAP: CrossAxisProfile,
  personaCAP: CrossAxisProfile,
  userEPS: ParadoxProfile,
  personaEPS: ParadoxProfile,
  recentPersonaIds: string[],
  personaId: string,
  personaArchetype?: string,
  recentArchetypes: string[] = []
): { score: number; breakdown: MatchBreakdown } {
  const paradoxDiversity = calculateParadoxDiversity(userEPS, personaEPS)
  const crossAxisDivergence = calculateCrossAxisDivergence(userCAP, personaCAP)
  const freshness = calculateFreshness(
    personaId,
    recentPersonaIds,
    personaArchetype,
    recentArchetypes
  )

  const score = round(0.4 * paradoxDiversity + 0.4 * crossAxisDivergence + 0.2 * freshness)

  return {
    score,
    breakdown: {
      vectorScore: 0,
      crossAxisScore: round(crossAxisDivergence),
      paradoxCompatibility: round(paradoxDiversity),
      qualitativeBonus: round(freshness),
    },
  }
}

// ── 교차축 유사도 ────────────────────────────────────────────

export function calculateCrossAxisSimilarity(
  capA: CrossAxisProfile,
  capB: CrossAxisProfile
): number {
  if (capA.axes.length === 0 || capB.axes.length === 0) return 0

  const scoresA = capA.axes.map((a) => a.score)
  const scoresB = capB.axes.map((a) => a.score)

  // 두 프로필의 축 수가 같은지 확인 후 코사인 유사도
  if (scoresA.length !== scoresB.length) return 0
  return Math.max(0, cosineSimilarity(scoresA, scoresB))
}

// ── 교차축 발산도 (탐색용: 차이가 클수록 높음) ──────────────

export function calculateCrossAxisDivergence(
  capA: CrossAxisProfile,
  capB: CrossAxisProfile
): number {
  if (capA.axes.length === 0 || capB.axes.length === 0) return 0

  const scoresA = capA.axes.map((a) => a.score)
  const scoresB = capB.axes.map((a) => a.score)
  if (scoresA.length !== scoresB.length) return 0

  // 유사도의 반전: 1 - similarity
  const similarity = Math.max(0, cosineSimilarity(scoresA, scoresB))
  return round(1 - similarity)
}

// ── 역설 호환성 ──────────────────────────────────────────────

export function calculateParadoxCompatibility(
  userEPS: ParadoxProfile,
  personaEPS: ParadoxProfile
): number {
  // 1 - |userOverall - personaOverall|
  return round(1 - Math.abs(userEPS.overall - personaEPS.overall))
}

// ── 역설 다양성 (탐색용: 차이가 클수록 높음) ──────────────

export function calculateParadoxDiversity(
  userEPS: ParadoxProfile,
  personaEPS: ParadoxProfile
): number {
  return round(Math.abs(userEPS.overall - personaEPS.overall))
}

// ── 신선도 (최근 접하지 않은 것 우선) ────────────────────────

export function calculateFreshness(
  personaId: string,
  recentPersonaIds: string[],
  personaArchetype?: string,
  recentArchetypes: string[] = []
): number {
  let freshness = 1.0

  // 최근 본 페르소나면 감점
  if (recentPersonaIds.includes(personaId)) {
    freshness -= 0.5
  }

  // 같은 아키타입이면 약간 감점
  if (personaArchetype && recentArchetypes.includes(personaArchetype)) {
    freshness -= 0.2
  }

  return Math.max(0, freshness)
}

// ── 매칭 설명 생성 ───────────────────────────────────────────

export function generateExplanation(
  tier: MatchingTier,
  breakdown: MatchBreakdown,
  userL1: SocialPersonaVector,
  personaL1: SocialPersonaVector
): string {
  const dims = L1_DIM_ORDER
  const similarities = dims.map((dim) => ({
    dim,
    similarity: round(1 - Math.abs(userL1[dim] - personaL1[dim])),
  }))
  similarities.sort((a, b) => b.similarity - a.similarity)
  const topDims = similarities.slice(0, 3)

  const dimLabels: Record<string, string> = {
    depth: "분석 깊이",
    lens: "판단 렌즈",
    stance: "비평 태도",
    scope: "디테일 수준",
    taste: "취향 성향",
    purpose: "목적 지향",
    sociability: "소통 성향",
  }

  if (tier === "basic") {
    const dimExplanations = topDims
      .map((d) => `${dimLabels[d.dim] ?? d.dim} 일치도: ${d.similarity}`)
      .join(", ")
    return `표면적 성향 매칭 — ${dimExplanations}`
  }

  if (tier === "advanced") {
    return `심층 매칭 — 역설 호환성: ${breakdown.paradoxCompatibility}, 벡터 유사도: ${breakdown.vectorScore}`
  }

  return `세렌디피티 추천 — 새로운 관점 탐색 (교차축 발산: ${breakdown.crossAxisScore})`
}

// ── 단일 페르소나 매칭 (전 Tier) ─────────────────────────────

export function matchPersona(
  user: UserProfile,
  persona: PersonaCandidate,
  tier: MatchingTier
): MatchResult {
  const personaVFinal = calculateVFinal(persona.l1, persona.l2, persona.l3)

  let result: { score: number; breakdown: MatchBreakdown }

  switch (tier) {
    case "basic":
      result = calculateBasicScore(
        user.vFinal.vector,
        personaVFinal.vector,
        user.crossAxisProfile,
        persona.crossAxisProfile,
        user.paradoxProfile,
        persona.paradoxProfile
      )
      break
    case "advanced":
      result = calculateAdvancedScore(
        user.vFinal.vector,
        personaVFinal.vector,
        user.crossAxisProfile,
        persona.crossAxisProfile,
        user.paradoxProfile,
        persona.paradoxProfile
      )
      break
    case "exploration":
      result = calculateExplorationScore(
        user.crossAxisProfile,
        persona.crossAxisProfile,
        user.paradoxProfile,
        persona.paradoxProfile,
        user.recentPersonaIds ?? [],
        persona.id,
        persona.archetype
      )
      break
  }

  const userL1 = vFinalToVector(user.vFinal)
  const explanation = generateExplanation(tier, result.breakdown, userL1, persona.l1)

  return {
    personaId: persona.id,
    score: result.score,
    tier,
    breakdown: result.breakdown,
    explanation,
  }
}

// ── 전체 매칭 (3-Tier 통합) ─────────────────────────────────

export function matchAll(
  user: UserProfile,
  personas: PersonaCandidate[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): MatchResult[] {
  const allResults: MatchResult[] = []

  // 각 Tier별로 매칭 실행
  for (const persona of personas) {
    const basicResult = matchPersona(user, persona, "basic")
    const advancedResult = matchPersona(user, persona, "advanced")
    const explorationResult = matchPersona(user, persona, "exploration")

    allResults.push(basicResult, advancedResult, explorationResult)
  }

  // Tier별 상위 N개 선택
  const byTier = groupByTier(allResults)
  const topN = config.topN

  const basicCount = Math.max(1, Math.round(topN * config.tierWeights.basic))
  const explorationCount = Math.max(1, Math.round(topN * config.tierWeights.exploration))
  const advancedCount = Math.max(1, topN - basicCount - explorationCount)

  const selected: MatchResult[] = [
    ...selectTopN(byTier.basic, basicCount, config.similarityThreshold),
    ...selectTopN(byTier.advanced, advancedCount, config.similarityThreshold),
    ...selectTopN(byTier.exploration, explorationCount, 0), // 탐색은 threshold 미적용
  ]

  // 다양성 적용: 같은 페르소나 중복 제거
  return deduplicateByPersona(selected)
}

function groupByTier(results: MatchResult[]): Record<MatchingTier, MatchResult[]> {
  return {
    basic: results.filter((r) => r.tier === "basic"),
    advanced: results.filter((r) => r.tier === "advanced"),
    exploration: results.filter((r) => r.tier === "exploration"),
  }
}

function selectTopN(results: MatchResult[], n: number, threshold: number): MatchResult[] {
  return results
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

function deduplicateByPersona(results: MatchResult[]): MatchResult[] {
  const seen = new Set<string>()
  const unique: MatchResult[] = []

  for (const r of results) {
    if (!seen.has(r.personaId)) {
      seen.add(r.personaId)
      unique.push(r)
    }
  }

  return unique
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
