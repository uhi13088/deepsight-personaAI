// ═══════════════════════════════════════════════════════════════
// T403: AutonomyCorrectionLog — 자율 교정 감사 로그
// 자율 적용된 교정을 기록하고 과교정을 감지합니다.
// ═══════════════════════════════════════════════════════════════

import type { CorrectionCategory } from "../arena/correction-loop"

// ── 타입 ────────────────────────────────────────────────────

export interface AutonomyCorrectionLog {
  id: string
  personaId: string
  sessionId: string
  severity: "minor" | "major"
  confidence: number
  category: CorrectionCategory
  patchSummary: string
  pisBeforeCorrection: number | null
  reviewed: boolean
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
}

export interface CreateCorrectionLogInput {
  personaId: string
  sessionId: string
  severity: "minor" | "major"
  confidence: number
  category: CorrectionCategory
  patchSummary: string
  pisBeforeCorrection: number | null
}

export interface CorrectionLogFilter {
  personaId?: string
  reviewed?: boolean
  severity?: "minor" | "major"
  limit?: number
  offset?: number
}

export interface OverCorrectionResult {
  detected: boolean
  category?: CorrectionCategory
  count?: number
  reason?: string
}

// ── 상수 ────────────────────────────────────────────────────

/** 과교정 감지 윈도우 (시간) */
const OVER_CORRECTION_WINDOW_HOURS = 24

/** 같은 카테고리 N회 연속 시 과교정 */
const OVER_CORRECTION_THRESHOLD = 3

// ── 핵심 함수 ────────────────────────────────────────────────

/**
 * 감사 로그 생성 데이터 빌드.
 */
export function buildCorrectionLog(
  input: CreateCorrectionLogInput
): Omit<AutonomyCorrectionLog, "id" | "createdAt"> {
  return {
    personaId: input.personaId,
    sessionId: input.sessionId,
    severity: input.severity,
    confidence: input.confidence,
    category: input.category,
    patchSummary: input.patchSummary,
    pisBeforeCorrection: input.pisBeforeCorrection,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
  }
}

/**
 * 과교정 감지 — 같은 카테고리 3회/24h 시 true.
 */
export function detectOverCorrection(
  recentLogs: AutonomyCorrectionLog[],
  windowHours: number = OVER_CORRECTION_WINDOW_HOURS
): OverCorrectionResult {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000)
  const windowLogs = recentLogs.filter((log) => log.createdAt >= cutoff)

  // 카테고리별 카운트
  const categoryCounts = new Map<CorrectionCategory, number>()
  for (const log of windowLogs) {
    const count = (categoryCounts.get(log.category) ?? 0) + 1
    categoryCounts.set(log.category, count)
  }

  for (const [category, count] of categoryCounts) {
    if (count >= OVER_CORRECTION_THRESHOLD) {
      return {
        detected: true,
        category,
        count,
        reason: `동일 카테고리(${category}) ${count}회/${windowHours}h — 자율 교정 자동 비활성화`,
      }
    }
  }

  return { detected: false }
}

/**
 * 패치 요약 생성 (사후 리뷰용).
 */
export function buildPatchSummary(params: {
  category: CorrectionCategory
  operationCount: number
  fields: string[]
}): string {
  return `[${params.category}] ${params.operationCount}개 오퍼레이션 — ${params.fields.join(", ")}`
}
