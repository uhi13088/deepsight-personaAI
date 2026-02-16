import { describe, it, expect } from "vitest"
import {
  computeInteractionProvenance,
  computeRelayProvenance,
  isProvenanceQuarantined,
  determinePostSource,
  summarizeProvenance,
  INTERACTION_SOURCE_TRUST,
  SOURCE_MAPPING,
} from "@/lib/security/data-provenance"
import type { ProvenanceData } from "@/lib/security/data-provenance"

// ═══════════════════════════════════════════════════════════════
// computeInteractionProvenance
// ═══════════════════════════════════════════════════════════════

describe("computeInteractionProvenance", () => {
  it("DIRECT + depth=0 → trustLevel=0.8 (user_input base)", () => {
    const result = computeInteractionProvenance({ source: "DIRECT" })
    expect(result.trustLevel).toBe(0.8)
    expect(result.propagationDepth).toBe(0)
    expect(result.originPersonaId).toBeNull()
  })

  it("SYSTEM + depth=0 → trustLevel=0.9", () => {
    const result = computeInteractionProvenance({ source: "SYSTEM" })
    expect(result.trustLevel).toBe(0.9)
  })

  it("PERSONA_RELAY + depth=1 → trustLevel 감쇠", () => {
    const result = computeInteractionProvenance({
      source: "PERSONA_RELAY",
      propagationDepth: 1,
    })
    // persona_interaction base = 0.7, 1-hop decay = 0.7
    // 0.7 × 0.7 = 0.49
    expect(result.trustLevel).toBeCloseTo(0.49, 2)
  })

  it("EXTERNAL_FEED + depth=2 → 낮은 trustLevel", () => {
    const result = computeInteractionProvenance({
      source: "EXTERNAL_FEED",
      propagationDepth: 2,
    })
    // external_feed base = 0.5, 2-hop decay = 0.5
    // 0.5 × 0.5 = 0.25
    expect(result.trustLevel).toBeCloseTo(0.25, 2)
  })

  it("depth=3 → trustLevel=0 (격리)", () => {
    const result = computeInteractionProvenance({
      source: "DIRECT",
      propagationDepth: 3,
    })
    expect(result.trustLevel).toBe(0)
  })

  it("originPersonaId 지정", () => {
    const result = computeInteractionProvenance({
      source: "PERSONA_RELAY",
      originPersonaId: "persona-abc",
    })
    expect(result.originPersonaId).toBe("persona-abc")
  })

  it("originPersonaId 미지정 → null", () => {
    const result = computeInteractionProvenance({ source: "DIRECT" })
    expect(result.originPersonaId).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRelayProvenance
// ═══════════════════════════════════════════════════════════════

describe("computeRelayProvenance", () => {
  const original: ProvenanceData = {
    source: "DIRECT",
    trustLevel: 0.8,
    propagationDepth: 0,
    originPersonaId: null,
  }

  it("depth 증가", () => {
    const result = computeRelayProvenance(original, "relay-persona")
    expect(result.propagationDepth).toBe(1)
  })

  it("source → PERSONA_RELAY", () => {
    const result = computeRelayProvenance(original, "relay-persona")
    expect(result.source).toBe("PERSONA_RELAY")
  })

  it("originPersonaId: 원본이 null이면 relay persona", () => {
    const result = computeRelayProvenance(original, "relay-persona")
    expect(result.originPersonaId).toBe("relay-persona")
  })

  it("originPersonaId: 원본이 있으면 유지", () => {
    const withOrigin: ProvenanceData = {
      ...original,
      originPersonaId: "original-persona",
    }
    const result = computeRelayProvenance(withOrigin, "relay-persona")
    expect(result.originPersonaId).toBe("original-persona")
  })

  it("연속 전파 시 trustLevel 급감", () => {
    const hop1 = computeRelayProvenance(original, "p1")
    const hop2 = computeRelayProvenance(hop1, "p2")
    const hop3 = computeRelayProvenance(hop2, "p3")
    expect(hop3.trustLevel).toBe(0) // depth=3 → 격리
    expect(hop3.propagationDepth).toBe(3)
  })
})

// ═══════════════════════════════════════════════════════════════
// isProvenanceQuarantined
// ═══════════════════════════════════════════════════════════════

describe("isProvenanceQuarantined", () => {
  it("depth < 3 + trust > 0 → false", () => {
    expect(
      isProvenanceQuarantined({
        source: "DIRECT",
        trustLevel: 0.8,
        propagationDepth: 0,
        originPersonaId: null,
      })
    ).toBe(false)
  })

  it("depth >= 3 → true", () => {
    expect(
      isProvenanceQuarantined({
        source: "PERSONA_RELAY",
        trustLevel: 0,
        propagationDepth: 3,
        originPersonaId: "p1",
      })
    ).toBe(true)
  })

  it("trustLevel = 0 → true", () => {
    expect(
      isProvenanceQuarantined({
        source: "EXTERNAL_FEED",
        trustLevel: 0,
        propagationDepth: 2,
        originPersonaId: null,
      })
    ).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// determinePostSource
// ═══════════════════════════════════════════════════════════════

describe("determinePostSource", () => {
  it("기본 → AUTONOMOUS", () => {
    expect(
      determinePostSource({
        isScheduled: false,
        isArenaTest: false,
        isFeedInspired: false,
      })
    ).toBe("AUTONOMOUS")
  })

  it("스케줄 → SCHEDULED", () => {
    expect(
      determinePostSource({
        isScheduled: true,
        isArenaTest: false,
        isFeedInspired: false,
      })
    ).toBe("SCHEDULED")
  })

  it("아레나 → ARENA_TEST (우선)", () => {
    expect(
      determinePostSource({
        isScheduled: true,
        isArenaTest: true,
        isFeedInspired: true,
      })
    ).toBe("ARENA_TEST")
  })

  it("피드 영감 → FEED_INSPIRED", () => {
    expect(
      determinePostSource({
        isScheduled: false,
        isArenaTest: false,
        isFeedInspired: true,
      })
    ).toBe("FEED_INSPIRED")
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeProvenance
// ═══════════════════════════════════════════════════════════════

describe("summarizeProvenance", () => {
  it("빈 배열 → 기본값", () => {
    const result = summarizeProvenance([])
    expect(result.totalEntries).toBe(0)
    expect(result.averageTrust).toBe(0)
    expect(result.quarantinedCount).toBe(0)
  })

  it("소스별 카운트", () => {
    const entries: ProvenanceData[] = [
      { source: "DIRECT", trustLevel: 0.8, propagationDepth: 0, originPersonaId: null },
      { source: "DIRECT", trustLevel: 0.8, propagationDepth: 0, originPersonaId: null },
      { source: "PERSONA_RELAY", trustLevel: 0.5, propagationDepth: 1, originPersonaId: "p1" },
    ]
    const result = summarizeProvenance(entries)
    expect(result.bySource.DIRECT).toBe(2)
    expect(result.bySource.PERSONA_RELAY).toBe(1)
    expect(result.bySource.EXTERNAL_FEED).toBe(0)
  })

  it("평균 신뢰도 계산", () => {
    const entries: ProvenanceData[] = [
      { source: "DIRECT", trustLevel: 0.8, propagationDepth: 0, originPersonaId: null },
      { source: "EXTERNAL_FEED", trustLevel: 0.4, propagationDepth: 0, originPersonaId: null },
    ]
    const result = summarizeProvenance(entries)
    expect(result.averageTrust).toBeCloseTo(0.6, 2)
  })

  it("격리 건수 카운트", () => {
    const entries: ProvenanceData[] = [
      { source: "DIRECT", trustLevel: 0.8, propagationDepth: 0, originPersonaId: null },
      { source: "PERSONA_RELAY", trustLevel: 0, propagationDepth: 3, originPersonaId: "p1" },
      { source: "EXTERNAL_FEED", trustLevel: 0, propagationDepth: 4, originPersonaId: "p2" },
    ]
    const result = summarizeProvenance(entries)
    expect(result.quarantinedCount).toBe(2)
  })

  it("최대 전파 깊이", () => {
    const entries: ProvenanceData[] = [
      { source: "DIRECT", trustLevel: 0.8, propagationDepth: 0, originPersonaId: null },
      { source: "PERSONA_RELAY", trustLevel: 0.3, propagationDepth: 2, originPersonaId: "p1" },
    ]
    const result = summarizeProvenance(entries)
    expect(result.maxPropagationDepth).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("INTERACTION_SOURCE_TRUST: DIRECT가 가장 높음", () => {
    const values = Object.values(INTERACTION_SOURCE_TRUST)
    expect(INTERACTION_SOURCE_TRUST.DIRECT).toBe(Math.max(...values))
  })

  it("INTERACTION_SOURCE_TRUST: 모든 값이 0~1", () => {
    for (const v of Object.values(INTERACTION_SOURCE_TRUST)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it("SOURCE_MAPPING: 모든 InteractionSource 매핑됨", () => {
    expect(SOURCE_MAPPING.DIRECT).toBeDefined()
    expect(SOURCE_MAPPING.PERSONA_RELAY).toBeDefined()
    expect(SOURCE_MAPPING.EXTERNAL_FEED).toBeDefined()
    expect(SOURCE_MAPPING.SYSTEM).toBeDefined()
  })
})
