// ═══════════════════════════════════════════════════════════════
// T61 테스트: 실행 엔진 + 제어 흐름 + 노드 실행기
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from "vitest"

// Control Flow
import {
  evaluateConditional,
  evaluateSwitch,
  evaluateMerge,
  type ConditionalData,
  type SwitchData,
  type MergeData,
} from "@/lib/node-graph/control-flow"

// LLM Adapter
import {
  PROMPTS,
  getLLMConfig,
  toPromptString,
  NODE_LLM_CONFIGS,
  type LLMAdapter,
} from "@/lib/node-graph/llm-adapter"

// Node Executor
import { executeNode, getNodeExecutor } from "@/lib/node-graph/node-executor"

// Execution Engine
import {
  executeGraph,
  executeFromNode,
  summarizeExecution,
  type ExecutionEngineResult,
} from "@/lib/node-graph/execution-engine"

import type { GraphState } from "@/lib/node-graph/topological-sort"

// ── 헬퍼: Mock LLM 어댑터 ────────────────────────────────────

function createMockLLM(response?: Record<string, unknown>): LLMAdapter {
  return {
    generate: vi.fn().mockResolvedValue(
      response ?? {
        name: "테스트봇",
        role: "리뷰어",
        background: "테스트 배경",
        overallScore: 0.85,
      }
    ),
  }
}

// ── 헬퍼: 간단한 그래프 생성 ──────────────────────────────────

function buildSimpleGraph(): GraphState {
  return {
    nodes: [
      {
        id: "basic",
        type: "basic-info",
        position: { x: 0, y: 0 },
        data: { name: "TestBot", age: 25, occupation: "Reviewer" },
      },
      {
        id: "l1",
        type: "l1-vector",
        position: { x: 200, y: 0 },
        data: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
      },
      {
        id: "l2",
        type: "l2-vector",
        position: { x: 200, y: 100 },
        data: {
          openness: 0.7,
          conscientiousness: 0.6,
          extraversion: 0.3,
          agreeableness: 0.8,
          neuroticism: 0.4,
        },
      },
      {
        id: "paradox",
        type: "paradox-calc",
        position: { x: 400, y: 50 },
        data: {},
      },
      {
        id: "vfinal",
        type: "v-final",
        position: { x: 600, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "e1",
        sourceNodeId: "l1",
        sourcePortId: "out",
        targetNodeId: "paradox",
        targetPortId: "l1",
      },
      {
        id: "e2",
        sourceNodeId: "l2",
        sourcePortId: "out",
        targetNodeId: "paradox",
        targetPortId: "l2",
      },
      {
        id: "e3",
        sourceNodeId: "l1",
        sourcePortId: "out",
        targetNodeId: "vfinal",
        targetPortId: "l1",
      },
      {
        id: "e4",
        sourceNodeId: "l2",
        sourcePortId: "out",
        targetNodeId: "vfinal",
        targetPortId: "l2",
      },
      {
        id: "e5",
        sourceNodeId: "paradox",
        sourcePortId: "out",
        targetNodeId: "vfinal",
        targetPortId: "paradox",
      },
    ],
  }
}

function buildBranchingGraph(): GraphState {
  return {
    nodes: [
      {
        id: "l1",
        type: "l1-vector",
        position: { x: 0, y: 0 },
        data: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
      },
      {
        id: "l2",
        type: "l2-vector",
        position: { x: 0, y: 100 },
        data: {
          openness: 0.7,
          conscientiousness: 0.6,
          extraversion: 0.3,
          agreeableness: 0.8,
          neuroticism: 0.4,
        },
      },
      {
        id: "paradox",
        type: "paradox-calc",
        position: { x: 200, y: 50 },
        data: {},
      },
      {
        id: "cond",
        type: "conditional",
        position: { x: 400, y: 50 },
        data: { conditionType: "threshold", operator: ">", threshold: 0.3, fieldPath: "overall" },
      },
      {
        id: "trueNode",
        type: "projection",
        position: { x: 600, y: 0 },
        data: { alpha: 0.7 },
      },
      {
        id: "falseNode",
        type: "projection",
        position: { x: 600, y: 100 },
        data: { alpha: 0.4 },
      },
      {
        id: "mergeNode",
        type: "merge",
        position: { x: 800, y: 50 },
        data: { mergeStrategy: "first-active" },
      },
    ],
    edges: [
      {
        id: "e1",
        sourceNodeId: "l1",
        sourcePortId: "out",
        targetNodeId: "paradox",
        targetPortId: "l1",
      },
      {
        id: "e2",
        sourceNodeId: "l2",
        sourcePortId: "out",
        targetNodeId: "paradox",
        targetPortId: "l2",
      },
      {
        id: "e3",
        sourceNodeId: "paradox",
        sourcePortId: "out",
        targetNodeId: "cond",
        targetPortId: "in",
      },
      {
        id: "e4",
        sourceNodeId: "cond",
        sourcePortId: "true",
        targetNodeId: "trueNode",
        targetPortId: "config",
      },
      {
        id: "e5",
        sourceNodeId: "cond",
        sourcePortId: "false",
        targetNodeId: "falseNode",
        targetPortId: "config",
      },
      {
        id: "e6",
        sourceNodeId: "trueNode",
        sourcePortId: "out",
        targetNodeId: "mergeNode",
        targetPortId: "in",
      },
      {
        id: "e7",
        sourceNodeId: "falseNode",
        sourcePortId: "out",
        targetNodeId: "mergeNode",
        targetPortId: "in",
      },
    ],
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. Control Flow: Conditional
// ═══════════════════════════════════════════════════════════════

describe("Control Flow — Conditional", () => {
  it("threshold > 조건을 평가한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: ">", threshold: 0.5 }
    expect(evaluateConditional(data, 0.7).branchTaken).toBe("true")
    expect(evaluateConditional(data, 0.3).branchTaken).toBe("false")
    expect(evaluateConditional(data, 0.5).branchTaken).toBe("false")
  })

  it("threshold >= 조건을 평가한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: ">=", threshold: 0.5 }
    expect(evaluateConditional(data, 0.5).branchTaken).toBe("true")
    expect(evaluateConditional(data, 0.49).branchTaken).toBe("false")
  })

  it("threshold < 조건을 평가한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: "<", threshold: 0.5 }
    expect(evaluateConditional(data, 0.3).branchTaken).toBe("true")
    expect(evaluateConditional(data, 0.7).branchTaken).toBe("false")
  })

  it("threshold == 조건을 평가한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: "==", threshold: 0.5 }
    expect(evaluateConditional(data, 0.5).branchTaken).toBe("true")
    expect(evaluateConditional(data, 0.50001).branchTaken).toBe("true") // 0.0001 이내
    expect(evaluateConditional(data, 0.6).branchTaken).toBe("false")
  })

  it("threshold != 조건을 평가한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: "!=", threshold: 0.5 }
    expect(evaluateConditional(data, 0.7).branchTaken).toBe("true")
    expect(evaluateConditional(data, 0.5).branchTaken).toBe("false")
  })

  it("range 조건을 평가한다", () => {
    const data: ConditionalData = {
      conditionType: "range",
      operator: ">",
      threshold: 0,
      rangeMin: 0.3,
      rangeMax: 0.7,
    }
    expect(evaluateConditional(data, 0.5).branchTaken).toBe("true")
    expect(evaluateConditional(data, 0.1).branchTaken).toBe("false")
    expect(evaluateConditional(data, 0.9).branchTaken).toBe("false")
  })

  it("enum 조건을 평가한다", () => {
    const data: ConditionalData = {
      conditionType: "enum",
      operator: "==",
      threshold: 0,
      enumValue: "high",
    }
    expect(evaluateConditional(data, "high").branchTaken).toBe("true")
    expect(evaluateConditional(data, "low").branchTaken).toBe("false")
  })

  it("exists 조건을 평가한다", () => {
    const data: ConditionalData = { conditionType: "exists", operator: ">", threshold: 0 }
    expect(evaluateConditional(data, "something").branchTaken).toBe("true")
    expect(evaluateConditional(data, null).branchTaken).toBe("false")
    expect(evaluateConditional(data, undefined).branchTaken).toBe("false")
  })

  it("fieldPath로 객체 내 필드를 참조한다", () => {
    const data: ConditionalData = {
      conditionType: "threshold",
      operator: ">",
      threshold: 0.5,
      fieldPath: "overall",
    }
    expect(evaluateConditional(data, { overall: 0.8 }).branchTaken).toBe("true")
    expect(evaluateConditional(data, { overall: 0.2 }).branchTaken).toBe("false")
  })

  it("NaN 입력은 false를 반환한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: ">", threshold: 0.5 }
    expect(evaluateConditional(data, "not-a-number").branchTaken).toBe("false")
  })

  it("원본 값을 패스스루한다", () => {
    const data: ConditionalData = { conditionType: "threshold", operator: ">", threshold: 0.5 }
    const input = { overall: 0.8, details: "test" }
    expect(evaluateConditional(data, input).value).toBe(input)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Control Flow: Switch
// ═══════════════════════════════════════════════════════════════

describe("Control Flow — Switch", () => {
  it("threshold-band 모드에서 밴드를 매칭한다", () => {
    const data: SwitchData = {
      switchMode: "threshold-band",
      bands: [
        { id: "low", label: "낮음", min: 0, max: 0.33 },
        { id: "mid", label: "중간", min: 0.33, max: 0.66 },
        { id: "high", label: "높음", min: 0.66, max: 1.0 },
      ],
      defaultCaseId: "default",
    }

    expect(evaluateSwitch(data, 0.2).activeCases).toEqual(["low"])
    expect(evaluateSwitch(data, 0.5).activeCases).toEqual(["mid"])
    expect(evaluateSwitch(data, 0.9).activeCases).toEqual(["high"])
  })

  it("마지막 밴드는 상한을 포함한다 (<=)", () => {
    const data: SwitchData = {
      switchMode: "threshold-band",
      bands: [
        { id: "low", label: "낮음", min: 0, max: 0.5 },
        { id: "high", label: "높음", min: 0.5, max: 1.0 },
      ],
      defaultCaseId: "default",
    }

    expect(evaluateSwitch(data, 1.0).activeCases).toEqual(["high"])
  })

  it("매칭 실패 시 default를 반환한다", () => {
    const data: SwitchData = {
      switchMode: "threshold-band",
      bands: [{ id: "only", label: "Only", min: 0, max: 0.5 }],
      defaultCaseId: "default",
    }

    expect(evaluateSwitch(data, 0.8).activeCases).toEqual(["default"])
  })

  it("enum-match 모드에서 값을 매칭한다", () => {
    const data: SwitchData = {
      switchMode: "enum-match",
      enumCases: [
        { id: "creative", label: "창작형", matchValues: ["CREATOR", "ARTIST"] },
        { id: "analytic", label: "분석형", matchValues: ["ANALYST", "RESEARCHER"] },
      ],
      defaultCaseId: "default",
    }

    expect(evaluateSwitch(data, "CREATOR").activeCases).toEqual(["creative"])
    expect(evaluateSwitch(data, "ANALYST").activeCases).toEqual(["analytic"])
    expect(evaluateSwitch(data, "OTHER").activeCases).toEqual(["default"])
  })

  it("NaN 입력은 default를 반환한다", () => {
    const data: SwitchData = {
      switchMode: "threshold-band",
      bands: [{ id: "only", label: "Only", min: 0, max: 1 }],
      defaultCaseId: "default",
    }
    expect(evaluateSwitch(data, "not-a-number").activeCases).toEqual(["default"])
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Control Flow: Merge
// ═══════════════════════════════════════════════════════════════

describe("Control Flow — Merge", () => {
  it("first-active 전략으로 첫 활성 입력을 반환한다", () => {
    const data: MergeData = { mergeStrategy: "first-active" }
    const result = evaluateMerge(data, { a: "hello", b: "world" })
    expect(result.merged).toBe("hello")
    expect(result.activeCount).toBe(2)
    expect(result.source).toBe("first")
  })

  it("combine 전략으로 모든 입력을 배열로 합친다", () => {
    const data: MergeData = { mergeStrategy: "combine" }
    const result = evaluateMerge(data, { a: "hello", b: "world" })
    expect(result.merged).toEqual(["hello", "world"])
    expect(result.source).toBe("combined")
  })

  it("combine 전략에서 단일 입력은 배열이 아닌 값으로 반환한다", () => {
    const data: MergeData = { mergeStrategy: "combine" }
    const result = evaluateMerge(data, { a: "only" })
    expect(result.merged).toBe("only")
  })

  it("null/undefined 입력을 필터링한다", () => {
    const data: MergeData = { mergeStrategy: "first-active" }
    const result = evaluateMerge(data, { a: null, b: undefined, c: "valid" })
    expect(result.merged).toBe("valid")
    expect(result.activeCount).toBe(1)
  })

  it("모든 입력이 비활성이면 null을 반환한다", () => {
    const data: MergeData = { mergeStrategy: "first-active" }
    const result = evaluateMerge(data, { a: null, b: undefined })
    expect(result.merged).toBeNull()
    expect(result.activeCount).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. LLM Adapter
// ═══════════════════════════════════════════════════════════════

describe("LLM Adapter", () => {
  it("프롬프트 템플릿이 정의되어 있다", () => {
    expect(PROMPTS.CHARACTER_GEN.system).toContain("캐릭터")
    expect(PROMPTS.BACKSTORY_GEN.system).toContain("배경 서사")
    expect(PROMPTS.VOICE_GEN.system).toContain("말투")
    expect(PROMPTS.CONTENT_GEN.system).toContain("콘텐츠")
    expect(PROMPTS.PRESSURE_GEN.system).toContain("압력")
    expect(PROMPTS.ZEITGEIST_GEN.system).toContain("시대상")
    expect(PROMPTS.TEST_SIM.system).toContain("테스트")
  })

  it("프롬프트 user 함수가 문자열을 반환한다", () => {
    expect(typeof PROMPTS.CHARACTER_GEN.user("v", "b", "a")).toBe("string")
    expect(typeof PROMPTS.BACKSTORY_GEN.user("l1", "l2", "l3", "p")).toBe("string")
    expect(typeof PROMPTS.VOICE_GEN.user("l1", "c")).toBe("string")
    expect(typeof PROMPTS.CONTENT_GEN.user("v", "c")).toBe("string")
    expect(typeof PROMPTS.PRESSURE_GEN.user("l3", "p")).toBe("string")
    expect(typeof PROMPTS.ZEITGEIST_GEN.user("b")).toBe("string")
    expect(typeof PROMPTS.TEST_SIM.user("p", "c", "s")).toBe("string")
  })

  it("getLLMConfig가 노드별 설정을 반환한다", () => {
    expect(getLLMConfig("character-gen").temperature).toBe(0.8)
    expect(getLLMConfig("voice-gen").temperature).toBe(0.7)
    expect(getLLMConfig("test-sim").temperature).toBe(0.6)
    expect(getLLMConfig("unknown").model).toBe("sonnet")
  })

  it("NODE_LLM_CONFIGS에 7개 노드가 정의되어 있다", () => {
    expect(Object.keys(NODE_LLM_CONFIGS)).toHaveLength(7)
  })

  it("toPromptString이 다양한 타입을 처리한다", () => {
    expect(toPromptString("hello")).toBe("hello")
    expect(toPromptString(null)).toBe("없음")
    expect(toPromptString(undefined)).toBe("없음")
    expect(toPromptString({ a: 1 })).toContain('"a"')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Node Executor — Input Nodes
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Input Nodes", () => {
  it("basic-info: 기본 정보를 반환한다", () => {
    const result = executeNode("n1", "basic-info", { name: "Bot", age: 30 }, {})
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.name).toBe("Bot")
    expect(out.age).toBe(30)
  })

  it("basic-info: 이름이 없으면 에러", () => {
    const result = executeNode("n1", "basic-info", { name: "" }, {})
    expect(result).toHaveProperty("status", "error")
  })

  it("l1-vector: 7D 벡터를 생성한다", () => {
    const result = executeNode("n1", "l1-vector", { depth: 0.8, lens: 0.2 }, {})
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      number
    >
    expect(out.depth).toBe(0.8)
    expect(out.lens).toBe(0.2)
    expect(out.sociability).toBe(0.5) // default
  })

  it("l1-vector: 값을 0~1로 클램프한다", () => {
    const result = executeNode("n1", "l1-vector", { depth: 1.5, lens: -0.3 }, {})
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      number
    >
    expect(out.depth).toBe(1)
    expect(out.lens).toBe(0)
  })

  it("l2-vector: 5D OCEAN 벡터를 생성한다", () => {
    const result = executeNode("n1", "l2-vector", { openness: 0.9 }, {})
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      number
    >
    expect(out.openness).toBe(0.9)
    expect(out.neuroticism).toBe(0.5)
  })

  it("l3-vector: 4D 벡터를 생성한다", () => {
    const result = executeNode("n1", "l3-vector", { conflictOrientation: 0.7 }, {})
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      number
    >
    expect(out.conflictOrientation).toBe(0.7)
    expect(out.narrativePace).toBe(0.5)
  })

  it("archetype-select: 아키타입 설정을 반환한다", () => {
    const result = executeNode(
      "n1",
      "archetype-select",
      { archetypeId: "arch-1", name: "Explorer" },
      {}
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.archetypeId).toBe("arch-1")
  })

  it("archetype-select: ID 없으면 에러", () => {
    const result = executeNode("n1", "archetype-select", { archetypeId: "" }, {})
    expect(result).toHaveProperty("status", "error")
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Node Executor — Engine Nodes
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Engine Nodes", () => {
  it("paradox-calc: L1↔L2 패러독스를 계산한다", () => {
    const result = executeNode(
      "n1",
      "paradox-calc",
      {},
      {
        l1: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
        l2: {
          openness: 0.7,
          conscientiousness: 0.6,
          extraversion: 0.3,
          agreeableness: 0.8,
          neuroticism: 0.4,
        },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(typeof out.l1l2).toBe("number")
    expect(typeof out.overall).toBe("number")
    expect(typeof out.dimensionality).toBe("number")
    expect(out.dominant).toHaveProperty("layer", "L1xL2")
  })

  it("paradox-calc: L1 없으면 에러", () => {
    const result = executeNode("n1", "paradox-calc", {}, { l2: { openness: 0.5 } })
    expect(result).toHaveProperty("status", "error")
  })

  it("pressure-ctrl: 압력 설정을 생성한다", () => {
    const result = executeNode(
      "n1",
      "pressure-ctrl",
      { pressureLevel: 0.3 },
      { l3: { emotionalArc: 0.7 } }
    )
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.baseline).toBe(0.3)
    expect(typeof out.decayConstant).toBe("number")
    expect(out.volatility).toBe(0.7)
  })

  it("v-final: V_Final 벡터를 계산한다", () => {
    const result = executeNode(
      "n1",
      "v-final",
      {},
      {
        l1: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
        l2: {
          openness: 0.7,
          conscientiousness: 0.6,
          extraversion: 0.3,
          agreeableness: 0.8,
          neuroticism: 0.4,
        },
      }
    )
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(Array.isArray(out.vector)).toBe(true)
    expect((out.vector as number[]).length).toBe(7)
    expect(out.layerContributions).toBeDefined()
  })

  it("v-final: L1만으로도 계산 가능하다", () => {
    const result = executeNode(
      "n1",
      "v-final",
      {},
      {
        l1: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
      }
    )
    expect(result).toHaveProperty("status", "success")
  })

  it("v-final: L1 없으면 에러", () => {
    const result = executeNode("n1", "v-final", {}, {})
    expect(result).toHaveProperty("status", "error")
  })

  it("projection: 프로젝션 계수를 반환한다", () => {
    const result = executeNode("n1", "projection", { alpha: 0.7 }, {})
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.alpha).toBe(0.7)
    expect(out.beta).toBe(0.3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Node Executor — Control Flow Nodes
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Control Flow Nodes", () => {
  it("conditional: 분기 결과를 반환한다", () => {
    const result = executeNode(
      "n1",
      "conditional",
      { conditionType: "threshold", operator: ">", threshold: 0.5 },
      { in: 0.8 }
    )
    expect(result).toHaveProperty("branch", "true")
    expect(result.outputs).toHaveProperty("true")
  })

  it("conditional: false 분기를 반환한다", () => {
    const result = executeNode(
      "n1",
      "conditional",
      { conditionType: "threshold", operator: ">", threshold: 0.5 },
      { in: 0.2 }
    )
    expect(result).toHaveProperty("branch", "false")
    expect(result.outputs).toHaveProperty("false")
  })

  it("switch: 활성 케이스를 반환한다", () => {
    const result = executeNode(
      "n1",
      "switch",
      {
        switchMode: "threshold-band",
        bands: [
          { id: "low", label: "낮음", min: 0, max: 0.5 },
          { id: "high", label: "높음", min: 0.5, max: 1.0 },
        ],
        defaultCaseId: "default",
      },
      { in: 0.3 }
    )
    expect(result.activeCases).toEqual(["low"])
    expect(result.outputs).toHaveProperty("low")
  })

  it("merge: 활성 입력을 병합한다", () => {
    const result = executeNode("n1", "merge", { mergeStrategy: "first-active" }, { in: "hello" })
    expect(result.outputs).toHaveProperty("merged", "hello")
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Node Executor — Generation Nodes
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Generation Nodes", () => {
  it("activity-gen: 규칙 기반으로 활동 지표를 생성한다 (LLM 불필요)", () => {
    const result = executeNode(
      "n1",
      "activity-gen",
      {},
      {
        l1: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    const metrics = out.metrics as Record<string, number>
    expect(metrics.initiative).toBeDefined()
    expect(metrics.expressiveness).toBeDefined()
    expect(metrics.interactivity).toBeDefined()
    expect(metrics.curiosity).toBeDefined()
    expect(metrics.consistency).toBeDefined()
    expect(metrics.adaptability).toBeDefined()
    expect(metrics.creativity).toBeDefined()
    expect(out.postFrequency).toBeDefined()
  })

  it("activity-gen: 모든 지표가 0~1 범위이다", () => {
    const result = executeNode(
      "n1",
      "activity-gen",
      {},
      { l1: { depth: 1, lens: 1, stance: 1, scope: 1, taste: 1, purpose: 1, sociability: 1 } }
    )
    const metrics = (
      (result as { outputs: Record<string, unknown> }).outputs.out as Record<string, unknown>
    ).metrics as Record<string, number>
    for (const val of Object.values(metrics)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  it("character-gen: LLM 없으면 에러", () => {
    const result = executeNode("n1", "character-gen", {}, { vfinal: {}, basic: {} })
    // Promise 반환
    expect(result).toBeInstanceOf(Promise)
    return (result as Promise<unknown>).then((r) => {
      expect(r).toHaveProperty("status", "error")
    })
  })

  it("character-gen: LLM으로 캐릭터를 생성한다", async () => {
    const mockLLM = createMockLLM({ name: "GeneratedBot", role: "writer" })
    const result = await executeNode(
      "n1",
      "character-gen",
      {},
      { vfinal: { vector: [0.5] }, basic: { name: "Bot" } },
      { llm: mockLLM }
    )
    expect(result).toHaveProperty("status", "success")
    expect(mockLLM.generate).toHaveBeenCalledOnce()
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.name).toBe("GeneratedBot")
  })

  it("voice-gen: LLM으로 보이스를 생성한다", async () => {
    const mockLLM = createMockLLM({ speechStyle: "casual" })
    const result = await executeNode(
      "n1",
      "voice-gen",
      {},
      { l1: { depth: 0.5 }, character: { name: "Bot" } },
      { llm: mockLLM }
    )
    expect(result).toHaveProperty("status", "success")
  })

  it("backstory-gen: L1 필수", async () => {
    const mockLLM = createMockLLM()
    const result = await executeNode("n1", "backstory-gen", {}, {}, { llm: mockLLM })
    expect(result).toHaveProperty("status", "error")
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. Node Executor — Assembly Nodes
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Assembly Nodes", () => {
  it("prompt-builder: 프롬프트 세트를 조합한다", () => {
    const result = executeNode(
      "n1",
      "prompt-builder",
      {},
      {
        character: { name: "Bot", role: "reviewer" },
        voice: { speechStyle: "formal" },
        backstory: { origin: "city" },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(typeof out.systemPrompt).toBe("string")
    expect(out.sectionCount).toBe(3) // character + voice + backstory
    expect((out.vectorContext as Record<string, boolean>).hasVoice).toBe(true)
    expect((out.vectorContext as Record<string, boolean>).hasBackstory).toBe(true)
  })

  it("prompt-builder: 캐릭터 없으면 에러", () => {
    const result = executeNode("n1", "prompt-builder", {}, {})
    expect(result).toHaveProperty("status", "error")
  })

  it("interaction-rules: 인터랙션 규칙을 생성한다", () => {
    const result = executeNode(
      "n1",
      "interaction-rules",
      {},
      {
        backstory: { nlpKeywords: ["conflict", "growth"] },
        vfinal: { vector: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.init).toBeDefined()
    expect(out.override).toBeDefined()
    expect(out.adapt).toBeDefined()
    expect(out.express).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. Node Executor — Output Nodes
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Output Nodes", () => {
  it("consistency: 일관성 검증 결과를 반환한다", () => {
    const result = executeNode(
      "n1",
      "consistency",
      {},
      {
        prompt: { systemPrompt: "test prompt", vectorContext: {} },
        character: { name: "Bot" },
        vfinal: { vector: [0.5] },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(typeof out.valid).toBe("boolean")
    expect(typeof out.overallScore).toBe("number")
    expect(out.categoryScores).toBeDefined()
  })

  it("consistency: PromptSet 없으면 에러", () => {
    const result = executeNode("n1", "consistency", {}, {})
    expect(result).toHaveProperty("status", "error")
  })

  it("fingerprint: 핑거프린트를 생성한다", () => {
    const result = executeNode(
      "n1",
      "fingerprint",
      {},
      {
        l1: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
        l2: { openness: 0.7, conscientiousness: 0.6 },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(Array.isArray(out.radarData)).toBe(true)
    expect(typeof out.hash).toBe("string")
    expect(out.layerCount).toBe(2)
  })

  it("deploy: 검증 통과 시 배포 성공", () => {
    const result = executeNode(
      "n1",
      "deploy",
      {},
      {
        prompt: { systemPrompt: "test" },
        validation: { valid: true, overallScore: 0.9 },
      }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.deployed).toBe(true)
  })

  it("deploy: 검증 실패 시 에러", () => {
    const result = executeNode(
      "n1",
      "deploy",
      {},
      {
        prompt: { systemPrompt: "test" },
        validation: { valid: false, overallScore: 0.5 },
      }
    )
    expect(result).toHaveProperty("status", "error")
  })

  it("test-sim: LLM으로 테스트를 실행한다", async () => {
    const mockLLM = createMockLLM({ response: "안녕하세요!", overallScore: 0.9 })
    const result = await executeNode(
      "n1",
      "test-sim",
      {},
      {
        prompt: { systemPrompt: "test" },
        character: { name: "Bot" },
      },
      { llm: mockLLM }
    )
    expect(result).toHaveProperty("status", "success")
    const out = (result as { outputs: Record<string, unknown> }).outputs.out as Record<
      string,
      unknown
    >
    expect(out.scenarioCount).toBe(3)
    expect(typeof out.overallScore).toBe("number")
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. Node Executor — 디스패처
// ═══════════════════════════════════════════════════════════════

describe("Node Executor — Dispatcher", () => {
  it("getNodeExecutor가 알려진 타입에 대해 함수를 반환한다", () => {
    expect(typeof getNodeExecutor("basic-info")).toBe("function")
    expect(typeof getNodeExecutor("paradox-calc")).toBe("function")
    expect(typeof getNodeExecutor("conditional")).toBe("function")
    expect(typeof getNodeExecutor("character-gen")).toBe("function")
    expect(typeof getNodeExecutor("prompt-builder")).toBe("function")
    expect(typeof getNodeExecutor("consistency")).toBe("function")
  })

  it("알 수 없는 타입에 대해 에러 executor를 반환한다", () => {
    const executor = getNodeExecutor("unknown-type")
    const result = executor("n1", {} as Record<string, unknown>, {}, {})
    expect(result).toHaveProperty("status", "error")
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. Execution Engine — 전체 그래프 실행
// ═══════════════════════════════════════════════════════════════

describe("Execution Engine — 전체 실행", () => {
  it("간단한 그래프를 실행한다", async () => {
    const graph = buildSimpleGraph()
    const result = await executeGraph(graph)

    expect(result.state.completed).toBe(true)
    expect(result.state.executionOrder.length).toBe(5)
    expect(result.executionPath.length).toBe(5)

    // 모든 노드가 성공해야 함
    const executed = result.executionPath.filter((e) => e.status === "executed")
    expect(executed.length).toBe(5)
  })

  it("순환이 있으면 completed=false", async () => {
    const graph: GraphState = {
      nodes: [
        { id: "a", type: "l1-vector", position: { x: 0, y: 0 }, data: {} },
        { id: "b", type: "l2-vector", position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e1", sourceNodeId: "a", sourcePortId: "out", targetNodeId: "b", targetPortId: "in" },
        { id: "e2", sourceNodeId: "b", sourcePortId: "out", targetNodeId: "a", targetPortId: "in" },
      ],
    }
    const result = await executeGraph(graph)
    expect(result.state.completed).toBe(false)
  })

  it("분기 그래프에서 비활성 경로를 스킵한다", async () => {
    const graph = buildBranchingGraph()
    const result = await executeGraph(graph)

    expect(result.state.completed).toBe(true)

    // conditional 결과 확인
    const condResult = result.state.results.get("cond")
    expect(condResult?.status).toBe("success")

    // 분기에 따라 하나는 executed, 하나는 skipped
    const skippedNodes = result.executionPath.filter((e) => e.status === "skipped")
    expect(skippedNodes.length).toBe(1) // true/false 중 하나만 스킵

    // merge 노드는 실행되어야 함
    const mergeResult = result.state.results.get("mergeNode")
    expect(mergeResult?.status).toBe("success")
  })

  it("totalDurationMs가 0 이상이다", async () => {
    const graph = buildSimpleGraph()
    const result = await executeGraph(graph)
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 13. Execution Engine — 부분 실행
// ═══════════════════════════════════════════════════════════════

describe("Execution Engine — 부분 실행", () => {
  it("특정 노드부터 실행한다", async () => {
    const graph = buildSimpleGraph()

    // 먼저 전체 실행
    const fullResult = await executeGraph(graph)

    // vfinal부터 다시 실행
    const partialResult = await executeFromNode(graph, "vfinal", fullResult.state.results)
    expect(partialResult.state.completed).toBe(true)
    expect(partialResult.executionPath.length).toBeGreaterThan(0)
  })

  it("존재하지 않는 노드 ID는 completed=false", async () => {
    const graph = buildSimpleGraph()
    const result = await executeFromNode(graph, "nonexistent", new Map())
    expect(result.state.completed).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 14. Execution Engine — 요약
// ═══════════════════════════════════════════════════════════════

describe("Execution Engine — 요약", () => {
  it("실행 요약을 생성한다", async () => {
    const graph = buildSimpleGraph()
    const result = await executeGraph(graph)
    const summary = summarizeExecution(result)

    expect(summary.total).toBe(5)
    expect(summary.executed).toBe(5)
    expect(summary.skipped).toBe(0)
    expect(summary.errors).toBe(0)
    expect(summary.avgDurationMs).toBeGreaterThanOrEqual(0)
  })

  it("분기 그래프의 요약을 생성한다", async () => {
    const graph = buildBranchingGraph()
    const result = await executeGraph(graph)
    const summary = summarizeExecution(result)

    expect(summary.total).toBe(7)
    expect(summary.skipped).toBe(1) // 비활성 분기
    expect(summary.executed + summary.skipped).toBe(7)
  })
})
