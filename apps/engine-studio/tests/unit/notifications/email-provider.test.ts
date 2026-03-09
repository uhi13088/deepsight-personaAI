import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sendEmailAlert } from "@/lib/notifications/email-provider"

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("sendEmailAlert", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("SENDGRID_API_KEY 미설정 → false 반환 (graceful skip)", async () => {
    delete process.env.SENDGRID_API_KEY
    process.env.ALERT_EMAIL_TO = "admin@example.com"

    const result = await sendEmailAlert({
      title: "Test",
      body: "body",
      severity: "info",
      category: "system",
    })

    expect(result).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("ALERT_EMAIL_TO 미설정 → false 반환", async () => {
    process.env.SENDGRID_API_KEY = "SG.test-key"
    delete process.env.ALERT_EMAIL_TO

    const result = await sendEmailAlert({
      title: "Test",
      body: "body",
      severity: "info",
      category: "system",
    })

    expect(result).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("정상 전송 → true 반환", async () => {
    process.env.SENDGRID_API_KEY = "SG.test-key"
    process.env.ALERT_EMAIL_TO = "admin@example.com"
    mockFetch.mockResolvedValue({ ok: true })

    const result = await sendEmailAlert({
      title: "🚨 Alert",
      body: "Cost exceeded",
      severity: "critical",
      category: "cost",
    })

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send")
    expect(options.headers.Authorization).toBe("Bearer SG.test-key")

    const payload = JSON.parse(options.body)
    expect(payload.personalizations[0].to).toEqual([{ email: "admin@example.com" }])
    expect(payload.subject).toBe("🚨 Alert")
    expect(payload.content[0].value).toContain("Cost exceeded")
    expect(payload.content[1].type).toBe("text/html")
  })

  it("복수 수신자 파싱 (쉼표 구분)", async () => {
    process.env.SENDGRID_API_KEY = "SG.test-key"
    process.env.ALERT_EMAIL_TO = "a@ex.com, b@ex.com, c@ex.com"
    mockFetch.mockResolvedValue({ ok: true })

    await sendEmailAlert({
      title: "T",
      body: "B",
      severity: "warning",
      category: "quality",
    })

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(payload.personalizations[0].to).toEqual([
      { email: "a@ex.com" },
      { email: "b@ex.com" },
      { email: "c@ex.com" },
    ])
  })

  it("ALERT_EMAIL_FROM 커스텀 발신자", async () => {
    process.env.SENDGRID_API_KEY = "SG.test-key"
    process.env.ALERT_EMAIL_TO = "admin@example.com"
    process.env.ALERT_EMAIL_FROM = "custom@deepsight.ai"
    mockFetch.mockResolvedValue({ ok: true })

    await sendEmailAlert({
      title: "T",
      body: "B",
      severity: "info",
      category: "system",
    })

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(payload.from.email).toBe("custom@deepsight.ai")
  })

  it("SendGrid 실패 → Error throw", async () => {
    process.env.SENDGRID_API_KEY = "SG.test-key"
    process.env.ALERT_EMAIL_TO = "admin@example.com"
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    })

    await expect(
      sendEmailAlert({ title: "T", body: "B", severity: "critical", category: "security" })
    ).rejects.toThrow("SendGrid failed: 403 Forbidden")
  })

  it("resourceUrl → HTML에 링크 포함", async () => {
    process.env.SENDGRID_API_KEY = "SG.test-key"
    process.env.ALERT_EMAIL_TO = "admin@example.com"
    mockFetch.mockResolvedValue({ ok: true })

    await sendEmailAlert({
      title: "T",
      body: "B",
      severity: "info",
      category: "system",
      resourceUrl: "https://example.com/resource/1",
    })

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
    const html = payload.content[1].value
    expect(html).toContain("https://example.com/resource/1")
    expect(html).toContain("View Details")
  })
})
