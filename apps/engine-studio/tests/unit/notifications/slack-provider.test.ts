import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sendSlackAlert } from "@/lib/notifications/slack-provider"

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("sendSlackAlert", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("SLACK_WEBHOOK_URL 미설정 → false 반환 (graceful skip)", async () => {
    delete process.env.SLACK_WEBHOOK_URL

    const result = await sendSlackAlert({
      title: "Test",
      body: "test body",
      severity: "info",
    })

    expect(result).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("정상 전송 → true 반환", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test"
    mockFetch.mockResolvedValue({ ok: true })

    const result = await sendSlackAlert({
      title: "🚨 Alert",
      body: "Something happened",
      severity: "critical",
    })

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://hooks.slack.com/test")
    expect(options.method).toBe("POST")

    const payload = JSON.parse(options.body)
    expect(payload.attachments[0].color).toBe("#FF0000") // critical
    expect(payload.attachments[0].blocks[0].text.text).toContain("Something happened")
  })

  it("severity별 색상 매핑", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test"
    mockFetch.mockResolvedValue({ ok: true })

    await sendSlackAlert({ title: "T", body: "B", severity: "warning" })
    const payload1 = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(payload1.attachments[0].color).toBe("#FFA500")

    await sendSlackAlert({ title: "T", body: "B", severity: "info" })
    const payload2 = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(payload2.attachments[0].color).toBe("#0099FF")
  })

  it("resourceUrl 있으면 View Details 링크 블록 추가", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test"
    mockFetch.mockResolvedValue({ ok: true })

    await sendSlackAlert({
      title: "T",
      body: "B",
      severity: "info",
      resourceUrl: "https://example.com/details",
    })

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(payload.attachments[0].blocks).toHaveLength(2)
    expect(payload.attachments[0].blocks[1].text.text).toContain("View Details")
  })

  it("Webhook 실패(non-ok) → Error throw", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test"
    mockFetch.mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" })

    await expect(sendSlackAlert({ title: "T", body: "B", severity: "critical" })).rejects.toThrow(
      "Slack webhook failed: 403 Forbidden"
    )
  })
})
