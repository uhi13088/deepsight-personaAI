/**
 * 일관성 자동 검증
 *
 * 생성된 페르소나의 각 속성 간 일관성을 자동으로 검증합니다.
 * 70점 이상이면 통과, 미만이면 재생성 또는 자동 수정합니다.
 */

import type { Vector6D } from "./vector-diversity"
import type { CharacterAttributes } from "./character-generator"
import type { ActivityTraits } from "./activity-inference"
import type { ContentSettings, RelationshipSettings } from "./content-settings-inference"

export interface ConsistencyValidationInput {
  vector6d: Vector6D
  characterAttrs: CharacterAttributes
  activityTraits: ActivityTraits
  contentSettings: ContentSettings
  relationshipSettings: RelationshipSettings
}

export interface ConsistencyIssue {
  category: "VECTOR_CHARACTER" | "CHARACTER_ACTIVITY" | "ACTIVITY_CONTENT" | "RELATIONSHIP"
  severity: "LOW" | "MEDIUM" | "HIGH" // 심각도
  description: string
  suggestion?: string
}

export interface ConsistencyResult {
  score: number // 0-100
  passed: boolean // 70점 이상이면 통과
  issues: ConsistencyIssue[]
  details: {
    vectorCharacterScore: number
    characterActivityScore: number
    activityContentScore: number
    relationshipScore: number
  }
}

const PASS_THRESHOLD = 70

/**
 * 일관성 검증 수행
 */
export function validateConsistency(input: ConsistencyValidationInput): ConsistencyResult {
  const issues: ConsistencyIssue[] = []

  // 1. 벡터 ↔ 캐릭터 속성 일관성
  const vectorCharacterScore = validateVectorCharacterConsistency(input, issues)

  // 2. 캐릭터 ↔ 활동성 일관성
  const characterActivityScore = validateCharacterActivityConsistency(input, issues)

  // 3. 활동성 ↔ 콘텐츠 설정 일관성
  const activityContentScore = validateActivityContentConsistency(input, issues)

  // 4. 관계 설정 일관성
  const relationshipScore = validateRelationshipConsistency(input, issues)

  // 가중 평균 점수 계산
  const score = Math.round(
    vectorCharacterScore * 0.35 +
      characterActivityScore * 0.25 +
      activityContentScore * 0.25 +
      relationshipScore * 0.15
  )

  return {
    score,
    passed: score >= PASS_THRESHOLD,
    issues,
    details: {
      vectorCharacterScore,
      characterActivityScore,
      activityContentScore,
      relationshipScore,
    },
  }
}

/**
 * 벡터 ↔ 캐릭터 속성 일관성 검증
 */
function validateVectorCharacterConsistency(
  input: ConsistencyValidationInput,
  issues: ConsistencyIssue[]
): number {
  const { vector6d, characterAttrs } = input
  let score = 100

  // 1. stance와 warmth 일관성 검사
  // 비판적(stance 높음)이면 warmth가 낮아야 함
  const expectedWarmthForStance = 1 - vector6d.stance
  const warmthDiff = Math.abs(characterAttrs.warmth - expectedWarmthForStance)

  if (warmthDiff > 0.5) {
    score -= 20
    issues.push({
      category: "VECTOR_CHARACTER",
      severity: "HIGH",
      description: `stance(${vector6d.stance.toFixed(2)})와 warmth(${characterAttrs.warmth.toFixed(2)})가 불일치`,
      suggestion: `warmth를 ${expectedWarmthForStance.toFixed(2)} 근처로 조정 필요`,
    })
  } else if (warmthDiff > 0.3) {
    score -= 10
    issues.push({
      category: "VECTOR_CHARACTER",
      severity: "MEDIUM",
      description: `stance와 warmth 간 약간의 불일치`,
    })
  }

  // 2. depth와 expertiseLevel 일관성
  const expertiseLevels: Record<string, number> = {
    CASUAL: 0.25,
    ENTHUSIAST: 0.45,
    EXPERT: 0.7,
    CRITIC: 0.9,
  }
  const expectedDepthForExpertise = expertiseLevels[characterAttrs.expertiseLevel] || 0.5
  const depthDiff = Math.abs(vector6d.depth - expectedDepthForExpertise)

  if (depthDiff > 0.4) {
    score -= 15
    issues.push({
      category: "VECTOR_CHARACTER",
      severity: "MEDIUM",
      description: `depth(${vector6d.depth.toFixed(2)})와 expertiseLevel(${characterAttrs.expertiseLevel})이 불일치`,
    })
  }

  // 3. lens와 speechPatterns 일관성
  // 감성적(lens 낮음)이면 감성적 말투가 있어야 함
  const emotionalPatterns = ["ㅠㅠ", "감동", "눈물", "마음", "따뜻"]
  const logicalPatterns = ["객관적", "분석", "기술적", "구조", "논리"]

  const hasEmotionalPatterns = characterAttrs.speechPatterns.some((p) =>
    emotionalPatterns.some((e) => p.includes(e))
  )
  const hasLogicalPatterns = characterAttrs.speechPatterns.some((p) =>
    logicalPatterns.some((l) => p.includes(l))
  )

  if (vector6d.lens < 0.4 && hasLogicalPatterns && !hasEmotionalPatterns) {
    score -= 10
    issues.push({
      category: "VECTOR_CHARACTER",
      severity: "LOW",
      description: `감성적 성향(lens: ${vector6d.lens.toFixed(2)})이지만 논리적 말투만 있음`,
    })
  } else if (vector6d.lens > 0.6 && hasEmotionalPatterns && !hasLogicalPatterns) {
    score -= 10
    issues.push({
      category: "VECTOR_CHARACTER",
      severity: "LOW",
      description: `논리적 성향(lens: ${vector6d.lens.toFixed(2)})이지만 감성적 말투만 있음`,
    })
  }

  // 4. taste와 favoriteGenres 일관성
  const experimentalGenres = ["독립영화", "아트하우스", "실험영화", "Indie", "Arthouse"]
  const classicGenres = ["클래식", "명작", "고전", "Classic"]

  const hasExperimentalGenres = characterAttrs.favoriteGenres.some((g) =>
    experimentalGenres.some((e) => g.includes(e))
  )
  const hasClassicGenres = characterAttrs.favoriteGenres.some((g) =>
    classicGenres.some((c) => g.includes(c))
  )

  if (vector6d.taste > 0.7 && hasClassicGenres && !hasExperimentalGenres) {
    score -= 5
    issues.push({
      category: "VECTOR_CHARACTER",
      severity: "LOW",
      description: `실험적 성향(taste: ${vector6d.taste.toFixed(2)})이지만 클래식 장르만 선호`,
    })
  }

  return Math.max(0, score)
}

/**
 * 캐릭터 ↔ 활동성 일관성 검증
 */
function validateCharacterActivityConsistency(
  input: ConsistencyValidationInput,
  issues: ConsistencyIssue[]
): number {
  const { characterAttrs, activityTraits } = input
  let score = 100

  // 1. warmth와 interactivity 일관성
  // 따뜻한 사람(warmth 높음)은 친화력(interactivity)도 높아야 함
  const interactivityDiff = Math.abs(characterAttrs.warmth - activityTraits.interactivity)

  if (interactivityDiff > 0.4) {
    score -= 15
    issues.push({
      category: "CHARACTER_ACTIVITY",
      severity: "MEDIUM",
      description: `warmth(${characterAttrs.warmth.toFixed(2)})와 interactivity(${activityTraits.interactivity.toFixed(2)})가 크게 차이남`,
    })
  }

  // 2. expertiseLevel과 initiative 일관성
  // 전문가/비평가는 주도성이 높아야 함
  const expertiseInitiativeMap: Record<string, number> = {
    CASUAL: 0.3,
    ENTHUSIAST: 0.5,
    EXPERT: 0.65,
    CRITIC: 0.8,
  }
  const expectedInitiative = expertiseInitiativeMap[characterAttrs.expertiseLevel] || 0.5
  const initiativeDiff = activityTraits.initiative - expectedInitiative

  if (initiativeDiff < -0.3) {
    score -= 10
    issues.push({
      category: "CHARACTER_ACTIVITY",
      severity: "LOW",
      description: `${characterAttrs.expertiseLevel}인데 주도성(${activityTraits.initiative.toFixed(2)})이 낮음`,
    })
  }

  // 3. background와 sociability 연관성 체크 (선택적)
  // 배경에 "커뮤니티", "모임" 등이 있으면 사교성 높아야 함
  const socialKeywords = ["커뮤니티", "모임", "동아리", "community", "group", "club"]
  const hasSocialBackground = socialKeywords.some((k) =>
    characterAttrs.background.toLowerCase().includes(k)
  )

  if (hasSocialBackground && activityTraits.sociability < 0.4) {
    score -= 10
    issues.push({
      category: "CHARACTER_ACTIVITY",
      severity: "LOW",
      description: `사회적 배경이 있지만 사교성이 낮음`,
    })
  }

  return Math.max(0, score)
}

/**
 * 활동성 ↔ 콘텐츠 설정 일관성 검증
 */
function validateActivityContentConsistency(
  input: ConsistencyValidationInput,
  issues: ConsistencyIssue[]
): number {
  const { activityTraits, contentSettings } = input
  let score = 100

  // 1. expressiveness와 contentStyle.avgPostLength 일관성
  const lengthScores: Record<string, number> = {
    SHORT: 0.25,
    MEDIUM: 0.5,
    LONG: 0.75,
    VERY_LONG: 0.95,
  }
  const expectedLength = lengthScores[contentSettings.contentStyle.avgPostLength] || 0.5
  const lengthDiff = Math.abs(activityTraits.expressiveness - expectedLength)

  if (lengthDiff > 0.35) {
    score -= 15
    issues.push({
      category: "ACTIVITY_CONTENT",
      severity: "MEDIUM",
      description: `표현력(${activityTraits.expressiveness.toFixed(2)})과 포스트 길이(${contentSettings.contentStyle.avgPostLength})가 불일치`,
    })
  }

  // 2. initiative와 interactionStyle.debateRate 일관성
  const debateDiff = Math.abs(
    activityTraits.initiative - contentSettings.interactionStyle.debateRate * 2
  )

  if (debateDiff > 0.5) {
    score -= 10
    issues.push({
      category: "ACTIVITY_CONTENT",
      severity: "LOW",
      description: `주도성과 토론 참여율 간 불일치`,
    })
  }

  // 3. sociability와 replySpeed 일관성
  const speedScores: Record<string, number> = {
    INSTANT: 0.9,
    QUICK: 0.7,
    MODERATE: 0.5,
    SLOW: 0.25,
  }
  const expectedSpeed = speedScores[contentSettings.interactionStyle.replySpeed] || 0.5
  const speedDiff = Math.abs(activityTraits.sociability - expectedSpeed)

  if (speedDiff > 0.4) {
    score -= 10
    issues.push({
      category: "ACTIVITY_CONTENT",
      severity: "LOW",
      description: `사교성(${activityTraits.sociability.toFixed(2)})과 답장 속도(${contentSettings.interactionStyle.replySpeed})가 불일치`,
    })
  }

  return Math.max(0, score)
}

/**
 * 관계 설정 일관성 검증
 */
function validateRelationshipConsistency(
  input: ConsistencyValidationInput,
  issues: ConsistencyIssue[]
): number {
  const { vector6d, characterAttrs, relationshipSettings } = input
  let score = 100

  // 1. stance와 conflictStyle 일관성
  // 비판적이면 갈등 임계값이 낮아야 함 (쉽게 갈등)
  const expectedThreshold = 1 - vector6d.stance
  const thresholdDiff = Math.abs(
    relationshipSettings.conflictStyle.triggerThreshold - expectedThreshold
  )

  if (thresholdDiff > 0.3) {
    score -= 15
    issues.push({
      category: "RELATIONSHIP",
      severity: "MEDIUM",
      description: `stance와 갈등 임계값이 불일치`,
    })
  }

  // 2. warmth와 reconciliationRate 일관성
  const reconciliationDiff = Math.abs(
    characterAttrs.warmth - relationshipSettings.conflictStyle.reconciliationRate
  )

  if (reconciliationDiff > 0.4) {
    score -= 10
    issues.push({
      category: "RELATIONSHIP",
      severity: "LOW",
      description: `warmth와 화해율이 불일치`,
    })
  }

  // 3. grudgeHolding 일관성
  // 비판적이고 차가우면 grudgeHolding이 true여야 함
  const shouldHoldGrudge = vector6d.stance > 0.7 && characterAttrs.warmth < 0.3
  if (shouldHoldGrudge !== relationshipSettings.conflictStyle.grudgeHolding) {
    score -= 5
    issues.push({
      category: "RELATIONSHIP",
      severity: "LOW",
      description: `grudgeHolding 설정이 성격과 맞지 않음`,
    })
  }

  return Math.max(0, score)
}

/**
 * 일관성 점수 향상을 위한 수정 제안
 */
export function suggestFixes(result: ConsistencyResult): {
  field: string
  currentValue: unknown
  suggestedValue: unknown
}[] {
  const fixes: { field: string; currentValue: unknown; suggestedValue: unknown }[] = []

  // 심각도 HIGH인 이슈부터 수정 제안
  const highSeverityIssues = result.issues.filter((i) => i.severity === "HIGH")

  for (const issue of highSeverityIssues) {
    if (issue.suggestion) {
      // suggestion에서 수정 제안 추출 (간단한 파싱)
      if (issue.description.includes("warmth")) {
        const match = issue.suggestion.match(/(\d+\.\d+)/)
        if (match) {
          fixes.push({
            field: "characterAttrs.warmth",
            currentValue: "current",
            suggestedValue: parseFloat(match[1]),
          })
        }
      }
    }
  }

  return fixes
}

/**
 * 자동 수정 적용
 */
export function autoFix(input: ConsistencyValidationInput): ConsistencyValidationInput {
  const result = validateConsistency(input)

  if (result.passed) {
    return input // 이미 통과면 수정 불필요
  }

  // 깊은 복사
  const fixed = JSON.parse(JSON.stringify(input)) as ConsistencyValidationInput

  // warmth 자동 수정
  if (result.details.vectorCharacterScore < 80) {
    const expectedWarmth = 1 - input.vector6d.stance
    fixed.characterAttrs.warmth =
      Math.round((expectedWarmth * 0.7 + input.characterAttrs.warmth * 0.3) * 100) / 100
  }

  // interactivity 자동 수정
  if (result.details.characterActivityScore < 80) {
    fixed.activityTraits.interactivity =
      Math.round(
        (fixed.characterAttrs.warmth * 0.6 + fixed.activityTraits.interactivity * 0.4) * 100
      ) / 100
  }

  return fixed
}
