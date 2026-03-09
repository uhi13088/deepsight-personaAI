// ═══════════════════════════════════════════════════════════════
// Email Provider — SendGrid (v4.1.1-C: T385)
// ═══════════════════════════════════════════════════════════════

import type { AlertSeverity, AlertCategory } from "./notification-service"

export interface EmailAlertPayload {
  title: string
  body: string
  severity: AlertSeverity
  category: AlertCategory
  resourceUrl?: string
}

/**
 * SendGrid v3 API로 알림 이메일 전송.
 *
 * 환경변수:
 * - SENDGRID_API_KEY: SendGrid API 키
 * - ALERT_EMAIL_FROM: 발신자 이메일 (기본: alerts@deepsight.ai)
 * - ALERT_EMAIL_TO: 수신자 이메일 (쉼표 구분 복수)
 *
 * 미설정 시 graceful skip.
 * @returns true = 전송 성공, false = 스킵
 */
export async function sendEmailAlert(payload: EmailAlertPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY
  const emailTo = process.env.ALERT_EMAIL_TO

  if (!apiKey || !emailTo) {
    console.log("[email] SENDGRID_API_KEY or ALERT_EMAIL_TO not configured, skipping")
    return false
  }

  const fromEmail = process.env.ALERT_EMAIL_FROM ?? "alerts@deepsight.ai"

  // 수신자 파싱 (쉼표 구분)
  const recipients = emailTo
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((email) => ({ email }))

  if (recipients.length === 0) {
    console.log("[email] No valid recipients in ALERT_EMAIL_TO, skipping")
    return false
  }

  const htmlBody = buildHtmlBody(payload)

  const sgPayload = {
    personalizations: [{ to: recipients }],
    from: { email: fromEmail, name: "DeepSight Alerts" },
    subject: payload.title,
    content: [
      { type: "text/plain", value: `${payload.title}\n\n${payload.body}` },
      { type: "text/html", value: htmlBody },
    ],
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sgPayload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`SendGrid failed: ${response.status} ${text}`)
  }

  return true
}

// ── HTML Template ────────────────────────────────────────────

const SEVERITY_BG: Record<AlertSeverity, string> = {
  critical: "#FEE2E2",
  warning: "#FEF3C7",
  info: "#DBEAFE",
}

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
}

function buildHtmlBody(payload: EmailAlertPayload): string {
  const bg = SEVERITY_BG[payload.severity]
  const border = SEVERITY_BORDER[payload.severity]
  const resourceLink = payload.resourceUrl
    ? `<p><a href="${payload.resourceUrl}" style="color: #3B82F6;">View Details</a></p>`
    : ""

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${bg}; border-left: 4px solid ${border}; padding: 16px; border-radius: 4px;">
        <h2 style="margin: 0 0 8px 0; font-size: 16px;">${payload.title}</h2>
        <p style="margin: 0; color: #374151; white-space: pre-wrap;">${payload.body}</p>
        ${resourceLink}
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 16px;">
        Category: ${payload.category} | Severity: ${payload.severity}
      </p>
    </div>
  `.trim()
}
