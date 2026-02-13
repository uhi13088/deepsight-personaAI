// ═══════════════════════════════════════════════════════════════
// Persona Lifecycle State Machine
// 스펙 §3.8 — 8-State Lifecycle Management
//
// States: DRAFT → REVIEW → ACTIVE → STANDARD → LEGACY → DEPRECATED → PAUSED → ARCHIVED
// ═══════════════════════════════════════════════════════════════

import type { PersonaStatus } from "@/generated/prisma"

// ── Lifecycle Action ────────────────────────────────────────

export type LifecycleAction =
  | "SUBMIT_REVIEW" // DRAFT → REVIEW
  | "APPROVE" // REVIEW → ACTIVE
  | "REJECT" // REVIEW → DRAFT
  | "PAUSE" // ACTIVE/STANDARD/LEGACY → PAUSED
  | "RESUME" // PAUSED → (이전 상태 or ACTIVE)
  | "ARCHIVE" // any (except ARCHIVED) → ARCHIVED
  | "RESTORE" // ARCHIVED → DRAFT
  | "DEPRECATE" // ACTIVE/STANDARD/LEGACY → DEPRECATED

// ── Status Labels ───────────────────────────────────────────

export const STATUS_LABELS: Record<PersonaStatus, string> = {
  DRAFT: "초안",
  REVIEW: "검토 중",
  ACTIVE: "활성",
  STANDARD: "표준",
  LEGACY: "레거시",
  DEPRECATED: "사용 중단",
  PAUSED: "일시 정지",
  ARCHIVED: "보관됨",
}

export const STATUS_COLORS: Record<PersonaStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  REVIEW: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  LEGACY: "bg-orange-100 text-orange-700",
  DEPRECATED: "bg-red-100 text-red-700",
  PAUSED: "bg-purple-100 text-purple-700",
  ARCHIVED: "bg-stone-100 text-stone-500",
}

export const ACTION_LABELS: Record<LifecycleAction, string> = {
  SUBMIT_REVIEW: "검토 요청",
  APPROVE: "승인",
  REJECT: "반려",
  PAUSE: "일시 정지",
  RESUME: "재개",
  ARCHIVE: "보관",
  RESTORE: "복원",
  DEPRECATE: "사용 중단",
}

// ── Transition Matrix ───────────────────────────────────────

const TRANSITIONS: Record<PersonaStatus, Partial<Record<LifecycleAction, PersonaStatus>>> = {
  DRAFT: {
    SUBMIT_REVIEW: "REVIEW",
    ARCHIVE: "ARCHIVED",
  },
  REVIEW: {
    APPROVE: "ACTIVE",
    REJECT: "DRAFT",
    ARCHIVE: "ARCHIVED",
  },
  ACTIVE: {
    PAUSE: "PAUSED",
    DEPRECATE: "DEPRECATED",
    ARCHIVE: "ARCHIVED",
  },
  STANDARD: {
    PAUSE: "PAUSED",
    DEPRECATE: "DEPRECATED",
    ARCHIVE: "ARCHIVED",
  },
  LEGACY: {
    PAUSE: "PAUSED",
    DEPRECATE: "DEPRECATED",
    ARCHIVE: "ARCHIVED",
  },
  DEPRECATED: {
    ARCHIVE: "ARCHIVED",
  },
  PAUSED: {
    RESUME: "ACTIVE",
    ARCHIVE: "ARCHIVED",
  },
  ARCHIVED: {
    RESTORE: "DRAFT",
  },
}

// ── Dangerous Actions (require confirmation) ────────────────

export const DANGEROUS_ACTIONS = new Set<LifecycleAction>(["ARCHIVE", "DEPRECATE"])

// ── Functions ───────────────────────────────────────────────

/**
 * 특정 상태에서 가능한 액션 목록
 */
export function getAvailableActions(status: PersonaStatus): LifecycleAction[] {
  const transitions = TRANSITIONS[status]
  return transitions ? (Object.keys(transitions) as LifecycleAction[]) : []
}

/**
 * 상태 전이 가능 여부 확인
 */
export function canTransition(
  currentStatus: PersonaStatus,
  action: LifecycleAction
): { allowed: boolean; targetStatus?: PersonaStatus; reason?: string } {
  const transitions = TRANSITIONS[currentStatus]
  if (!transitions) {
    return { allowed: false, reason: `알 수 없는 상태: ${currentStatus}` }
  }

  const targetStatus = transitions[action]
  if (!targetStatus) {
    return {
      allowed: false,
      reason: `'${STATUS_LABELS[currentStatus]}' 상태에서 '${ACTION_LABELS[action]}' 작업은 불가합니다.`,
    }
  }

  return { allowed: true, targetStatus }
}

/**
 * 상태 전이 실행 (검증 포함)
 * 반환값: 새로운 상태 또는 에러
 */
export function executeTransition(
  currentStatus: PersonaStatus,
  action: LifecycleAction
): { success: true; newStatus: PersonaStatus } | { success: false; reason: string } {
  const result = canTransition(currentStatus, action)
  if (!result.allowed || !result.targetStatus) {
    return { success: false, reason: result.reason ?? "전이 불가" }
  }
  return { success: true, newStatus: result.targetStatus }
}

/**
 * Active 계열 상태인지 확인 (사용 중인 페르소나)
 */
export function isActiveStatus(status: PersonaStatus): boolean {
  return status === "ACTIVE" || status === "STANDARD" || status === "LEGACY"
}

/**
 * 편집 가능 여부
 */
export function isEditable(status: PersonaStatus): boolean {
  return status !== "ARCHIVED"
}

/**
 * 편집 시 경고 필요 여부
 */
export function needsEditWarning(status: PersonaStatus): boolean {
  return isActiveStatus(status)
}
