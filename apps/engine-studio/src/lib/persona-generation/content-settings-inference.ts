/**
 * 콘텐츠/관계 설정 자동 추론
 *
 * 6D 벡터와 활동성 특성에서 콘텐츠 생성 설정과 관계 설정을 자동으로 추론합니다.
 */

import type { Vector6D } from "./vector-diversity"
import type { ActivityTraits } from "./activity-inference"
import type { CharacterAttributes } from "./character-generator"

// ============================================
// Content Settings Types
// ============================================

export interface PreferredPostType {
  type: string
  weight: number // 0.0 ~ 1.0
}

export interface ContentStyle {
  useHashtags: boolean
  hashtagCount: number // 1-5
  useEmojis: boolean
  emojiFrequency: "NONE" | "LOW" | "MEDIUM" | "HIGH"
  preferThread: boolean
  avgPostLength: "SHORT" | "MEDIUM" | "LONG" | "VERY_LONG"
  formality: "CASUAL" | "BALANCED" | "FORMAL" | "PROFESSIONAL"
}

export interface ReviewStyle {
  ratingBias: number // -0.5 ~ 0.5 (부정/긍정 편향)
  spoilerPolicy: "NEVER" | "WARNED" | "SOMETIMES"
  detailLevel: "BRIEF" | "MODERATE" | "DETAILED" | "EXHAUSTIVE"
  aspectFocus: string[] // 집중 분석 영역
  comparisonStyle: boolean // 다른 작품과 비교하는지
}

export interface InteractionStyle {
  commentTone: "SUPPORTIVE" | "NEUTRAL" | "CHALLENGING" | "MIXED"
  agreeRate: number // 0.0 ~ 1.0 (동의 빈도)
  debateRate: number // 0.0 ~ 1.0 (토론 참여 빈도)
  praiseRate: number // 0.0 ~ 1.0 (칭찬 빈도)
  questionRate: number // 0.0 ~ 1.0 (질문 빈도)
  replySpeed: "INSTANT" | "QUICK" | "MODERATE" | "SLOW"
}

export interface ContentSettings {
  preferredPostTypes: PreferredPostType[]
  contentStyle: ContentStyle
  reviewStyle: ReviewStyle
  interactionStyle: InteractionStyle
}

// ============================================
// Relationship Settings Types
// ============================================

export interface RelationshipStyle {
  followStrategy: "SELECTIVE" | "BALANCED" | "OPEN" | "VERY_OPEN"
  intimacyBuildSpeed: "SLOW" | "MODERATE" | "FAST"
  loyaltyLevel: number // 0.0 ~ 1.0
}

export interface ConflictStyle {
  triggerThreshold: number // 0.0 ~ 1.0 (낮을수록 쉽게 갈등)
  responseType: "AVOID" | "DISCUSS" | "CHALLENGE" | "ESCALATE"
  escalationRate: number // 0.0 ~ 1.0
  reconciliationRate: number // 0.0 ~ 1.0
  grudgeHolding: boolean
}

export interface CollaborationStyle {
  openness: number // 0.0 ~ 1.0
  rolePreference: "LEADER" | "EQUAL" | "SUPPORTER"
  preferredPartners: string[] // 선호하는 파트너 유형
}

export interface RelationshipSettings {
  relationshipStyle: RelationshipStyle
  conflictStyle: ConflictStyle
  collaborationStyle: CollaborationStyle
}

// ============================================
// Content Settings Inference
// ============================================

/**
 * 콘텐츠 생성 설정 추론
 */
export function deriveContentSettings(vector: Vector6D, traits: ActivityTraits): ContentSettings {
  return {
    preferredPostTypes: derivePreferredPostTypes(vector, traits),
    contentStyle: deriveContentStyle(vector, traits),
    reviewStyle: deriveReviewStyle(vector),
    interactionStyle: deriveInteractionStyle(vector, traits),
  }
}

/**
 * 선호 포스트 타입 추론
 */
function derivePreferredPostTypes(vector: Vector6D, traits: ActivityTraits): PreferredPostType[] {
  const types: PreferredPostType[] = []

  // REVIEW: 모든 페르소나의 기본 콘텐츠
  types.push({
    type: "REVIEW",
    weight: 0.3 + vector.depth * 0.2 + vector.purpose * 0.1,
  })

  // DAILY: 감성적이고 사교적일수록
  types.push({
    type: "DAILY",
    weight: 0.1 + (1 - vector.lens) * 0.15 + traits.sociability * 0.1,
  })

  // DEBATE: 비판적이고 주도적일수록
  types.push({
    type: "DEBATE",
    weight: vector.stance * 0.25 + traits.initiative * 0.15,
  })

  // VS_BATTLE: 실험적이고 비판적일수록
  types.push({
    type: "VS_BATTLE",
    weight: vector.taste * 0.15 + vector.stance * 0.1,
  })

  // QNA: 수용적이고 친화적일수록
  types.push({
    type: "QNA",
    weight: (1 - vector.stance) * 0.15 + traits.interactivity * 0.1,
  })

  // LIST: 디테일하고 분석적일수록
  types.push({
    type: "LIST",
    weight: vector.scope * 0.15 + vector.depth * 0.1,
  })

  // RECOMMENDATION: 수용적이고 따뜻할수록
  types.push({
    type: "RECOMMENDATION",
    weight: (1 - vector.stance) * 0.2 + (1 - vector.lens) * 0.1,
  })

  // 정규화 (합이 1이 되도록)
  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0)
  return types.map((t) => ({
    ...t,
    weight: Math.round((t.weight / totalWeight) * 100) / 100,
  }))
}

/**
 * 콘텐츠 스타일 추론
 */
function deriveContentStyle(vector: Vector6D, traits: ActivityTraits): ContentStyle {
  return {
    useHashtags: true,
    hashtagCount: Math.round(2 + traits.expressiveness * 3),
    useEmojis: vector.lens < 0.5, // 감성적일수록 이모지 사용
    emojiFrequency: deriveEmojiFrequency(vector.lens),
    preferThread: traits.expressiveness > 0.7,
    avgPostLength: derivePostLength(traits.expressiveness),
    formality: deriveFormalityLevel(vector),
  }
}

/**
 * 이모지 빈도 추론
 */
function deriveEmojiFrequency(lens: number): "NONE" | "LOW" | "MEDIUM" | "HIGH" {
  if (lens > 0.8) return "NONE"
  if (lens > 0.6) return "LOW"
  if (lens > 0.3) return "MEDIUM"
  return "HIGH"
}

/**
 * 포스트 길이 추론
 */
function derivePostLength(expressiveness: number): "SHORT" | "MEDIUM" | "LONG" | "VERY_LONG" {
  if (expressiveness > 0.8) return "VERY_LONG"
  if (expressiveness > 0.6) return "LONG"
  if (expressiveness > 0.35) return "MEDIUM"
  return "SHORT"
}

/**
 * 형식성 수준 추론
 */
function deriveFormalityLevel(vector: Vector6D): "CASUAL" | "BALANCED" | "FORMAL" | "PROFESSIONAL" {
  const formalityScore = vector.lens * 0.4 + vector.depth * 0.3 + vector.purpose * 0.3

  if (formalityScore > 0.75) return "PROFESSIONAL"
  if (formalityScore > 0.55) return "FORMAL"
  if (formalityScore > 0.35) return "BALANCED"
  return "CASUAL"
}

/**
 * 리뷰 스타일 추론
 */
function deriveReviewStyle(vector: Vector6D): ReviewStyle {
  return {
    ratingBias: deriveRatingBias(vector.stance),
    spoilerPolicy: "NEVER",
    detailLevel: deriveDetailLevel(vector.scope),
    aspectFocus: deriveAspectFocus(vector),
    comparisonStyle: vector.depth > 0.6,
  }
}

/**
 * 평점 편향 추론
 */
function deriveRatingBias(stance: number): number {
  // 비판적일수록 낮은 평점 경향 (-0.5 ~ 0.5)
  return Math.round((0.5 - stance) * 100) / 100
}

/**
 * 디테일 수준 추론
 */
function deriveDetailLevel(scope: number): "BRIEF" | "MODERATE" | "DETAILED" | "EXHAUSTIVE" {
  if (scope > 0.8) return "EXHAUSTIVE"
  if (scope > 0.55) return "DETAILED"
  if (scope > 0.3) return "MODERATE"
  return "BRIEF"
}

/**
 * 분석 초점 영역 추론
 */
function deriveAspectFocus(vector: Vector6D): string[] {
  const aspects: string[] = []

  if (vector.lens > 0.6) {
    aspects.push("시네마토그래피", "연출")
  } else {
    aspects.push("감정선", "캐릭터")
  }

  if (vector.depth > 0.6) {
    aspects.push("서사 구조", "주제 의식")
  }

  if (vector.scope > 0.6) {
    aspects.push("디테일", "프로덕션")
  }

  if (vector.purpose > 0.6) {
    aspects.push("메시지", "사회적 의미")
  }

  return aspects.slice(0, 4)
}

/**
 * 인터랙션 스타일 추론
 */
function deriveInteractionStyle(vector: Vector6D, traits: ActivityTraits): InteractionStyle {
  return {
    commentTone: deriveCommentTone(vector),
    agreeRate: Math.round((1 - vector.stance * 0.7) * 100) / 100,
    debateRate: Math.round(vector.stance * 0.5 * 100) / 100,
    praiseRate: Math.round((1 - vector.stance) * 0.6 * 100) / 100,
    questionRate: Math.round(vector.depth * 0.3 * 100) / 100,
    replySpeed: deriveReplySpeed(traits.sociability),
  }
}

/**
 * 댓글 톤 추론
 */
function deriveCommentTone(vector: Vector6D): "SUPPORTIVE" | "NEUTRAL" | "CHALLENGING" | "MIXED" {
  if (vector.stance > 0.7 && vector.lens > 0.6) return "CHALLENGING"
  if (vector.stance < 0.3 && vector.lens < 0.4) return "SUPPORTIVE"
  if (vector.stance > 0.5) return "MIXED"
  return "NEUTRAL"
}

/**
 * 답장 속도 추론
 */
function deriveReplySpeed(sociability: number): "INSTANT" | "QUICK" | "MODERATE" | "SLOW" {
  if (sociability > 0.8) return "INSTANT"
  if (sociability > 0.6) return "QUICK"
  if (sociability > 0.35) return "MODERATE"
  return "SLOW"
}

// ============================================
// Relationship Settings Inference
// ============================================

/**
 * 관계 설정 추론
 */
export function deriveRelationshipSettings(
  vector: Vector6D,
  characterAttrs: CharacterAttributes
): RelationshipSettings {
  return {
    relationshipStyle: deriveRelationshipStyle(vector, characterAttrs.warmth),
    conflictStyle: deriveConflictStyle(vector, characterAttrs.warmth),
    collaborationStyle: deriveCollaborationStyle(vector, characterAttrs.warmth),
  }
}

/**
 * 관계 스타일 추론
 */
function deriveRelationshipStyle(vector: Vector6D, warmth: number): RelationshipStyle {
  return {
    followStrategy: deriveFollowStrategy(vector.stance, warmth),
    intimacyBuildSpeed: deriveIntimacySpeed(warmth),
    loyaltyLevel: Math.round((1 - vector.taste * 0.5) * 100) / 100, // 실험적일수록 충성도 낮음
  }
}

/**
 * 팔로우 전략 추론
 */
function deriveFollowStrategy(
  stance: number,
  warmth: number
): "SELECTIVE" | "BALANCED" | "OPEN" | "VERY_OPEN" {
  const openness = (1 - stance) * 0.6 + warmth * 0.4

  if (openness > 0.75) return "VERY_OPEN"
  if (openness > 0.55) return "OPEN"
  if (openness > 0.35) return "BALANCED"
  return "SELECTIVE"
}

/**
 * 친밀도 형성 속도 추론
 */
function deriveIntimacySpeed(warmth: number): "SLOW" | "MODERATE" | "FAST" {
  if (warmth > 0.7) return "FAST"
  if (warmth > 0.4) return "MODERATE"
  return "SLOW"
}

/**
 * 갈등 스타일 추론
 */
function deriveConflictStyle(vector: Vector6D, warmth: number): ConflictStyle {
  return {
    triggerThreshold: Math.round((1 - vector.stance) * 100) / 100, // 비판적일수록 쉽게 갈등
    responseType: deriveConflictResponse(vector),
    escalationRate: Math.round(vector.stance * 0.5 * 100) / 100,
    reconciliationRate: Math.round(warmth * 0.7 * 100) / 100,
    grudgeHolding: vector.stance > 0.7 && warmth < 0.3,
  }
}

/**
 * 갈등 대응 방식 추론
 */
function deriveConflictResponse(vector: Vector6D): "AVOID" | "DISCUSS" | "CHALLENGE" | "ESCALATE" {
  if (vector.stance < 0.3) return "AVOID"
  if (vector.stance < 0.5) return "DISCUSS"
  if (vector.stance < 0.75) return "CHALLENGE"
  return "ESCALATE"
}

/**
 * 협업 스타일 추론
 */
function deriveCollaborationStyle(vector: Vector6D, warmth: number): CollaborationStyle {
  return {
    openness: Math.round((warmth * 0.8 + 0.2) * 100) / 100,
    rolePreference: deriveCollabRole(vector.stance, vector.lens),
    preferredPartners: derivePreferredPartners(vector),
  }
}

/**
 * 협업 역할 선호 추론
 */
function deriveCollabRole(stance: number, lens: number): "LEADER" | "EQUAL" | "SUPPORTER" {
  const leadershipScore = stance * 0.6 + lens * 0.4

  if (leadershipScore > 0.65) return "LEADER"
  if (leadershipScore > 0.35) return "EQUAL"
  return "SUPPORTER"
}

/**
 * 선호 파트너 유형 추론
 */
function derivePreferredPartners(vector: Vector6D): string[] {
  const partners: string[] = []

  if (vector.stance > 0.6) {
    // 비판적인 사람은 비슷하거나 반대 성향
    partners.push("논쟁 파트너", "동지")
  } else {
    // 수용적인 사람은 다양한 파트너
    partners.push("영화 친구", "추천 교환")
  }

  if (vector.depth > 0.6) {
    partners.push("분석 파트너")
  }

  if (vector.taste > 0.6) {
    partners.push("새로운 시각")
  }

  return partners.slice(0, 3)
}
