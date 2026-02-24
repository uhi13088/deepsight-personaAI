// ═══════════════════════════════════════════════════════════════
// 매칭 설명 시스템 (XAI)
// T58-AC2: 운영자용 분석 + 사용자용 자연어 설명
// T215: Enrichment Layer 시그널 설명 추가
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types"
import type { ScoreAdjustment } from "./context-enricher"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface TraitLevel {
  dimension: SocialDimension
  level: "very_high" | "high" | "neutral" | "low" | "very_low"
  value: number
}

/** Enrichment 시그널이 매칭에 미친 영향 설명 */
export interface EnrichmentExplanation {
  appliedSignals: string[] // 적용된 시그널 목록 (한글)
  positiveFactors: string[] // 점수 상승 요인
  negativeFactors: string[] // 점수 하락 요인
  tierAdjustment?: string // 동적 Tier 가중치 변경 사유
  experimentId?: string // A/B 실험 ID (있으면)
}

export interface OperatorExplanation {
  matchScore: number
  tier: string
  dimensionBreakdown: Array<{
    dimension: string
    label: string
    userValue: number
    personaValue: number
    contribution: number
  }>
  strengthFactors: string[]
  weakFactors: string[]
  /** Enrichment Layer 기여 분석 (있으면) */
  enrichment?: EnrichmentExplanation
}

export interface UserExplanation {
  headline: string // 1문장 요약
  body: string // 2-3문장 자연어 설명
  traits: string[] // 매칭 특성 태그
}

// ── 차원별 레이블 ────────────────────────────────────────────

const DIM_LABELS: Record<
  SocialDimension,
  { name: string; veryHigh: string; high: string; low: string; veryLow: string }
> = {
  depth: {
    name: "분석 깊이",
    veryHigh: "극심층",
    high: "심층적",
    low: "직관적",
    veryLow: "극직관",
  },
  lens: { name: "판단 렌즈", veryHigh: "극논리", high: "논리적", low: "감성적", veryLow: "극감성" },
  stance: {
    name: "비평 태도",
    veryHigh: "극비판",
    high: "비판적",
    low: "수용적",
    veryLow: "극수용",
  },
  scope: {
    name: "디테일 수준",
    veryHigh: "극세밀",
    high: "디테일",
    low: "핵심만",
    veryLow: "극간결",
  },
  taste: {
    name: "취향 성향",
    veryHigh: "극전위",
    high: "실험적",
    low: "클래식",
    veryLow: "극보수",
  },
  purpose: {
    name: "목적 지향",
    veryHigh: "극의미",
    high: "의미추구",
    low: "오락",
    veryLow: "극오락",
  },
  sociability: {
    name: "소통 성향",
    veryHigh: "극사교",
    high: "사교적",
    low: "독립적",
    veryLow: "극독립",
  },
}

// ── 유저 상위 특성 추출 ──────────────────────────────────────

export function getTopTraits(vector: SocialPersonaVector, n: number = 3): TraitLevel[] {
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]

  const traits: TraitLevel[] = dims.map((dim) => {
    const value = vector[dim]
    const level: TraitLevel["level"] =
      value >= 0.8
        ? "very_high"
        : value >= 0.6
          ? "high"
          : value <= 0.2
            ? "very_low"
            : value <= 0.4
              ? "low"
              : "neutral"
    return { dimension: dim, level, value }
  })

  // 극단값 우선 정렬 (|0.5 - value| 큰 순)
  traits.sort((a, b) => Math.abs(b.value - 0.5) - Math.abs(a.value - 0.5))
  return traits.slice(0, n)
}

// ── 운영자용 분석 생성 ───────────────────────────────────────

export function generateOperatorExplanation(
  matchScore: number,
  tier: string,
  userL1: SocialPersonaVector,
  personaL1: SocialPersonaVector
): OperatorExplanation {
  const dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]

  const dimensionBreakdown = dims.map((dim) => {
    const diff = Math.abs(userL1[dim] - personaL1[dim])
    return {
      dimension: dim,
      label: DIM_LABELS[dim].name,
      userValue: round(userL1[dim]),
      personaValue: round(personaL1[dim]),
      contribution: round(1 - diff), // 유사할수록 높은 기여
    }
  })

  dimensionBreakdown.sort((a, b) => b.contribution - a.contribution)

  const strengthFactors = dimensionBreakdown
    .filter((d) => d.contribution >= 0.8)
    .map((d) => `${d.label} 일치도 높음 (${d.contribution})`)

  const weakFactors = dimensionBreakdown
    .filter((d) => d.contribution < 0.5)
    .map((d) => `${d.label} 차이 큼 (${d.contribution})`)

  return {
    matchScore: round(matchScore),
    tier,
    dimensionBreakdown,
    strengthFactors,
    weakFactors,
  }
}

// ── 사용자용 자연어 설명 ─────────────────────────────────────

// 특성별 자연어 표현 (말하듯이)
const TRAIT_EXPRESSIONS: Record<string, string> = {
  depth_very_high: "작품을 극도로 깊이 파고드는 분이시네요",
  depth_high: "작품을 깊이 파고드는 걸 좋아하시는군요",
  depth_low: "직관적으로 느끼시는 분이네요",
  depth_very_low: "순간의 느낌을 가장 중요하게 여기시는 분이에요",
  lens_very_high: "철저하게 데이터와 논리로 분석하시는 분이네요",
  lens_high: "분석적인 관점으로 보시네요",
  lens_low: "감성으로 먼저 반응하시는 분이에요",
  lens_very_low: "순수한 감정과 직감으로 작품을 느끼시는 분이에요",
  stance_very_high: "누구보다 솔직하고 날카로운 분이시네요",
  stance_high: "좋은 점만 말하는 건 싫으시죠",
  stance_low: "작품의 좋은 면을 먼저 보시는 분이네요",
  stance_very_low: "모든 작품에서 가치를 찾으시는 포용적인 분이에요",
  scope_very_high: "한 작품의 모든 것을 샅샅이 살피시는 분이네요",
  scope_high: "디테일을 꼼꼼히 살피시네요",
  scope_low: "핵심만 간결하게 보시는 스타일이에요",
  scope_very_low: "한 줄 감상으로 핵심을 꿰뚫는 분이에요",
  taste_very_high: "남들이 모르는 숨겨진 작품을 발굴하시는 분이에요",
  taste_high: "새로운 시도를 좋아하시는군요",
  taste_low: "검증된 작품을 선호하시네요",
  taste_very_low: "시간이 검증한 명작을 가장 사랑하시는 분이에요",
  purpose_very_high: "작품 속에서 존재의 의미를 탐구하시는 분이에요",
  purpose_high: "작품에서 의미를 찾으시는 분이에요",
  purpose_low: "가볍게 즐기시는 스타일이에요",
  purpose_very_low: "순수하게 재미를 위해 작품을 즐기시는 분이에요",
  sociability_very_high: "작품 경험을 모두와 나누는 걸 최고로 여기시네요",
  sociability_high: "다른 사람과 나누는 걸 좋아하시네요",
  sociability_low: "혼자만의 감상을 즐기시는 분이에요",
  sociability_very_low: "완전히 자신만의 세계에서 작품을 경험하시는 분이에요",
}

// 페르소나 매칭 표현
const PERSONA_MATCH_EXPRESSIONS: Record<string, string> = {
  depth_very_high: "이 추천자는 작품의 가장 깊은 층위까지 파고드는 극심층 분석가예요",
  depth_high: "이 추천자도 작품의 숨겨진 의미와 연출 의도를 꼼꼼히 분석하는 스타일이에요",
  depth_low: "이 추천자도 머리보다 마음으로 먼저 느끼는 타입이라 잘 통할 거예요",
  depth_very_low: "이 추천자도 직감의 힘을 믿는 타입이라 감이 통할 거예요",
  lens_very_high: "이 추천자는 데이터와 근거로 작품을 정밀하게 해부하는 타입이에요",
  lens_high: "이 추천자도 논리적으로 작품을 해석하는 걸 좋아해요",
  lens_low: "이 추천자도 감성적인 공감을 중시하는 스타일이에요",
  lens_very_low: "이 추천자도 순수한 감정의 파도를 타며 작품을 경험하는 타입이에요",
  stance_very_high: "이 추천자는 거침없이 솔직한 평가를 해줄 거예요",
  stance_high: "이 추천자는 아쉬운 점도 솔직하게 말해주는 스타일이에요",
  stance_low: "이 추천자도 긍정적인 시선으로 작품을 바라봐요",
  stance_very_low: "이 추천자는 모든 작품에서 빛나는 점을 찾아주는 따뜻한 타입이에요",
  scope_very_high: "이 추천자는 작품의 모든 요소를 빠짐없이 분석하는 극세밀 타입이에요",
  scope_high: "이 추천자도 하나하나 꼼꼼하게 짚어주는 타입이에요",
  scope_low: "이 추천자도 핵심만 깔끔하게 정리해주는 스타일이에요",
  scope_very_low: "이 추천자는 한 마디로 작품의 핵심을 짚어주는 타입이에요",
  taste_very_high: "이 추천자는 아무도 모르는 숨겨진 보석을 발굴하는 전문가예요",
  taste_high: "이 추천자도 실험적인 작품을 발굴하는 걸 좋아해요",
  taste_low: "이 추천자도 명작의 가치를 알아보는 안목이 있어요",
  taste_very_low: "이 추천자는 검증된 명작 중의 명작을 추천하는 안목이 있어요",
  purpose_very_high: "이 추천자는 작품에서 삶의 깊은 의미를 탐구하는 타입이에요",
  purpose_high: "이 추천자도 작품 속 깊은 의미를 파고드는 타입이에요",
  purpose_low: "이 추천자도 편하게 즐길 수 있는 작품을 잘 골라요",
  purpose_very_low: "이 추천자는 순수한 재미와 즐거움을 최우선으로 골라줘요",
  sociability_very_high: "함께 열정적으로 이야기 나눌 수 있는 최고의 대화 상대예요",
  sociability_high: "함께 이야기 나눌 수 있는 추천자예요",
  sociability_low: "조용히 깊은 감상을 나눠줄 추천자예요",
  sociability_very_low: "자신만의 깊은 세계에서 우러나온 감상을 전해줄 추천자예요",
}

export function generateUserExplanation(
  userL1: SocialPersonaVector,
  personaL1: SocialPersonaVector,
  context?: { timeOfDay?: string; genre?: string }
): UserExplanation {
  const topTraits = getTopTraits(userL1, 3)
  const nonNeutralTraits = topTraits.filter((t) => t.level !== "neutral")

  if (nonNeutralTraits.length === 0) {
    return {
      headline: "다양한 관점을 가진 분이시네요",
      body: "이 추천자도 균형 잡힌 시각으로 작품을 바라보는 스타일이에요. 편하게 다양한 이야기를 나눌 수 있을 거예요.",
      traits: ["균형잡힌"],
    }
  }

  // 첫 번째 특성 → headline
  const primary = nonNeutralTraits[0]
  const headlineKey = `${primary.dimension}_${primary.level}`
  const headline = TRAIT_EXPRESSIONS[headlineKey] ?? "취향이 잘 맞는 추천자를 찾았어요"

  // 나머지 특성 → body 조합
  const bodyParts: string[] = []
  for (const trait of nonNeutralTraits.slice(0, 2)) {
    const matchKey = `${trait.dimension}_${trait.level}`
    const matchExpr = PERSONA_MATCH_EXPRESSIONS[matchKey]
    if (matchExpr) bodyParts.push(matchExpr)
  }

  // 컨텍스트 보너스
  if (context?.timeOfDay === "night") {
    bodyParts.push("늦은 밤이라 가벼운 마음으로 즐겨보세요")
  }

  const body = bodyParts.join(". ") + "."

  const traits = nonNeutralTraits.map((t) => getTraitLabel(t.dimension, t.level))

  return { headline, body, traits }
}

// ── 복합 성향 설명 ───────────────────────────────────────────

export function generateCompoundExplanation(
  userL1: SocialPersonaVector,
  personaName: string
): string {
  const traits = getTopTraits(userL1, 3).filter((t) => t.level !== "neutral")

  if (traits.length === 0) {
    return `${personaName}은(는) 다양한 관점을 제공하는 추천자입니다.`
  }

  const traitDescriptions = traits.map((t) => getTraitLabel(t.dimension, t.level))

  const traitStr = traitDescriptions.join(" + ")
  const headlineKey = `${traits[0].dimension}_${traits[0].level}`
  const userDescription = TRAIT_EXPRESSIONS[headlineKey] ?? ""
  const matchKey = `${traits[0].dimension}_${traits[0].level}`
  const matchDescription = PERSONA_MATCH_EXPRESSIONS[matchKey] ?? ""

  return `[${traitStr} 유저]\n${userDescription}!\n${matchDescription}.`
}

// ── Enrichment 설명 생성 ──────────────────────────────────────

export function generateEnrichmentExplanation(
  enrichment: ScoreAdjustment,
  experimentId?: string
): EnrichmentExplanation {
  const appliedSignals: string[] = []
  const positiveFactors: string[] = []
  const negativeFactors: string[] = []

  if (enrichment.voiceBonus !== 0) {
    appliedSignals.push("보이스 유사도")
    if (enrichment.voiceBonus > 0) {
      positiveFactors.push(`보이스 스타일 유사 (+${enrichment.voiceBonus})`)
    } else {
      negativeFactors.push(`보이스 스타일 차이 (${enrichment.voiceBonus})`)
    }
  }

  if (enrichment.relationshipBonus > 0) {
    appliedSignals.push("관계 깊이")
    positiveFactors.push(`관계 깊이 보너스 (+${enrichment.relationshipBonus})`)
  }

  if (enrichment.negativePenalty > 0) {
    appliedSignals.push("네거티브 시그널")
    negativeFactors.push(`네거티브 패널티 (-${round(enrichment.negativePenalty * 100)}%)`)
  }

  if (enrichment.engagementBonus > 0) {
    appliedSignals.push("인게이지먼트")
    positiveFactors.push(`인게이지먼트 부스트 (+${enrichment.engagementBonus})`)
  }

  if (enrichment.fatigueDecay < 1.0) {
    appliedSignals.push("피로 감쇠")
    negativeFactors.push(`노출 피로 감쇠 (×${enrichment.fatigueDecay})`)
  }

  if (enrichment.rediscoveryBoost > 0) {
    appliedSignals.push("재발견")
    positiveFactors.push(`재발견 부스트 (+${enrichment.rediscoveryBoost})`)
  }

  if (enrichment.qualityWeight < 1.0) {
    appliedSignals.push("품질 가중")
    negativeFactors.push(`품질 보정 (×${enrichment.qualityWeight})`)
  }

  if (enrichment.consumptionBonus > 0) {
    appliedSignals.push("소비 패턴")
    positiveFactors.push(`소비 패턴 일치 (+${enrichment.consumptionBonus})`)
  }

  if (enrichment.topologyModifier !== 0) {
    appliedSignals.push("소셜 토폴로지")
    if (enrichment.topologyModifier > 0) {
      positiveFactors.push(`허브 노드 부스트 (+${enrichment.topologyModifier})`)
    } else {
      negativeFactors.push(`고립/주변부 패널티 (${enrichment.topologyModifier})`)
    }
  }

  if (enrichment.emotionalModifier > 0) {
    appliedSignals.push("감정 보정")
    positiveFactors.push(`감정 기반 매칭 (+${enrichment.emotionalModifier})`)
  }

  if (enrichment.coldStartFactor < 1.0) {
    appliedSignals.push("콜드스타트")
    negativeFactors.push(`콜드스타트 보정 (×${enrichment.coldStartFactor})`)
  }

  return {
    appliedSignals,
    positiveFactors,
    negativeFactors,
    experimentId,
  }
}

// ── 유틸 ─────────────────────────────────────────────────────

function getTraitLabel(dimension: SocialDimension, level: TraitLevel["level"]): string {
  const label = DIM_LABELS[dimension]
  switch (level) {
    case "very_high":
      return label.veryHigh
    case "high":
      return label.high
    case "low":
      return label.low
    case "very_low":
      return label.veryLow
    default:
      return "보통"
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
