// ═══════════════════════════════════════════════════════════════
// Consumer Journey Simulator Tests
// T65: profile creation, simulation modes, virtual users,
//      data sources, API guide generation
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  CrossAxisProfile,
  ParadoxProfile,
} from "@/types"

import {
  createConsumerProfile,
  runSimulation,
  rankMatches,
  createSimulationRequest,
  generateVirtualUsers,
  resolveDataSource,
  generateIntegrationGuide,
  DATA_SOURCE_PRESETS,
  type ConsumerProfile,
  type SimulationMode,
  type SimulationConfig,
  type BasicSimulationData,
  type DetailedSimulationData,
  type ComparisonSimulationData,
  type MatchPreview,
  type DataSourceConfig,
  type VirtualUserConfig,
} from "@/lib/consumer-journey"

import type {
  PersonaCandidate,
  MatchResult,
  MatchingTier,
  MatchBreakdown,
} from "@/lib/matching/three-tier-engine"

import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"

// ── Test Fixtures ──────────────────────────────────────────────

const makeL1 = (base = 0.5): SocialPersonaVector => ({
  depth: base,
  lens: base + 0.1,
  stance: base - 0.1,
  scope: base,
  taste: base + 0.05,
  purpose: base,
  sociability: base - 0.05,
})

const makeL2 = (base = 0.5): CoreTemperamentVector => ({
  openness: base,
  conscientiousness: base + 0.1,
  extraversion: base - 0.1,
  agreeableness: base,
  neuroticism: base + 0.05,
})

const makeL3 = (base = 0.5): NarrativeDriveVector => ({
  lack: base,
  moralCompass: base + 0.1,
  volatility: base - 0.1,
  growthArc: base + 0.05,
})

function makePersonaCandidate(id: string, base = 0.5): PersonaCandidate {
  const l1 = makeL1(base)
  const l2 = makeL2(base)
  const l3 = makeL3(base)
  const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3, crossAxisProfile)

  return {
    id,
    name: `Persona ${id}`,
    archetype: "test_archetype",
    l1,
    l2,
    l3,
    crossAxisProfile,
    paradoxProfile,
  }
}

function makeConsumerProfile(label: string, base = 0.5): ConsumerProfile {
  return createConsumerProfile(
    label,
    { ageGroup: "20s", gender: "male" },
    { preferredGenres: ["SF"], contentHistory: [], traitKeywords: ["analytical"] },
    makeL1(base),
    makeL2(base),
    makeL3(base),
    "virtual_user",
    0.0
  )
}

// ═══════════════════════════════════════════════════════════════
// AC1: Profile Creation
// ═══════════════════════════════════════════════════════════════

describe("Consumer Journey — Profile Creation", () => {
  it("should create a consumer profile with all required fields", () => {
    const profile = makeConsumerProfile("Test User")
    expect(profile.id).toMatch(/^cp_/)
    expect(profile.label).toBe("Test User")
    expect(profile.demographics.ageGroup).toBe("20s")
    expect(profile.demographics.gender).toBe("male")
    expect(profile.interests.preferredGenres).toContain("SF")
    expect(profile.source).toBe("virtual_user")
    expect(profile.createdAt).toBeGreaterThan(0)
  })

  it("should compute vFinal, crossAxisProfile, and paradoxProfile", () => {
    const profile = makeConsumerProfile("Test User")
    expect(profile.vFinal).toBeDefined()
    expect(profile.vFinal.vector).toHaveLength(7)
    expect(profile.crossAxisProfile).toBeDefined()
    expect(profile.crossAxisProfile.axes.length).toBeGreaterThan(0)
    expect(profile.paradoxProfile).toBeDefined()
    expect(profile.paradoxProfile.overall).toBeGreaterThanOrEqual(0)
  })

  it("should default source to 'virtual_user'", () => {
    const profile = createConsumerProfile(
      "Default Source",
      { ageGroup: "30s", gender: "female" },
      { preferredGenres: [], contentHistory: [], traitKeywords: [] },
      makeL1(),
      makeL2(),
      makeL3()
    )
    expect(profile.source).toBe("virtual_user")
  })

  it("should generate unique IDs for distinct profiles", () => {
    const p1 = makeConsumerProfile("A")
    const p2 = makeConsumerProfile("B")
    expect(p1.id).not.toBe(p2.id)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Simulation Modes
// ═══════════════════════════════════════════════════════════════

describe("Consumer Journey — rankMatches", () => {
  it("should sort match results by score descending", () => {
    const personas = [makePersonaCandidate("p1"), makePersonaCandidate("p2")]
    const results: MatchResult[] = [
      {
        personaId: "p1",
        score: 0.7,
        tier: "basic" as MatchingTier,
        breakdown: {
          vectorScore: 0.7,
          crossAxisScore: 0,
          paradoxCompatibility: 0,
          qualitativeBonus: 0,
          trustBoost: 0,
        },
        explanation: "test",
      },
      {
        personaId: "p2",
        score: 0.9,
        tier: "basic" as MatchingTier,
        breakdown: {
          vectorScore: 0.9,
          crossAxisScore: 0,
          paradoxCompatibility: 0,
          qualitativeBonus: 0,
          trustBoost: 0,
        },
        explanation: "test",
      },
    ]

    const ranked = rankMatches(results, personas, 10)
    expect(ranked[0].personaId).toBe("p2")
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].personaId).toBe("p1")
    expect(ranked[1].rank).toBe(2)
  })

  it("should limit results to topN", () => {
    const personas = [
      makePersonaCandidate("p1"),
      makePersonaCandidate("p2"),
      makePersonaCandidate("p3"),
    ]
    const results: MatchResult[] = personas.map((p, i) => ({
      personaId: p.id,
      score: 0.5 + i * 0.1,
      tier: "basic" as MatchingTier,
      breakdown: {
        vectorScore: 0.5 + i * 0.1,
        crossAxisScore: 0,
        paradoxCompatibility: 0,
        qualitativeBonus: 0,
        trustBoost: 0,
      },
      explanation: "test",
    }))

    const ranked = rankMatches(results, personas, 2)
    expect(ranked).toHaveLength(2)
  })

  it("should map persona name and archetype correctly", () => {
    const personas = [makePersonaCandidate("p1")]
    const results: MatchResult[] = [
      {
        personaId: "p1",
        score: 0.8,
        tier: "basic" as MatchingTier,
        breakdown: {
          vectorScore: 0.8,
          crossAxisScore: 0,
          paradoxCompatibility: 0,
          qualitativeBonus: 0,
          trustBoost: 0,
        },
        explanation: "match explanation",
      },
    ]

    const ranked = rankMatches(results, personas, 5)
    expect(ranked[0].personaName).toBe("Persona p1")
    expect(ranked[0].archetype).toBe("test_archetype")
    expect(ranked[0].explanation).toBe("match explanation")
  })

  it("should use 'Unknown' for missing personas", () => {
    const results: MatchResult[] = [
      {
        personaId: "missing",
        score: 0.5,
        tier: "basic" as MatchingTier,
        breakdown: {
          vectorScore: 0.5,
          crossAxisScore: 0,
          paradoxCompatibility: 0,
          qualitativeBonus: 0,
          trustBoost: 0,
        },
        explanation: "test",
      },
    ]
    const ranked = rankMatches(results, [], 5)
    expect(ranked[0].personaName).toBe("Unknown")
    expect(ranked[0].archetype).toBeNull()
  })
})

describe("Consumer Journey — createSimulationRequest", () => {
  it("should create a request with default config", () => {
    const profile = makeConsumerProfile("User A")
    const personas = [makePersonaCandidate("p1")]
    const request = createSimulationRequest("basic", [profile], personas)

    expect(request.id).toMatch(/^req_/)
    expect(request.mode).toBe("basic")
    expect(request.profiles).toHaveLength(1)
    expect(request.personaCandidates).toHaveLength(1)
    expect(request.config.topN).toBe(5)
    expect(request.config.includeExploration).toBe(true)
    expect(request.config.pressureLevel).toBe(0.0)
  })

  it("should allow partial config overrides", () => {
    const request = createSimulationRequest(
      "detailed",
      [makeConsumerProfile("User")],
      [makePersonaCandidate("p1")],
      { topN: 10, pressureLevel: 0.5 }
    )
    expect(request.config.topN).toBe(10)
    expect(request.config.pressureLevel).toBe(0.5)
    expect(request.config.includeExploration).toBe(true) // default preserved
  })
})

describe("Consumer Journey — runSimulation (basic)", () => {
  it("should return basic simulation data with top matches", () => {
    const profile = makeConsumerProfile("User", 0.5)
    const personas = [makePersonaCandidate("p1", 0.5), makePersonaCandidate("p2", 0.8)]
    const request = createSimulationRequest("basic", [profile], personas)

    const result = runSimulation(request)
    expect(result.id).toMatch(/^sim_/)
    expect(result.requestId).toBe(request.id)
    expect(result.mode).toBe("basic")
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)

    const data = result.data as BasicSimulationData
    expect(data.kind).toBe("basic")
    expect(data.totalCandidates).toBe(2)
    expect(data.topMatches.length).toBeGreaterThan(0)
    expect(data.topMatches.length).toBeLessThanOrEqual(5)
  })
})

describe("Consumer Journey — runSimulation (detailed)", () => {
  it("should return detailed simulation data with dimension analysis", () => {
    const profile = makeConsumerProfile("Detailed User", 0.6)
    const personas = [makePersonaCandidate("p1", 0.5)]
    const request = createSimulationRequest("detailed", [profile], personas)

    const result = runSimulation(request)
    const data = result.data as DetailedSimulationData
    expect(data.kind).toBe("detailed")
    expect(data.dimensionAnalysis.length).toBeGreaterThan(0)
    expect(data.paradoxAnalysis).toBeDefined()
    expect(data.pressureEffects.length).toBe(5) // 5 pressure levels
    expect(data.crossAxisHighlights).toBeDefined()
  })

  it("should calculate dimension analysis for L1/L2/L3", () => {
    const profile = makeConsumerProfile("Analysis User", 0.4)
    const personas = [makePersonaCandidate("p1", 0.6)]
    const request = createSimulationRequest("detailed", [profile], personas)

    const result = runSimulation(request)
    const data = result.data as DetailedSimulationData
    const layers = new Set(data.dimensionAnalysis.map((d) => d.layer))
    expect(layers.has("L1")).toBe(true)
    expect(layers.has("L2")).toBe(true)
    expect(layers.has("L3")).toBe(true)
    // 7 + 5 + 4 = 16 dimensions total
    expect(data.dimensionAnalysis).toHaveLength(16)
  })

  it("should handle no persona candidates for detailed mode", () => {
    const profile = makeConsumerProfile("Empty User")
    const request = createSimulationRequest("detailed", [profile], [])

    const result = runSimulation(request)
    const data = result.data as DetailedSimulationData
    expect(data.dimensionAnalysis).toHaveLength(0)
    expect(data.paradoxAnalysis.analysis).toContain("분석 대상 페르소나가 없습니다")
    expect(data.pressureEffects).toHaveLength(0)
  })
})

describe("Consumer Journey — runSimulation (comparison)", () => {
  it("should return comparison data for multiple profiles", () => {
    const profiles = [makeConsumerProfile("User A", 0.3), makeConsumerProfile("User B", 0.7)]
    const personas = [makePersonaCandidate("p1", 0.5)]
    const request = createSimulationRequest("comparison", profiles, personas)

    const result = runSimulation(request)
    const data = result.data as ComparisonSimulationData
    expect(data.kind).toBe("comparison")
    expect(data.profiles).toHaveLength(2)
    expect(data.perProfileResults).toHaveLength(2)
    expect(data.overlapAnalysis).toBeDefined()
  })

  it("should calculate profile similarity for 2 profiles", () => {
    const profiles = [makeConsumerProfile("X", 0.5), makeConsumerProfile("Y", 0.5)]
    const personas = [makePersonaCandidate("p1", 0.5)]
    const request = createSimulationRequest("comparison", profiles, personas)

    const result = runSimulation(request)
    const data = result.data as ComparisonSimulationData
    expect(data.overlapAnalysis.profileSimilarity).toBeGreaterThan(0)
  })

  it("should identify divergent dimensions sorted by spread", () => {
    const profiles = [makeConsumerProfile("A", 0.2), makeConsumerProfile("B", 0.8)]
    const personas = [makePersonaCandidate("p1")]
    const request = createSimulationRequest("comparison", profiles, personas)

    const result = runSimulation(request)
    const data = result.data as ComparisonSimulationData
    expect(data.overlapAnalysis.divergentDimensions.length).toBeGreaterThan(0)
    // Verify sorted by spread descending
    for (let i = 1; i < data.overlapAnalysis.divergentDimensions.length; i++) {
      expect(data.overlapAnalysis.divergentDimensions[i - 1].spread).toBeGreaterThanOrEqual(
        data.overlapAnalysis.divergentDimensions[i].spread
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Virtual User Generation & Data Sources
// ═══════════════════════════════════════════════════════════════

describe("Consumer Journey — generateVirtualUsers", () => {
  it("should generate the requested number of virtual users (uniform)", () => {
    const config: VirtualUserConfig = { count: 5, distributionMode: "uniform" }
    const users = generateVirtualUsers(config)
    expect(users).toHaveLength(5)
    users.forEach((u) => {
      expect(u.source).toBe("virtual_user")
      expect(u.label).toMatch(/^Virtual User/)
    })
  })

  it("should generate virtual users with gaussian distribution", () => {
    const config: VirtualUserConfig = {
      count: 10,
      distributionMode: "gaussian",
      gaussianParams: { mean: 0.5, stdDev: 0.15 },
    }
    const users = generateVirtualUsers(config)
    expect(users).toHaveLength(10)
    // All vector values should be in [0, 1]
    users.forEach((u) => {
      expect(u.l1.depth).toBeGreaterThanOrEqual(0)
      expect(u.l1.depth).toBeLessThanOrEqual(1)
    })
  })

  it("should generate virtual users with clustered distribution", () => {
    const config: VirtualUserConfig = {
      count: 3,
      distributionMode: "clustered",
      clusterParams: { clusterCount: 2, spread: 0.1 },
    }
    const users = generateVirtualUsers(config)
    expect(users).toHaveLength(3)
  })

  it("should use custom demographics when provided", () => {
    const config: VirtualUserConfig = {
      count: 5,
      distributionMode: "uniform",
      demographics: { ageGroups: ["30s"], genders: ["female"] },
    }
    const users = generateVirtualUsers(config)
    users.forEach((u) => {
      expect(u.demographics.ageGroup).toBe("30s")
      expect(u.demographics.gender).toBe("female")
    })
  })

  it("should use custom genres and traitKeywords", () => {
    const config: VirtualUserConfig = {
      count: 2,
      distributionMode: "uniform",
      genres: ["comedy", "drama"],
      traitKeywords: ["creative"],
    }
    const users = generateVirtualUsers(config)
    users.forEach((u) => {
      expect(u.interests.preferredGenres).toEqual(["comedy", "drama"])
      expect(u.interests.traitKeywords).toEqual(["creative"])
    })
  })
})

describe("Consumer Journey — Data Sources", () => {
  it("should have correct presets defined", () => {
    expect(DATA_SOURCE_PRESETS.activePersonas).toBeDefined()
    expect(DATA_SOURCE_PRESETS.allPersonas).toBeDefined()
    expect(DATA_SOURCE_PRESETS.virtualRandom).toBeDefined()
    expect(DATA_SOURCE_PRESETS.virtualGaussian).toBeDefined()
    expect(DATA_SOURCE_PRESETS.syntheticFromArchetype).toBeDefined()
  })

  it("should resolve real_persona data source without virtual users", () => {
    const resolved = resolveDataSource(DATA_SOURCE_PRESETS.activePersonas)
    expect(resolved.sourceType).toBe("real_persona")
    expect(resolved.virtualUsers).toHaveLength(0)
    expect(resolved.personaFilter).toBeDefined()
    expect(resolved.personaFilter?.statuses).toContain("ACTIVE")
  })

  it("should resolve virtual_user data source and generate users", () => {
    const resolved = resolveDataSource(DATA_SOURCE_PRESETS.virtualRandom)
    expect(resolved.sourceType).toBe("virtual_user")
    expect(resolved.virtualUsers).toHaveLength(50)
    expect(resolved.personaFilter).toBeNull()
  })

  it("should resolve synthetic data source and generate users", () => {
    const resolved = resolveDataSource(DATA_SOURCE_PRESETS.syntheticFromArchetype)
    expect(resolved.sourceType).toBe("synthetic")
    expect(resolved.virtualUsers).toHaveLength(20)
    resolved.virtualUsers.forEach((u) => {
      expect(u.source).toBe("synthetic")
      expect(u.label).toContain("Synthetic")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: API Integration Guide
// ═══════════════════════════════════════════════════════════════

describe("Consumer Journey — generateIntegrationGuide", () => {
  it("should generate a complete guide with defaults", () => {
    const guide = generateIntegrationGuide()
    expect(guide.version).toBe("v1")
    expect(guide.baseUrl).toBe("https://api.deepsight.ai")
    expect(guide.title).toContain("DeepSight")
    expect(guide.authentication.type).toBe("api_key")
    expect(guide.authentication.headerName).toBe("X-DeepSight-API-Key")
  })

  it("should use custom baseUrl and version", () => {
    const guide = generateIntegrationGuide({ baseUrl: "https://custom.api.com", version: "v2" })
    expect(guide.baseUrl).toBe("https://custom.api.com")
    expect(guide.version).toBe("v2")
  })

  it("should contain at least 5 endpoints", () => {
    const guide = generateIntegrationGuide()
    expect(guide.endpoints.length).toBeGreaterThanOrEqual(5)
  })

  it("should have match, reviews, recommend endpoints", () => {
    const guide = generateIntegrationGuide()
    const paths = guide.endpoints.map((e) => e.path)
    expect(paths.some((p) => p.includes("match"))).toBe(true)
    expect(paths.some((p) => p.includes("reviews"))).toBe(true)
    expect(paths.some((p) => p.includes("recommend"))).toBe(true)
  })

  it("should have SDK examples for ts/python/curl", () => {
    const guide = generateIntegrationGuide()
    const languages = guide.sdkExamples.map((e) => e.language)
    expect(languages).toContain("typescript")
    expect(languages).toContain("python")
    expect(languages).toContain("curl")
  })

  it("should have webhooks defined", () => {
    const guide = generateIntegrationGuide()
    expect(guide.webhooks.length).toBeGreaterThan(0)
    const events = guide.webhooks.map((w) => w.event)
    expect(events).toContain("match.completed")
  })

  it("should have error codes defined", () => {
    const guide = generateIntegrationGuide()
    expect(guide.errorCodes.length).toBeGreaterThanOrEqual(5)
    const codes = guide.errorCodes.map((e) => e.code)
    expect(codes).toContain("AUTH_INVALID_KEY")
    expect(codes).toContain("AUTH_RATE_LIMITED")
  })

  it("should have rate limit info", () => {
    const guide = generateIntegrationGuide()
    expect(guide.rateLimits.defaultLimit).toContain("1,000")
    expect(Object.keys(guide.rateLimits.perEndpoint).length).toBeGreaterThan(0)
  })

  it("should have changelog entries", () => {
    const guide = generateIntegrationGuide()
    expect(guide.changelog.length).toBeGreaterThan(0)
    expect(guide.changelog[0].version).toBe("v1.0.0")
  })
})
