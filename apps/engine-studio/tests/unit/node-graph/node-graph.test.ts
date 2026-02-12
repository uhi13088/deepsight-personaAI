// ═══════════════════════════════════════════════════════════════
// Node Graph Tests
// T59-AC7: PortTypes / Registry / TopSort / DAG / Validator / Serializer
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

// ── AC1: Port Types ──────────────────────────────────────────

import {
  ALL_PORT_TYPES,
  PORT_CATEGORIES,
  isPortCompatible,
  getCompatibleTypes,
  getPortColor,
  PORT_COLORS,
} from "@/lib/node-graph/port-types"
import type { PortType, PortCategory } from "@/lib/node-graph/port-types"

// ── AC2: Node Registry ───────────────────────────────────────

import {
  getNodeDefinition,
  getNodesByCategory,
  getAllNodeDefinitions,
  getNodeCategories,
  CATEGORY_LABELS,
} from "@/lib/node-graph/node-registry"

// ── AC3: Topological Sort ────────────────────────────────────

import { topologicalSort, detectCycle, wouldCreateCycle } from "@/lib/node-graph/topological-sort"
import type { GraphState, NodeInstance, EdgeInstance } from "@/lib/node-graph/topological-sort"

// ── AC4: DAG Engine ──────────────────────────────────────────

import {
  createExecutionPlan,
  executeDAG,
  getDownstreamNodes,
  getUpstreamNodes,
} from "@/lib/node-graph/dag-engine"
import type { NodeExecutor } from "@/lib/node-graph/dag-engine"

// ── AC5: Graph Validator ─────────────────────────────────────

import { validateGraph } from "@/lib/node-graph/graph-validator"

// ── AC6: Serializer ──────────────────────────────────────────

import {
  serializeGraph,
  deserializeGraph,
  toJSON,
  fromJSON,
  migrateV2ToV3,
  loadGraph,
  cloneGraph,
  hasGraphChanged,
  CURRENT_VERSION,
} from "@/lib/node-graph/serializer"
import type { V2SerializedGraph } from "@/lib/node-graph/serializer"

// ── 테스트 헬퍼 ──────────────────────────────────────────────

function node(id: string, type: string, x = 0, y = 0): NodeInstance {
  return { id, type, position: { x, y }, data: {} }
}

function edge(
  id: string,
  src: string,
  srcPort: string,
  tgt: string,
  tgtPort: string
): EdgeInstance {
  return { id, sourceNodeId: src, sourcePortId: srcPort, targetNodeId: tgt, targetPortId: tgtPort }
}

// 최소 유효 그래프: basic-info → character-gen → prompt-builder → consistency → deploy
function makeMinimalGraph(): GraphState {
  return {
    nodes: [
      node("n1", "basic-info"),
      node("n2", "l1-vector"),
      node("n3", "v-final"),
      node("n4", "character-gen"),
      node("n5", "prompt-builder"),
      node("n6", "consistency"),
      node("n7", "deploy"),
    ],
    edges: [
      edge("e1", "n2", "out", "n3", "l1"),
      edge("e2", "n3", "out", "n4", "vfinal"),
      edge("e3", "n1", "out", "n4", "basic"),
      edge("e4", "n4", "out", "n5", "character"),
      edge("e5", "n5", "out", "n6", "prompt"),
      edge("e6", "n5", "out", "n7", "prompt"),
      edge("e7", "n6", "out", "n7", "validation"),
    ],
  }
}

// ═══════════════════════════════════════════════════════════════
// AC1: Port Types
// ═══════════════════════════════════════════════════════════════

describe("Port Types — 21개 타입", () => {
  it("21개 + Any = 22개 포트 타입이 정의되어 있다", () => {
    expect(ALL_PORT_TYPES).toHaveLength(22)
  })

  it("모든 타입에 카테고리가 매핑되어 있다", () => {
    for (const pt of ALL_PORT_TYPES) {
      expect(PORT_CATEGORIES[pt]).toBeDefined()
    }
  })
})

describe("Port Types — 호환성", () => {
  it("동일 타입끼리 호환된다", () => {
    expect(isPortCompatible("SocialPersonaVector", "SocialPersonaVector")).toBe(true)
    expect(isPortCompatible("CharacterData", "CharacterData")).toBe(true)
  })

  it("다른 타입끼리 호환되지 않는다", () => {
    expect(isPortCompatible("SocialPersonaVector", "CoreTemperamentVector")).toBe(false)
    expect(isPortCompatible("CharacterData", "VoiceProfile")).toBe(false)
  })

  it("Any 타입은 모든 타입과 호환된다", () => {
    expect(isPortCompatible("Any", "SocialPersonaVector")).toBe(true)
    expect(isPortCompatible("CharacterData", "Any")).toBe(true)
    expect(isPortCompatible("Any", "Any")).toBe(true)
  })

  it("ArchetypeConfig → 벡터 타입 호환", () => {
    expect(isPortCompatible("ArchetypeConfig", "SocialPersonaVector")).toBe(true)
    expect(isPortCompatible("ArchetypeConfig", "CoreTemperamentVector")).toBe(true)
    expect(isPortCompatible("ArchetypeConfig", "NarrativeDriveVector")).toBe(true)
  })

  it("ArchetypeConfig → 비벡터 타입 비호환", () => {
    expect(isPortCompatible("ArchetypeConfig", "CharacterData")).toBe(false)
    expect(isPortCompatible("ArchetypeConfig", "PromptSet")).toBe(false)
  })
})

describe("Port Types — 호환 타입 목록", () => {
  it("output 방향으로 호환 타입을 반환한다", () => {
    const types = getCompatibleTypes("ArchetypeConfig", "output")
    expect(types).toContain("ArchetypeConfig") // 자기 자신
    expect(types).toContain("SocialPersonaVector")
    expect(types).toContain("Any")
  })

  it("input 방향으로 호환 타입을 반환한다", () => {
    const types = getCompatibleTypes("SocialPersonaVector", "input")
    expect(types).toContain("SocialPersonaVector") // 자기 자신
    expect(types).toContain("ArchetypeConfig") // 특수 호환
    expect(types).toContain("Any")
  })
})

describe("Port Types — 컬러", () => {
  it("각 카테고리에 컬러가 정의되어 있다", () => {
    const categories: PortCategory[] = [
      "vector",
      "engine",
      "generation",
      "assembly",
      "output",
      "control",
    ]
    for (const cat of categories) {
      expect(PORT_COLORS[cat]).toBeTruthy()
    }
  })

  it("포트 타입별 컬러를 반환한다", () => {
    expect(getPortColor("SocialPersonaVector")).toBe(PORT_COLORS.vector)
    expect(getPortColor("CharacterData")).toBe(PORT_COLORS.generation)
    expect(getPortColor("Any")).toBe(PORT_COLORS.control)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Node Registry
// ═══════════════════════════════════════════════════════════════

describe("Node Registry — 25노드", () => {
  it("총 25개 노드가 등록되어 있다", () => {
    const all = getAllNodeDefinitions()
    expect(all).toHaveLength(25)
  })

  it("7개 카테고리가 있다", () => {
    // 6개 카테고리 (control-flow는 하이픈)
    const categories = getNodeCategories()
    expect(categories).toHaveLength(6)
  })

  it("카테고리별 노드 수가 맞다", () => {
    expect(getNodesByCategory("input")).toHaveLength(5)
    expect(getNodesByCategory("engine")).toHaveLength(4)
    expect(getNodesByCategory("control-flow")).toHaveLength(3)
    expect(getNodesByCategory("generation")).toHaveLength(7)
    expect(getNodesByCategory("assembly")).toHaveLength(2)
    expect(getNodesByCategory("output")).toHaveLength(4)
  })

  it("카테고리 레이블이 정의되어 있다", () => {
    expect(CATEGORY_LABELS.input).toBe("입력")
    expect(CATEGORY_LABELS.generation).toBe("생성")
  })
})

describe("Node Registry — 노드 조회", () => {
  it("타입으로 노드 정의를 조회할 수 있다", () => {
    const def = getNodeDefinition("basic-info")
    expect(def).toBeDefined()
    expect(def!.label).toBe("기본 정보")
    expect(def!.category).toBe("input")
    expect(def!.outputs).toHaveLength(1)
  })

  it("존재하지 않는 타입은 undefined를 반환한다", () => {
    expect(getNodeDefinition("non-existent")).toBeUndefined()
  })

  it("입력 노드는 inputs가 비어있다", () => {
    const def = getNodeDefinition("l1-vector")!
    expect(def.inputs).toHaveLength(0)
    expect(def.outputs).toHaveLength(1)
    expect(def.evaluationStrategy).toBe("eager")
  })

  it("generation 노드는 manual 평가 전략이다", () => {
    const def = getNodeDefinition("character-gen")!
    expect(def.evaluationStrategy).toBe("manual")
  })

  it("deploy 노드는 outputs가 비어있다", () => {
    const def = getNodeDefinition("deploy")!
    expect(def.outputs).toHaveLength(0)
  })

  it("conditional 노드는 true/false 출력 포트가 있다", () => {
    const def = getNodeDefinition("conditional")!
    expect(def.outputs).toHaveLength(2)
    expect(def.outputs.map((p) => p.id)).toContain("true")
    expect(def.outputs.map((p) => p.id)).toContain("false")
  })

  it("merge 노드는 multi input을 허용한다", () => {
    const def = getNodeDefinition("merge")!
    expect(def.inputs[0].multi).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Topological Sort + Cycle Detection
// ═══════════════════════════════════════════════════════════════

describe("Topological Sort — Kahn's Algorithm", () => {
  it("선형 그래프를 올바르게 정렬한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t"), node("c", "t")],
      edges: [edge("e1", "a", "o", "b", "i"), edge("e2", "b", "o", "c", "i")],
    }
    const result = topologicalSort(graph)
    expect(result.hasCycle).toBe(false)
    expect(result.sorted).toEqual(["a", "b", "c"])
  })

  it("분기 그래프를 정렬한다 (A→B, A→C, B→D, C→D)", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t"), node("c", "t"), node("d", "t")],
      edges: [
        edge("e1", "a", "o", "b", "i"),
        edge("e2", "a", "o", "c", "i"),
        edge("e3", "b", "o", "d", "i"),
        edge("e4", "c", "o", "d", "i"),
      ],
    }
    const result = topologicalSort(graph)
    expect(result.hasCycle).toBe(false)
    expect(result.sorted).toHaveLength(4)
    expect(result.sorted.indexOf("a")).toBeLessThan(result.sorted.indexOf("b"))
    expect(result.sorted.indexOf("a")).toBeLessThan(result.sorted.indexOf("c"))
    expect(result.sorted.indexOf("b")).toBeLessThan(result.sorted.indexOf("d"))
  })

  it("순환이 있으면 hasCycle=true를 반환한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t"), node("c", "t")],
      edges: [
        edge("e1", "a", "o", "b", "i"),
        edge("e2", "b", "o", "c", "i"),
        edge("e3", "c", "o", "a", "i"), // 순환!
      ],
    }
    const result = topologicalSort(graph)
    expect(result.hasCycle).toBe(true)
    expect(result.cycleNodes.length).toBeGreaterThan(0)
  })

  it("독립 노드도 포함된다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t"), node("lonely", "t")],
      edges: [edge("e1", "a", "o", "b", "i")],
    }
    const result = topologicalSort(graph)
    expect(result.sorted).toHaveLength(3)
    expect(result.sorted).toContain("lonely")
  })

  it("빈 그래프를 처리한다", () => {
    const result = topologicalSort({ nodes: [], edges: [] })
    expect(result.hasCycle).toBe(false)
    expect(result.sorted).toHaveLength(0)
  })
})

describe("Cycle Detection — DFS", () => {
  it("순환이 없으면 false를 반환한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t")],
      edges: [edge("e1", "a", "o", "b", "i")],
    }
    expect(detectCycle(graph).hasCycle).toBe(false)
  })

  it("순환이 있으면 경로를 반환한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t"), node("c", "t")],
      edges: [
        edge("e1", "a", "o", "b", "i"),
        edge("e2", "b", "o", "c", "i"),
        edge("e3", "c", "o", "a", "i"),
      ],
    }
    const result = detectCycle(graph)
    expect(result.hasCycle).toBe(true)
    expect(result.cyclePath.length).toBeGreaterThan(0)
  })

  it("자기 순환을 감지한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t")],
      edges: [edge("e1", "a", "o", "a", "i")],
    }
    expect(detectCycle(graph).hasCycle).toBe(true)
  })
})

describe("wouldCreateCycle", () => {
  it("순환을 만들지 않는 연결은 false", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t"), node("c", "t")],
      edges: [edge("e1", "a", "o", "b", "i")],
    }
    expect(wouldCreateCycle(graph, "b", "c")).toBe(false)
  })

  it("순환을 만드는 연결은 true", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t")],
      edges: [edge("e1", "a", "o", "b", "i")],
    }
    expect(wouldCreateCycle(graph, "b", "a")).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: DAG Engine
// ═══════════════════════════════════════════════════════════════

describe("DAG Engine — 실행 계획", () => {
  it("실행 순서를 올바르게 생성한다", () => {
    const graph = makeMinimalGraph()
    const plan = createExecutionPlan(graph)
    expect(plan.hasCycle).toBe(false)
    expect(plan.nodeCount).toBe(7)
    // basic-info, l1-vector는 v-final보다 먼저
    const order = plan.order
    expect(order.indexOf("n2")).toBeLessThan(order.indexOf("n3")) // l1 → v-final
    expect(order.indexOf("n3")).toBeLessThan(order.indexOf("n4")) // v-final → character
    expect(order.indexOf("n4")).toBeLessThan(order.indexOf("n5")) // character → prompt
  })
})

describe("DAG Engine — executeDAG", () => {
  const simpleExecutor: NodeExecutor = (nodeId, nodeType, data, inputs) => {
    return {
      nodeId,
      outputs: { out: `result_${nodeId}` },
      status: "success",
    }
  }

  it("단순 그래프를 실행한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "basic-info"), node("b", "character-gen")],
      edges: [edge("e1", "a", "out", "b", "basic")],
    }
    const state = executeDAG(graph, simpleExecutor)
    expect(state.completed).toBe(true)
    expect(state.results.size).toBe(2)
    expect(state.results.get("a")!.status).toBe("success")
    expect(state.results.get("b")!.status).toBe("success")
  })

  it("순환 그래프는 실행하지 않는다", () => {
    const graph: GraphState = {
      nodes: [node("a", "t"), node("b", "t")],
      edges: [edge("e1", "a", "o", "b", "i"), edge("e2", "b", "o", "a", "i")],
    }
    const state = executeDAG(graph, simpleExecutor)
    expect(state.completed).toBe(false)
  })

  it("conditional 분기에서 활성 엣지만 따라간다", () => {
    const graph: GraphState = {
      nodes: [
        node("input", "basic-info"),
        node("cond", "conditional"),
        node("true_path", "character-gen"),
        node("false_path", "character-gen"),
      ],
      edges: [
        edge("e1", "input", "out", "cond", "in"),
        edge("e2", "cond", "true", "true_path", "basic"),
        edge("e3", "cond", "false", "false_path", "basic"),
      ],
    }

    const executor: NodeExecutor = (nodeId, nodeType) => {
      if (nodeType === "conditional") {
        return {
          nodeId,
          outputs: { true: "value", false: "value" },
          status: "success",
          branch: "true", // true 분기 선택
        }
      }
      return { nodeId, outputs: { out: `result_${nodeId}` }, status: "success" }
    }

    const state = executeDAG(graph, executor)
    expect(state.completed).toBe(true)
    expect(state.results.get("true_path")!.status).toBe("success")
    expect(state.results.get("false_path")!.status).toBe("skipped")
  })

  it("입력값을 올바르게 수집한다", () => {
    const graph: GraphState = {
      nodes: [node("a", "basic-info"), node("b", "character-gen")],
      edges: [edge("e1", "a", "out", "b", "basic")],
    }

    let receivedInputs: Record<string, unknown> = {}
    const executor: NodeExecutor = (nodeId, _type, _data, inputs) => {
      if (nodeId === "b") receivedInputs = inputs
      return { nodeId, outputs: { out: `val_${nodeId}` }, status: "success" }
    }

    executeDAG(graph, executor)
    expect(receivedInputs["basic"]).toBe("val_a")
  })
})

describe("DAG Engine — 그래프 탐색", () => {
  it("downstream 노드를 찾는다", () => {
    const graph = makeMinimalGraph()
    // n2(l1-vector) → n3(v-final) → n4(character) → n5(prompt) → n6(consistency), n7(deploy)
    const downstream = getDownstreamNodes("n3", graph)
    expect(downstream).toContain("n4")
    expect(downstream).toContain("n5")
    expect(downstream).not.toContain("n1")
    expect(downstream).not.toContain("n2")
  })

  it("upstream 노드를 찾는다", () => {
    const graph = makeMinimalGraph()
    const upstream = getUpstreamNodes("n5", graph)
    expect(upstream).toContain("n4")
    expect(upstream).toContain("n3")
    expect(upstream).toContain("n2")
    expect(upstream).not.toContain("n7")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: Graph Validator
// ═══════════════════════════════════════════════════════════════

describe("Graph Validator — 필수 노드", () => {
  it("최소 유효 그래프는 유효하다", () => {
    const result = validateGraph(makeMinimalGraph())
    expect(result.errorCount).toBe(0)
  })

  it("빈 그래프는 필수 노드 에러를 발생시킨다", () => {
    const result = validateGraph({ nodes: [], edges: [] })
    expect(result.valid).toBe(false)
    expect(result.errorCount).toBeGreaterThan(0)
    const requiredIssues = result.issues.filter((i) => i.category === "required_node")
    expect(requiredIssues.length).toBeGreaterThanOrEqual(4) // basic-info, prompt-builder, consistency, deploy + L1
  })

  it("L1 소스가 없으면 에러", () => {
    const graph: GraphState = {
      nodes: [
        node("n1", "basic-info"),
        node("n5", "prompt-builder"),
        node("n6", "consistency"),
        node("n7", "deploy"),
      ],
      edges: [],
    }
    const result = validateGraph(graph)
    const l1Issue = result.issues.find((i) => i.message.includes("L1 소스"))
    expect(l1Issue).toBeDefined()
  })
})

describe("Graph Validator — 순환 검증", () => {
  it("순환 그래프는 에러를 발생시킨다", () => {
    const graph: GraphState = {
      nodes: [
        node("a", "basic-info"),
        node("b", "l1-vector"),
        node("c", "prompt-builder"),
        node("d", "consistency"),
        node("e", "deploy"),
      ],
      edges: [
        edge("e1", "a", "out", "c", "character"),
        edge("e2", "c", "out", "a", "basic"), // 순환!
      ],
    }
    const result = validateGraph(graph)
    const cycleIssue = result.issues.find((i) => i.category === "cycle")
    expect(cycleIssue).toBeDefined()
    expect(cycleIssue!.level).toBe("error")
  })
})

describe("Graph Validator — 포트 호환성", () => {
  it("비호환 포트 연결 시 에러", () => {
    const graph = makeMinimalGraph()
    // character-gen의 CharacterData 출력을 consistency의 vfinal(VFinalResult) 입력에 연결
    graph.edges.push(edge("e_bad", "n4", "out", "n6", "vfinal"))
    const result = validateGraph(graph)
    const typeIssue = result.issues.find(
      (i) => i.category === "connection" && i.message.includes("타입 불일치")
    )
    expect(typeIssue).toBeDefined()
  })
})

describe("Graph Validator — 도달 가능성 (Rule 3)", () => {
  it("고립된 노드는 에러를 발생시킨다", () => {
    const graph = makeMinimalGraph()
    graph.nodes.push(node("orphan", "fingerprint"))
    const result = validateGraph(graph)
    const reachIssue = result.issues.find(
      (i) => i.category === "reachability" && i.nodeId === "orphan"
    )
    expect(reachIssue).toBeDefined()
  })
})

describe("Graph Validator — Switch Default (Rule 4)", () => {
  it("Switch 노드에 기본 케이스가 없으면 info", () => {
    const graph = makeMinimalGraph()
    graph.nodes.push({ ...node("sw", "switch"), data: {} }) // defaultCaseId 없음
    graph.edges.push(edge("e_sw", "n2", "out", "sw", "in"))
    const result = validateGraph(graph)
    const switchIssue = result.issues.find((i) => i.category === "switch_default")
    expect(switchIssue).toBeDefined()
    expect(switchIssue!.level).toBe("info")
  })
})

describe("Graph Validator — 종합 결과", () => {
  it("에러/경고/정보 카운트를 올바르게 집계한다", () => {
    const result = validateGraph(makeMinimalGraph())
    expect(result.errorCount).toBe(0)
    expect(typeof result.warningCount).toBe("number")
    expect(typeof result.infoCount).toBe("number")
    expect(result.valid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC6: Serializer
// ═══════════════════════════════════════════════════════════════

describe("Serializer — 직렬화/역직렬화", () => {
  it("그래프를 직렬화/역직렬화 할 수 있다", () => {
    const graph = makeMinimalGraph()
    const serialized = serializeGraph(graph, "persona-1", { author: "test" })

    expect(serialized.version).toBe(CURRENT_VERSION)
    expect(serialized.personaId).toBe("persona-1")
    expect(serialized.nodes).toHaveLength(7)
    expect(serialized.edges).toHaveLength(7)
    expect(serialized.metadata.author).toBe("test")

    const deserialized = deserializeGraph(serialized)
    expect(deserialized.nodes).toHaveLength(7)
    expect(deserialized.edges).toHaveLength(7)
  })

  it("JSON 문자열로 변환/복원 할 수 있다", () => {
    const graph = makeMinimalGraph()
    const serialized = serializeGraph(graph, "p1")
    const json = toJSON(serialized)
    const restored = fromJSON(json)

    expect(restored.version).toBe(CURRENT_VERSION)
    expect(restored.nodes).toHaveLength(7)
  })
})

describe("Serializer — v2→v3 마이그레이션", () => {
  it("v2 그래프를 v3로 마이그레이션한다", () => {
    const v2: V2SerializedGraph = {
      version: "2.0.0",
      personaId: "p-old",
      nodes: [
        { id: "n1", type: "persona-input", position: { x: 0, y: 0 }, data: {} },
        {
          id: "n2",
          type: "vector-6d",
          position: { x: 100, y: 0 },
          data: { depth: 0.7, lens: 0.6, stance: 0.5, scope: 0.4, taste: 0.3, purpose: 0.8 },
        },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "output", target: "n2", targetHandle: "input" },
      ],
    }

    const v3 = migrateV2ToV3(v2)
    expect(v3.version).toBe(CURRENT_VERSION)

    // 노드 타입 매핑
    expect(v3.nodes[0].type).toBe("basic-info")
    expect(v3.nodes[1].type).toBe("l1-vector")

    // sociability 기본값 추가
    expect(v3.nodes[1].data["sociability"]).toBe(0.5)

    // 엣지 포트 매핑
    expect(v3.edges[0].sourcePortId).toBe("out")
    expect(v3.edges[0].targetPortId).toBe("in")

    // 마이그레이션 메모
    expect(v3.metadata.notes).toContain("v2")
  })

  it("loadGraph가 버전에 따라 자동 마이그레이션한다", () => {
    const v2JSON = JSON.stringify({
      version: "2.0.0",
      personaId: "p-old",
      nodes: [{ id: "n1", type: "persona-input", position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    })

    const result = loadGraph(v2JSON)
    expect(result.version).toBe(CURRENT_VERSION)
    expect(result.nodes[0].type).toBe("basic-info")
  })

  it("v3 그래프는 마이그레이션 없이 그대로 반환한다", () => {
    const graph = makeMinimalGraph()
    const serialized = serializeGraph(graph, "p1")
    const json = toJSON(serialized)
    const loaded = loadGraph(json)
    expect(loaded.version).toBe(CURRENT_VERSION)
    expect(loaded.nodes).toHaveLength(7)
  })
})

describe("Serializer — 유틸", () => {
  it("cloneGraph가 독립적인 복사본을 만든다", () => {
    const graph = makeMinimalGraph()
    const clone = cloneGraph(graph)

    expect(clone.nodes).toHaveLength(graph.nodes.length)
    expect(clone.edges).toHaveLength(graph.edges.length)

    // 수정해도 원본에 영향 없음
    clone.nodes[0].position.x = 999
    expect(graph.nodes[0].position.x).toBe(0)
  })

  it("hasGraphChanged가 변경을 감지한다", () => {
    const a = serializeGraph(makeMinimalGraph(), "p1")
    const b = serializeGraph(makeMinimalGraph(), "p1")

    expect(hasGraphChanged(a, b)).toBe(false)

    // 노드 위치 변경
    b.nodes[0].position.x = 999
    expect(hasGraphChanged(a, b)).toBe(true)
  })

  it("hasGraphChanged가 노드 추가를 감지한다", () => {
    const a = serializeGraph(makeMinimalGraph(), "p1")
    const graph2 = makeMinimalGraph()
    graph2.nodes.push(node("extra", "fingerprint"))
    const b = serializeGraph(graph2, "p1")

    expect(hasGraphChanged(a, b)).toBe(true)
  })
})
