// ═══════════════════════════════════════════════════════════════
// PersonaWorld — User Trust Score (Phase 6-A)
// 운영 설계서 §10.2 — 유저 신뢰 점수 관리
// ═══════════════════════════════════════════════════════════════

export type InspectionLevel = "BASIC" | "ENHANCED" | "DEEP" | "BLOCKED"

export interface UserTrustState {
  score: number // 1.0 (신뢰) → 0.0 (차단)
  lastUpdatedAt: Date
}

// ── 감소/회복 규칙 ──────────────────────────────────────────

export type TrustEvent =
  | "BLOCK_EVENT"
  | "WARN_EVENT"
  | "REPORT_RECEIVED"
  | "REPORT_CONFIRMED"
  | "DAILY_RECOVERY"

const DECAY_MAP: Record<TrustEvent, number> = {
  BLOCK_EVENT: -0.15,
  WARN_EVENT: -0.05,
  REPORT_RECEIVED: -0.03,
  REPORT_CONFIRMED: -0.1,
  DAILY_RECOVERY: 0.01,
}

const MAX_RECOVERY = 0.95
const DEFAULT_SCORE = 1.0

// ── 검사 수준 ────────────────────────────────────────────────

const INSPECTION_THRESHOLDS = {
  BASIC: 0.8,
  ENHANCED: 0.5,
  DEEP: 0.3,
} as const

/**
 * 신뢰 점수 → 검사 수준 결정.
 */
export function getInspectionLevel(score: number): InspectionLevel {
  if (score >= INSPECTION_THRESHOLDS.BASIC) return "BASIC"
  if (score >= INSPECTION_THRESHOLDS.ENHANCED) return "ENHANCED"
  if (score >= INSPECTION_THRESHOLDS.DEEP) return "DEEP"
  return "BLOCKED"
}

/**
 * 신뢰 점수 초기화.
 */
export function createInitialTrustState(): UserTrustState {
  return {
    score: DEFAULT_SCORE,
    lastUpdatedAt: new Date(),
  }
}

/**
 * 이벤트에 따른 신뢰 점수 업데이트.
 */
export function applyTrustEvent(state: UserTrustState, event: TrustEvent): UserTrustState {
  const delta = DECAY_MAP[event]
  let newScore = state.score + delta

  // 회복 이벤트는 MAX_RECOVERY까지만
  if (event === "DAILY_RECOVERY" && newScore > MAX_RECOVERY) {
    newScore = MAX_RECOVERY
  }

  // 범위 제한
  newScore = Math.max(0, Math.min(1, newScore))

  return {
    score: newScore,
    lastUpdatedAt: new Date(),
  }
}

/**
 * 여러 이벤트를 순차 적용.
 */
export function applyTrustEvents(state: UserTrustState, events: TrustEvent[]): UserTrustState {
  let current = state
  for (const event of events) {
    current = applyTrustEvent(current, event)
  }
  return current
}
