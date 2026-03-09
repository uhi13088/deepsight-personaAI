// ═══════════════════════════════════════════════════════════════
// Slack Provider — Incoming Webhook (v4.1.1-C: T385)
// ═══════════════════════════════════════════════════════════════

import type { AlertSeverity } from "./notification-service"

export interface SlackAlertPayload {
  title: string
  body: string
  severity: AlertSeverity
  resourceUrl?: string
}

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: "#FF0000",
  warning: "#FFA500",
  info: "#0099FF",
}

/**
 * Slack Incoming Webhook으로 알림 전송.
 *
 * SLACK_WEBHOOK_URL 환경변수 미설정 시 graceful skip (false 반환).
 * @returns true = 전송 성공, false = 스킵 또는 실패
 */
export async function sendSlackAlert(payload: SlackAlertPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.log("[slack] SLACK_WEBHOOK_URL not configured, skipping")
    return false
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${payload.title}*\n${payload.body}`,
      },
    },
  ]

  if (payload.resourceUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${payload.resourceUrl}|View Details>`,
      },
    })
  }

  const slackPayload = {
    attachments: [
      {
        color: SEVERITY_COLOR[payload.severity],
        blocks,
      },
    ],
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackPayload),
  })

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`)
  }

  return true
}
