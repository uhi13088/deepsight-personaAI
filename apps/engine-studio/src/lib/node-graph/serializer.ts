// ═══════════════════════════════════════════════════════════════
// 직렬화/역직렬화 + v2→v3 마이그레이션
// T59-AC6
// ═══════════════════════════════════════════════════════════════

import type { GraphState, NodeInstance, EdgeInstance } from "./topological-sort"

// ── 직렬화 포맷 ──────────────────────────────────────────────

export const CURRENT_VERSION = "3.0.0"

export interface SerializedGraph {
  version: string
  personaId: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  createdAt: string // ISO 8601
  updatedAt: string
  metadata: {
    presetId?: string
    author?: string
    notes?: string
  }
}

export interface SerializedNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface SerializedEdge {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

// ── v2 포맷 (마이그레이션용) ─────────────────────────────────

export interface V2SerializedGraph {
  version: "2.0.0"
  personaId: string
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    sourceHandle: string
    target: string
    targetHandle: string
  }>
}

// ── 직렬화 ───────────────────────────────────────────────────

export function serializeGraph(
  graph: GraphState,
  personaId: string,
  metadata: SerializedGraph["metadata"] = {}
): SerializedGraph {
  const now = new Date().toISOString()

  return {
    version: CURRENT_VERSION,
    personaId,
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      sourcePortId: e.sourcePortId,
      targetNodeId: e.targetNodeId,
      targetPortId: e.targetPortId,
    })),
    createdAt: metadata.presetId ? now : now, // 새로 생성이면 현재 시간
    updatedAt: now,
    metadata,
  }
}

// ── 역직렬화 ─────────────────────────────────────────────────

export function deserializeGraph(serialized: SerializedGraph): GraphState {
  return {
    nodes: serialized.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: serialized.edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      sourcePortId: e.sourcePortId,
      targetNodeId: e.targetNodeId,
      targetPortId: e.targetPortId,
    })),
  }
}

// ── JSON 문자열 변환 ─────────────────────────────────────────

export function toJSON(graph: SerializedGraph): string {
  return JSON.stringify(graph, null, 2)
}

export function fromJSON(json: string): SerializedGraph {
  const parsed = JSON.parse(json) as SerializedGraph
  return parsed
}

// ── v2 → v3 마이그레이션 ─────────────────────────────────────

const V2_NODE_TYPE_MAP: Record<string, string> = {
  "persona-input": "basic-info",
  "vector-6d": "l1-vector",
  "character-node": "character-gen",
  "prompt-node": "prompt-builder",
  "output-node": "deploy",
}

const V2_PORT_MAP: Record<string, string> = {
  output: "out",
  input: "in",
  vector: "l1",
  character: "character",
  prompt: "prompt",
}

export function migrateV2ToV3(v2: V2SerializedGraph): SerializedGraph {
  const now = new Date().toISOString()

  const nodes: SerializedNode[] = v2.nodes.map((n) => {
    const newType = V2_NODE_TYPE_MAP[n.type] ?? n.type
    const data = { ...n.data }

    // 6D → 7D: sociability 기본값 추가
    if (n.type === "vector-6d" && data["sociability"] === undefined) {
      data["sociability"] = 0.5
    }

    return {
      id: n.id,
      type: newType,
      position: n.position,
      data,
    }
  })

  const edges: SerializedEdge[] = v2.edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    sourcePortId: V2_PORT_MAP[e.sourceHandle] ?? e.sourceHandle,
    targetNodeId: e.target,
    targetPortId: V2_PORT_MAP[e.targetHandle] ?? e.targetHandle,
  }))

  return {
    version: CURRENT_VERSION,
    personaId: v2.personaId,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
    metadata: {
      notes: "v2에서 v3로 마이그레이션됨",
    },
  }
}

// ── 버전 확인 + 자동 마이그레이션 ────────────────────────────

export function loadGraph(json: string): SerializedGraph {
  const parsed = JSON.parse(json) as { version: string }

  if (parsed.version === "2.0.0") {
    return migrateV2ToV3(parsed as unknown as V2SerializedGraph)
  }

  return parsed as SerializedGraph
}

// ── 그래프 복제 ──────────────────────────────────────────────

export function cloneGraph(graph: GraphState): GraphState {
  return {
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: { ...n.data },
      position: { ...n.position },
    })),
    edges: graph.edges.map((e) => ({ ...e })),
  }
}

// ── 그래프 비교 (변경 감지) ──────────────────────────────────

export function hasGraphChanged(a: SerializedGraph, b: SerializedGraph): boolean {
  if (a.nodes.length !== b.nodes.length) return true
  if (a.edges.length !== b.edges.length) return true

  const aNodeIds = new Set(a.nodes.map((n) => n.id))
  const bNodeIds = new Set(b.nodes.map((n) => n.id))
  for (const id of aNodeIds) {
    if (!bNodeIds.has(id)) return true
  }

  const aEdgeIds = new Set(a.edges.map((e) => e.id))
  const bEdgeIds = new Set(b.edges.map((e) => e.id))
  for (const id of aEdgeIds) {
    if (!bEdgeIds.has(id)) return true
  }

  // 노드 데이터 비교
  for (const aNode of a.nodes) {
    const bNode = b.nodes.find((n) => n.id === aNode.id)
    if (!bNode) return true
    if (JSON.stringify(aNode.data) !== JSON.stringify(bNode.data)) return true
    if (aNode.position.x !== bNode.position.x || aNode.position.y !== bNode.position.y) {
      return true
    }
  }

  return false
}
