// ═══════════════════════════════════════════════════════════════
// Consumer Journey Simulator (End-User Experience Preview)
// T65: 소비자 여정 시뮬레이터 — B2B 고객 체험용 미리보기
// Spec §5.7: 페르소나 매칭 → 리뷰 탐색 → 추천 흐름 시뮬레이션
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

// ═══════════════════════════════════════════════════════════════
// AC3: Data Source Integration
// ═══════════════════════════════════════════════════════════════

export type DataSourceType = "real_persona" | "virtual_user" | "synthetic"

/** 데이터 소스 구성 */
export interface DataSourceConfig {
  type: DataSourceType
  label: string
  description: string
  personaFilter?: {
    statuses: string[]
    archetypes?: string[]
    minQualityScore?: number
  }
  virtualUserConfig?: VirtualUserConfig
  syntheticConfig?: SyntheticDataConfig
}

/** 가상 유저 생성 설정 */
export interface VirtualUserConfig {
  count: number
  distributionMode: "uniform" | "gaussian" | "clustered"
  gaussianParams?: {
    mean: number
    stdDev: number
  }
  clusterParams?: {
    clusterCount: number
    spread: number // 클러스터 내 분산 (0.0~0.5)
  }
  demographics?: {
    ageGroups?: UserDemographics["ageGroup"][]
    genders?: UserDemographics["gender"][]
  }
  genres?: string[]
  traitKeywords?: string[]
}

/** 합성 데이터 설정 */
export interface SyntheticDataConfig {
  baseArchetype: string
  variationRange: number // 아키타입 기준 벡터 변동 범위 (0.0~0.5)
  count: number
}

// ── Virtual User Generator ───────────────────────────────────

/** 가상 유저 생성기 */
export function generateVirtualUsers(config: VirtualUserConfig): ConsumerProfile[] {
  const profiles: ConsumerProfile[] = []

  for (let i = 0; i < config.count; i++) {
    const l1 = generateVector7D(config.distributionMode, config.gaussianParams)
    const l2 = generateVector5D(config.distributionMode, config.gaussianParams)
    const l3 = generateVector4D(config.distributionMode, config.gaussianParams)

    const demographics = pickRandomDemographics(config.demographics)
    const interests: UserInterestProfile = {
      preferredGenres: config.genres ?? pickRandomGenres(),
      contentHistory: [],
      traitKeywords: config.traitKeywords ?? [],
    }

    profiles.push(
      createConsumerProfile(
        `Virtual User ${i + 1}`,
        demographics,
        interests,
        l1,
        l2,
        l3,
        "virtual_user"
      )
    )
  }

  return profiles
}

function generateVector7D(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): SocialPersonaVector {
  return {
    depth: generateDimValue(mode, gaussian),
    lens: generateDimValue(mode, gaussian),
    stance: generateDimValue(mode, gaussian),
    scope: generateDimValue(mode, gaussian),
    taste: generateDimValue(mode, gaussian),
    purpose: generateDimValue(mode, gaussian),
    sociability: generateDimValue(mode, gaussian),
  }
}

function generateVector5D(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): CoreTemperamentVector {
  return {
    openness: generateDimValue(mode, gaussian),
    conscientiousness: generateDimValue(mode, gaussian),
    extraversion: generateDimValue(mode, gaussian),
    agreeableness: generateDimValue(mode, gaussian),
    neuroticism: generateDimValue(mode, gaussian),
  }
}

function generateVector4D(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): NarrativeDriveVector {
  return {
    lack: generateDimValue(mode, gaussian),
    moralCompass: generateDimValue(mode, gaussian),
    volatility: generateDimValue(mode, gaussian),
    growthArc: generateDimValue(mode, gaussian),
  }
}

function generateDimValue(
  mode: VirtualUserConfig["distributionMode"],
  gaussian?: VirtualUserConfig["gaussianParams"]
): number {
  switch (mode) {
    case "uniform":
      return round(Math.random())
    case "gaussian": {
      const mean = gaussian?.mean ?? 0.5
      const stdDev = gaussian?.stdDev ?? 0.15
      return round(clamp01(boxMullerGaussian(mean, stdDev)))
    }
    case "clustered":
      // 클러스터 모드: 랜덤 중심점 주변 정규분포
      return round(clamp01(boxMullerGaussian(Math.random(), 0.1)))
  }
}

/** Box-Muller 변환을 사용한 가우시안 분포 */
function boxMullerGaussian(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
  return mean + stdDev * z0
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

const DEFAULT_AGE_GROUPS: UserDemographics["ageGroup"][] = [
  "10s",
  "20s",
  "30s",
  "40s",
  "50s",
  "60plus",
]

const DEFAULT_GENDERS: UserDemographics["gender"][] = ["male", "female", "other", "unspecified"]

function pickRandomDemographics(config?: VirtualUserConfig["demographics"]): UserDemographics {
  const ageGroups = config?.ageGroups ?? DEFAULT_AGE_GROUPS
  const genders = config?.genders ?? DEFAULT_GENDERS

  return {
    ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
    gender: genders[Math.floor(Math.random() * genders.length)],
  }
}

const DEFAULT_GENRES = ["로맨스", "스릴러", "SF", "드라마", "코미디", "다큐멘터리", "액션", "호러"]

function pickRandomGenres(): string[] {
  const count = 1 + Math.floor(Math.random() * 3) // 1~3개
  const shuffled = [...DEFAULT_GENRES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ── Data Source Resolver ─────────────────────────────────────

/** 데이터 소스 프리셋 */
export const DATA_SOURCE_PRESETS: Record<string, DataSourceConfig> = {
  activePersonas: {
    type: "real_persona",
    label: "활성 페르소나",
    description: "현재 ACTIVE 상태의 실제 페르소나 목록",
    personaFilter: {
      statuses: ["ACTIVE"],
    },
  },
  allPersonas: {
    type: "real_persona",
    label: "전체 페르소나",
    description: "ACTIVE + TESTING 상태의 페르소나 포함",
    personaFilter: {
      statuses: ["ACTIVE", "TESTING"],
    },
  },
  virtualRandom: {
    type: "virtual_user",
    label: "랜덤 가상 유저",
    description: "균등 분포 가상 유저 50명",
    virtualUserConfig: {
      count: 50,
      distributionMode: "uniform",
    },
  },
  virtualGaussian: {
    type: "virtual_user",
    label: "정규분포 가상 유저",
    description: "평균 중심 정규분포 가상 유저 50명",
    virtualUserConfig: {
      count: 50,
      distributionMode: "gaussian",
      gaussianParams: { mean: 0.5, stdDev: 0.15 },
    },
  },
  syntheticFromArchetype: {
    type: "synthetic",
    label: "아키타입 기반 합성",
    description: "특정 아키타입 기준으로 변형된 합성 유저",
    syntheticConfig: {
      baseArchetype: "cinephile",
      variationRange: 0.2,
      count: 20,
    },
  },
}

/** 데이터 소스 해석 (PersonaCandidate는 외부에서 제공) */
export interface ResolvedDataSource {
  sourceType: DataSourceType
  label: string
  description: string
  personaFilter: DataSourceConfig["personaFilter"] | null
  virtualUsers: ConsumerProfile[]
}

export function resolveDataSource(config: DataSourceConfig): ResolvedDataSource {
  let virtualUsers: ConsumerProfile[] = []

  if (config.type === "virtual_user" && config.virtualUserConfig) {
    virtualUsers = generateVirtualUsers(config.virtualUserConfig)
  }

  if (config.type === "synthetic" && config.syntheticConfig) {
    virtualUsers = generateSyntheticUsers(config.syntheticConfig)
  }

  return {
    sourceType: config.type,
    label: config.label,
    description: config.description,
    personaFilter: config.personaFilter ?? null,
    virtualUsers,
  }
}

function generateSyntheticUsers(config: SyntheticDataConfig): ConsumerProfile[] {
  const profiles: ConsumerProfile[] = []
  const range = clamp01(config.variationRange)

  for (let i = 0; i < config.count; i++) {
    // 아키타입 중심값 (0.5 기반) 주변으로 변동
    const l1 = generateVector7D("gaussian", { mean: 0.5, stdDev: range })
    const l2 = generateVector5D("gaussian", { mean: 0.5, stdDev: range })
    const l3 = generateVector4D("gaussian", { mean: 0.5, stdDev: range })

    profiles.push(
      createConsumerProfile(
        `Synthetic ${config.baseArchetype} ${i + 1}`,
        pickRandomDemographics(),
        {
          preferredGenres: [],
          contentHistory: [],
          traitKeywords: [config.baseArchetype],
        },
        l1,
        l2,
        l3,
        "synthetic"
      )
    )
  }

  return profiles
}

// ═══════════════════════════════════════════════════════════════
// AC4: API Integration Guide (B2B 고객용)
// ═══════════════════════════════════════════════════════════════

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"
export type AuthType = "api_key" | "oauth2" | "jwt"

/** API 엔드포인트 정의 */
export interface APIEndpoint {
  method: HttpMethod
  path: string
  description: string
  authentication: AuthType
  requestBody?: Record<string, FieldSpec>
  responseBody: Record<string, FieldSpec>
  rateLimit: string
  exampleRequest?: string
  exampleResponse?: string
}

/** 필드 스펙 */
export interface FieldSpec {
  type: string
  required: boolean
  description: string
  example?: string
}

/** SDK 코드 예제 */
export interface SDKExample {
  language: "typescript" | "python" | "curl"
  label: string
  description: string
  code: string
}

/** API 연동 가이드 전체 구조 */
export interface APIIntegrationGuide {
  version: string
  title: string
  description: string
  baseUrl: string
  authentication: {
    type: AuthType
    headerName: string
    description: string
    howToObtain: string
  }
  endpoints: APIEndpoint[]
  sdkExamples: SDKExample[]
  webhooks: WebhookDefinition[]
  errorCodes: ErrorCodeDefinition[]
  rateLimits: RateLimitInfo
  changelog: ChangelogEntry[]
}

export interface WebhookDefinition {
  event: string
  description: string
  payloadFields: Record<string, FieldSpec>
}

export interface ErrorCodeDefinition {
  code: string
  httpStatus: number
  message: string
  resolution: string
}

export interface RateLimitInfo {
  defaultLimit: string
  burstLimit: string
  perEndpoint: Record<string, string>
}

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

// ── Guide Generator ──────────────────────────────────────────

/** B2B 고객용 API 연동 가이드 생성 */
export function generateIntegrationGuide(options?: {
  baseUrl?: string
  version?: string
}): APIIntegrationGuide {
  const baseUrl = options?.baseUrl ?? "https://api.deepsight.ai"
  const version = options?.version ?? "v1"

  return {
    version,
    title: "DeepSight Persona Matching API Integration Guide",
    description:
      "페르소나 기반 콘텐츠 추천 API 연동 가이드. 3-Layer 벡터 매칭(L1: 7D Social Persona + L2: 5D OCEAN + L3: 4D Narrative Drive)을 활용한 개인화 추천을 제공합니다.",
    baseUrl,
    authentication: {
      type: "api_key",
      headerName: "X-DeepSight-API-Key",
      description: "Developer Console에서 발급받은 API Key를 헤더에 포함합니다.",
      howToObtain: "Developer Console > API Keys > Create New Key",
    },
    endpoints: buildEndpoints(baseUrl, version),
    sdkExamples: buildSDKExamples(baseUrl, version),
    webhooks: buildWebhookDefinitions(),
    errorCodes: buildErrorCodes(),
    rateLimits: {
      defaultLimit: "1,000 requests/minute",
      burstLimit: "100 requests/second",
      perEndpoint: {
        [`POST /${version}/match`]: "500 requests/minute",
        [`GET /${version}/personas`]: "1,000 requests/minute",
        [`POST /${version}/recommend`]: "500 requests/minute",
        [`POST /${version}/feedback`]: "2,000 requests/minute",
      },
    },
    changelog: [
      {
        version: "v1.0.0",
        date: "2026-02-01",
        changes: [
          "Initial release: 3-Tier matching (Basic/Advanced/Exploration)",
          "User profile creation with 3-Layer vector",
          "Persona recommendation endpoint",
        ],
      },
    ],
  }
}

function buildEndpoints(baseUrl: string, version: string): APIEndpoint[] {
  return [
    // Step 1: 유저 → 페르소나 매칭
    {
      method: "POST",
      path: `/${version}/match`,
      description:
        "유저 프로필을 기반으로 최적의 페르소나를 매칭합니다. 3-Tier 알고리즘(Basic/Advanced/Exploration)을 사용합니다.",
      authentication: "api_key",
      requestBody: {
        userProfile: {
          type: "object",
          required: true,
          description: "유저 프로필 (preferences, history, traits 또는 직접 벡터 입력)",
          example:
            '{"preferences": ["romance", "thriller"], "history": ["기생충"], "traits": ["논리적"]}',
        },
        limit: {
          type: "number",
          required: false,
          description: "반환할 매칭 결과 수 (default: 3, max: 10)",
          example: "3",
        },
        tier: {
          type: "string",
          required: false,
          description: "매칭 Tier 지정 (basic/advanced/exploration/all, default: all)",
          example: "all",
        },
      },
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "매칭 결과 배열 (personaId, score, tier, explanation)",
          example:
            '{"matches": [{"personaId": "p_001", "score": 0.94, "tier": "basic", "explanation": "..."}]}',
        },
      },
      rateLimit: "500 requests/minute",
      exampleRequest: JSON.stringify(
        {
          userProfile: {
            preferences: ["romance", "thriller"],
            history: ["기생충", "더글로리"],
            traits: ["논리적", "디테일중시"],
          },
          limit: 3,
        },
        null,
        2
      ),
      exampleResponse: JSON.stringify(
        {
          success: true,
          data: {
            matches: [
              {
                personaId: "persona_cinephile",
                score: 0.94,
                tier: "basic",
                explanation: "표면적 성향 매칭 — 분석 깊이 일치도: 0.92, 판단 렌즈 일치도: 0.88",
              },
              {
                personaId: "persona_sf_mania",
                score: 0.87,
                tier: "advanced",
                explanation: "심층 매칭 — 역설 호환성: 0.85, 벡터 유사도: 0.89",
              },
            ],
          },
        },
        null,
        2
      ),
    },

    // Step 2: 페르소나 리뷰 조회
    {
      method: "GET",
      path: `/${version}/personas/{personaId}/reviews`,
      description: "특정 페르소나의 콘텐츠 리뷰를 조회합니다. contentId로 필터링 가능합니다.",
      authentication: "api_key",
      requestBody: undefined,
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "리뷰 배열 (reviewId, contentId, text, rating, style)",
        },
      },
      rateLimit: "1,000 requests/minute",
      exampleResponse: JSON.stringify(
        {
          success: true,
          data: {
            reviews: [
              {
                reviewId: "rev_001",
                contentId: "movie_parasite",
                text: "봉준호 감독의 계급론을 ...",
                rating: 4.8,
                style: "analytical_deep",
              },
            ],
          },
        },
        null,
        2
      ),
    },

    // Step 3: 페르소나 기반 추천
    {
      method: "POST",
      path: `/${version}/recommend`,
      description: "매칭된 페르소나를 기반으로 콘텐츠를 추천합니다.",
      authentication: "api_key",
      requestBody: {
        personaId: {
          type: "string",
          required: true,
          description: "매칭된 페르소나 ID",
          example: "persona_cinephile",
        },
        userId: {
          type: "string",
          required: true,
          description: "최종 소비자 ID",
          example: "user_12345",
        },
        limit: {
          type: "number",
          required: false,
          description: "추천 콘텐츠 수 (default: 10, max: 50)",
          example: "10",
        },
      },
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "추천 콘텐츠 배열 (contentId, score, reason)",
        },
      },
      rateLimit: "500 requests/minute",
      exampleRequest: JSON.stringify(
        {
          personaId: "persona_cinephile",
          userId: "user_12345",
          limit: 10,
        },
        null,
        2
      ),
      exampleResponse: JSON.stringify(
        {
          success: true,
          data: {
            recommendations: [
              {
                contentId: "movie_blade_runner",
                title: "블레이드 러너 2049",
                predictedRating: 4.9,
                reason: "시네필 평론가의 감성과 분석이 완벽하게 일치하는 SF 걸작",
              },
            ],
          },
        },
        null,
        2
      ),
    },

    // 페르소나 목록
    {
      method: "GET",
      path: `/${version}/personas`,
      description: "사용 가능한 페르소나 목록을 조회합니다.",
      authentication: "api_key",
      requestBody: undefined,
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "페르소나 목록 (id, name, archetype, description)",
        },
      },
      rateLimit: "1,000 requests/minute",
    },

    // 유저 벡터 조회
    {
      method: "GET",
      path: `/${version}/user/{userId}/vector`,
      description:
        "유저의 현재 프로파일 벡터를 조회합니다. 점진적 프로파일링으로 학습된 벡터를 반환합니다.",
      authentication: "api_key",
      requestBody: undefined,
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
        data: {
          type: "object",
          required: true,
          description: "유저 벡터 (l1, l2, l3, vFinal, confidence)",
        },
      },
      rateLimit: "1,000 requests/minute",
    },

    // 피드백 전송
    {
      method: "POST",
      path: `/${version}/feedback`,
      description: "유저의 페르소나/콘텐츠 피드백을 전송합니다. 점진적 프로파일링에 활용됩니다.",
      authentication: "api_key",
      requestBody: {
        userId: {
          type: "string",
          required: true,
          description: "최종 소비자 ID",
        },
        personaId: {
          type: "string",
          required: true,
          description: "페르소나 ID",
        },
        contentId: {
          type: "string",
          required: false,
          description: "콘텐츠 ID (있을 경우)",
        },
        action: {
          type: "string",
          required: true,
          description: "피드백 액션 (like/dislike/click/bookmark/share/dismiss)",
          example: "like",
        },
        metadata: {
          type: "object",
          required: false,
          description: "추가 메타데이터 (dwellTime, scrollDepth 등)",
        },
      },
      responseBody: {
        success: { type: "boolean", required: true, description: "요청 성공 여부" },
      },
      rateLimit: "2,000 requests/minute",
    },
  ]
}

function buildSDKExamples(baseUrl: string, version: string): SDKExample[] {
  return [
    {
      language: "typescript",
      label: "TypeScript/Node.js",
      description: "TypeScript SDK를 사용한 기본 매칭 흐름",
      code: `import { DeepSightClient } from '@deepsight/sdk';

const client = new DeepSightClient({
  apiKey: process.env.DEEPSIGHT_API_KEY!,
  baseUrl: '${baseUrl}',
});

// Step 1: 유저 → 페르소나 매칭
const matchResult = await client.match({
  userProfile: {
    preferences: ['romance', 'thriller'],
    history: ['기생충', '더글로리'],
    traits: ['논리적', '디테일중시'],
  },
  limit: 3,
});

// Step 2: 페르소나 리뷰 조회
const topPersonaId = matchResult.matches[0].personaId;
const reviews = await client.getReviews(topPersonaId, {
  contentId: 'movie_parasite',
});

// Step 3: 페르소나 기반 추천
const recommendations = await client.recommend({
  personaId: topPersonaId,
  userId: 'user_12345',
  limit: 10,
});

// Step 4: 피드백 전송
await client.sendFeedback({
  userId: 'user_12345',
  personaId: topPersonaId,
  contentId: recommendations[0].contentId,
  action: 'like',
});`,
    },
    {
      language: "python",
      label: "Python",
      description: "Python SDK를 사용한 기본 매칭 흐름",
      code: `from deepsight import DeepSightClient

client = DeepSightClient(
    api_key=os.environ["DEEPSIGHT_API_KEY"],
    base_url="${baseUrl}",
)

# Step 1: 유저 -> 페르소나 매칭
match_result = client.match(
    user_profile={
        "preferences": ["romance", "thriller"],
        "history": ["기생충", "더글로리"],
        "traits": ["논리적", "디테일중시"],
    },
    limit=3,
)

# Step 2: 페르소나 리뷰 조회
top_persona_id = match_result.matches[0].persona_id
reviews = client.get_reviews(top_persona_id, content_id="movie_parasite")

# Step 3: 페르소나 기반 추천
recommendations = client.recommend(
    persona_id=top_persona_id,
    user_id="user_12345",
    limit=10,
)

# Step 4: 피드백 전송
client.send_feedback(
    user_id="user_12345",
    persona_id=top_persona_id,
    content_id=recommendations[0].content_id,
    action="like",
)`,
    },
    {
      language: "curl",
      label: "cURL",
      description: "cURL을 사용한 API 호출 예시",
      code: `# Step 1: 유저 -> 페르소나 매칭
curl -X POST ${baseUrl}/${version}/match \\
  -H "Content-Type: application/json" \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY" \\
  -d '{
    "userProfile": {
      "preferences": ["romance", "thriller"],
      "history": ["기생충", "더글로리"],
      "traits": ["논리적", "디테일중시"]
    },
    "limit": 3
  }'

# Step 2: 페르소나 리뷰 조회
curl ${baseUrl}/${version}/personas/persona_cinephile/reviews?content_id=movie_parasite \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY"

# Step 3: 페르소나 기반 추천
curl -X POST ${baseUrl}/${version}/recommend \\
  -H "Content-Type: application/json" \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY" \\
  -d '{
    "personaId": "persona_cinephile",
    "userId": "user_12345",
    "limit": 10
  }'

# Step 4: 피드백 전송
curl -X POST ${baseUrl}/${version}/feedback \\
  -H "Content-Type: application/json" \\
  -H "X-DeepSight-API-Key: YOUR_API_KEY" \\
  -d '{
    "userId": "user_12345",
    "personaId": "persona_cinephile",
    "contentId": "movie_blade_runner",
    "action": "like"
  }'`,
    },
  ]
}

function buildWebhookDefinitions(): WebhookDefinition[] {
  return [
    {
      event: "match.completed",
      description: "매칭이 완료되었을 때 발생합니다.",
      payloadFields: {
        userId: { type: "string", required: true, description: "유저 ID" },
        matches: { type: "array", required: true, description: "매칭 결과 배열" },
        timestamp: { type: "string", required: true, description: "ISO 8601 타임스탬프" },
      },
    },
    {
      event: "user.vector_updated",
      description: "유저 벡터가 업데이트되었을 때 발생합니다 (점진적 프로파일링).",
      payloadFields: {
        userId: { type: "string", required: true, description: "유저 ID" },
        previousVector: { type: "object", required: true, description: "이전 벡터" },
        currentVector: { type: "object", required: true, description: "현재 벡터" },
        confidence: { type: "number", required: true, description: "벡터 신뢰도 (0~1)" },
      },
    },
    {
      event: "persona.activated",
      description: "새로운 페르소나가 활성화되었을 때 발생합니다.",
      payloadFields: {
        personaId: { type: "string", required: true, description: "페르소나 ID" },
        name: { type: "string", required: true, description: "페르소나 이름" },
        archetype: { type: "string", required: false, description: "아키타입" },
      },
    },
  ]
}

function buildErrorCodes(): ErrorCodeDefinition[] {
  return [
    {
      code: "AUTH_INVALID_KEY",
      httpStatus: 401,
      message: "Invalid or expired API key",
      resolution: "Developer Console에서 API Key를 재발급하세요.",
    },
    {
      code: "AUTH_RATE_LIMITED",
      httpStatus: 429,
      message: "Rate limit exceeded",
      resolution: "요청 빈도를 줄이거나 플랜을 업그레이드하세요.",
    },
    {
      code: "MATCH_NO_ACTIVE_PERSONAS",
      httpStatus: 404,
      message: "No active personas available for matching",
      resolution: "Engine Studio에서 페르소나를 활성화하세요.",
    },
    {
      code: "MATCH_INVALID_PROFILE",
      httpStatus: 400,
      message: "Invalid user profile format",
      resolution: "요청 바디의 userProfile 필드를 확인하세요.",
    },
    {
      code: "RECOMMEND_PERSONA_NOT_FOUND",
      httpStatus: 404,
      message: "Persona not found or inactive",
      resolution: "유효한 personaId를 사용하세요.",
    },
    {
      code: "FEEDBACK_INVALID_ACTION",
      httpStatus: 400,
      message: "Invalid feedback action",
      resolution: "action은 like/dislike/click/bookmark/share/dismiss 중 하나여야 합니다.",
    },
    {
      code: "INTERNAL_ERROR",
      httpStatus: 500,
      message: "Internal server error",
      resolution: "지속 발생 시 support@deepsight.ai로 문의하세요.",
    },
  ]
}

// ═══════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════

function round(v: number): number {
  return Math.round(v * 100) / 100
}
