// ═══════════════════════════════════════════════════════════════
// 플로우 프리셋 4종
// T60-AC7: Quick / Standard / Advanced / Custom
// ═══════════════════════════════════════════════════════════════

import type { NodeInstance, EdgeInstance, GraphState } from "@/lib/node-graph/topological-sort"

// ── 타입 ─────────────────────────────────────────────────────

export interface FlowPreset {
  id: string
  name: string
  description: string
  category: "quick" | "standard" | "advanced" | "custom"
  nodeCount: number
  edgeCount: number
  build: () => GraphState
}

// ── 헬퍼 ─────────────────────────────────────────────────────

let idCounter = 0

function resetIds(): void {
  idCounter = 0
}

function nodeId(): string {
  return `n_${++idCounter}`
}

function edgeId(): string {
  return `e_${++idCounter}`
}

function makeNode(
  id: string,
  type: string,
  x: number,
  y: number,
  data: Record<string, unknown> = {}
): NodeInstance {
  return { id, type, position: { x, y }, data }
}

function makeEdge(
  id: string,
  src: string,
  srcPort: string,
  tgt: string,
  tgtPort: string
): EdgeInstance {
  return { id, sourceNodeId: src, sourcePortId: srcPort, targetNodeId: tgt, targetPortId: tgtPort }
}

// ── Preset A: Quick (5노드) ──────────────────────────────────

function buildQuick(): GraphState {
  resetIds()
  const nBasic = nodeId()
  const nArch = nodeId()
  const nPrompt = nodeId()
  const nConsist = nodeId()
  const nDeploy = nodeId()

  return {
    nodes: [
      makeNode(nBasic, "basic-info", 0, 100),
      makeNode(nArch, "archetype-select", 0, 300),
      makeNode(nPrompt, "prompt-builder", 400, 200),
      makeNode(nConsist, "consistency", 700, 100),
      makeNode(nDeploy, "deploy", 1000, 200),
    ],
    edges: [
      makeEdge(edgeId(), nBasic, "out", nPrompt, "character"),
      makeEdge(edgeId(), nArch, "out", nPrompt, "character"),
      makeEdge(edgeId(), nPrompt, "out", nConsist, "prompt"),
      makeEdge(edgeId(), nConsist, "out", nDeploy, "validation"),
      makeEdge(edgeId(), nPrompt, "out", nDeploy, "prompt"),
    ],
  }
}

// ── Preset B: Standard (7노드) ───────────────────────────────

function buildStandard(): GraphState {
  resetIds()
  const nBasic = nodeId()
  const nL1 = nodeId()
  const nVFinal = nodeId()
  const nChar = nodeId()
  const nPrompt = nodeId()
  const nConsist = nodeId()
  const nDeploy = nodeId()

  return {
    nodes: [
      makeNode(nBasic, "basic-info", 0, 100),
      makeNode(nL1, "l1-vector", 0, 300),
      makeNode(nVFinal, "v-final", 300, 300),
      makeNode(nChar, "character-gen", 600, 200),
      makeNode(nPrompt, "prompt-builder", 900, 200),
      makeNode(nConsist, "consistency", 1200, 100),
      makeNode(nDeploy, "deploy", 1500, 200),
    ],
    edges: [
      makeEdge(edgeId(), nL1, "out", nVFinal, "l1"),
      makeEdge(edgeId(), nVFinal, "out", nChar, "vfinal"),
      makeEdge(edgeId(), nBasic, "out", nChar, "basic"),
      makeEdge(edgeId(), nChar, "out", nPrompt, "character"),
      makeEdge(edgeId(), nPrompt, "out", nConsist, "prompt"),
      makeEdge(edgeId(), nConsist, "out", nDeploy, "validation"),
      makeEdge(edgeId(), nPrompt, "out", nDeploy, "prompt"),
    ],
  }
}

// ── Preset C: Advanced (15노드) ──────────────────────────────

function buildAdvanced(): GraphState {
  resetIds()
  const nBasic = nodeId()
  const nL1 = nodeId()
  const nL2 = nodeId()
  const nL3 = nodeId()
  const nParadox = nodeId()
  const nPressure = nodeId()
  const nVFinal = nodeId()
  const nChar = nodeId()
  const nBackstory = nodeId()
  const nVoice = nodeId()
  const nZeitgeist = nodeId()
  const nPrompt = nodeId()
  const nInteraction = nodeId()
  const nConsist = nodeId()
  const nDeploy = nodeId()

  return {
    nodes: [
      makeNode(nBasic, "basic-info", 0, 0),
      makeNode(nL1, "l1-vector", 0, 200),
      makeNode(nL2, "l2-vector", 0, 400),
      makeNode(nL3, "l3-vector", 0, 600),
      makeNode(nParadox, "paradox-calc", 300, 300),
      makeNode(nPressure, "pressure-ctrl", 300, 600),
      makeNode(nVFinal, "v-final", 600, 300),
      makeNode(nChar, "character-gen", 900, 100),
      makeNode(nBackstory, "backstory-gen", 900, 300),
      makeNode(nVoice, "voice-gen", 900, 500),
      makeNode(nZeitgeist, "zeitgeist-gen", 600, 0),
      makeNode(nPrompt, "prompt-builder", 1200, 200),
      makeNode(nInteraction, "interaction-rules", 1200, 450),
      makeNode(nConsist, "consistency", 1500, 100),
      makeNode(nDeploy, "deploy", 1800, 250),
    ],
    edges: [
      makeEdge(edgeId(), nL1, "out", nParadox, "l1"),
      makeEdge(edgeId(), nL2, "out", nParadox, "l2"),
      makeEdge(edgeId(), nL3, "out", nPressure, "l3"),
      makeEdge(edgeId(), nL1, "out", nVFinal, "l1"),
      makeEdge(edgeId(), nL2, "out", nVFinal, "l2"),
      makeEdge(edgeId(), nL3, "out", nVFinal, "l3"),
      makeEdge(edgeId(), nParadox, "out", nVFinal, "paradox"),
      makeEdge(edgeId(), nPressure, "out", nVFinal, "pressure"),
      makeEdge(edgeId(), nVFinal, "out", nChar, "vfinal"),
      makeEdge(edgeId(), nBasic, "out", nChar, "basic"),
      makeEdge(edgeId(), nL1, "out", nBackstory, "l1"),
      makeEdge(edgeId(), nParadox, "out", nBackstory, "paradox"),
      makeEdge(edgeId(), nL1, "out", nVoice, "l1"),
      makeEdge(edgeId(), nChar, "out", nVoice, "character"),
      makeEdge(edgeId(), nBasic, "out", nZeitgeist, "basic"),
      makeEdge(edgeId(), nChar, "out", nPrompt, "character"),
      makeEdge(edgeId(), nVoice, "out", nPrompt, "voice"),
      makeEdge(edgeId(), nBackstory, "out", nPrompt, "backstory"),
      makeEdge(edgeId(), nZeitgeist, "out", nPrompt, "zeitgeist"),
      makeEdge(edgeId(), nBackstory, "out", nInteraction, "backstory"),
      makeEdge(edgeId(), nVFinal, "out", nInteraction, "vfinal"),
      makeEdge(edgeId(), nPrompt, "out", nConsist, "prompt"),
      makeEdge(edgeId(), nChar, "out", nConsist, "character"),
      makeEdge(edgeId(), nPrompt, "out", nDeploy, "prompt"),
      makeEdge(edgeId(), nConsist, "out", nDeploy, "validation"),
      makeEdge(edgeId(), nInteraction, "out", nDeploy, "rules"),
    ],
  }
}

// ── Preset D: Custom (빈 그래프) ─────────────────────────────

function buildCustom(): GraphState {
  return { nodes: [], edges: [] }
}

// ── 프리셋 목록 ──────────────────────────────────────────────

export const FLOW_PRESETS: FlowPreset[] = [
  {
    id: "quick",
    name: "Quick",
    description: "아키타입 기반 빠른 생성 (5노드)",
    category: "quick",
    nodeCount: 5,
    edgeCount: 5,
    build: buildQuick,
  },
  {
    id: "standard",
    name: "Standard",
    description: "L1 벡터 기반 표준 파이프라인 (7노드)",
    category: "standard",
    nodeCount: 7,
    edgeCount: 7,
    build: buildStandard,
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "3-Layer 전체 활용 고급 파이프라인 (15노드)",
    category: "advanced",
    nodeCount: 15,
    edgeCount: 26,
    build: buildAdvanced,
  },
  {
    id: "custom",
    name: "Custom",
    description: "빈 캔버스에서 시작",
    category: "custom",
    nodeCount: 0,
    edgeCount: 0,
    build: buildCustom,
  },
]

export function getPreset(id: string): FlowPreset | undefined {
  return FLOW_PRESETS.find((p) => p.id === id)
}
