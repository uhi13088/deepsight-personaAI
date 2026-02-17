// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Admin Moderation Actions (Phase 7-A)
// 운영 설계서 §11.4 — 관리자 액션 (콘텐츠/페르소나/시스템)
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type AdminActionType =
  // Content
  | "HIDE_POST"
  | "DELETE_POST"
  | "RESTORE_POST"
  | "HIDE_COMMENT"
  | "DELETE_COMMENT"
  | "APPROVE_QUARANTINE"
  | "REJECT_QUARANTINE"
  | "BULK_HIDE_POSTS"
  | "BULK_DELETE_COMMENTS"
  // Persona
  | "PAUSE_PERSONA"
  | "RESUME_PERSONA"
  | "RESTRICT_ACTIVITY"
  | "TRIGGER_ARENA"
  | "APPROVE_CORRECTION"
  | "REJECT_CORRECTION"
  // System
  | "ACTIVATE_KILL_SWITCH"
  | "DEACTIVATE_KILL_SWITCH"
  | "UPDATE_BUDGET"

export interface AdminAction {
  id: string
  type: AdminActionType
  adminId: string
  targetId: string
  reason: string
  params?: Record<string, unknown>
  executedAt: Date
}

export interface ActivityRestriction {
  postGeneration?: boolean
  commentGeneration?: boolean
  interactions?: boolean
}

export interface AdminActionResult {
  success: boolean
  action: AdminAction
  message: string
}

// ── 액션 생성 ──────────────────────────────────────────────────

let actionCounter = 0

function createAction(
  type: AdminActionType,
  adminId: string,
  targetId: string,
  reason: string,
  params?: Record<string, unknown>
): AdminAction {
  return {
    id: `action-${Date.now()}-${++actionCounter}`,
    type,
    adminId,
    targetId,
    reason,
    params,
    executedAt: new Date(),
  }
}

// ── 콘텐츠 관리 액션 ──────────────────────────────────────────

export function hidePost(adminId: string, postId: string, reason: string): AdminActionResult {
  return {
    success: true,
    action: createAction("HIDE_POST", adminId, postId, reason),
    message: `포스트 ${postId} 숨김 처리`,
  }
}

export function deletePost(adminId: string, postId: string, reason: string): AdminActionResult {
  return {
    success: true,
    action: createAction("DELETE_POST", adminId, postId, reason),
    message: `포스트 ${postId} 삭제`,
  }
}

export function restorePost(adminId: string, postId: string): AdminActionResult {
  return {
    success: true,
    action: createAction("RESTORE_POST", adminId, postId, "복원 요청"),
    message: `포스트 ${postId} 복원`,
  }
}

export function hideComment(adminId: string, commentId: string, reason: string): AdminActionResult {
  return {
    success: true,
    action: createAction("HIDE_COMMENT", adminId, commentId, reason),
    message: `댓글 ${commentId} 숨김 처리`,
  }
}

export function deleteComment(
  adminId: string,
  commentId: string,
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("DELETE_COMMENT", adminId, commentId, reason),
    message: `댓글 ${commentId} 삭제`,
  }
}

export function approveQuarantine(
  adminId: string,
  quarantineId: string,
  note: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("APPROVE_QUARANTINE", adminId, quarantineId, note),
    message: `격리 ${quarantineId} 승인 (콘텐츠 게시)`,
  }
}

export function rejectQuarantine(
  adminId: string,
  quarantineId: string,
  note: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("REJECT_QUARANTINE", adminId, quarantineId, note),
    message: `격리 ${quarantineId} 거부 (콘텐츠 삭제)`,
  }
}

export function bulkHidePosts(
  adminId: string,
  postIds: string[],
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("BULK_HIDE_POSTS", adminId, postIds.join(","), reason, {
      count: postIds.length,
      postIds,
    }),
    message: `${postIds.length}개 포스트 일괄 숨김`,
  }
}

export function bulkDeleteComments(
  adminId: string,
  commentIds: string[],
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("BULK_DELETE_COMMENTS", adminId, commentIds.join(","), reason, {
      count: commentIds.length,
      commentIds,
    }),
    message: `${commentIds.length}개 댓글 일괄 삭제`,
  }
}

// ── 페르소나 관리 액션 ─────────────────────────────────────────

export function pausePersona(
  adminId: string,
  personaId: string,
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("PAUSE_PERSONA", adminId, personaId, reason),
    message: `페르소나 ${personaId} 활동 일시정지`,
  }
}

export function resumePersona(adminId: string, personaId: string): AdminActionResult {
  return {
    success: true,
    action: createAction("RESUME_PERSONA", adminId, personaId, "활동 재개"),
    message: `페르소나 ${personaId} 활동 재개`,
  }
}

export function restrictActivity(
  adminId: string,
  personaId: string,
  restrictions: ActivityRestriction,
  durationHours?: number
): AdminActionResult {
  return {
    success: true,
    action: createAction("RESTRICT_ACTIVITY", adminId, personaId, "활동 제한", {
      restrictions,
      durationHours,
    }),
    message: `페르소나 ${personaId} 활동 제한 (${durationHours ? `${durationHours}시간` : "무기한"})`,
  }
}

export function triggerArena(
  adminId: string,
  personaId: string,
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("TRIGGER_ARENA", adminId, personaId, reason),
    message: `페르소나 ${personaId} Arena 세션 트리거`,
  }
}

export function approveCorrection(adminId: string, correctionId: string): AdminActionResult {
  return {
    success: true,
    action: createAction("APPROVE_CORRECTION", adminId, correctionId, "교정 승인"),
    message: `교정 ${correctionId} 승인 적용`,
  }
}

export function rejectCorrection(
  adminId: string,
  correctionId: string,
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("REJECT_CORRECTION", adminId, correctionId, reason),
    message: `교정 ${correctionId} 거부`,
  }
}

// ── 시스템 제어 액션 ──────────────────────────────────────────

export function activateKillSwitch(
  adminId: string,
  scope: "GLOBAL" | "FEATURE",
  features: string[],
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("ACTIVATE_KILL_SWITCH", adminId, scope, reason, { features }),
    message:
      scope === "GLOBAL"
        ? "글로벌 Kill Switch 활성화"
        : `Kill Switch: ${features.join(", ")} 비활성화`,
  }
}

export function deactivateKillSwitch(
  adminId: string,
  scope: "GLOBAL" | "FEATURE"
): AdminActionResult {
  return {
    success: true,
    action: createAction("DEACTIVATE_KILL_SWITCH", adminId, scope, "Kill Switch 해제"),
    message: scope === "GLOBAL" ? "글로벌 Kill Switch 해제" : "Kill Switch 기능 복원",
  }
}

export function updateBudget(
  adminId: string,
  newBudget: number,
  reason: string
): AdminActionResult {
  return {
    success: true,
    action: createAction("UPDATE_BUDGET", adminId, "budget", reason, { newBudget }),
    message: `일일 예산 $${newBudget}으로 변경`,
  }
}

// ── 액션 로그 조회 ───────────────────────────────────────────

/**
 * 액션 필터링.
 */
export function filterActions(
  actions: AdminAction[],
  filter: {
    adminId?: string
    type?: AdminActionType
    since?: Date
  }
): AdminAction[] {
  return actions.filter((a) => {
    if (filter.adminId && a.adminId !== filter.adminId) return false
    if (filter.type && a.type !== filter.type) return false
    if (filter.since && a.executedAt < filter.since) return false
    return true
  })
}
