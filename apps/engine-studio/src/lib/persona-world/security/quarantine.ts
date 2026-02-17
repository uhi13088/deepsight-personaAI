// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Quarantine System (Phase 6-A)
// 운영 설계서 §10.7 — 콘텐츠 격리 시스템
// ═══════════════════════════════════════════════════════════════

import type { GateSeverity } from "./pw-gate-rules"

export type QuarantineContentType = "POST" | "COMMENT" | "INTERACTION"
export type QuarantineDetector = "OUTPUT_SENTINEL" | "INTEGRITY_MONITOR" | "GATE_GUARD" | "MANUAL"
export type QuarantineStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED"

export interface QuarantineEntry {
  id: string
  contentType: QuarantineContentType
  contentId: string
  personaId?: string
  userId?: string

  reason: {
    detector: QuarantineDetector
    category: string
    details: string
    severity: GateSeverity
  }

  originalContent: string
  sanitizedContent?: string

  status: QuarantineStatus
  reviewedBy?: string
  reviewedAt?: Date
  reviewNote?: string

  createdAt: Date
  expiresAt: Date
}

// ── 심각도별 자동 만료 시간 (ms) ──────────────────────────────

const EXPIRY_MAP: Record<GateSeverity, number | null> = {
  LOW: 72 * 60 * 60 * 1000, // 72시간
  MEDIUM: 48 * 60 * 60 * 1000, // 48시간
  HIGH: 24 * 60 * 60 * 1000, // 24시간
  CRITICAL: null, // 수동만
}

// ── 심각도별 활동 제한 비율 ────────────────────────────────────

export const ACTIVITY_REDUCTION: Record<GateSeverity, number> = {
  LOW: 0, // 제한 없음
  MEDIUM: 0.3, // 30% 활동 감소
  HIGH: 1.0, // 해당 유형 정지
  CRITICAL: 1.0, // 전체 정지
}

// ── 격리 엔트리 생성 ──────────────────────────────────────────

let entryCounter = 0

/**
 * 격리 엔트리 생성.
 */
export function createQuarantineEntry(params: {
  contentType: QuarantineContentType
  contentId: string
  personaId?: string
  userId?: string
  detector: QuarantineDetector
  category: string
  details: string
  severity: GateSeverity
  originalContent: string
  sanitizedContent?: string
}): QuarantineEntry {
  const now = new Date()
  const expiryMs = EXPIRY_MAP[params.severity]
  const expiresAt = expiryMs ? new Date(now.getTime() + expiryMs) : new Date(9999, 11, 31)

  entryCounter++

  return {
    id: `q_${now.getTime()}_${entryCounter}`,
    contentType: params.contentType,
    contentId: params.contentId,
    personaId: params.personaId,
    userId: params.userId,
    reason: {
      detector: params.detector,
      category: params.category,
      details: params.details,
      severity: params.severity,
    },
    originalContent: params.originalContent,
    sanitizedContent: params.sanitizedContent,
    status: "PENDING",
    createdAt: now,
    expiresAt,
  }
}

/**
 * 격리 엔트리 심사.
 */
export function reviewQuarantineEntry(
  entry: QuarantineEntry,
  action: "APPROVED" | "REJECTED",
  adminId: string,
  note?: string
): QuarantineEntry {
  return {
    ...entry,
    status: action,
    reviewedBy: adminId,
    reviewedAt: new Date(),
    reviewNote: note,
  }
}

/**
 * 만료된 엔트리 처리.
 * PENDING + expiresAt 초과 → EXPIRED.
 */
export function processExpiredEntries(entries: QuarantineEntry[]): {
  processed: QuarantineEntry[]
  expiredCount: number
} {
  const now = new Date()
  let expiredCount = 0

  const processed = entries.map((entry) => {
    if (entry.status === "PENDING" && entry.expiresAt <= now) {
      expiredCount++
      return { ...entry, status: "EXPIRED" as QuarantineStatus }
    }
    return entry
  })

  return { processed, expiredCount }
}

/**
 * 격리 통계.
 */
export function getQuarantineStats(entries: QuarantineEntry[]): {
  total: number
  pending: number
  approved: number
  rejected: number
  expired: number
  bySeverity: Record<GateSeverity, number>
} {
  const stats = {
    total: entries.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<GateSeverity, number>,
  }

  for (const entry of entries) {
    stats[entry.status.toLowerCase() as "pending" | "approved" | "rejected" | "expired"]++
    stats.bySeverity[entry.reason.severity]++
  }

  return stats
}
