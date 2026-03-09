// ═══════════════════════════════════════════════════════════════
// T407: 메타 인지 관리자 알림 연동
// selfAssessment가 NEEDS_ATTENTION 이상이면 자동 알림
// ═══════════════════════════════════════════════════════════════

import { sendAlert } from "@/lib/notifications/notification-service"
import type { SelfAssessment, MetaCognitionReport } from "./meta-cognition"

// ── 타입 ────────────────────────────────────────────────────

export interface MetaCognitionAlertResult {
  sent: boolean
  channel: "slack" | "all" | null
  reason?: string
}

// ── 핵심 함수 ────────────────────────────────────────────────

/**
 * 메타 인지 보고서 기반 관리자 알림 발송.
 *
 * - NEEDS_ATTENTION → Slack
 * - CRITICAL → Slack + 이메일
 * - HEALTHY / DRIFTING → 스킵
 */
export async function sendMetaCognitionAlert(
  report: MetaCognitionReport,
  personaName: string
): Promise<MetaCognitionAlertResult> {
  if (report.selfAssessment === "HEALTHY" || report.selfAssessment === "DRIFTING") {
    return { sent: false, channel: null, reason: `${report.selfAssessment} — 알림 불필요` }
  }

  const channel = report.selfAssessment === "CRITICAL" ? "all" : "slack"
  const severity = report.selfAssessment === "CRITICAL" ? "critical" : "warning"

  const body = buildAlertBody(report, personaName)

  const result = await sendAlert({
    channel,
    severity,
    category: "quality",
    title: `메타 인지 알림: ${personaName} — ${report.selfAssessment}`,
    body,
  })

  return {
    sent: result.success,
    channel,
  }
}

function buildAlertBody(report: MetaCognitionReport, personaName: string): string {
  const lines = [
    `페르소나: ${personaName}`,
    `판정: ${report.selfAssessment}`,
    `PIS: ${report.pisSnapshot}`,
    ``,
    `[드리프트 자각] ${report.driftAwareness}`,
    `[자기 보고] ${report.selfReport}`,
    `[개선 제안] ${report.suggestion}`,
  ]
  return lines.join("\n")
}

/**
 * selfAssessment가 알림 대상인지 판정.
 */
export function shouldSendAlert(assessment: SelfAssessment): boolean {
  return assessment === "NEEDS_ATTENTION" || assessment === "CRITICAL"
}
