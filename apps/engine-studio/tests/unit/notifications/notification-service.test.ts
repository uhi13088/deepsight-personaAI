import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock providers before importing service
vi.mock("@/lib/notifications/slack-provider", () => ({
  sendSlackAlert: vi.fn(),
}))
vi.mock("@/lib/notifications/email-provider", () => ({
  sendEmailAlert: vi.fn(),
}))

import { sendAlert, type AlertOptions } from "@/lib/notifications/notification-service"
import { sendSlackAlert } from "@/lib/notifications/slack-provider"
import { sendEmailAlert } from "@/lib/notifications/email-provider"

const mockSlack = vi.mocked(sendSlackAlert)
const mockEmail = vi.mocked(sendEmailAlert)

beforeEach(() => {
  vi.clearAllMocks()
})

// ═════════════════════════════════════════════════════════════
// sendAlert
// ═════════════════════════════════════════════════════════════

describe("sendAlert", () => {
  const baseOptions: AlertOptions = {
    channel: "all",
    severity: "critical",
    category: "security",
    title: "Trust Score Drop",
    body: "User X trust score dropped below 30",
  }

  // ── channel routing ──

  it("channel=all → Slack + Email 모두 호출", async () => {
    mockSlack.mockResolvedValue(true)
    mockEmail.mockResolvedValue(true)

    const result = await sendAlert(baseOptions)

    expect(mockSlack).toHaveBeenCalledTimes(1)
    expect(mockEmail).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(true)
    expect(result.channels.slack?.sent).toBe(true)
    expect(result.channels.email?.sent).toBe(true)
  })

  it("channel=slack → Slack만 호출", async () => {
    mockSlack.mockResolvedValue(true)

    const result = await sendAlert({ ...baseOptions, channel: "slack" })

    expect(mockSlack).toHaveBeenCalledTimes(1)
    expect(mockEmail).not.toHaveBeenCalled()
    expect(result.channels.slack?.sent).toBe(true)
    expect(result.channels.email).toBeUndefined()
  })

  it("channel=email → Email만 호출", async () => {
    mockEmail.mockResolvedValue(true)

    const result = await sendAlert({ ...baseOptions, channel: "email" })

    expect(mockSlack).not.toHaveBeenCalled()
    expect(mockEmail).toHaveBeenCalledTimes(1)
    expect(result.channels.email?.sent).toBe(true)
    expect(result.channels.slack).toBeUndefined()
  })

  // ── severity + category formatting ──

  it("severity + category 포맷팅 확인", async () => {
    mockSlack.mockResolvedValue(true)

    await sendAlert({ ...baseOptions, severity: "warning", category: "cost", channel: "slack" })

    const call = mockSlack.mock.calls[0][0]
    expect(call.title).toContain("[WARNING]")
    expect(call.title).toContain("[cost]")
    expect(call.title).toContain("Trust Score Drop")
  })

  it("critical → 🚨 이모지", async () => {
    mockSlack.mockResolvedValue(true)

    await sendAlert({ ...baseOptions, severity: "critical", channel: "slack" })

    const call = mockSlack.mock.calls[0][0]
    expect(call.title).toContain("🚨")
  })

  it("info → ℹ️ 이모지", async () => {
    mockSlack.mockResolvedValue(true)

    await sendAlert({ ...baseOptions, severity: "info", channel: "slack" })

    const call = mockSlack.mock.calls[0][0]
    expect(call.title).toContain("ℹ️")
  })

  // ── graceful skip ──

  it("Slack 미설정(false 반환) → success=false", async () => {
    mockSlack.mockResolvedValue(false)

    const result = await sendAlert({ ...baseOptions, channel: "slack" })

    expect(result.success).toBe(false)
    expect(result.channels.slack?.sent).toBe(false)
  })

  it("Email 미설정(false 반환) → success=false", async () => {
    mockEmail.mockResolvedValue(false)

    const result = await sendAlert({ ...baseOptions, channel: "email" })

    expect(result.success).toBe(false)
    expect(result.channels.email?.sent).toBe(false)
  })

  // ── error handling ──

  it("Slack 에러 시 error 필드에 메시지 포함", async () => {
    mockSlack.mockRejectedValue(new Error("Webhook timeout"))

    const result = await sendAlert({ ...baseOptions, channel: "slack" })

    expect(result.success).toBe(false)
    expect(result.channels.slack?.sent).toBe(false)
    expect(result.channels.slack?.error).toBe("Webhook timeout")
  })

  it("Email 에러 시 error 필드에 메시지 포함", async () => {
    mockEmail.mockRejectedValue(new Error("SendGrid 403"))

    const result = await sendAlert({ ...baseOptions, channel: "email" })

    expect(result.success).toBe(false)
    expect(result.channels.email?.sent).toBe(false)
    expect(result.channels.email?.error).toBe("SendGrid 403")
  })

  it("Slack 성공 + Email 실패 → success=true (하나라도 성공)", async () => {
    mockSlack.mockResolvedValue(true)
    mockEmail.mockRejectedValue(new Error("fail"))

    const result = await sendAlert(baseOptions)

    expect(result.success).toBe(true)
    expect(result.channels.slack?.sent).toBe(true)
    expect(result.channels.email?.sent).toBe(false)
  })

  // ── resourceUrl 전달 ──

  it("resourceUrl이 provider에 전달됨", async () => {
    mockSlack.mockResolvedValue(true)

    await sendAlert({
      ...baseOptions,
      channel: "slack",
      resourceUrl: "https://example.com/alert/123",
    })

    const call = mockSlack.mock.calls[0][0]
    expect(call.resourceUrl).toBe("https://example.com/alert/123")
  })
})
