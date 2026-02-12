// ═══════════════════════════════════════════════════════════════
// 활동성/콘텐츠 설정 추론
// T52-AC5: 벡터→활동 패턴 매핑
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export type PostFrequency = "RARE" | "OCCASIONAL" | "MODERATE" | "ACTIVE" | "HYPERACTIVE"

export interface ActivitySettings {
  postFrequency: PostFrequency
  postsPerWeek: number
  activeHours: [number, number] // [시작시, 종료시]
  peakHours: [number, number]
  timezone: string
}

export interface ContentSettings {
  preferredPostTypes: string[]
  contentStyle: ContentStyle
  reviewStyle: ReviewStyle
  interactionStyle: InteractionStyle
}

export interface ContentStyle {
  depth: "shallow" | "moderate" | "deep"
  tone: "casual" | "balanced" | "formal"
  lengthPreference: "short" | "medium" | "long"
}

export interface ReviewStyle {
  approach: "intuitive" | "analytical" | "mixed"
  criticality: "lenient" | "balanced" | "strict"
  focusAreas: string[]
}

export interface InteractionStyle {
  responsiveness: "passive" | "moderate" | "active"
  debateWillingness: "avoidant" | "selective" | "eager"
  toneInComments: "supportive" | "neutral" | "challenging"
}

// ── 활동 설정 추론 ────────────────────────────────────────────

export function inferActivitySettings(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): ActivitySettings {
  const postFrequency = inferPostFrequency(l1, l2)
  const postsPerWeek = inferPostsPerWeek(postFrequency)
  const activeHours = inferActiveHours(l1, l2)
  const peakHours = inferPeakHours(l1, l3)

  return {
    postFrequency,
    postsPerWeek,
    activeHours,
    peakHours,
    timezone: "Asia/Seoul",
  }
}

// ── 콘텐츠 설정 추론 ─────────────────────────────────────────

export function inferContentSettings(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): ContentSettings {
  return {
    preferredPostTypes: inferPreferredPostTypes(l1),
    contentStyle: inferContentStyle(l1, l2),
    reviewStyle: inferReviewStyle(l1, l2, l3),
    interactionStyle: inferInteractionStyle(l1, l2, l3),
  }
}

// ── 포스팅 빈도 추론 ─────────────────────────────────────────

function inferPostFrequency(l1: SocialPersonaVector, l2: CoreTemperamentVector): PostFrequency {
  // sociability + extraversion 기반
  const socialScore = l1.sociability * 0.6 + l2.extraversion * 0.4

  if (socialScore >= 0.8) return "HYPERACTIVE"
  if (socialScore >= 0.6) return "ACTIVE"
  if (socialScore >= 0.4) return "MODERATE"
  if (socialScore >= 0.2) return "OCCASIONAL"
  return "RARE"
}

function inferPostsPerWeek(frequency: PostFrequency): number {
  const map: Record<PostFrequency, number> = {
    RARE: 1,
    OCCASIONAL: 3,
    MODERATE: 5,
    ACTIVE: 8,
    HYPERACTIVE: 14,
  }
  return map[frequency]
}

// ── 활동 시간 추론 ────────────────────────────────────────────

function inferActiveHours(l1: SocialPersonaVector, l2: CoreTemperamentVector): [number, number] {
  // purpose + conscientiousness 기반
  const structuredScore = l1.purpose * 0.5 + l2.conscientiousness * 0.5

  if (structuredScore > 0.6) {
    // 아침형 — 의미추구 + 체계적
    return [8, 22]
  }
  // 저녁형 — 오락적 + 즉흥적
  return [12, 2]
}

// ── 피크 시간 추론 ────────────────────────────────────────────

function inferPeakHours(l1: SocialPersonaVector, l3: NarrativeDriveVector): [number, number] {
  // volatility + depth 기반
  if (l3.volatility > 0.6) {
    // 변동적 → 늦은 밤 활동적
    return [22, 2]
  }
  if (l1.depth > 0.6) {
    // 심층적 → 새벽 집중
    return [21, 1]
  }
  // 기본값
  return [19, 23]
}

// ── 선호 포스트 타입 추론 ─────────────────────────────────────

function inferPreferredPostTypes(l1: SocialPersonaVector): string[] {
  const types: string[] = []

  if (l1.depth > 0.6) types.push("deep-review")
  if (l1.depth < 0.4) types.push("quick-reaction")
  if (l1.lens > 0.6) types.push("analysis")
  if (l1.lens < 0.4) types.push("emotional-review")
  if (l1.stance > 0.6) types.push("critique")
  if (l1.stance < 0.4) types.push("recommendation")
  if (l1.taste > 0.6) types.push("discovery")
  if (l1.purpose > 0.6) types.push("thought-piece")
  if (l1.sociability > 0.6) types.push("discussion")

  // 최소 2개
  if (types.length < 2) {
    types.push("review", "thought")
  }

  return [...new Set(types)].slice(0, 5)
}

// ── 콘텐츠 스타일 추론 ───────────────────────────────────────

function inferContentStyle(l1: SocialPersonaVector, l2: CoreTemperamentVector): ContentStyle {
  return {
    depth: l1.depth > 0.6 ? "deep" : l1.depth < 0.4 ? "shallow" : "moderate",
    tone:
      l2.conscientiousness > 0.6 ? "formal" : l2.conscientiousness < 0.4 ? "casual" : "balanced",
    lengthPreference: l1.scope > 0.6 ? "long" : l1.scope < 0.4 ? "short" : "medium",
  }
}

// ── 리뷰 스타일 추론 ─────────────────────────────────────────

function inferReviewStyle(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): ReviewStyle {
  const approach: ReviewStyle["approach"] =
    l1.lens > 0.6 ? "analytical" : l1.lens < 0.4 ? "intuitive" : "mixed"

  const criticality: ReviewStyle["criticality"] =
    l1.stance > 0.6 ? "strict" : l1.stance < 0.4 ? "lenient" : "balanced"

  const focusAreas: string[] = []
  if (l1.depth > 0.5) focusAreas.push("구조/서사")
  if (l1.lens > 0.5) focusAreas.push("논리/논증")
  if (l1.lens < 0.5) focusAreas.push("감성/분위기")
  if (l1.taste > 0.5) focusAreas.push("독창성/실험성")
  if (l3.moralCompass > 0.5) focusAreas.push("윤리/메시지")

  return { approach, criticality, focusAreas: focusAreas.slice(0, 3) }
}

// ── 인터랙션 스타일 추론 ─────────────────────────────────────

function inferInteractionStyle(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): InteractionStyle {
  const responsiveness: InteractionStyle["responsiveness"] =
    l1.sociability > 0.6 ? "active" : l1.sociability < 0.4 ? "passive" : "moderate"

  const debateWillingness: InteractionStyle["debateWillingness"] =
    l1.stance > 0.6 && l2.agreeableness < 0.5
      ? "eager"
      : l2.agreeableness > 0.6
        ? "avoidant"
        : "selective"

  const toneInComments: InteractionStyle["toneInComments"] =
    l2.agreeableness > 0.6 ? "supportive" : l1.stance > 0.6 ? "challenging" : "neutral"

  return { responsiveness, debateWillingness, toneInComments }
}
