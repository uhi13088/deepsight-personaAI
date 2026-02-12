// ═══════════════════════════════════════════════════════════════
// Quality Score 계산
// T54-AC3: vectorBalance(30%) + promptCompleteness(30%)
//          + interviewResult(30%) + coherence(10%)
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface QualityScoreResult {
  overallScore: number // 0~100
  verdict: "pass" | "warning" | "fail"
  components: QualityComponents
  recommendations: string[]
}

export interface QualityComponents {
  vectorBalance: ComponentScore
  promptCompleteness: ComponentScore
  interviewResult: ComponentScore
  coherence: ComponentScore
}

export interface ComponentScore {
  score: number // 0~100
  weight: number
  details: string[]
}

// ── 벡터 균형 점수 ──────────────────────────────────────────────

export function calculateVectorBalance(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): ComponentScore {
  const details: string[] = []

  // L1: 7D 분산 체크 — 너무 균일(모두 0.5)하거나 너무 극단적이면 감점
  const l1Values = [l1.depth, l1.lens, l1.stance, l1.scope, l1.taste, l1.purpose, l1.sociability]
  const l1Score = calculateDistributionScore(l1Values, "L1")
  details.push(...l1Score.details)

  // L2: 5D 분산 체크
  const l2Values = [
    l2.openness,
    l2.conscientiousness,
    l2.extraversion,
    l2.agreeableness,
    l2.neuroticism,
  ]
  const l2Score = calculateDistributionScore(l2Values, "L2")
  details.push(...l2Score.details)

  // L3: 4D 분산 체크
  const l3Values = [l3.lack, l3.moralCompass, l3.volatility, l3.growthArc]
  const l3Score = calculateDistributionScore(l3Values, "L3")
  details.push(...l3Score.details)

  // 가중 평균: L1(0.45) + L2(0.30) + L3(0.25)
  const score = round(l1Score.score * 0.45 + l2Score.score * 0.3 + l3Score.score * 0.25)

  return { score, weight: 0.3, details }
}

function calculateDistributionScore(
  values: number[],
  label: string
): { score: number; details: string[] } {
  const details: string[] = []

  // 평균
  const mean = values.reduce((a, b) => a + b, 0) / values.length

  // 분산
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length

  // 극단값 비율 (0.1 미만 또는 0.9 초과)
  const extremeCount = values.filter((v) => v < 0.1 || v > 0.9).length
  const extremeRatio = extremeCount / values.length

  // 완전 균일 체크 (모두 같은 값)
  const allSame = values.every((v) => Math.abs(v - values[0]) < 0.01)

  let score = 100

  // 분산이 너무 낮으면 감점 (너무 균일 = 개성 없음)
  if (allSame) {
    score -= 40
    details.push(`${label}: 모든 차원이 동일한 값 (개성 부족)`)
  } else if (variance < 0.01) {
    score -= 20
    details.push(`${label}: 차원 간 분산이 매우 낮음`)
  }

  // 극단값이 너무 많으면 감점
  if (extremeRatio > 0.5) {
    score -= 20
    details.push(`${label}: 극단값 비율이 높음 (${extremeCount}/${values.length})`)
  }

  // 적정 분산 (0.02~0.08) → 보너스
  if (variance >= 0.02 && variance <= 0.08 && extremeRatio <= 0.3) {
    score = Math.min(100, score + 10)
  }

  return { score: Math.max(0, score), details }
}

// ── 프롬프트 완성도 ─────────────────────────────────────────────

export interface PromptData {
  basePrompt: string
  reviewPrompt: string
  postPrompt: string
  commentPrompt: string
  interactionPrompt: string
}

export function calculatePromptCompleteness(prompts: PromptData): ComponentScore {
  const details: string[] = []
  let score = 0

  // 기본 프롬프트 (필수, 40점)
  if (prompts.basePrompt.trim().length >= 50) {
    score += 40
  } else if (prompts.basePrompt.trim().length > 0) {
    score += 20
    details.push("기본 프롬프트가 50자 미만")
  } else {
    details.push("기본 프롬프트 누락")
  }

  // 부가 프롬프트 (각 15점 = 60점)
  const optionalPrompts: [string, string][] = [
    [prompts.reviewPrompt, "리뷰 프롬프트"],
    [prompts.postPrompt, "포스트 프롬프트"],
    [prompts.commentPrompt, "댓글 프롬프트"],
    [prompts.interactionPrompt, "상호작용 프롬프트"],
  ]

  for (const [prompt, name] of optionalPrompts) {
    if (prompt.trim().length >= 30) {
      score += 15
    } else if (prompt.trim().length > 0) {
      score += 8
      details.push(`${name}이 30자 미만`)
    } else {
      details.push(`${name} 미작성`)
    }
  }

  return { score: Math.min(100, score), weight: 0.3, details }
}

// ── 인터뷰 결과 반영 ────────────────────────────────────────────

export function calculateInterviewScore(
  interviewSimilarity: number | null,
  interviewVerdict: "pass" | "warning" | "fail" | null
): ComponentScore {
  const details: string[] = []

  if (interviewSimilarity === null || interviewVerdict === null) {
    details.push("Auto-Interview 미실시")
    return { score: 0, weight: 0.3, details }
  }

  const score = round(interviewSimilarity * 100)

  if (interviewVerdict === "pass") {
    details.push(`Auto-Interview PASS (유사도: ${score}%)`)
  } else if (interviewVerdict === "warning") {
    details.push(`Auto-Interview WARNING (유사도: ${score}%)`)
  } else {
    details.push(`Auto-Interview FAIL (유사도: ${score}%)`)
  }

  return { score, weight: 0.3, details }
}

// ── 내적 일관성 ─────────────────────────────────────────────────

export function calculateCoherenceComponent(coherenceScore: number | null): ComponentScore {
  const details: string[] = []

  if (coherenceScore === null) {
    details.push("Integrity Score 미계산")
    return { score: 0, weight: 0.1, details }
  }

  const score = round(coherenceScore * 100)

  if (score >= 80) {
    details.push("벡터 간 내적 일관성 양호")
  } else if (score >= 60) {
    details.push("벡터 간 일부 불일치 존재")
  } else {
    details.push("벡터 간 내적 일관성 낮음 — 설계 점검 필요")
  }

  return { score, weight: 0.1, details }
}

// ── 종합 점수 계산 ──────────────────────────────────────────────

export function calculateQualityScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  prompts: PromptData,
  interviewSimilarity: number | null = null,
  interviewVerdict: "pass" | "warning" | "fail" | null = null,
  coherenceScore: number | null = null
): QualityScoreResult {
  const vectorBalance = calculateVectorBalance(l1, l2, l3)
  const promptCompleteness = calculatePromptCompleteness(prompts)
  const interviewResult = calculateInterviewScore(interviewSimilarity, interviewVerdict)
  const coherence = calculateCoherenceComponent(coherenceScore)

  const components: QualityComponents = {
    vectorBalance,
    promptCompleteness,
    interviewResult,
    coherence,
  }

  // 가중 합산
  const overallScore = round(
    vectorBalance.score * vectorBalance.weight +
      promptCompleteness.score * promptCompleteness.weight +
      interviewResult.score * interviewResult.weight +
      coherence.score * coherence.weight
  )

  // 판정
  let verdict: QualityScoreResult["verdict"]
  if (overallScore >= 70) verdict = "pass"
  else if (overallScore >= 50) verdict = "warning"
  else verdict = "fail"

  // 추천 사항
  const recommendations: string[] = []
  if (vectorBalance.score < 60) {
    recommendations.push("벡터 분포를 다양하게 조정하세요")
  }
  if (promptCompleteness.score < 60) {
    recommendations.push("프롬프트를 더 상세하게 작성하세요")
  }
  if (interviewResult.score === 0 && interviewSimilarity === null) {
    recommendations.push("Auto-Interview를 실시하세요")
  } else if (interviewResult.score < 70) {
    recommendations.push("벡터와 응답 간 일관성을 개선하세요")
  }
  if (coherence.score < 60 && coherenceScore !== null) {
    recommendations.push("레이어 간 내적 일관성을 점검하세요")
  }

  return { overallScore, verdict, components, recommendations }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
