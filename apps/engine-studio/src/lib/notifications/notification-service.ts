// ═══════════════════════════════════════════════════════════════
// Notification Service — 통합 알림 인터페이스 (v4.1.1-C: T385)
// Slack Webhook + SendGrid 이메일 2채널 지원
// ═══════════════════════════════════════════════════════════════

import { sendSlackAlert } from "./slack-provider"
import { sendEmailAlert } from "./email-provider"

// ── Types ────────────────────────────────────────────────────

/** 알림 채널 */
export type AlertChannel = "slack" | "email" | "all"

/** 알림 심각도 */
export type AlertSeverity = "critical" | "warning" | "info"

/** 알림 카테고리 */
export type AlertCategory = "security" | "cost" | "quality" | "system"

/** 알림 전송 옵션 */
export interface AlertOptions {
  channel: AlertChannel
  severity: AlertSeverity
  category: AlertCategory
  title: string
  body: string
  /** 관련 리소스 URL (선택) */
  resourceUrl?: string
}

/** 알림 전송 결과 */
export interface AlertResult {
  success: boolean
  channels: {
    slack?: { sent: boolean; error?: string }
    email?: { sent: boolean; error?: string }
  }
}

// ── Severity → Emoji ─────────────────────────────────────────

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: "🚨",
  warning: "⚠️",
  info: "ℹ️",
}

// ── Main Function ────────────────────────────────────────────

/**
 * 통합 알림 전송.
 *
 * - channel="slack" → Slack만
 * - channel="email" → 이메일만
 * - channel="all" → 양쪽 모두
 * - 환경변수 미설정 시 graceful skip (로그만 출력)
 */
export async function sendAlert(options: AlertOptions): Promise<AlertResult> {
  const { channel, severity, category, title, body, resourceUrl } = options

  const formattedTitle = `${SEVERITY_EMOJI[severity]} [${severity.toUpperCase()}] [${category}] ${title}`

  const result: AlertResult = { success: false, channels: {} }

  const shouldSendSlack = channel === "slack" || channel === "all"
  const shouldSendEmail = channel === "email" || channel === "all"

  // Slack
  if (shouldSendSlack) {
    try {
      const sent = await sendSlackAlert({
        title: formattedTitle,
        body,
        severity,
        resourceUrl,
      })
      result.channels.slack = { sent }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      result.channels.slack = { sent: false, error: message }
      console.error(`[notification] Slack send failed: ${message}`)
    }
  }

  // Email
  if (shouldSendEmail) {
    try {
      const sent = await sendEmailAlert({
        title: formattedTitle,
        body,
        severity,
        category,
        resourceUrl,
      })
      result.channels.email = { sent }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      result.channels.email = { sent: false, error: message }
      console.error(`[notification] Email send failed: ${message}`)
    }
  }

  // 하나라도 성공하면 전체 success
  result.success = (result.channels.slack?.sent ?? false) || (result.channels.email?.sent ?? false)

  // 전송 로그
  console.log(
    `[notification] ${formattedTitle} → slack=${result.channels.slack?.sent ?? "skip"}, email=${result.channels.email?.sent ?? "skip"}`
  )

  return result
}
