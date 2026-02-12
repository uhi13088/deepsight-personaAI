// ═══════════════════════════════════════════════════════════════
// T128-AC6: 노드 에디터 통합 테스트
// 프리셋 실행, 직렬화 라운드트립, 실행 요약
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  executeGraph,
  summarizeExecution,
  type ExecutionEngineResult,
} from "@/lib/node-graph/execution-engine"

import {
  serializeGraph,
  deserializeGraph,
  toJSON,
  fromJSON,
  loadGraph,
  cloneGraph,
} from "@/lib/node-graph/serializer"

import { validateGraph } from "@/lib/node-graph/graph-validator"
import { FLOW_PRESETS, getPreset } from "@/constants/flow-presets"
import type { GraphState } from "@/lib/node-graph/topological-sort"

// ═══════════════════════════════════════════════════════════════
// 프리셋 직렬화 라운드트립
// ═══════════════════════════════════════════════════════════════

describe("T128: 프리셋 직렬화 라운드트립", () => {
  const presets = FLOW_PRESETS.filter((p) => p.id !== "custom")

  for (const preset of presets) {
    it(`${preset.name} 프리셋 → serialize → JSON → load → deserialize → 노드/엣지 동일`, () => {
      const graph = preset.build()
      expect(graph.nodes.length).toBe(preset.nodeCount)
      expect(graph.edges.length).toBe(preset.edgeCount)

      // serialize → JSON
      const serialized = serializeGraph(graph, "test-persona", { presetId: preset.id })
      expect(serialized.version).toBe("3.0.0")
      expect(serialized.personaId).toBe("test-persona")

      const json = toJSON(serialized)
      expect(json).toBeTruthy()

      // JSON → load (자동 마이그레이션) → deserialize
      const loaded = loadGraph(json)
      const restored = deserializeGraph(loaded)

      expect(restored.nodes.length).toBe(preset.nodeCount)
      expect(restored.edges.length).toBe(preset.edgeCount)

      // 노드 ID 일치 확인
      const originalIds = new Set(graph.nodes.map((n) => n.id))
      const restoredIds = new Set(restored.nodes.map((n) => n.id))
      expect(restoredIds).toEqual(originalIds)
    })
  }

  it("fromJSON ↔ toJSON 왕복 일치", () => {
    const graph = getPreset("standard")!.build()
    const serialized = serializeGraph(graph, "roundtrip")
    const json = toJSON(serialized)
    const parsed = fromJSON(json)

    expect(parsed.personaId).toBe("roundtrip")
    expect(parsed.nodes.length).toBe(serialized.nodes.length)
    expect(parsed.edges.length).toBe(serialized.edges.length)
  })
})

// ═══════════════════════════════════════════════════════════════
// 프리셋 실행
// ═══════════════════════════════════════════════════════════════

describe("T128: 프리셋 그래프 실행", () => {
  it("Quick 프리셋 실행 — completed=true", async () => {
    const graph = getPreset("quick")!.build()
    const result = await executeGraph(graph)

    expect(result.state.completed).toBe(true)
    expect(result.executionPath.length).toBeGreaterThan(0)
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
  })

  it("Standard 프리셋 실행 — completed=true", async () => {
    const graph = getPreset("standard")!.build()
    const result = await executeGraph(graph)

    expect(result.state.completed).toBe(true)
    expect(result.executionPath.length).toBeGreaterThan(0)
  })

  it("Advanced 프리셋 실행 — completed=true, 경로 길이 > 0", async () => {
    const graph = getPreset("advanced")!.build()
    const result = await executeGraph(graph)

    expect(result.state.completed).toBe(true)
    expect(result.executionPath.length).toBeGreaterThan(0)
  })

  it("빈 그래프 실행 — completed=true, 경로 비어있음", async () => {
    const emptyGraph: GraphState = { nodes: [], edges: [] }
    const result = await executeGraph(emptyGraph)

    expect(result.state.completed).toBe(true)
    expect(result.executionPath.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 실행 요약
// ═══════════════════════════════════════════════════════════════

describe("T128: 실행 요약 (summarizeExecution)", () => {
  it("Quick 프리셋 실행 요약 — total/executed/skipped/errors 합 일치", async () => {
    const graph = getPreset("quick")!.build()
    const result = await executeGraph(graph)
    const summary = summarizeExecution(result)

    expect(summary.total).toBeGreaterThan(0)
    expect(summary.executed + summary.skipped + summary.errors).toBe(summary.total)
    expect(summary.avgDurationMs).toBeGreaterThanOrEqual(0)
  })

  it("빈 실행 결과 요약", () => {
    const emptyResult: ExecutionEngineResult = {
      state: {
        results: new Map(),
        activeEdges: new Set(),
        executionOrder: [],
        completed: true,
      },
      executionPath: [],
      totalDurationMs: 0,
    }
    const summary = summarizeExecution(emptyResult)

    expect(summary.total).toBe(0)
    expect(summary.executed).toBe(0)
    expect(summary.skipped).toBe(0)
    expect(summary.errors).toBe(0)
    expect(summary.avgDurationMs).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 저장/로드 + 재실행 일관성
// ═══════════════════════════════════════════════════════════════

describe("T128: 저장/로드 후 재실행 일관성", () => {
  it("Standard 프리셋 직렬화 → 역직렬화 → 재실행 — 동일 결과 수", async () => {
    const graph = getPreset("standard")!.build()

    // 1차 실행
    const result1 = await executeGraph(graph)
    const summary1 = summarizeExecution(result1)

    // 직렬화 → 역직렬화
    const serialized = serializeGraph(graph, "consistency-test")
    const json = toJSON(serialized)
    const loaded = loadGraph(json)
    const restored = deserializeGraph(loaded)

    // 2차 실행
    const result2 = await executeGraph(restored)
    const summary2 = summarizeExecution(result2)

    expect(summary1.total).toBe(summary2.total)
    expect(summary1.executed).toBe(summary2.executed)
    expect(summary1.skipped).toBe(summary2.skipped)
    expect(summary1.errors).toBe(summary2.errors)
  })
})

// ═══════════════════════════════════════════════════════════════
// 그래프 검증
// ═══════════════════════════════════════════════════════════════

describe("T128: 프리셋 그래프 검증", () => {
  // Standard/Advanced — 전체 노드 포함, 타입 호환 → 검증 통과
  const fullPresets = FLOW_PRESETS.filter((p) => p.id !== "custom" && p.id !== "quick")

  for (const preset of fullPresets) {
    it(`${preset.name} 프리셋 — 검증 통과`, () => {
      const graph = preset.build()
      const result = validateGraph(graph)

      expect(result.valid).toBe(true)
      expect(result.errorCount).toBe(0)
    })
  }

  it("Quick 프리셋 — 단축 연결이므로 포트 타입 불일치 에러 포함", () => {
    const graph = getPreset("quick")!.build()
    const result = validateGraph(graph)

    // Quick은 character-gen 없이 직접 연결 → BasicInfoData/ArchetypeConfig → CharacterData 불일치
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.category === "connection")).toBe(true)
  })

  it("빈 그래프 — 필수 노드 없어 검증 실패", () => {
    const result = validateGraph({ nodes: [], edges: [] })

    expect(result.valid).toBe(false)
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.issues.some((i) => i.category === "required_node")).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 그래프 복제
// ═══════════════════════════════════════════════════════════════

describe("T128: 그래프 복제", () => {
  it("복제된 그래프는 원본과 동일하지만 독립적", () => {
    const original = getPreset("standard")!.build()
    const cloned = cloneGraph(original)

    expect(cloned.nodes.length).toBe(original.nodes.length)
    expect(cloned.edges.length).toBe(original.edges.length)

    // 독립성: 원본 수정이 복제에 영향 없음
    original.nodes[0].data["test"] = true
    expect(cloned.nodes[0].data["test"]).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 실행 결과 상태 확인
// ═══════════════════════════════════════════════════════════════

describe("T128: 실행 결과 상태 분석", () => {
  it("Quick 프리셋 — 각 노드에 실행 결과가 있음", async () => {
    const graph = getPreset("quick")!.build()
    const result = await executeGraph(graph)

    for (const node of graph.nodes) {
      const nodeResult = result.state.results.get(node.id)
      expect(nodeResult).toBeDefined()
      expect(["success", "error", "skipped"]).toContain(nodeResult!.status)
    }
  })

  it("실행 경로 엔트리에 nodeType이 올바르게 기록됨", async () => {
    const graph = getPreset("quick")!.build()
    const nodeTypes = new Set(graph.nodes.map((n) => n.type))
    const result = await executeGraph(graph)

    for (const entry of result.executionPath) {
      expect(nodeTypes.has(entry.nodeType)).toBe(true)
      expect(entry.durationMs).toBeGreaterThanOrEqual(0)
    }
  })

  it("활성 엣지가 올바르게 추적됨", async () => {
    const graph = getPreset("standard")!.build()
    const result = await executeGraph(graph)

    // 활성 엣지는 그래프의 엣지 중 일부
    const allEdgeIds = new Set(graph.edges.map((e) => e.id))
    for (const activeEdgeId of result.state.activeEdges) {
      expect(allEdgeIds.has(activeEdgeId)).toBe(true)
    }
  })
})
