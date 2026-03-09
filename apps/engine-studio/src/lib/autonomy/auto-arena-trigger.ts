// ═══════════════════════════════════════════════════════════════
// T404: PIS 기반 자동 Arena 트리거
// autoCorrection=true && PIS < 0.7 → Arena 세션 자동 스케줄
// ═══════════════════════════════════════════════════════════════

import type { AutonomyPolicy } from "./autonomy-policy"

// ── 타입 ────────────────────────────────────────────────────

export interface AutoArenaTriggerResult {
  shouldTrigger: boolean
  reason: string
  severity: "WARNING" | "CRITICAL" | null
  /** 관리자 알림 필요 여부 */
  notifyAdmin: boolean
}

export interface AutoArenaTriggerParams {
  personaId: string
  currentPIS: number
  policy: AutonomyPolicy | null
  /** 최근 24h 내 Arena 실행 여부 */
  hasRecentArena: boolean
  /** 예산 내 여부 */
  withinBudget: boolean
}

// ── 상수 ────────────────────────────────────────────────────

/** PIS WARNING 임계값 */
const PIS_WARNING_THRESHOLD = 0.7

/** PIS CRITICAL 임계값 */
const PIS_CRITICAL_THRESHOLD = 0.6

// ── 핵심 함수 ────────────────────────────────────────────────

/**
 * PIS 기반 자동 Arena 트리거 판정.
 *
 * 규칙:
 * 1. autoCorrection=false → 스킵
 * 2. PIS ≥ 0.7 → 스킵
 * 3. 최근 24h Arena 실행 → 스킵 (중복 방지)
 * 4. 예산 초과 → 스킵 + 관리자 알림
 * 5. PIS < 0.6 (CRITICAL) → 트리거 + Slack/이메일 알림
 * 6. PIS < 0.7 (WARNING) → 트리거
 */
export function checkAutoArenaTrigger(params: AutoArenaTriggerParams): AutoArenaTriggerResult {
  const { currentPIS, policy, hasRecentArena, withinBudget } = params

  // Rule 1: 자율 교정 비활성
  if (!policy?.autoCorrection) {
    return { shouldTrigger: false, reason: "자율 교정 비활성", severity: null, notifyAdmin: false }
  }

  // Rule 2: PIS 양호
  if (currentPIS >= PIS_WARNING_THRESHOLD) {
    return {
      shouldTrigger: false,
      reason: `PIS ${currentPIS} ≥ ${PIS_WARNING_THRESHOLD}`,
      severity: null,
      notifyAdmin: false,
    }
  }

  // Rule 3: 중복 방지
  if (hasRecentArena) {
    return {
      shouldTrigger: false,
      reason: "최근 24h 내 Arena 이미 실행됨",
      severity: currentPIS < PIS_CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING",
      notifyAdmin: false,
    }
  }

  // Rule 4: 예산 초과
  if (!withinBudget) {
    return {
      shouldTrigger: false,
      reason: "Arena 예산 초과 — 관리자 확인 필요",
      severity: currentPIS < PIS_CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING",
      notifyAdmin: true,
    }
  }

  // Rule 5: CRITICAL
  if (currentPIS < PIS_CRITICAL_THRESHOLD) {
    return {
      shouldTrigger: true,
      reason: `PIS ${currentPIS} < ${PIS_CRITICAL_THRESHOLD} — CRITICAL 자동 Arena 트리거`,
      severity: "CRITICAL",
      notifyAdmin: true,
    }
  }

  // Rule 6: WARNING
  return {
    shouldTrigger: true,
    reason: `PIS ${currentPIS} < ${PIS_WARNING_THRESHOLD} — WARNING 자동 Arena 트리거`,
    severity: "WARNING",
    notifyAdmin: false,
  }
}
