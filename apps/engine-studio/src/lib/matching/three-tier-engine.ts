// ═══════════════════════════════════════════════════════════════
// 3-Tier 매칭 엔진
// T57-AC1: Basic(60%) + Advanced(10%) + Exploration(30%)
// T215: MatchingContext Enrichment Layer 통합
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
import type {
  EnrichedMatchingContext,
  PersonaEnrichedSignals,
  UserEnrichedContext,
  ScoreAdjustment,
  EnrichmentFeature,
} from "./context-enricher"
import {
  applyEnrichmentSignals,
  computeDynamicTierWeights,
  computeNegativePenalty,
} from "./context-enricher"

// ── 타입 정의 ─────────────────────────────────────────────────

export type MatchingTier = "basic" | "advanced" | "exploration"

export interface MatchBreakdown {
  vectorScore: number // V_Final 코사인 유사도
  crossAxisScore: number // 83축 유사도/발산도
  paradoxCompatibility: number // 역설 호환성 (Advanced)
  qualitativeBonus: number // 비정량적 보정 (±0.1) — Voice 유사도 + Enrichment
  trustBoost: number // 신뢰 기반 소셜 시그널 (Basic/Advanced only, 0.0~1.0)
  /** Enrichment Layer 적용 상세 (있으면 사용) */
  enrichment?: ScoreAdjustment
}

/**
 * 소셜 신뢰 시그널 (trust-score.ts의 computeTrustScore 결과에서 추출).
 * 매칭 시 관계 데이터가 있는 페르소나 쌍에만 적용.
 */
export interface SocialSignal {
  /** λ-가중 신뢰 점수 (0.0~1.0, computeTrustScore().score) */
  trustScore: number
  /** 활성화 가중치 (0.0~1.0, computeTrustScore().lambda) */
  trustLambda: number
}

/**
 * 매칭 컨텍스트 — 소셜 시그널 + Enrichment Layer.
 * matchAll()에 전달하여 페르소나별 소셜 신호 및 풍부한 컨텍스트를 주입.
 */
export interface MatchingContext {
  /** personaId → SocialSignal 매핑. 이력 없는 페르소나는 미포함. */
  socialSignals?: Map<string, SocialSignal>
  /** Enrichment Layer 확장 컨텍스트 */
  enrichment?: EnrichedMatchingContext
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

/**
 * Trust 최대 가중치 (20%).
 *
 * 매칭 점수에서 Trust가 차지할 수 있는 최대 비율.
 * 실제 가중치 = min(TRUST_MAX_WEIGHT, socialSignal.trustLambda × TRUST_MAX_WEIGHT)
 * - 0세션: trustWeight ≈ 0 (순수 벡터 매칭)
 * - 30세션: trustWeight ≈ 0.10 (벡터 90% + Trust 10%)
 * - 50세션+: trustWeight ≈ 0.20 (벡터 80% + Trust 20%)
 */
export const TRUST_MAX_WEIGHT = 0.2

// ── Tier 1: Basic Matching ───────────────────────────────────

export function calculateBasicScore(
  userVFinal: number[],
  personaVFinal: number[],
  userCAP: CrossAxisProfile,
  personaCAP: CrossAxisProfile,
  userEPS?: ParadoxProfile,
  personaEPS?: ParadoxProfile,
  socialSignal?: SocialSignal,
  personaSignals?: PersonaEnrichedSignals,
  userContext?: UserEnrichedContext,
  enabledFeatures?: Set<EnrichmentFeature>
): { score: number; breakdown: MatchBreakdown } {
  const vectorScore = Math.max(0, cosineSimilarity(userVFinal, personaVFinal))
  const crossAxisScore = calculateCrossAxisSimilarity(userCAP, personaCAP)

  // Paradox 호환성: 제공되면 5% 반영, 없으면 기존과 동일
  const paradoxCompat =
    userEPS && personaEPS ? calculateParadoxCompatibility(userEPS, personaEPS) : 0
  const hasParadox = userEPS && personaEPS

  // V_Final 65% + 교차축 30% + Paradox 5% (Paradox 없으면 V_Final 70% + 교차축 30%)
  const rawScore = hasParadox
    ? 0.65 * vectorScore + 0.3 * crossAxisScore + 0.05 * paradoxCompat
    : 0.7 * vectorScore + 0.3 * crossAxisScore

  // Trust 블렌딩: (1 - trustWeight) × rawScore + trustWeight × trustScore
  const trustWeight = computeTrustWeight(socialSignal)
  const trustBoostValue = socialSignal?.trustScore ?? 0

  const trustBlended =
    trustWeight > 0 ? (1 - trustWeight) * rawScore + trustWeight * trustBoostValue : rawScore

  // Enrichment Layer 적용
  const enrichment = applyEnrichmentSignals(
    trustBlended,
    "basic",
    personaSignals,
    userContext,
    enabledFeatures
  )

  return {
    score: round(enrichment.finalScore),
    breakdown: {
      vectorScore: round(vectorScore),
      crossAxisScore: round(crossAxisScore),
      paradoxCompatibility: round(paradoxCompat),
      qualitativeBonus: enrichment.voiceBonus,
      trustBoost: round(trustBoostValue),
      enrichment,
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
  personaEPS: ParadoxProfile,
  socialSignal?: SocialSignal,
  personaSignals?: PersonaEnrichedSignals,
  userContext?: UserEnrichedContext,
  enabledFeatures?: Set<EnrichmentFeature>
): { score: number; breakdown: MatchBreakdown } {
  const vectorScore = Math.max(0, cosineSimilarity(userVFinal, personaVFinal))
  const crossAxisScore = calculateCrossAxisSimilarity(userCAP, personaCAP)
  const paradoxCompat = calculateParadoxCompatibility(userEPS, personaEPS)

  const rawScore = 0.5 * vectorScore + 0.3 * crossAxisScore + 0.2 * paradoxCompat

  // Trust 블렌딩
  const trustWeight = computeTrustWeight(socialSignal)
  const trustBoostValue = socialSignal?.trustScore ?? 0

  const trustBlended =
    trustWeight > 0 ? (1 - trustWeight) * rawScore + trustWeight * trustBoostValue : rawScore

  // Enrichment Layer 적용
  const enrichment = applyEnrichmentSignals(
    trustBlended,
    "advanced",
    personaSignals,
    userContext,
    enabledFeatures
  )

  return {
    score: round(enrichment.finalScore),
    breakdown: {
      vectorScore: round(vectorScore),
      crossAxisScore: round(crossAxisScore),
      paradoxCompatibility: round(paradoxCompat),
      qualitativeBonus: enrichment.voiceBonus,
      trustBoost: round(trustBoostValue),
      enrichment,
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
  recentArchetypes: string[] = [],
  personaSignals?: PersonaEnrichedSignals,
  userContext?: UserEnrichedContext,
  enabledFeatures?: Set<EnrichmentFeature>
): { score: number; breakdown: MatchBreakdown } {
  const paradoxDiversity = calculateParadoxDiversity(userEPS, personaEPS)
  const crossAxisDivergence = calculateCrossAxisDivergence(userCAP, personaCAP)
  const freshness = calculateFreshness(
    personaId,
    recentPersonaIds,
    personaArchetype,
    recentArchetypes
  )

  const rawScore = 0.4 * paradoxDiversity + 0.4 * crossAxisDivergence + 0.2 * freshness

  // Enrichment Layer 적용 (exploration tier)
  const enrichment = applyEnrichmentSignals(
    rawScore,
    "exploration",
    personaSignals,
    userContext,
    enabledFeatures
  )

  return {
    score: round(enrichment.finalScore),
    breakdown: {
      vectorScore: 0,
      crossAxisScore: round(crossAxisDivergence),
      paradoxCompatibility: round(paradoxDiversity),
      qualitativeBonus: round(freshness),
      trustBoost: 0, // Exploration Tier는 Trust 미적용 (세렌디피티 보존)
      enrichment,
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

  const trustSuffix = breakdown.trustBoost > 0 ? ` (신뢰 보정: +${breakdown.trustBoost})` : ""

  if (tier === "basic") {
    const dimExplanations = topDims
      .map((d) => `${dimLabels[d.dim] ?? d.dim} 일치도: ${d.similarity}`)
      .join(", ")
    return `표면적 성향 매칭 — ${dimExplanations}${trustSuffix}`
  }

  if (tier === "advanced") {
    return `심층 매칭 — 역설 호환성: ${breakdown.paradoxCompatibility}, 벡터 유사도: ${breakdown.vectorScore}${trustSuffix}`
  }

  return `세렌디피티 추천 — 새로운 관점 탐색 (교차축 발산: ${breakdown.crossAxisScore})`
}

// ── 단일 페르소나 매칭 (전 Tier) ─────────────────────────────

export function matchPersona(
  user: UserProfile,
  persona: PersonaCandidate,
  tier: MatchingTier,
  socialSignal?: SocialSignal,
  personaSignals?: PersonaEnrichedSignals,
  userContext?: UserEnrichedContext,
  enabledFeatures?: Set<EnrichmentFeature>
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
        persona.paradoxProfile,
        socialSignal,
        personaSignals,
        userContext,
        enabledFeatures
      )
      break
    case "advanced":
      result = calculateAdvancedScore(
        user.vFinal.vector,
        personaVFinal.vector,
        user.crossAxisProfile,
        persona.crossAxisProfile,
        user.paradoxProfile,
        persona.paradoxProfile,
        socialSignal,
        personaSignals,
        userContext,
        enabledFeatures
      )
      break
    case "exploration":
      // Exploration Tier는 Trust 미적용 — 세렌디피티 보존
      result = calculateExplorationScore(
        user.crossAxisProfile,
        persona.crossAxisProfile,
        user.paradoxProfile,
        persona.paradoxProfile,
        user.recentPersonaIds ?? [],
        persona.id,
        persona.archetype,
        [],
        personaSignals,
        userContext,
        enabledFeatures
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
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
  context?: MatchingContext
): MatchResult[] {
  const enrichment = context?.enrichment
  const userContext = enrichment?.userContext
  const enabledFeatures = enrichment?.experiment?.enabledFeatures

  // 1. 블록된 페르소나 사전 필터링
  const filteredPersonas = personas.filter((persona) => {
    const signals = enrichment?.personaSignals?.get(persona.id)
    if (!signals?.negative) return true
    // isBlocked: 완전 제거, isSuspectedBot: 완전 제거
    if (signals.negative.isBlocked || signals.negative.isSuspectedBot) return false
    // high penalty(≥0.8): 제거
    if (computeNegativePenalty(signals.negative) >= 0.8) return false
    return true
  })

  // 2. 동적 Tier 가중치 (유저 세그먼트 기반)
  const dynamicWeights = computeDynamicTierWeights(userContext?.session)
  const tierWeights = dynamicWeights ?? config.tierWeights

  const allResults: MatchResult[] = []

  // 3. 각 Tier별로 매칭 실행
  for (const persona of filteredPersonas) {
    const signal = context?.socialSignals?.get(persona.id)
    const pSignals = enrichment?.personaSignals?.get(persona.id)

    const basicResult = matchPersona(
      user,
      persona,
      "basic",
      signal,
      pSignals,
      userContext,
      enabledFeatures
    )
    const advancedResult = matchPersona(
      user,
      persona,
      "advanced",
      signal,
      pSignals,
      userContext,
      enabledFeatures
    )
    const explorationResult = matchPersona(
      user,
      persona,
      "exploration",
      undefined,
      pSignals,
      userContext,
      enabledFeatures
    )

    allResults.push(basicResult, advancedResult, explorationResult)
  }

  // 4. Tier별 상위 N개 선택 (동적 가중치 적용)
  const byTier = groupByTier(allResults)
  const topN = config.topN

  const basicCount = Math.max(1, Math.round(topN * tierWeights.basic))
  const explorationCount = Math.max(1, Math.round(topN * tierWeights.exploration))
  const advancedCount = Math.max(1, topN - basicCount - explorationCount)

  const selected: MatchResult[] = [
    ...selectTopN(byTier.basic, basicCount, config.similarityThreshold),
    ...selectTopN(byTier.advanced, advancedCount, config.similarityThreshold),
    ...selectTopN(byTier.exploration, explorationCount, 0), // 탐색은 threshold 미적용
  ]

  // 5. 다양성 적용: 같은 페르소나 중복 제거
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

// ── Trust 가중치 계산 ────────────────────────────────────────

/**
 * SocialSignal로부터 실제 매칭 가중치 계산.
 *
 * trustWeight = min(TRUST_MAX_WEIGHT, trustLambda × TRUST_MAX_WEIGHT)
 * - λ=0 (0세션): trustWeight=0 → 순수 벡터 매칭
 * - λ=0.5 (30세션): trustWeight=0.10
 * - λ=1.0 (50세션+): trustWeight=0.20
 */
export function computeTrustWeight(socialSignal?: SocialSignal): number {
  if (!socialSignal) return 0
  return Math.min(TRUST_MAX_WEIGHT, socialSignal.trustLambda * TRUST_MAX_WEIGHT)
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
