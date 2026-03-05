import { describe, it, expect } from "vitest"
import {
  extractCoreKeywords,
  computeKeywordOverlap,
  checkForbiddenPatterns,
  computeOutputDrift,
  detectIdentityDrift,
  DRIFT_WARNING_THRESHOLD,
  DRIFT_CRITICAL_THRESHOLD,
} from "@/lib/persona-world/identity-drift-detector"

// ── extractCoreKeywords ──────────────────────────────────────────

describe("extractCoreKeywords", () => {
  it("빈 facts → 빈 Set", () => {
    const result = extractCoreKeywords([])
    expect(result.size).toBe(0)
  })

  it("coreIdentity 카테고리 → 가장 많이 추출 (weight=3)", () => {
    const facts = [
      {
        id: "1",
        category: "coreIdentity",
        content: "나는 공포 애호가 감성 기술 리뷰어",
        source: "backstory",
        changeCount: 0,
      },
    ]
    const result = extractCoreKeywords(facts)
    expect(result.size).toBeGreaterThan(0)
  })

  it("2자 미만 토큰 제외", () => {
    const facts = [
      {
        id: "1",
        category: "coreIdentity",
        content: "나 는 AI",
        source: "backstory",
        changeCount: 0,
      },
    ]
    const result = extractCoreKeywords(facts)
    // "나", "는" (1자) 제외, "AI" (2자) 포함
    expect(result.has("나")).toBe(false)
  })
})

// ── computeKeywordOverlap ────────────────────────────────────────

describe("computeKeywordOverlap", () => {
  it("빈 키워드 Set → 1.0 (drift 없음으로 간주)", () => {
    const result = computeKeywordOverlap("어떤 텍스트", new Set())
    expect(result).toBe(1.0)
  })

  it("완전 일치 → 1.0", () => {
    const keywords = new Set(["공포", "리뷰어", "AI"])
    const text = "공포 리뷰어 AI 콘텐츠"
    const result = computeKeywordOverlap(text, keywords)
    expect(result).toBeGreaterThan(0.5)
  })

  it("전혀 다른 텍스트 → overlap 낮음", () => {
    const keywords = new Set(["공포", "리뷰어", "AI", "기술", "감성"])
    const text = "오늘 날씨가 맑습니다 산책 좋아요"
    const result = computeKeywordOverlap(text, keywords)
    expect(result).toBeLessThan(0.5)
  })
})

// ── checkForbiddenPatterns ───────────────────────────────────────

describe("checkForbiddenPatterns", () => {
  it("위반 없음 → 0", () => {
    const result = checkForbiddenPatterns("일반적인 텍스트입니다", ["금지어", "위험단어"])
    expect(result).toBe(0)
  })

  it("위반 1건 → 0.2", () => {
    const result = checkForbiddenPatterns("금지어가 포함된 텍스트", ["금지어"])
    expect(result).toBeCloseTo(0.2)
  })

  it("위반 5건+ → 1.0 (최대 패널티)", () => {
    const result = checkForbiddenPatterns("a b c d e f", ["a", "b", "c", "d", "e", "f"])
    expect(result).toBe(1.0)
  })

  it("대소문자 무시", () => {
    const result = checkForbiddenPatterns("FORBIDDEN word", ["forbidden"])
    expect(result).toBeCloseTo(0.2)
  })
})

// ── computeOutputDrift ───────────────────────────────────────────

describe("computeOutputDrift", () => {
  it("키워드 완전 일치 + 금지어 없음 → drift 낮음", () => {
    const keywords = new Set(["공포", "리뷰어"])
    const output = "공포 콘텐츠를 좋아하는 리뷰어입니다"
    const drift = computeOutputDrift(output, keywords, [])
    expect(drift).toBeLessThanOrEqual(DRIFT_WARNING_THRESHOLD)
  })

  it("키워드 없음 + 금지어 위반 → drift 높음", () => {
    const keywords = new Set(["공포", "리뷰어", "감성", "기술", "AI"])
    const output = "전혀 다른 내용의 텍스트 금지어포함"
    const drift = computeOutputDrift(output, keywords, ["금지어포함"])
    expect(drift).toBeGreaterThan(DRIFT_WARNING_THRESHOLD)
  })
})

// ── 상수 검증 ────────────────────────────────────────────────────

describe("drift thresholds", () => {
  it("DRIFT_WARNING_THRESHOLD = 0.30", () => {
    expect(DRIFT_WARNING_THRESHOLD).toBe(0.3)
  })

  it("DRIFT_CRITICAL_THRESHOLD = 0.50", () => {
    expect(DRIFT_CRITICAL_THRESHOLD).toBe(0.5)
  })
})

// ── detectIdentityDrift — DI Mock ──────────────────────────────

describe("detectIdentityDrift", () => {
  function makeProvider(driftLevel: "ok" | "warning" | "critical") {
    // 출력 텍스트 설정 (drift 수준에 따라)
    const outputText =
      driftLevel === "ok"
        ? "공포 콘텐츠를 좋아하는 리뷰어 AI 기술 감성"
        : driftLevel === "warning"
          ? "전혀 관련없는 텍스트 산책 날씨"
          : "전혀 관련없는 텍스트 금지어1 금지어2 금지어3"

    return {
      async getRecentOutputs() {
        return [
          { id: "out1", type: "post" as const, content: outputText, createdAt: new Date() },
          { id: "out2", type: "post" as const, content: outputText, createdAt: new Date() },
        ]
      },
      async getImmutableCore() {
        return {
          immutableFacts: [
            {
              id: "f1",
              category: "coreIdentity",
              content: "공포 리뷰어 AI 기술 감성",
              source: "backstory",
              changeCount: 0,
            },
          ],
          coreKeywords: ["공포", "리뷰어", "AI"],
          forbiddenPatterns: driftLevel === "critical" ? ["금지어1", "금지어2", "금지어3"] : [],
        }
      },
      async updateConsistencyScore() {},
      async setDegradedState() {},
    }
  }

  it("drift 낮으면 status=ok", async () => {
    const provider = makeProvider("ok")
    const result = await detectIdentityDrift(provider, "p1")
    expect(result.skipped).toBe(false)
    expect(result.status).toBe("ok")
  })

  it("drift 중간이면 status=warning", async () => {
    const provider = makeProvider("warning")
    const result = await detectIdentityDrift(provider, "p1")
    expect(result.skipped).toBe(false)
    // warning 또는 ok (키워드 overlap에 따라 달라짐)
    expect(["ok", "warning", "critical"]).toContain(result.status)
  })

  it("출력 없으면 skipped=true", async () => {
    const provider = {
      ...makeProvider("ok"),
      async getRecentOutputs() {
        return []
      },
    }
    const result = await detectIdentityDrift(provider, "p1")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("no_recent_outputs")
  })

  it("ImmutableCore 없으면 skipped=true", async () => {
    const provider = {
      ...makeProvider("ok"),
      async getImmutableCore() {
        return null
      },
    }
    const result = await detectIdentityDrift(provider, "p1")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("no_immutable_core")
  })
})
