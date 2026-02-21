// ═══════════════════════════════════════════════════════════════
// PersonaWorld — 모더레이션 액션 (Phase 7-A)
// 관리자용 포스트/댓글/페르소나 관리 액션
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ActionType =
  | "HIDE_POST"
  | "DELETE_POST"
  | "RESTORE_POST"
  | "HIDE_COMMENT"
  | "DELETE_COMMENT"
  | "PAUSE_PERSONA"
  | "RESUME_PERSONA"
  | "RESOLVE_REPORT"
  | "DISMISS_REPORT"

export interface ActionResult {
  success: boolean
  action: ActionType
  targetId: string
  message: string
}

export interface AuditLogEntry {
  action: ActionType
  targetId: string
  adminId: string
  reason?: string
  timestamp: Date
}

// ── DI Provider ──────────────────────────────────────────────

export interface ModerationActionProvider {
  hidePost(postId: string): Promise<void>
  deletePost(postId: string): Promise<void>
  restorePost(postId: string): Promise<void>
  hideComment(commentId: string): Promise<void>
  deleteComment(commentId: string): Promise<void>
  pausePersona(personaId: string): Promise<void>
  resumePersona(personaId: string): Promise<void>
  resolveReport(reportId: string, resolution: string, adminId: string): Promise<void>
  dismissReport(reportId: string, adminId: string): Promise<void>
  createAuditLog(entry: AuditLogEntry): Promise<void>
}

// ── 액션 실행 ────────────────────────────────────────────────

export async function executeAction(
  provider: ModerationActionProvider,
  action: ActionType,
  targetId: string,
  adminId: string,
  options?: { reason?: string; resolution?: string }
): Promise<ActionResult> {
  try {
    switch (action) {
      case "HIDE_POST":
        await provider.hidePost(targetId)
        break
      case "DELETE_POST":
        await provider.deletePost(targetId)
        break
      case "RESTORE_POST":
        await provider.restorePost(targetId)
        break
      case "HIDE_COMMENT":
        await provider.hideComment(targetId)
        break
      case "DELETE_COMMENT":
        await provider.deleteComment(targetId)
        break
      case "PAUSE_PERSONA":
        await provider.pausePersona(targetId)
        break
      case "RESUME_PERSONA":
        await provider.resumePersona(targetId)
        break
      case "RESOLVE_REPORT":
        await provider.resolveReport(targetId, options?.resolution ?? "RESOLVED", adminId)
        break
      case "DISMISS_REPORT":
        await provider.dismissReport(targetId, adminId)
        break
    }

    // 감사 로그 기록
    await provider.createAuditLog({
      action,
      targetId,
      adminId,
      reason: options?.reason,
      timestamp: new Date(),
    })

    return {
      success: true,
      action,
      targetId,
      message: `${action} 완료`,
    }
  } catch (error) {
    return {
      success: false,
      action,
      targetId,
      message: error instanceof Error ? error.message : "액션 실행 실패",
    }
  }
}
