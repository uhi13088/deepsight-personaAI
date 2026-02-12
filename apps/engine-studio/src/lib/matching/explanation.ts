// ═══════════════════════════════════════════════════════════════
// 매칭 설명 시스템 (XAI)
// T58-AC2: 운영자용 분석 + 사용자용 자연어 설명
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface TraitLevel {
  dimension: SocialDimension
  level: "high" | "low" | "neutral"
  value: number
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
}

export interface UserExplanation {
  headline: string // 1문장 요약
  body: string // 2-3문장 자연어 설명
  traits: string[] // 매칭 특성 태그
}

// ── 차원별 레이블 ────────────────────────────────────────────

const DIM_LABELS: Record<SocialDimension, { name: string; high: string; low: string }> = {
  depth: { name: "분석 깊이", high: "심층적", low: "직관적" },
  lens: { name: "판단 렌즈", high: "논리적", low: "감성적" },
  stance: { name: "비평 태도", high: "비판적", low: "수용적" },
  scope: { name: "디테일 수준", high: "디테일", low: "핵심만" },
  taste: { name: "취향 성향", high: "실험적", low: "클래식" },
  purpose: { name: "목적 지향", high: "의미추구", low: "오락" },
  sociability: { name: "소통 성향", high: "사교적", low: "독립적" },
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
    return {
      dimension: dim,
      level: value >= 0.6 ? "high" : value <= 0.4 ? "low" : "neutral",
      value,
    }
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
  depth_high: "작품을 깊이 파고드는 걸 좋아하시는군요",
  depth_low: "직관적으로 느끼시는 분이네요",
  lens_high: "분석적인 관점으로 보시네요",
  lens_low: "감성으로 먼저 반응하시는 분이에요",
  stance_high: "좋은 점만 말하는 건 싫으시죠",
  stance_low: "작품의 좋은 면을 먼저 보시는 분이네요",
  scope_high: "디테일을 꼼꼼히 살피시네요",
  scope_low: "핵심만 간결하게 보시는 스타일이에요",
  taste_high: "새로운 시도를 좋아하시는군요",
  taste_low: "검증된 작품을 선호하시네요",
  purpose_high: "작품에서 의미를 찾으시는 분이에요",
  purpose_low: "가볍게 즐기시는 스타일이에요",
  sociability_high: "다른 사람과 나누는 걸 좋아하시네요",
  sociability_low: "혼자만의 감상을 즐기시는 분이에요",
}

// 페르소나 매칭 표현
const PERSONA_MATCH_EXPRESSIONS: Record<string, string> = {
  depth_high: "이 추천자도 작품의 숨겨진 의미와 연출 의도를 꼼꼼히 분석하는 스타일이에요",
  depth_low: "이 추천자도 머리보다 마음으로 먼저 느끼는 타입이라 잘 통할 거예요",
  lens_high: "이 추천자도 논리적으로 작품을 해석하는 걸 좋아해요",
  lens_low: "이 추천자도 감성적인 공감을 중시하는 스타일이에요",
  stance_high: "이 추천자는 아쉬운 점도 솔직하게 말해주는 스타일이에요",
  stance_low: "이 추천자도 긍정적인 시선으로 작품을 바라봐요",
  scope_high: "이 추천자도 하나하나 꼼꼼하게 짚어주는 타입이에요",
  scope_low: "이 추천자도 핵심만 깔끔하게 정리해주는 스타일이에요",
  taste_high: "이 추천자도 실험적인 작품을 발굴하는 걸 좋아해요",
  taste_low: "이 추천자도 명작의 가치를 알아보는 안목이 있어요",
  purpose_high: "이 추천자도 작품 속 깊은 의미를 파고드는 타입이에요",
  purpose_low: "이 추천자도 편하게 즐길 수 있는 작품을 잘 골라요",
  sociability_high: "함께 이야기 나눌 수 있는 추천자예요",
  sociability_low: "조용히 깊은 감상을 나눠줄 추천자예요",
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

  const traits = nonNeutralTraits.map((t) => {
    const label = DIM_LABELS[t.dimension]
    return t.level === "high" ? label.high : label.low
  })

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

  const traitDescriptions = traits.map((t) => {
    const label = DIM_LABELS[t.dimension]
    return t.level === "high" ? label.high : label.low
  })

  const traitStr = traitDescriptions.join(" + ")
  const headlineKey = `${traits[0].dimension}_${traits[0].level}`
  const userDescription = TRAIT_EXPRESSIONS[headlineKey] ?? ""
  const matchKey = `${traits[0].dimension}_${traits[0].level}`
  const matchDescription = PERSONA_MATCH_EXPRESSIONS[matchKey] ?? ""

  return `[${traitStr} 유저]\n${userDescription}!\n${matchDescription}.`
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
