// ═══════════════════════════════════════════════════════════════
// Consumer Journey — Simulator Types & Logic + Simulation Modes
// AC1 + AC2: 프로필, 매칭 프리뷰, 시뮬레이션 (Basic/Detailed/Comparison)
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
  CrossAxisProfile,
  ParadoxProfile,
  VFinalResult,
} from "@/types"
import { cosineSimilarity } from "@/lib/vector/utils"
import { calculateVFinal } from "@/lib/vector/v-final"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import {
  matchAll,
  matchPersona,
  DEFAULT_MATCHING_CONFIG,
  type PersonaCandidate,
  type MatchResult,
  type MatchingConfig,
  type MatchBreakdown,
  type MatchingTier,
} from "@/lib/matching/three-tier-engine"
import { type DataSourceType, round } from "./types"

// ═══════════════════════════════════════════════════════════════
// AC1: Simulator Types & Logic
// ═══════════════════════════════════════════════════════════════

// ── User Profile (소비자 프로필) ─────────────────────────────

/** 소비자 인구통계 정보 */
export interface UserDemographics {
  ageGroup: "10s" | "20s" | "30s" | "40s" | "50s" | "60plus"
  gender: "male" | "female" | "other" | "unspecified"
  region?: string
}

/** 소비자 관심사/이력 */
export interface UserInterestProfile {
  preferredGenres: string[]
  contentHistory: string[] // 최근 소비한 콘텐츠 ID/이름
  traitKeywords: string[] // 성향 키워드 (e.g., "논리적", "디테일중시")
}

/** 소비자 여정 시뮬레이터용 유저 프로필 */
export interface ConsumerProfile {
  id: string
  label: string
  demographics: UserDemographics
  interests: UserInterestProfile
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  vFinal: VFinalResult
  crossAxisProfile: CrossAxisProfile
  paradoxProfile: ParadoxProfile
  source: DataSourceType
  createdAt: number
}

// ── Simulation Request / Result ─────────────────────────────

export type SimulationMode = "basic" | "detailed" | "comparison"

export interface SimulationRequest {
  id: string
  mode: SimulationMode
  profiles: ConsumerProfile[] // 1 for basic/detailed, 2+ for comparison
  personaCandidates: PersonaCandidate[]
  config: SimulationConfig
  timestamp: number
}

export interface SimulationConfig {
  matchingConfig: MatchingConfig
  topN: number // 표시할 매칭 결과 수
  includeExploration: boolean // 탐색 Tier 포함 여부
  pressureLevel: number // 0.0~1.0
}

export interface SimulationResult {
  id: string
  requestId: string
  mode: SimulationMode
  data: BasicSimulationData | DetailedSimulationData | ComparisonSimulationData
  executionTimeMs: number
  timestamp: number
}

// ── Match Preview ────────────────────────────────────────────

export interface MatchPreview {
  personaId: string
  personaName: string
  archetype: string | null
  overallScore: number
  tier: MatchingTier
  breakdown: MatchBreakdown
  explanation: string
  rank: number
}

// ── Simulation Functions ─────────────────────────────────────

/** 소비자 프로필 생성 (벡터로부터) */
export function createConsumerProfile(
  label: string,
  demographics: UserDemographics,
  interests: UserInterestProfile,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  source: DataSourceType = "virtual_user",
  pressure: number = 0.0
): ConsumerProfile {
  const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3, crossAxisProfile)
  const vFinal = calculateVFinal(l1, l2, l3, pressure)

  return {
    id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    demographics,
    interests,
    l1,
    l2,
    l3,
    vFinal,
    crossAxisProfile,
    paradoxProfile,
    source,
    createdAt: Date.now(),
  }
}

/** 소비자 프로필 → matching UserProfile 변환 */
function toMatchingUserProfile(
  profile: ConsumerProfile,
  recentPersonaIds: string[] = []
): {
  id: string
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  vFinal: VFinalResult
  crossAxisProfile: CrossAxisProfile
  paradoxProfile: ParadoxProfile
  recentPersonaIds: string[]
} {
  return {
    id: profile.id,
    l1: profile.l1,
    l2: profile.l2,
    l3: profile.l3,
    vFinal: profile.vFinal,
    crossAxisProfile: profile.crossAxisProfile,
    paradoxProfile: profile.paradoxProfile,
    recentPersonaIds,
  }
}

/** 시뮬레이션 실행 (모든 모드 통합 entry point) */
export function runSimulation(request: SimulationRequest): SimulationResult {
  const startTime = Date.now()

  let data: BasicSimulationData | DetailedSimulationData | ComparisonSimulationData

  switch (request.mode) {
    case "basic":
      data = runBasicSimulation(request.profiles[0], request.personaCandidates, request.config)
      break
    case "detailed":
      data = runDetailedSimulation(request.profiles[0], request.personaCandidates, request.config)
      break
    case "comparison":
      data = runComparisonSimulation(request.profiles, request.personaCandidates, request.config)
      break
  }

  return {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    requestId: request.id,
    mode: request.mode,
    data,
    executionTimeMs: Date.now() - startTime,
    timestamp: Date.now(),
  }
}

/** 매칭 결과를 점수 기준으로 정렬하여 MatchPreview 배열로 변환 */
export function rankMatches(
  results: MatchResult[],
  personas: PersonaCandidate[],
  topN: number
): MatchPreview[] {
  const personaMap = new Map(personas.map((p) => [p.id, p]))

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((result, index) => {
      const persona = personaMap.get(result.personaId)
      return {
        personaId: result.personaId,
        personaName: persona?.name ?? "Unknown",
        archetype: persona?.archetype ?? null,
        overallScore: round(result.score),
        tier: result.tier,
        breakdown: result.breakdown,
        explanation: result.explanation,
        rank: index + 1,
      }
    })
}

/** SimulationRequest 생성 헬퍼 */
export function createSimulationRequest(
  mode: SimulationMode,
  profiles: ConsumerProfile[],
  personaCandidates: PersonaCandidate[],
  config?: Partial<SimulationConfig>
): SimulationRequest {
  const defaultConfig: SimulationConfig = {
    matchingConfig: DEFAULT_MATCHING_CONFIG,
    topN: 5,
    includeExploration: true,
    pressureLevel: 0.0,
  }

  return {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mode,
    profiles,
    personaCandidates,
    config: { ...defaultConfig, ...config },
    timestamp: Date.now(),
  }
}

// ═══════════════════════════════════════════════════════════════
// AC2: Simulation Modes
// ═══════════════════════════════════════════════════════════════

// ── Basic Simulation ─────────────────────────────────────────

/** 기본 시뮬레이션 결과: Top-N 매칭만 */
export interface BasicSimulationData {
  kind: "basic"
  profile: ConsumerProfile
  topMatches: MatchPreview[]
  totalCandidates: number
}

function runBasicSimulation(
  profile: ConsumerProfile,
  personas: PersonaCandidate[],
  config: SimulationConfig
): BasicSimulationData {
  const userProfile = toMatchingUserProfile(profile)
  const results = matchAll(userProfile, personas, config.matchingConfig)
  const topMatches = rankMatches(results, personas, config.topN)

  return {
    kind: "basic",
    profile,
    topMatches,
    totalCandidates: personas.length,
  }
}

// ── Detailed Simulation ──────────────────────────────────────

/** 차원별 매칭 분석 */
export interface DimensionMatchAnalysis {
  layer: "L1" | "L2" | "L3"
  dimension: string
  label: string
  userValue: number
  personaValue: number
  similarity: number
  contribution: "strong" | "moderate" | "weak"
}

/** Paradox 분석 */
export interface ParadoxAnalysis {
  userEps: number
  personaEps: number
  compatibility: number // 1 - |user - persona|
  dominantUserParadox: string
  dominantPersonaParadox: string
  analysis: string
}

/** Pressure 영향 분석 */
export interface PressureEffect {
  pressureLevel: number
  vFinalShift: number[] // L1 차원별 V_Final 변화량
  layerContributions: {
    l1Weight: number
    l2Weight: number
    l3Weight: number
  }
  matchScoreAtPressure: number
  interpretation: string
}

/** 상세 시뮬레이션 결과: 차원별 분석, 역설, 압력 효과 */
export interface DetailedSimulationData {
  kind: "detailed"
  profile: ConsumerProfile
  topMatches: MatchPreview[]
  dimensionAnalysis: DimensionMatchAnalysis[]
  paradoxAnalysis: ParadoxAnalysis
  pressureEffects: PressureEffect[]
  crossAxisHighlights: CrossAxisHighlight[]
  totalCandidates: number
}

/** 교차축 주요 항목 */
export interface CrossAxisHighlight {
  axisId: string
  relationship: string
  userScore: number
  personaScore: number
  impact: "positive" | "negative" | "neutral"
  description: string
}

const L1_LABELS: Record<SocialDimension, string> = {
  depth: "분석 깊이",
  lens: "판단 렌즈",
  stance: "비평 태도",
  scope: "디테일 수준",
  taste: "취향 성향",
  purpose: "목적 지향",
  sociability: "소통 성향",
}

const L2_LABELS: Record<TemperamentDimension, string> = {
  openness: "개방성",
  conscientiousness: "성실성",
  extraversion: "외향성",
  agreeableness: "우호성",
  neuroticism: "신경성",
}

const L3_LABELS: Record<NarrativeDimension, string> = {
  lack: "결핍감",
  moralCompass: "도덕 나침반",
  volatility: "변동성",
  growthArc: "성장 궤도",
}

function runDetailedSimulation(
  profile: ConsumerProfile,
  personas: PersonaCandidate[],
  config: SimulationConfig
): DetailedSimulationData {
  const userProfile = toMatchingUserProfile(profile)
  const results = matchAll(userProfile, personas, config.matchingConfig)
  const topMatches = rankMatches(results, personas, config.topN)

  // 상위 매칭 페르소나에 대한 상세 분석 (1위 기준)
  const topPersona =
    topMatches.length > 0 ? personas.find((p) => p.id === topMatches[0].personaId) : null

  const dimensionAnalysis = topPersona ? buildDimensionAnalysis(profile, topPersona) : []

  const paradoxAnalysis = topPersona
    ? buildParadoxAnalysis(profile, topPersona)
    : buildEmptyParadoxAnalysis()

  const pressureEffects = topPersona
    ? buildPressureEffects(profile, topPersona, config.matchingConfig)
    : []

  const crossAxisHighlights = topPersona ? buildCrossAxisHighlights(profile, topPersona) : []

  return {
    kind: "detailed",
    profile,
    topMatches,
    dimensionAnalysis,
    paradoxAnalysis,
    pressureEffects,
    crossAxisHighlights,
    totalCandidates: personas.length,
  }
}

function buildDimensionAnalysis(
  profile: ConsumerProfile,
  persona: PersonaCandidate
): DimensionMatchAnalysis[] {
  const analyses: DimensionMatchAnalysis[] = []

  // L1 dimensions
  const l1Dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  for (const dim of l1Dims) {
    const userVal = profile.l1[dim]
    const personaVal = persona.l1[dim]
    const sim = round(1 - Math.abs(userVal - personaVal))
    analyses.push({
      layer: "L1",
      dimension: dim,
      label: L1_LABELS[dim],
      userValue: round(userVal),
      personaValue: round(personaVal),
      similarity: sim,
      contribution: sim >= 0.8 ? "strong" : sim >= 0.5 ? "moderate" : "weak",
    })
  }

  // L2 dimensions
  const l2Dims: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]
  for (const dim of l2Dims) {
    const userVal = profile.l2[dim]
    const personaVal = persona.l2[dim]
    const sim = round(1 - Math.abs(userVal - personaVal))
    analyses.push({
      layer: "L2",
      dimension: dim,
      label: L2_LABELS[dim],
      userValue: round(userVal),
      personaValue: round(personaVal),
      similarity: sim,
      contribution: sim >= 0.8 ? "strong" : sim >= 0.5 ? "moderate" : "weak",
    })
  }

  // L3 dimensions
  const l3Dims: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]
  for (const dim of l3Dims) {
    const userVal = profile.l3[dim]
    const personaVal = persona.l3[dim]
    const sim = round(1 - Math.abs(userVal - personaVal))
    analyses.push({
      layer: "L3",
      dimension: dim,
      label: L3_LABELS[dim],
      userValue: round(userVal),
      personaValue: round(personaVal),
      similarity: sim,
      contribution: sim >= 0.8 ? "strong" : sim >= 0.5 ? "moderate" : "weak",
    })
  }

  return analyses.sort((a, b) => b.similarity - a.similarity)
}

function buildParadoxAnalysis(
  profile: ConsumerProfile,
  persona: PersonaCandidate
): ParadoxAnalysis {
  const userEps = profile.paradoxProfile.overall
  const personaEps = persona.paradoxProfile.overall
  const compatibility = round(1 - Math.abs(userEps - personaEps))

  const dominantLayerLabels: Record<string, string> = {
    L1xL2: "가면 vs 본성",
    L1xL3: "가면 vs 욕망",
    L2xL3: "본성 vs 욕망",
  }

  const userDominant = profile.paradoxProfile.dominant.layer
  const personaDominant = persona.paradoxProfile.dominant.layer

  let analysis: string
  if (compatibility >= 0.8) {
    analysis = "유사한 역설 구조를 가져 안정적인 매칭이 예상됩니다."
  } else if (compatibility >= 0.5) {
    analysis = "적당한 역설 차이가 있어 신선한 관점을 제공할 수 있습니다."
  } else {
    analysis = "큰 역설 차이가 있어 의외의 발견이 가능하지만 불일치 리스크도 있습니다."
  }

  return {
    userEps: round(userEps),
    personaEps: round(personaEps),
    compatibility,
    dominantUserParadox: dominantLayerLabels[userDominant] ?? userDominant,
    dominantPersonaParadox: dominantLayerLabels[personaDominant] ?? personaDominant,
    analysis,
  }
}

function buildEmptyParadoxAnalysis(): ParadoxAnalysis {
  return {
    userEps: 0,
    personaEps: 0,
    compatibility: 0,
    dominantUserParadox: "",
    dominantPersonaParadox: "",
    analysis: "분석 대상 페르소나가 없습니다.",
  }
}

function buildPressureEffects(
  profile: ConsumerProfile,
  persona: PersonaCandidate,
  matchingConfig: MatchingConfig
): PressureEffect[] {
  const pressureLevels = [0.0, 0.25, 0.5, 0.75, 1.0]
  const baseVFinal = calculateVFinal(profile.l1, profile.l2, profile.l3, 0.0)

  return pressureLevels.map((p) => {
    const vFinalAtP = calculateVFinal(profile.l1, profile.l2, profile.l3, p)
    const shift = vFinalAtP.vector.map((v, i) => round(v - baseVFinal.vector[i]))

    // 이 pressure에서 매칭 점수 재계산
    const userAtP = toMatchingUserProfile({
      ...profile,
      vFinal: vFinalAtP,
    })
    const matchResult = matchPersona(userAtP, persona, "advanced")

    let interpretation: string
    if (p <= 0.1) {
      interpretation = "평온한 상태: L1(사회적 가면)이 지배적입니다."
    } else if (p <= 0.4) {
      interpretation = "약간의 압박: L2(본성)가 조금씩 드러나기 시작합니다."
    } else if (p <= 0.7) {
      interpretation = "중간 압박: L2(본성)와 L3(서사적 욕망)가 혼합됩니다."
    } else {
      interpretation = "높은 압박: L2/L3가 L1을 압도하여 진정한 성향이 드러납니다."
    }

    return {
      pressureLevel: p,
      vFinalShift: shift,
      layerContributions: vFinalAtP.layerContributions,
      matchScoreAtPressure: matchResult.score,
      interpretation,
    }
  })
}

function buildCrossAxisHighlights(
  profile: ConsumerProfile,
  persona: PersonaCandidate
): CrossAxisHighlight[] {
  const personaCAP = persona.crossAxisProfile
  const userCAP = profile.crossAxisProfile

  // 주요 차이가 큰 교차축 top 5
  const highlights: CrossAxisHighlight[] = []
  const maxAxes = Math.min(userCAP.axes.length, personaCAP.axes.length)

  for (let i = 0; i < maxAxes; i++) {
    const userAxis = userCAP.axes[i]
    const personaAxis = personaCAP.axes[i]
    const diff = Math.abs(userAxis.score - personaAxis.score)

    highlights.push({
      axisId: userAxis.axisId,
      relationship: userAxis.relationship,
      userScore: round(userAxis.score),
      personaScore: round(personaAxis.score),
      impact: diff < 0.2 ? "positive" : diff < 0.5 ? "neutral" : "negative",
      description: userAxis.interpretation,
    })
  }

  return highlights
    .sort((a, b) => {
      const diffA = Math.abs(a.userScore - a.personaScore)
      const diffB = Math.abs(b.userScore - b.personaScore)
      return diffB - diffA
    })
    .slice(0, 5)
}

// ── Comparison Simulation ────────────────────────────────────

/** 비교 시뮬레이션: 2+ 프로필 side-by-side */
export interface ComparisonSimulationData {
  kind: "comparison"
  profiles: ConsumerProfile[]
  perProfileResults: ComparisonEntry[]
  overlapAnalysis: OverlapAnalysis
  totalCandidates: number
}

export interface ComparisonEntry {
  profileId: string
  profileLabel: string
  topMatches: MatchPreview[]
  avgScore: number
  topScore: number
}

export interface OverlapAnalysis {
  sharedTopPersonas: string[] // 모든 프로필의 top-N에 공통으로 등장하는 페르소나 ID
  uniquePerProfile: Record<string, string[]> // 프로필별 고유 매칭 페르소나 ID
  profileSimilarity: number // 프로필 간 V_Final 유사도 (2개일 때)
  divergentDimensions: DivergentDimension[]
}

export interface DivergentDimension {
  dimension: string
  layer: "L1" | "L2" | "L3"
  label: string
  values: Array<{ profileId: string; value: number }>
  spread: number // max - min
}

function runComparisonSimulation(
  profiles: ConsumerProfile[],
  personas: PersonaCandidate[],
  config: SimulationConfig
): ComparisonSimulationData {
  const perProfileResults: ComparisonEntry[] = profiles.map((profile) => {
    const userProfile = toMatchingUserProfile(profile)
    const results = matchAll(userProfile, personas, config.matchingConfig)
    const topMatches = rankMatches(results, personas, config.topN)

    const scores = topMatches.map((m) => m.overallScore)
    const avgScore =
      scores.length > 0 ? round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
    const topScore = scores.length > 0 ? scores[0] : 0

    return {
      profileId: profile.id,
      profileLabel: profile.label,
      topMatches,
      avgScore,
      topScore,
    }
  })

  const overlapAnalysis = buildOverlapAnalysis(profiles, perProfileResults)

  return {
    kind: "comparison",
    profiles,
    perProfileResults,
    overlapAnalysis,
    totalCandidates: personas.length,
  }
}

function buildOverlapAnalysis(
  profiles: ConsumerProfile[],
  entries: ComparisonEntry[]
): OverlapAnalysis {
  // 공통 매칭 페르소나
  const allTopSets = entries.map((e) => new Set(e.topMatches.map((m) => m.personaId)))
  const sharedTopPersonas: string[] = []
  if (allTopSets.length > 0) {
    for (const personaId of allTopSets[0]) {
      if (allTopSets.every((s) => s.has(personaId))) {
        sharedTopPersonas.push(personaId)
      }
    }
  }

  // 프로필별 고유 매칭
  const uniquePerProfile: Record<string, string[]> = {}
  for (const entry of entries) {
    const others = entries.filter((e) => e.profileId !== entry.profileId)
    const otherIds = new Set(others.flatMap((e) => e.topMatches.map((m) => m.personaId)))
    uniquePerProfile[entry.profileId] = entry.topMatches
      .map((m) => m.personaId)
      .filter((id) => !otherIds.has(id))
  }

  // 프로필 간 V_Final 유사도 (2개일 때)
  let profileSimilarity = 0
  if (profiles.length === 2) {
    profileSimilarity = round(
      Math.max(0, cosineSimilarity(profiles[0].vFinal.vector, profiles[1].vFinal.vector))
    )
  }

  // 가장 차이가 큰 차원 분석
  const divergentDimensions = buildDivergentDimensions(profiles)

  return {
    sharedTopPersonas,
    uniquePerProfile,
    profileSimilarity,
    divergentDimensions,
  }
}

function buildDivergentDimensions(profiles: ConsumerProfile[]): DivergentDimension[] {
  const dimensions: DivergentDimension[] = []

  // L1
  const l1Dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  for (const dim of l1Dims) {
    const values = profiles.map((p) => ({ profileId: p.id, value: round(p.l1[dim]) }))
    const vals = values.map((v) => v.value)
    dimensions.push({
      dimension: dim,
      layer: "L1",
      label: L1_LABELS[dim],
      values,
      spread: round(Math.max(...vals) - Math.min(...vals)),
    })
  }

  // L2
  const l2Dims: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]
  for (const dim of l2Dims) {
    const values = profiles.map((p) => ({ profileId: p.id, value: round(p.l2[dim]) }))
    const vals = values.map((v) => v.value)
    dimensions.push({
      dimension: dim,
      layer: "L2",
      label: L2_LABELS[dim],
      values,
      spread: round(Math.max(...vals) - Math.min(...vals)),
    })
  }

  // L3
  const l3Dims: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]
  for (const dim of l3Dims) {
    const values = profiles.map((p) => ({ profileId: p.id, value: round(p.l3[dim]) }))
    const vals = values.map((v) => v.value)
    dimensions.push({
      dimension: dim,
      layer: "L3",
      label: L3_LABELS[dim],
      values,
      spread: round(Math.max(...vals) - Math.min(...vals)),
    })
  }

  return dimensions.sort((a, b) => b.spread - a.spread)
}
