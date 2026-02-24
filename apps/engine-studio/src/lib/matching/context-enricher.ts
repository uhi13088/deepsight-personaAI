// ═══════════════════════════════════════════════════════════════
// MatchingContext Enrichment Layer
// 매칭 엔진(순수함수)과 주변 시그널(DB/상태)을 분리하되,
// 매칭 전에 풍부한 컨텍스트를 조립하는 레이어.
// ═══════════════════════════════════════════════════════════════

import type { VoiceStyleParams } from "@/lib/persona-world/types"
import { cosineSimilarity } from "@/lib/vector/utils"
import { round, clamp } from "./utils"

// ── 확장 시그널 타입 ────────────────────────────────────────

/** 관계 깊이 시그널 (PersonaRelationship 기반) */
export interface RelationshipSignal {
  warmth: number // 0~1
  tension: number // 0~1
  frequency: number // 0~1
  depth: number // 0~1
  lastInteractionAt: Date | null
}

/** 네거티브 시그널 (moderation/report 기반) */
export interface NegativeSignal {
  reportCount: number // 총 리포트 수
  isBlocked: boolean
  highTension: boolean // tension > threshold
  isSuspectedBot: boolean
}

/** 인게이지먼트 시그널 (PersonaPost 집계) */
export interface EngagementSignal {
  avgLikes: number
  avgComments: number
  postCount30d: number
  engagementVelocity: number // 최근 vs 이전 인게이지먼트 변화율
}

/** 소비 패턴 시그널 (ConsumptionLog 기반) */
export interface ConsumptionSignal {
  topTags: string[] // 상위 소비 태그
  avgRating: number
  contentTypeDistribution: Record<string, number>
}

/** 소셜 그래프 시그널 (connectivity.ts 기반) */
export interface TopologySignal {
  classification: "HUB" | "NORMAL" | "PERIPHERAL" | "ISOLATE"
  isSuspectedBot: boolean
  connectivityScore: number // 0~1
}

/** 감정 상태 시그널 (emotional-contagion 기반) */
export interface EmotionalSignal {
  currentMood: number // 0~1
  moodStability: number // 0~1 (변동성의 역수)
  avgNetworkMood: number // 0~1
}

/** 세션 컨텍스트 (유저 현재 상태) */
export interface SessionContext {
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
  sessionCount: number // 총 세션 수
  isNewUser: boolean // < 10 세션
  isChurning: boolean // 최근 참여도 하락
  daysSinceLastVisit: number
}

/** 페르소나 품질 시그널 */
export interface QualitySignal {
  qualityScore: number // 0~1
  consistencyScore: number // 0~1
  paradoxScore: number // 0~1
  driftSeverity: "STABLE" | "WARNING" | "CRITICAL"
  interactionCount: number // 총 인터랙션 수 (콜드스타트 감지용)
}

/** 노출 이력 시그널 (피로 방지) */
export interface ExposureSignal {
  appearanceCount7d: number // 7일간 노출 수
  lastShownAt: Date | null
  daysSinceLastShown: number
}

/** A/B 실험 컨텍스트 */
export interface ExperimentContext {
  experimentId?: string
  variant?: string
  enabledFeatures: Set<EnrichmentFeature>
}

// ── 전체 Enriched Context ─────────────────────────────────

/** enricher가 활성화할 수 있는 기능 목록 */
export type EnrichmentFeature =
  | "voiceSimilarity"
  | "qualityWeight"
  | "negativeSignals"
  | "relationshipDepth"
  | "fatiguePrevention"
  | "engagementBoost"
  | "coldStartStrategy"
  | "consumptionPatterns"
  | "socialTopology"
  | "emotionalContagion"
  | "dynamicPressure"
  | "dynamicTierWeights"

/** 페르소나별 풍부한 시그널 묶음 */
export interface PersonaEnrichedSignals {
  voiceStyleParams?: VoiceStyleParams
  relationship?: RelationshipSignal
  negative?: NegativeSignal
  engagement?: EngagementSignal
  consumption?: ConsumptionSignal
  topology?: TopologySignal
  emotional?: EmotionalSignal
  quality?: QualitySignal
  exposure?: ExposureSignal
}

/** 유저 세션 컨텍스트 */
export interface UserEnrichedContext {
  session?: SessionContext
  preferredTags?: string[] // 유저 선호 태그 (온보딩 + 행동)
  voiceStyleParams?: VoiceStyleParams // 유저 선호 VoiceStyle
}

/** matchAll()에 전달되는 확장된 매칭 컨텍스트 */
export interface EnrichedMatchingContext {
  /** personaId → 풍부한 시그널 */
  personaSignals: Map<string, PersonaEnrichedSignals>
  /** 유저 컨텍스트 */
  userContext?: UserEnrichedContext
  /** A/B 실험 */
  experiment?: ExperimentContext
}

// ── 시그널 → 매칭 점수 변환 함수들 ─────────────────────────

/** Voice 유사도 계산 (cosine similarity of 6-dim style vector) */
export function computeVoiceSimilarity(
  userStyle: VoiceStyleParams,
  personaStyle: VoiceStyleParams
): number {
  const uVec = voiceStyleToVector(userStyle)
  const pVec = voiceStyleToVector(personaStyle)
  return cosineSimilarity(uVec, pVec)
}

/** 관계 깊이 점수 (0~1) */
export function computeRelationshipDepthScore(signal: RelationshipSignal): number {
  return clamp(signal.warmth * 0.6 + signal.frequency * 0.3 + (1 - signal.tension) * 0.1)
}

/** 네거티브 패널티 (0~1, 높을수록 나쁨) */
export function computeNegativePenalty(signal: NegativeSignal): number {
  if (signal.isBlocked) return 1.0
  if (signal.isSuspectedBot) return 0.8

  let penalty = 0
  if (signal.highTension) penalty += 0.3
  penalty += Math.min(0.5, signal.reportCount * 0.1)
  return clamp(penalty)
}

/** 인게이지먼트 부스트 (0~1) */
export function computeEngagementBoost(signal: EngagementSignal): number {
  // 정규화: avg 3+ likes = 1.0, 0 = 0
  const likeScore = Math.min(1, signal.avgLikes / 3)
  const commentScore = Math.min(1, signal.avgComments / 2)
  const velocityBonus = signal.engagementVelocity > 0 ? 0.1 : 0

  return clamp(likeScore * 0.5 + commentScore * 0.4 + velocityBonus)
}

/** 콜드스타트 보정 계수 (1.0 = 정상, <1.0 = 콜드스타트 상태) */
export function computeColdStartFactor(quality: QualitySignal): number {
  if (quality.interactionCount >= 10) return 1.0
  // 인터랙션 0~10 사이: 선형 증가 (최소 0.5)
  return 0.5 + 0.5 * (quality.interactionCount / 10)
}

/** 피로 감쇠 (0~1, 1.0 = 감쇠 없음, 0 = 완전 억제) */
export function computeFatigueDecay(exposure: ExposureSignal): number {
  if (exposure.appearanceCount7d === 0) return 1.0
  // e^(-(count / 5))
  return Math.exp(-exposure.appearanceCount7d / 5)
}

/** 재발견 부스트 (14일 이상 안 보이고 + warmth가 높았던 경우) */
export function computeRediscoveryBoost(
  exposure: ExposureSignal,
  relationship?: RelationshipSignal
): number {
  if (exposure.daysSinceLastShown < 14) return 0
  if (!relationship || relationship.warmth < 0.5) return 0
  return 0.08
}

/** 품질 가중치 (0.7~1.0 범위로 최종 점수에 곱함) */
export function computeQualityWeight(quality: QualitySignal): number {
  return 0.7 + 0.3 * quality.qualityScore
}

/** 소비 패턴 일치도 (0~1) */
export function computeConsumptionMatch(userTags: string[], personaTags: string[]): number {
  if (userTags.length === 0 || personaTags.length === 0) return 0
  const userSet = new Set(userTags)
  const personaSet = new Set(personaTags)
  const intersection = [...userSet].filter((t) => personaSet.has(t))
  const union = new Set([...userSet, ...personaSet])
  return intersection.length / union.size // Jaccard similarity
}

/** 토폴로지 보정 계수 */
export function computeTopologyModifier(topology: TopologySignal): number {
  if (topology.isSuspectedBot) return -0.5 // 강한 패널티
  switch (topology.classification) {
    case "HUB":
      return 0.1 // Exploration tier에서 약간 부스트
    case "ISOLATE":
      return -0.1 // 관계 형성 어려움
    case "PERIPHERAL":
      return -0.05
    case "NORMAL":
    default:
      return 0
  }
}

/** 감정 기반 보정 (유저 mood 낮을 때 → 긍정적 페르소나 우선) */
export function computeEmotionalModifier(userMood: number, personaMood: number): number {
  // 유저 mood < 0.3: 긍정적 페르소나(mood > 0.6) +0.05
  if (userMood < 0.3 && personaMood > 0.6) return 0.05
  // 유저 mood > 0.7: 중립 (보정 없음)
  return 0
}

/** 동적 Pressure 계수 (세션 수 기반) */
export function computeDynamicPressure(sessionCount: number): number {
  if (sessionCount < 10) return 0.0
  if (sessionCount < 30) return 0.1
  if (sessionCount < 50) return 0.25
  return 0.5
}

/** 동적 Tier 가중치 (유저 세그먼트 기반) */
export function computeDynamicTierWeights(
  session?: SessionContext
): { basic: number; advanced: number; exploration: number } | null {
  if (!session) return null

  if (session.isNewUser) {
    return { basic: 0.4, advanced: 0.1, exploration: 0.5 } // 탐색 우선
  }
  if (session.isChurning) {
    return { basic: 0.3, advanced: 0.1, exploration: 0.6 } // 세렌디피티로 재참여
  }
  if (session.sessionCount >= 50) {
    return { basic: 0.4, advanced: 0.4, exploration: 0.2 } // 심층 추천
  }
  // 기본 (활성 유저)
  return null // DEFAULT 사용
}

// ── Enriched 시그널을 최종 점수에 적용하는 함수 ─────────────

export interface ScoreAdjustment {
  baseScore: number
  voiceBonus: number
  relationshipBonus: number
  negativePenalty: number
  engagementBonus: number
  fatigueDecay: number
  rediscoveryBoost: number
  qualityWeight: number
  consumptionBonus: number
  topologyModifier: number
  emotionalModifier: number
  coldStartFactor: number
  finalScore: number
}

/** 모든 시그널을 종합하여 최종 점수 계산 */
export function applyEnrichmentSignals(
  rawScore: number,
  tier: "basic" | "advanced" | "exploration",
  personaSignals?: PersonaEnrichedSignals,
  userContext?: UserEnrichedContext,
  enabledFeatures?: Set<EnrichmentFeature>
): ScoreAdjustment {
  const enabled =
    enabledFeatures ??
    new Set<EnrichmentFeature>([
      "voiceSimilarity",
      "qualityWeight",
      "negativeSignals",
      "relationshipDepth",
      "fatiguePrevention",
      "engagementBoost",
      "coldStartStrategy",
      "consumptionPatterns",
      "socialTopology",
      "emotionalContagion",
    ])

  let voiceBonus = 0
  let relationshipBonus = 0
  let negativePenalty = 0
  let engagementBonus = 0
  let fatigueDecay = 1.0
  let rediscoveryBoost = 0
  let qualityWeight = 1.0
  let consumptionBonus = 0
  let topologyModifier = 0
  let emotionalModifier = 0
  let coldStartFactor = 1.0

  if (!personaSignals) {
    return {
      baseScore: rawScore,
      voiceBonus,
      relationshipBonus,
      negativePenalty,
      engagementBonus,
      fatigueDecay,
      rediscoveryBoost,
      qualityWeight,
      consumptionBonus,
      topologyModifier,
      emotionalModifier,
      coldStartFactor,
      finalScore: rawScore,
    }
  }

  // Voice 유사도 → qualitativeBonus 슬롯에 해당 (Basic/Advanced ±0.05)
  if (
    enabled.has("voiceSimilarity") &&
    personaSignals.voiceStyleParams &&
    userContext?.voiceStyleParams
  ) {
    const sim = computeVoiceSimilarity(
      userContext.voiceStyleParams,
      personaSignals.voiceStyleParams
    )
    voiceBonus = (sim - 0.5) * 0.1 // ±0.05 범위
    if (tier === "exploration") voiceBonus = 0 // 탐색에는 미적용
  }

  // 관계 깊이 → Advanced에 더 강하게 반영
  if (enabled.has("relationshipDepth") && personaSignals.relationship) {
    const depthScore = computeRelationshipDepthScore(personaSignals.relationship)
    relationshipBonus = tier === "advanced" ? depthScore * 0.1 : depthScore * 0.05
    if (tier === "exploration") relationshipBonus = 0
  }

  // 네거티브 시그널 → 모든 Tier에 적용
  if (enabled.has("negativeSignals") && personaSignals.negative) {
    negativePenalty = computeNegativePenalty(personaSignals.negative)
  }

  // 인게이지먼트 → Basic/Advanced에 적용
  if (enabled.has("engagementBoost") && personaSignals.engagement) {
    const boost = computeEngagementBoost(personaSignals.engagement)
    engagementBonus = tier === "exploration" ? 0 : boost * 0.05
  }

  // 피로 감쇠
  if (enabled.has("fatiguePrevention") && personaSignals.exposure) {
    fatigueDecay = computeFatigueDecay(personaSignals.exposure)
    rediscoveryBoost = computeRediscoveryBoost(personaSignals.exposure, personaSignals.relationship)
  }

  // 품질 가중
  if (enabled.has("qualityWeight") && personaSignals.quality) {
    qualityWeight = computeQualityWeight(personaSignals.quality)
  }

  // 콜드스타트
  if (enabled.has("coldStartStrategy") && personaSignals.quality) {
    coldStartFactor = computeColdStartFactor(personaSignals.quality)
  }

  // 소비 패턴
  if (
    enabled.has("consumptionPatterns") &&
    personaSignals.consumption &&
    userContext?.preferredTags
  ) {
    const match = computeConsumptionMatch(
      userContext.preferredTags,
      personaSignals.consumption.topTags
    )
    consumptionBonus = tier === "exploration" ? 0 : match * 0.05
  }

  // 토폴로지
  if (enabled.has("socialTopology") && personaSignals.topology) {
    topologyModifier = computeTopologyModifier(personaSignals.topology)
    // Exploration tier에서만 Hub 부스트 적용
    if (tier !== "exploration" && topologyModifier > 0) topologyModifier = 0
  }

  // 감정 보정
  if (enabled.has("emotionalContagion") && personaSignals.emotional && userContext?.session) {
    // 유저 mood는 userContext로부터 추정 (세션 정보 기반 단순 모델)
    emotionalModifier = computeEmotionalModifier(
      personaSignals.emotional.avgNetworkMood, // 네트워크 평균을 프록시로
      personaSignals.emotional.currentMood
    )
  }

  // 최종 점수 조합
  const adjusted =
    (rawScore +
      voiceBonus +
      relationshipBonus +
      engagementBonus +
      consumptionBonus +
      topologyModifier +
      emotionalModifier +
      rediscoveryBoost) *
    fatigueDecay *
    qualityWeight *
    coldStartFactor

  // 네거티브 패널티: 강한 감점
  const finalScore = clamp(adjusted * (1 - negativePenalty))

  return {
    baseScore: rawScore,
    voiceBonus: round(voiceBonus),
    relationshipBonus: round(relationshipBonus),
    negativePenalty: round(negativePenalty),
    engagementBonus: round(engagementBonus),
    fatigueDecay: round(fatigueDecay),
    rediscoveryBoost: round(rediscoveryBoost),
    qualityWeight: round(qualityWeight),
    consumptionBonus: round(consumptionBonus),
    topologyModifier: round(topologyModifier),
    emotionalModifier: round(emotionalModifier),
    coldStartFactor: round(coldStartFactor),
    finalScore: round(finalScore),
  }
}

// ── 유틸 ─────────────────────────────────────────────────

function voiceStyleToVector(style: VoiceStyleParams): number[] {
  return [
    style.formality,
    style.humor,
    style.sentenceLength,
    style.emotionExpression,
    style.assertiveness,
    style.vocabularyLevel,
  ]
}
