import { describe, it, expect } from "vitest"
import {
  buildAdjacencyMap,
  extractNodeIds,
  computeNodeDegree,
  computeClusteringCoefficient,
  computeNodeMetrics,
  computeAllNodeMetrics,
  computeGraphStats,
  classifyNode,
  detectHubs,
  detectIsolates,
  detectAnomalies,
  getEnabledModulesForFeature,
  validateSocialModuleConfig,
  DEFAULT_SOCIAL_MODULE_CONFIG,
  FEATURE_BINDINGS,
  ISOLATE_MAX_DEGREE,
  CONNECTION_SPIKE_THRESHOLD,
  TENSION_CLUSTER_THRESHOLD,
  BOT_PATTERN_VARIANCE_THRESHOLD,
} from "@/lib/social-module/connectivity"
import type { RelationshipEdge, NodeMetrics, SocialModuleConfig } from "@/lib/social-module/types"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeEdge(
  sourceId: string,
  targetId: string,
  overrides: Partial<RelationshipEdge> = {}
): RelationshipEdge {
  return {
    sourceId,
    targetId,
    warmth: 0.5,
    tension: 0.1,
    frequency: 0.3,
    depth: 0.2,
    lastInteractionAt: Date.now(),
    ...overrides,
  }
}

/** 삼각형 그래프: A→B, B→C, A→C */
function makeTriangleGraph(): RelationshipEdge[] {
  return [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("A", "C")]
}

/** 스타 그래프: Hub → A, B, C, D */
function makeStarGraph(): RelationshipEdge[] {
  return [
    makeEdge("Hub", "A"),
    makeEdge("Hub", "B"),
    makeEdge("Hub", "C"),
    makeEdge("Hub", "D"),
    makeEdge("A", "Hub"),
    makeEdge("B", "Hub"),
    makeEdge("C", "Hub"),
    makeEdge("D", "Hub"),
  ]
}

/** 체인 그래프: A→B→C→D */
function makeChainGraph(): RelationshipEdge[] {
  return [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("C", "D")]
}

// ═══════════════════════════════════════════════════════════════
// buildAdjacencyMap
// ═══════════════════════════════════════════════════════════════

describe("buildAdjacencyMap", () => {
  it("빈 엣지 → 빈 맵", () => {
    const map = buildAdjacencyMap([])
    expect(map.size).toBe(0)
  })

  it("엣지 → source 기준 인접 리스트", () => {
    const edges = makeTriangleGraph()
    const map = buildAdjacencyMap(edges)
    expect(map.get("A")!.length).toBe(2) // A→B, A→C
    expect(map.get("B")!.length).toBe(1) // B→C
    expect(map.has("C")).toBe(true) // target으로 등록
  })

  it("target 노드도 등록", () => {
    const edges = [makeEdge("A", "B")]
    const map = buildAdjacencyMap(edges)
    expect(map.has("B")).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// extractNodeIds
// ═══════════════════════════════════════════════════════════════

describe("extractNodeIds", () => {
  it("빈 배열 → 빈 결과", () => {
    expect(extractNodeIds([])).toHaveLength(0)
  })

  it("중복 제거", () => {
    const edges = makeTriangleGraph()
    const ids = extractNodeIds(edges)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })

  it("source와 target 모두 포함", () => {
    const ids = extractNodeIds([makeEdge("X", "Y")])
    expect(ids).toContain("X")
    expect(ids).toContain("Y")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeNodeDegree
// ═══════════════════════════════════════════════════════════════

describe("computeNodeDegree", () => {
  it("스타 그래프 Hub → in=4, out=4", () => {
    const edges = makeStarGraph()
    const { inDegree, outDegree } = computeNodeDegree("Hub", edges)
    expect(outDegree).toBe(4) // Hub→A,B,C,D
    expect(inDegree).toBe(4) // A,B,C,D→Hub
  })

  it("스타 그래프 Leaf → in=1, out=1", () => {
    const edges = makeStarGraph()
    const { inDegree, outDegree } = computeNodeDegree("A", edges)
    expect(outDegree).toBe(1) // A→Hub
    expect(inDegree).toBe(1) // Hub→A
  })

  it("고립 노드 → in=0, out=0", () => {
    const { inDegree, outDegree } = computeNodeDegree("X", [])
    expect(inDegree).toBe(0)
    expect(outDegree).toBe(0)
  })

  it("체인 그래프 중간 노드", () => {
    const edges = makeChainGraph()
    const { inDegree, outDegree } = computeNodeDegree("B", edges)
    expect(inDegree).toBe(1) // A→B
    expect(outDegree).toBe(1) // B→C
  })
})

// ═══════════════════════════════════════════════════════════════
// computeClusteringCoefficient
// ═══════════════════════════════════════════════════════════════

describe("computeClusteringCoefficient", () => {
  it("삼각형 → CC = 1.0", () => {
    const edges = makeTriangleGraph()
    // A의 이웃: B, C. B↔C 연결 있음 → 1/1 = 1.0
    const cc = computeClusteringCoefficient("A", edges)
    expect(cc).toBe(1.0)
  })

  it("스타 그래프 Hub → CC = 0 (이웃간 연결 없음)", () => {
    const edges = makeStarGraph()
    const cc = computeClusteringCoefficient("Hub", edges)
    expect(cc).toBe(0) // A,B,C,D 사이 연결 없음
  })

  it("이웃 1명 → CC = 0", () => {
    const edges = [makeEdge("A", "B")]
    const cc = computeClusteringCoefficient("A", edges)
    expect(cc).toBe(0) // 2명 이상 필요
  })

  it("고립 노드 → CC = 0", () => {
    expect(computeClusteringCoefficient("X", [])).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeNodeMetrics
// ═══════════════════════════════════════════════════════════════

describe("computeNodeMetrics", () => {
  it("삼각형 노드 A 메트릭", () => {
    const edges = makeTriangleGraph()
    const metrics = computeNodeMetrics("A", edges)
    expect(metrics.personaId).toBe("A")
    expect(metrics.outDegree).toBe(2) // A→B, A→C
    expect(metrics.inDegree).toBe(0)
    expect(metrics.totalDegree).toBe(2)
    expect(metrics.avgWarmth).toBe(0.5)
    expect(metrics.clusteringCoefficient).toBe(1.0)
    expect(metrics.connectivityScore).toBeGreaterThan(0)
  })

  it("고립 노드 → 모든 메트릭 0", () => {
    const metrics = computeNodeMetrics("X", [])
    expect(metrics.totalDegree).toBe(0)
    expect(metrics.avgWarmth).toBe(0)
    expect(metrics.connectivityScore).toBeGreaterThanOrEqual(0)
  })

  it("connectivityScore 0~1 범위", () => {
    const edges = makeStarGraph()
    const metrics = computeNodeMetrics("Hub", edges)
    expect(metrics.connectivityScore).toBeGreaterThanOrEqual(0)
    expect(metrics.connectivityScore).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeAllNodeMetrics
// ═══════════════════════════════════════════════════════════════

describe("computeAllNodeMetrics", () => {
  it("삼각형 → 3개 노드 메트릭", () => {
    const metrics = computeAllNodeMetrics(makeTriangleGraph())
    expect(metrics).toHaveLength(3)
  })

  it("빈 그래프 → 빈 결과", () => {
    expect(computeAllNodeMetrics([])).toHaveLength(0)
  })

  it("스타 그래프 → 5개 노드", () => {
    const metrics = computeAllNodeMetrics(makeStarGraph())
    expect(metrics).toHaveLength(5) // Hub + A,B,C,D
  })
})

// ═══════════════════════════════════════════════════════════════
// computeGraphStats
// ═══════════════════════════════════════════════════════════════

describe("computeGraphStats", () => {
  it("빈 그래프 → 0 통계", () => {
    const stats = computeGraphStats([])
    expect(stats.totalNodes).toBe(0)
    expect(stats.totalEdges).toBe(0)
    expect(stats.density).toBe(0)
  })

  it("삼각형 그래프 통계", () => {
    const stats = computeGraphStats(makeTriangleGraph())
    expect(stats.totalNodes).toBe(3)
    expect(stats.totalEdges).toBe(3)
    expect(stats.avgDegree).toBeGreaterThan(0)
    expect(stats.density).toBeGreaterThan(0)
    expect(stats.density).toBeLessThanOrEqual(1)
  })

  it("스타 그래프 → Hub 감지", () => {
    const stats = computeGraphStats(makeStarGraph())
    expect(stats.totalNodes).toBe(5)
    expect(stats.hubCount).toBeGreaterThanOrEqual(1)
  })

  it("avgClusteringCoefficient 0~1 범위", () => {
    const stats = computeGraphStats(makeTriangleGraph())
    expect(stats.avgClusteringCoefficient).toBeGreaterThanOrEqual(0)
    expect(stats.avgClusteringCoefficient).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// classifyNode
// ═══════════════════════════════════════════════════════════════

describe("classifyNode", () => {
  it("ISOLATE: degree 1, CC 0", () => {
    const metrics: NodeMetrics = {
      personaId: "iso",
      inDegree: 0,
      outDegree: 1,
      totalDegree: 1,
      avgWarmth: 0.3,
      avgTension: 0.1,
      clusteringCoefficient: 0,
      connectivityScore: 0.1,
    }
    expect(classifyNode(metrics, 4)).toBe("ISOLATE")
  })

  it("HUB: degree >= 2×avg, CC > 0.3", () => {
    const metrics: NodeMetrics = {
      personaId: "hub",
      inDegree: 5,
      outDegree: 5,
      totalDegree: 10,
      avgWarmth: 0.6,
      avgTension: 0.1,
      clusteringCoefficient: 0.5,
      connectivityScore: 0.7,
    }
    expect(classifyNode(metrics, 3)).toBe("HUB")
  })

  it("PERIPHERAL: degree < avg*0.5", () => {
    const metrics: NodeMetrics = {
      personaId: "peri",
      inDegree: 1,
      outDegree: 1,
      totalDegree: 2,
      avgWarmth: 0.5,
      avgTension: 0.1,
      clusteringCoefficient: 0.2,
      connectivityScore: 0.3,
    }
    expect(classifyNode(metrics, 8)).toBe("PERIPHERAL")
  })

  it("NORMAL: 기본", () => {
    const metrics: NodeMetrics = {
      personaId: "norm",
      inDegree: 2,
      outDegree: 2,
      totalDegree: 4,
      avgWarmth: 0.5,
      avgTension: 0.2,
      clusteringCoefficient: 0.3,
      connectivityScore: 0.5,
    }
    expect(classifyNode(metrics, 4)).toBe("NORMAL")
  })
})

// ═══════════════════════════════════════════════════════════════
// detectHubs / detectIsolates
// ═══════════════════════════════════════════════════════════════

describe("detectHubs", () => {
  it("스타 그래프 → Hub 감지", () => {
    const hubs = detectHubs(makeStarGraph())
    expect(hubs.length).toBeGreaterThanOrEqual(1)
    expect(hubs.some((h) => h.personaId === "Hub")).toBe(true)
  })

  it("체인 그래프 → Hub 없음", () => {
    const hubs = detectHubs(makeChainGraph())
    expect(hubs).toHaveLength(0)
  })
})

describe("detectIsolates", () => {
  it("체인 그래프 끝 노드 → Isolate 가능", () => {
    const edges = makeChainGraph()
    const isolates = detectIsolates(edges)
    // D는 in=1, out=0 → totalDegree=1, CC=0 → ISOLATE
    expect(isolates.some((i) => i.personaId === "D")).toBe(true)
  })

  it("삼각형 → Isolate 없음", () => {
    expect(detectIsolates(makeTriangleGraph())).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// detectAnomalies
// ═══════════════════════════════════════════════════════════════

describe("detectAnomalies", () => {
  it("빈 그래프 → 이상 없음", () => {
    const alerts = detectAnomalies([], [])
    expect(alerts).toHaveLength(0)
  })

  it("연결 급증 감지", () => {
    const edges = Array.from({ length: 15 }, (_, i) => makeEdge("spammer", `target-${i}`))
    const recentEdges = edges // 모두 최근
    const alerts = detectAnomalies(edges, recentEdges)
    const spikeAlerts = alerts.filter((a) => a.type === "sudden_connection_spike")
    expect(spikeAlerts.length).toBeGreaterThan(0)
  })

  it("긴장 클러스터 감지", () => {
    const edges = [
      makeEdge("tense", "A", { tension: 0.8 }),
      makeEdge("tense", "B", { tension: 0.7 }),
      makeEdge("tense", "C", { tension: 0.9 }),
    ]
    const alerts = detectAnomalies(edges, [])
    const tensionAlerts = alerts.filter((a) => a.type === "tension_cluster")
    expect(tensionAlerts.length).toBeGreaterThan(0)
  })

  it("봇 패턴 감지 (균등 빈도)", () => {
    const edges = Array.from(
      { length: 6 },
      (_, i) => makeEdge("bot", `target-${i}`, { frequency: 0.5 }) // 모두 동일
    )
    const alerts = detectAnomalies(edges, [])
    const botAlerts = alerts.filter((a) => a.type === "bot_pattern")
    expect(botAlerts.length).toBeGreaterThan(0)
  })

  it("고립 위험 감지", () => {
    const edges = [makeEdge("lonely", "A", { warmth: 0.1 })]
    const alerts = detectAnomalies(edges, [])
    const isoAlerts = alerts.filter((a) => a.type === "isolation_risk" && a.personaId === "lonely")
    expect(isoAlerts.length).toBeGreaterThan(0)
  })

  it("정상 그래프 → 이상 적음", () => {
    const edges = makeTriangleGraph()
    const alerts = detectAnomalies(edges, [])
    const highSeverity = alerts.filter((a) => a.severity === "high")
    expect(highSeverity).toHaveLength(0)
  })

  it("severity 등급 포함", () => {
    const edges = Array.from({ length: 25 }, (_, i) => makeEdge("mega-spammer", `t-${i}`))
    const alerts = detectAnomalies(edges, edges)
    const spike = alerts.find((a) => a.type === "sudden_connection_spike")
    expect(spike?.severity).toBe("high") // 2× threshold
  })
})

// ═══════════════════════════════════════════════════════════════
// getEnabledModulesForFeature
// ═══════════════════════════════════════════════════════════════

describe("getEnabledModulesForFeature", () => {
  it("security → connectivity 바인딩", () => {
    const modules = getEnabledModulesForFeature("security")
    expect(modules.some((m) => m.module === "connectivity")).toBe(true)
  })

  it("비활성 모듈 제외", () => {
    const config: SocialModuleConfig = {
      ...DEFAULT_SOCIAL_MODULE_CONFIG,
      connectivity: { enabled: false, weight: 0.3 },
    }
    const modules = getEnabledModulesForFeature("security", config)
    expect(modules).toHaveLength(0)
  })

  it("matching → reputation 바인딩", () => {
    const modules = getEnabledModulesForFeature("matching")
    expect(modules.some((m) => m.module === "reputation")).toBe(true)
  })

  it("arena → tribalism (비활성 기본)", () => {
    const modules = getEnabledModulesForFeature("arena")
    expect(modules).toHaveLength(0) // tribalism 기본 비활성
  })
})

// ═══════════════════════════════════════════════════════════════
// validateSocialModuleConfig
// ═══════════════════════════════════════════════════════════════

describe("validateSocialModuleConfig", () => {
  it("기본 설정 유효", () => {
    const result = validateSocialModuleConfig(DEFAULT_SOCIAL_MODULE_CONFIG)
    expect(result.valid).toBe(true)
  })

  it("음수 가중치 → invalid", () => {
    const config: SocialModuleConfig = {
      ...DEFAULT_SOCIAL_MODULE_CONFIG,
      connectivity: { enabled: true, weight: -0.1 },
    }
    const result = validateSocialModuleConfig(config)
    expect(result.valid).toBe(false)
  })

  it("가중치 > 1 → invalid", () => {
    const config: SocialModuleConfig = {
      ...DEFAULT_SOCIAL_MODULE_CONFIG,
      authority: { enabled: true, weight: 1.5 },
    }
    const result = validateSocialModuleConfig(config)
    expect(result.valid).toBe(false)
  })

  it("활성 모듈 가중치 합 > 2 → invalid", () => {
    const config: SocialModuleConfig = {
      authority: { enabled: true, weight: 0.8 },
      connectivity: { enabled: true, weight: 0.8 },
      reputation: { enabled: true, weight: 0.8 },
      tribalism: { enabled: false, weight: 0.2 },
    }
    const result = validateSocialModuleConfig(config)
    expect(result.valid).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("FEATURE_BINDINGS 모든 기능 존재", () => {
    expect(FEATURE_BINDINGS.matching).toBeDefined()
    expect(FEATURE_BINDINGS.feed).toBeDefined()
    expect(FEATURE_BINDINGS.arena).toBeDefined()
    expect(FEATURE_BINDINGS.security).toBeDefined()
  })

  it("security에 connectivity 바인딩", () => {
    expect(FEATURE_BINDINGS.security).toContain("connectivity")
  })

  it("CONNECTION_SPIKE_THRESHOLD > 0", () => {
    expect(CONNECTION_SPIKE_THRESHOLD).toBeGreaterThan(0)
  })

  it("TENSION_CLUSTER_THRESHOLD 0~1", () => {
    expect(TENSION_CLUSTER_THRESHOLD).toBeGreaterThan(0)
    expect(TENSION_CLUSTER_THRESHOLD).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 시나리오
// ═══════════════════════════════════════════════════════════════

describe("통합 시나리오", () => {
  it("소셜 네트워크 전체 분석 플로우", () => {
    // 네트워크 구축: Hub(A) + 삼각(B,C,D) + 고립(E)
    const edges: RelationshipEdge[] = [
      makeEdge("A", "B", { warmth: 0.7 }),
      makeEdge("A", "C", { warmth: 0.6 }),
      makeEdge("A", "D", { warmth: 0.8 }),
      makeEdge("B", "A", { warmth: 0.7 }),
      makeEdge("C", "A", { warmth: 0.6 }),
      makeEdge("D", "A", { warmth: 0.8 }),
      makeEdge("B", "C", { warmth: 0.5 }),
      makeEdge("C", "D", { warmth: 0.4 }),
      makeEdge("E", "A", { warmth: 0.1 }), // E는 A만 연결
    ]

    // 그래프 통계
    const stats = computeGraphStats(edges)
    expect(stats.totalNodes).toBe(5)
    expect(stats.totalEdges).toBe(9)
    expect(stats.density).toBeGreaterThan(0)

    // 노드 메트릭
    const metrics = computeAllNodeMetrics(edges)
    const hubA = metrics.find((m) => m.personaId === "A")!
    expect(hubA.totalDegree).toBe(7) // in=4 (B,C,D,E→A) + out=3 (A→B,C,D)
    expect(hubA.avgWarmth).toBeGreaterThan(0.5)

    // 보안 모듈 활성 확인
    const securityModules = getEnabledModulesForFeature("security")
    expect(securityModules.length).toBeGreaterThan(0)

    // 이상 탐지 (정상 → 심각한 이상 없음)
    const alerts = detectAnomalies(edges, [])
    const highAlerts = alerts.filter((a) => a.severity === "high")
    expect(highAlerts).toHaveLength(0)
  })
})
