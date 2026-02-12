// ═══════════════════════════════════════════════════════════════
// DAG 평가 엔진
// T59-AC4: 노드 실행 순서, 활성 엣지 추적
// ═══════════════════════════════════════════════════════════════

import { topologicalSort } from "./topological-sort"
import type { GraphState, EdgeInstance } from "./topological-sort"
import { getNodeDefinition } from "./node-registry"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface NodeExecutionResult {
  nodeId: string
  outputs: Record<string, unknown> // portId → value
  status: "success" | "error" | "skipped"
  error?: string
  branch?: string // 제어 흐름 분기 결과
  activeCases?: string[] // switch 활성 케이스
}

export interface ExecutionPlan {
  order: string[] // 실행 순서
  nodeCount: number
  hasCycle: boolean
}

export interface ExecutionState {
  results: Map<string, NodeExecutionResult>
  activeEdges: Set<string> // 활성 엣지 ID
  executionOrder: string[]
  completed: boolean
}

export type NodeExecutor = (
  nodeId: string,
  nodeType: string,
  nodeData: Record<string, unknown>,
  inputs: Record<string, unknown>
) => NodeExecutionResult

// ── 실행 계획 생성 ───────────────────────────────────────────

export function createExecutionPlan(graph: GraphState): ExecutionPlan {
  const result = topologicalSort(graph)
  return {
    order: result.sorted,
    nodeCount: result.sorted.length,
    hasCycle: result.hasCycle,
  }
}

// ── 입력값 수집 ──────────────────────────────────────────────

function collectInputs(
  nodeId: string,
  graph: GraphState,
  results: Map<string, NodeExecutionResult>,
  activeEdges: Set<string>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}

  // 해당 노드로 들어오는 엣지
  const incomingEdges = graph.edges.filter((e) => e.targetNodeId === nodeId)

  for (const edge of incomingEdges) {
    // 비활성 엣지는 무시
    if (!activeEdges.has(edge.id)) continue

    const sourceResult = results.get(edge.sourceNodeId)
    if (sourceResult && sourceResult.status === "success") {
      const value = sourceResult.outputs[edge.sourcePortId]
      if (value !== undefined) {
        // multi 포트 처리: 기존 값이 배열이면 push, 아니면 대체
        const existing = inputs[edge.targetPortId]
        if (existing !== undefined) {
          // multi input → 배열로 변환
          if (Array.isArray(existing)) {
            existing.push(value)
          } else {
            inputs[edge.targetPortId] = [existing, value]
          }
        } else {
          inputs[edge.targetPortId] = value
        }
      }
    }
  }

  return inputs
}

// ── 제어 흐름 활성 엣지 업데이트 ─────────────────────────────

function updateActiveEdges(
  nodeId: string,
  result: NodeExecutionResult,
  graph: GraphState,
  activeEdges: Set<string>
): void {
  const outEdges = graph.edges.filter((e) => e.sourceNodeId === nodeId)
  const nodeDef = getNodeDefinition(graph.nodes.find((n) => n.id === nodeId)?.type ?? "")

  if (!nodeDef) {
    // 정의가 없으면 모든 출력 엣지 활성화
    for (const edge of outEdges) {
      activeEdges.add(edge.id)
    }
    return
  }

  // 제어 흐름 노드: 분기에 따라 선택적 활성화
  if (nodeDef.type === "conditional") {
    const branchPort = result.branch === "true" ? "true" : "false"
    for (const edge of outEdges) {
      if (edge.sourcePortId === branchPort) {
        activeEdges.add(edge.id)
      }
      // 다른 분기 엣지는 비활성
    }
    return
  }

  if (nodeDef.type === "switch") {
    const activeCases = result.activeCases ?? []
    for (const edge of outEdges) {
      if (activeCases.includes(edge.sourcePortId)) {
        activeEdges.add(edge.id)
      }
    }
    return
  }

  // 일반 노드: 모든 출력 엣지 활성화
  for (const edge of outEdges) {
    activeEdges.add(edge.id)
  }
}

// ── DAG 실행 ─────────────────────────────────────────────────

export function executeDAG(graph: GraphState, executor: NodeExecutor): ExecutionState {
  const plan = createExecutionPlan(graph)

  if (plan.hasCycle) {
    return {
      results: new Map(),
      activeEdges: new Set(),
      executionOrder: [],
      completed: false,
    }
  }

  const results = new Map<string, NodeExecutionResult>()
  const activeEdges = new Set<string>()

  // 초기 활성 엣지: 입력 노드(in-degree 0)에서 나가는 엣지
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const incomingCount = new Map<string, number>()
  for (const node of graph.nodes) {
    incomingCount.set(node.id, 0)
  }
  for (const edge of graph.edges) {
    incomingCount.set(edge.targetNodeId, (incomingCount.get(edge.targetNodeId) ?? 0) + 1)
  }

  // 위상 정렬 순서로 실행
  for (const nodeId of plan.order) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    // 이 노드에 들어오는 엣지가 하나라도 있는데 모두 비활성이면 skip
    const inEdges = graph.edges.filter((e) => e.targetNodeId === nodeId)
    const hasInEdges = inEdges.length > 0
    const hasActiveInput = inEdges.some((e) => activeEdges.has(e.id))

    if (hasInEdges && !hasActiveInput) {
      // 입력 엣지가 있지만 활성 입력이 없음 → 분기에서 제외된 노드
      results.set(nodeId, {
        nodeId,
        outputs: {},
        status: "skipped",
      })
      continue
    }

    // 입력값 수집
    const inputs = collectInputs(nodeId, graph, results, activeEdges)

    // 노드 실행
    const result = executor(nodeId, node.type, node.data, inputs)
    results.set(nodeId, result)

    // 성공 시 활성 엣지 업데이트
    if (result.status === "success") {
      updateActiveEdges(nodeId, result, graph, activeEdges)
    }
  }

  return {
    results,
    activeEdges,
    executionOrder: plan.order,
    completed: true,
  }
}

// ── 부분 실행 (특정 노드부터) ─────────────────────────────────

export function getDownstreamNodes(nodeId: string, graph: GraphState): string[] {
  const adjacency = new Map<string, string[]>()
  for (const node of graph.nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId)
  }

  const visited = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const neighbor of adjacency.get(current) ?? []) {
      queue.push(neighbor)
    }
  }

  visited.delete(nodeId) // 시작 노드 제외
  return Array.from(visited)
}

export function getUpstreamNodes(nodeId: string, graph: GraphState): string[] {
  // 역방향 인접 리스트
  const reverseAdj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    reverseAdj.set(node.id, [])
  }
  for (const edge of graph.edges) {
    reverseAdj.get(edge.targetNodeId)?.push(edge.sourceNodeId)
  }

  const visited = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    for (const neighbor of reverseAdj.get(current) ?? []) {
      queue.push(neighbor)
    }
  }

  visited.delete(nodeId)
  return Array.from(visited)
}
