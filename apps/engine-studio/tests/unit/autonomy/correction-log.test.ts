import { describe, it, expect } from "vitest"
import {
  buildCorrectionLog,
  detectOverCorrection,
  buildPatchSummary,
  type AutonomyCorrectionLog,
} from "@/lib/autonomy/correction-log"

function makeLogs(category: string, count: number, hoursAgo: number = 0): AutonomyCorrectionLog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    personaId: "p1",
    sessionId: "s1",
    severity: "minor" as const,
    confidence: 0.9,
    category: category as AutonomyCorrectionLog["category"],
    patchSummary: "test",
    pisBeforeCorrection: 0.8,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000 + i * 1000),
  }))
}

describe("buildCorrectionLog", () => {
  it("입력으로부터 로그 데이터 생성", () => {
    const log = buildCorrectionLog({
      personaId: "p1",
      sessionId: "s1",
      severity: "major",
      confidence: 0.92,
      category: "voice",
      patchSummary: "[voice] 2개 오퍼레이션",
      pisBeforeCorrection: 0.75,
    })
    expect(log.personaId).toBe("p1")
    expect(log.severity).toBe("major")
    expect(log.reviewed).toBe(false)
    expect(log.reviewedBy).toBeNull()
  })
})

describe("detectOverCorrection", () => {
  it("같은 카테고리 3회/24h → 과교정 감지", () => {
    const logs = makeLogs("voice", 3)
    const result = detectOverCorrection(logs)
    expect(result.detected).toBe(true)
    expect(result.category).toBe("voice")
    expect(result.reason).toContain("voice")
  })

  it("같은 카테고리 2회 → 감지 안 됨", () => {
    const logs = makeLogs("voice", 2)
    const result = detectOverCorrection(logs)
    expect(result.detected).toBe(false)
  })

  it("서로 다른 카테고리 3회 → 감지 안 됨", () => {
    const logs = [...makeLogs("voice", 1), ...makeLogs("consistency", 1), ...makeLogs("l2", 1)]
    const result = detectOverCorrection(logs)
    expect(result.detected).toBe(false)
  })

  it("24h 밖의 로그는 제외", () => {
    const logs = makeLogs("voice", 3, 25) // 25시간 전
    const result = detectOverCorrection(logs)
    expect(result.detected).toBe(false)
  })
})

describe("buildPatchSummary", () => {
  it("패치 요약 문자열 생성", () => {
    const summary = buildPatchSummary({
      category: "voice",
      operationCount: 2,
      fields: ["speechStyle", "habitualExpressions"],
    })
    expect(summary).toBe("[voice] 2개 오퍼레이션 — speechStyle, habitualExpressions")
  })
})
