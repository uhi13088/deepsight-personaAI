// ═══════════════════════════════════════════════════════════════
// TrustScore — 신뢰 기반 매칭 가중치
// T181: 데이터 축적 → 자동 활성화 구조
//
// 공식: TrustScore = λ × (w1×conflictResRate + w2×engagementSlope + w3×sessionNorm)
// λ = sigmoid(totalSessions/30 - 1): 30세션 미만이면 λ→0, 이상이면 λ→1
//
// 활성화 조건: totalSessions >= 30 (자동, λ가 0.5 이상)
// LLM 비용 0, 순수 통계 기반.
// ═══════════════════════════════════════════════════════════════

// ── 타입 ─────────────────────────────────────────────────────

export interface TrustInput {
  /** 총 세션 수 (인터랙션 횟수) */
  totalSessions: number
  /** 갈등 해결 횟수 */
  conflictResolutions: number
  /** 총 갈등 횟수 */
  totalConflicts: number
  /** 참여 깊이 이력 (시간순 depth 값 배열) */
  engagementDepths: number[]
}

export interface TrustResult {
  /** 신뢰 점수 (0.0~1.0) */
  score: number
  /** 활성화 가중치 λ (0.0~1.0, 30세션 이하에서는 ~0) */
  lambda: number
  /** 갈등 해결률 (0.0~1.0) */
  conflictResolutionRate: number
  /** 참여 깊이 기울기 (-1.0~1.0) */
  engagementDepthSlope: number
  /** 세션 정규화 값 (0.0~1.0) */
  sessionNorm: number
  /** 활성 여부 (λ >= 0.5) */
  isActive: boolean
}

// ── 가중치 ──────────────────────────────────────────────────

/** 갈등 해결률 가중치 */
export const W_CONFLICT_RESOLUTION = 0.4

/** 참여 깊이 기울기 가중치 */
export const W_ENGAGEMENT_SLOPE = 0.3

/** 세션 수 정규화 가중치 */
export const W_SESSION_NORM = 0.3

/** λ 시그모이드 중심점 (세션 수) */
export const LAMBDA_CENTER = 30

/** λ 활성화 임계값 */
export const LAMBDA_ACTIVE_THRESHOLD = 0.5

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * TrustScore 계산.
 *
 * λ = sigmoid(totalSessions/30 - 1)로 자동 가중치 조절:
 * - 10세션: λ ≈ 0.03 (거의 비활성)
 * - 30세션: λ = 0.50 (활성화 시작)
 * - 50세션: λ ≈ 0.97 (거의 완전 활성)
 * - 100세션: λ ≈ 0.99
 */
export function computeTrustScore(input: TrustInput): TrustResult {
  const lambda = computeLambda(input.totalSessions)

  const conflictResolutionRate = computeConflictResolutionRate(
    input.conflictResolutions,
    input.totalConflicts
  )

  const engagementDepthSlope = computeEngagementSlope(input.engagementDepths)

  const sessionNorm = computeSessionNorm(input.totalSessions)

  // 원시 신뢰 점수 (0~1)
  const rawScore =
    W_CONFLICT_RESOLUTION * conflictResolutionRate +
    W_ENGAGEMENT_SLOPE * normalizeSlope(engagementDepthSlope) +
    W_SESSION_NORM * sessionNorm

  // λ로 가중
  const score = round(lambda * rawScore)

  return {
    score,
    lambda: round(lambda),
    conflictResolutionRate: round(conflictResolutionRate),
    engagementDepthSlope: round(engagementDepthSlope),
    sessionNorm: round(sessionNorm),
    isActive: lambda >= LAMBDA_ACTIVE_THRESHOLD,
  }
}

// ── 구성 요소 계산 ──────────────────────────────────────────

/**
 * λ = sigmoid(totalSessions / LAMBDA_CENTER - 1)
 * = 1 / (1 + e^(-(totalSessions/30 - 1) * 5))
 *
 * 스케일 팩터 5로 30세션 근처에서 급격한 전환.
 */
export function computeLambda(totalSessions: number): number {
  const x = (totalSessions / LAMBDA_CENTER - 1) * 5
  return 1 / (1 + Math.exp(-x))
}

/** 갈등 해결률 = resolutions / conflicts (갈등 0이면 1.0) */
export function computeConflictResolutionRate(resolutions: number, totalConflicts: number): number {
  if (totalConflicts === 0) return 1.0
  return Math.min(1, resolutions / totalConflicts)
}

/**
 * 참여 깊이 추세 (단순 선형 회귀 기울기).
 * 양수 = 시간이 갈수록 더 깊은 대화, 음수 = 관심 감소.
 */
export function computeEngagementSlope(depths: number[]): number {
  if (depths.length < 2) return 0

  const n = depths.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += depths[i]
    sumXY += i * depths[i]
    sumX2 += i * i
  }

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return 0

  const slope = (n * sumXY - sumX * sumY) / denominator
  return slope
}

/** 세션 수 정규화: min(1, totalSessions / 100) */
export function computeSessionNorm(totalSessions: number): number {
  return Math.min(1, totalSessions / 100)
}

/** 기울기를 0~1로 정규화 (음수는 0에 가깝게, 양수는 1에 가깝게) */
function normalizeSlope(slope: number): number {
  // sigmoid(-10~10 범위로 스케일)
  const scaled = slope * 50 // depth가 0~1 범위이므로 기울기는 매우 작음
  return 1 / (1 + Math.exp(-scaled))
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000
}
