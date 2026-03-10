// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Arena Feedback Loop Bridge (Phase 6-B)
// 운영 설계서 §9.5 — PW→Arena 트리거, 교정 추적
// ═══════════════════════════════════════════════════════════════

import type { PISGrade } from "./integrity-score"

// ── 타입 정의 ─────────────────────────────────────────────────

export type TriggerPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type TriggerType =
  | "INTERVIEW_FAIL"
  | "PIS_DROP_SUDDEN"
  | "PIS_CRITICAL"
  | "BOT_PATTERN_DETECTED"
  | "FACTBOOK_VIOLATION"
  | "SCHEDULED_CHECK"
  | "USER_ARENA"

export interface ArenaTrigger {
  type: TriggerType
  priority: TriggerPriority
  maxDelayHours: number
  personaId: string
  reason: string
  detectedAt: Date
}

export interface CorrectionTracking {
  correctionId: string
  personaId: string

  before: {
    pis: number
    failedDimensions: string[]
    triggeredBy: TriggerType
  }

  correction: {
    arenaSessionId: string
    patchCategories: string[]
    appliedAt: Date
    approvedBy: string
  }

  after?: {
    pis: number
    improvement: number
    resolvedDimensions: string[]
    remainingIssues: string[]
    measuredAt: Date
  }

  verdict?: CorrectionVerdict
}

export type CorrectionVerdict = "EFFECTIVE" | "PARTIAL" | "INEFFECTIVE" | "REGRESSED"

// ── 트리거 조건 정의 ──────────────────────────────────────────

interface TriggerCondition {
  type: TriggerType
  priority: TriggerPriority
  maxDelayHours: number
}

const TRIGGER_CONDITIONS: Record<TriggerType, Omit<TriggerCondition, "type">> = {
  INTERVIEW_FAIL: { priority: "HIGH", maxDelayHours: 2 },
  PIS_DROP_SUDDEN: { priority: "HIGH", maxDelayHours: 4 },
  PIS_CRITICAL: { priority: "CRITICAL", maxDelayHours: 0 }, // 즉시
  BOT_PATTERN_DETECTED: { priority: "HIGH", maxDelayHours: 1 },
  FACTBOOK_VIOLATION: { priority: "MEDIUM", maxDelayHours: 24 },
  SCHEDULED_CHECK: { priority: "LOW", maxDelayHours: 168 }, // 1주
  USER_ARENA: { priority: "LOW", maxDelayHours: 24 }, // 유저 토론 데이터 — 낮은 우선순위
}

// ── 트리거 생성 ───────────────────────────────────────────────

/**
 * Arena 트리거 생성.
 */
export function createArenaTrigger(
  personaId: string,
  type: TriggerType,
  reason: string
): ArenaTrigger {
  const condition = TRIGGER_CONDITIONS[type]
  return {
    type,
    priority: condition.priority,
    maxDelayHours: condition.maxDelayHours,
    personaId,
    reason,
    detectedAt: new Date(),
  }
}

// ── 트리거 조건 체크 ──────────────────────────────────────────

/**
 * Auto-Interview 결과에서 트리거 체크.
 */
export function checkInterviewTrigger(
  personaId: string,
  interviewScore: number
): ArenaTrigger | null {
  if (interviewScore < 0.7) {
    return createArenaTrigger(
      personaId,
      "INTERVIEW_FAIL",
      `Interview score ${interviewScore} < 0.70`
    )
  }
  return null
}

/**
 * PIS 주간 변화에서 트리거 체크.
 */
export function checkPISDropTrigger(
  personaId: string,
  currentPIS: number,
  previousPIS: number
): ArenaTrigger | null {
  const drop = previousPIS - currentPIS
  if (drop > 0.1) {
    return createArenaTrigger(
      personaId,
      "PIS_DROP_SUDDEN",
      `PIS dropped ${round(drop)}: ${round(previousPIS)} → ${round(currentPIS)}`
    )
  }
  return null
}

/**
 * PIS 임계 수준 트리거 체크.
 */
export function checkPISCriticalTrigger(personaId: string, pis: number): ArenaTrigger | null {
  if (pis < 0.6) {
    return createArenaTrigger(
      personaId,
      "PIS_CRITICAL",
      `PIS ${round(pis)} < 0.60 — activity pause required`
    )
  }
  return null
}

/**
 * BOT 패턴 감지 트리거 체크.
 */
export function checkBotPatternTrigger(
  personaId: string,
  hasCriticalBotPattern: boolean
): ArenaTrigger | null {
  if (hasCriticalBotPattern) {
    return createArenaTrigger(
      personaId,
      "BOT_PATTERN_DETECTED",
      "Critical BOT_PATTERN detected in InteractionPatternLog"
    )
  }
  return null
}

/**
 * Factbook 위반 빈도 트리거 체크.
 */
export function checkFactbookViolationTrigger(
  personaId: string,
  dailyViolationCount: number
): ArenaTrigger | null {
  if (dailyViolationCount >= 3) {
    return createArenaTrigger(
      personaId,
      "FACTBOOK_VIOLATION",
      `${dailyViolationCount} factbook violations in 24h`
    )
  }
  return null
}

/**
 * 모든 트리거 조건 한번에 체크.
 */
export function checkAllTriggers(params: {
  personaId: string
  interviewScore?: number
  currentPIS?: number
  previousPIS?: number
  hasCriticalBotPattern?: boolean
  dailyFactbookViolations?: number
}): ArenaTrigger[] {
  const triggers: ArenaTrigger[] = []

  if (params.interviewScore !== undefined) {
    const t = checkInterviewTrigger(params.personaId, params.interviewScore)
    if (t) triggers.push(t)
  }

  if (params.currentPIS !== undefined && params.previousPIS !== undefined) {
    const t = checkPISDropTrigger(params.personaId, params.currentPIS, params.previousPIS)
    if (t) triggers.push(t)
  }

  if (params.currentPIS !== undefined) {
    const t = checkPISCriticalTrigger(params.personaId, params.currentPIS)
    if (t) triggers.push(t)
  }

  if (params.hasCriticalBotPattern !== undefined) {
    const t = checkBotPatternTrigger(params.personaId, params.hasCriticalBotPattern)
    if (t) triggers.push(t)
  }

  if (params.dailyFactbookViolations !== undefined) {
    const t = checkFactbookViolationTrigger(params.personaId, params.dailyFactbookViolations)
    if (t) triggers.push(t)
  }

  // 우선순위 정렬
  const priorityOrder: TriggerPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  triggers.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))

  return triggers
}

// ── 교정 추적 ─────────────────────────────────────────────────

/**
 * 교정 추적 레코드 생성.
 */
export function createCorrectionTracking(params: {
  correctionId: string
  personaId: string
  beforePIS: number
  failedDimensions: string[]
  triggeredBy: TriggerType
  arenaSessionId: string
  patchCategories: string[]
  approvedBy: string
}): CorrectionTracking {
  return {
    correctionId: params.correctionId,
    personaId: params.personaId,
    before: {
      pis: params.beforePIS,
      failedDimensions: params.failedDimensions,
      triggeredBy: params.triggeredBy,
    },
    correction: {
      arenaSessionId: params.arenaSessionId,
      patchCategories: params.patchCategories,
      appliedAt: new Date(),
      approvedBy: params.approvedBy,
    },
  }
}

/**
 * 교정 결과 평가.
 *
 * - EFFECTIVE: improvement > 0.05
 * - PARTIAL: 0 < improvement ≤ 0.05
 * - INEFFECTIVE: ≈ 0 (within ±0.01)
 * - REGRESSED: < -0.01
 */
export function evaluateCorrectionVerdict(beforePIS: number, afterPIS: number): CorrectionVerdict {
  const improvement = afterPIS - beforePIS

  if (improvement > 0.05) return "EFFECTIVE"
  if (improvement > 0.01) return "PARTIAL"
  if (improvement >= -0.01) return "INEFFECTIVE"
  return "REGRESSED"
}

/**
 * 교정 결과를 추적 레코드에 기록.
 */
export function recordCorrectionResult(
  tracking: CorrectionTracking,
  afterPIS: number,
  resolvedDimensions: string[],
  remainingIssues: string[]
): CorrectionTracking {
  const improvement = round(afterPIS - tracking.before.pis)
  const verdict = evaluateCorrectionVerdict(tracking.before.pis, afterPIS)

  return {
    ...tracking,
    after: {
      pis: round(afterPIS),
      improvement,
      resolvedDimensions,
      remainingIssues,
      measuredAt: new Date(),
    },
    verdict,
  }
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
