// ═══════════════════════════════════════════════════════════════
// 분기 실행 엔진
// T61-AC4: 활성 엣지 추적, ExecutionPath, 비활성 경로 스킵
// ═══════════════════════════════════════════════════════════════

import { topologicalSort } from "./topological-sort"
import type { GraphState, NodeInstance } from "./topological-sort"
import type { NodeExecutionResult, ExecutionState } from "./dag-engine"
import { getNodeDefinition } from "./node-registry"
import { executeNode, type ExecutionContext } from "./node-executor"

// ── ExecutionPath 엔트리 ──────────────────────────────────────

export interface ExecutionPathEntry {
  nodeId: string
  nodeType: string
  status: "executed" | "skipped" | "error"
  reason?: string
  durationMs: number
}

// ── 실행 결과 (확장) ──────────────────────────────────────────

export interface ExecutionEngineResult {
  state: ExecutionState
  executionPath: ExecutionPathEntry[]
  totalDurationMs: number
}

// ── 입력값 수집 (활성 엣지만) ────────────────────────────────

function collectActiveInputs(
  nodeId: string,
  graph: GraphState,
  results: Map<string, NodeExecutionResult>,
  activeEdges: Set<string>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}
  const incomingEdges = graph.edges.filter((e) => e.targetNodeId === nodeId)

  for (const edge of incomingEdges) {
    if (!activeEdges.has(edge.id)) continue

    const sourceResult = results.get(edge.sourceNodeId)
    if (sourceResult && sourceResult.status === "success") {
      const value = sourceResult.outputs[edge.sourcePortId]
      if (value !== undefined) {
        const existing = inputs[edge.targetPortId]
        if (existing !== undefined) {
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

// ── 활성 엣지 업데이트 ────────────────────────────────────────

function updateActiveEdges(
  node: NodeInstance,
  result: NodeExecutionResult,
  graph: GraphState,
  activeEdges: Set<string>
): void {
  const outEdges = graph.edges.filter((e) => e.sourceNodeId === node.id)
  const nodeDef = getNodeDefinition(node.type)

  // conditional: branchTaken 포트만 활성화
  if (nodeDef?.type === "conditional" && result.branch) {
    for (const edge of outEdges) {
      if (edge.sourcePortId === result.branch) {
        activeEdges.add(edge.id)
      }
    }
    return
  }

  // switch: activeCases 포트만 활성화
  if (nodeDef?.type === "switch" && result.activeCases) {
    for (const edge of outEdges) {
      if (result.activeCases.includes(edge.sourcePortId)) {
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

// ── 메인 실행 엔진 ─────────────────────────────────────────────

export async function executeGraph(
  graph: GraphState,
  ctx: ExecutionContext = {}
): Promise<ExecutionEngineResult> {
  const startTime = Date.now()
  const sortResult = topologicalSort(graph)

  if (sortResult.hasCycle) {
    return {
      state: {
        results: new Map(),
        activeEdges: new Set(),
        executionOrder: [],
        completed: false,
      },
      executionPath: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  const results = new Map<string, NodeExecutionResult>()
  const activeEdges = new Set<string>()
  const executionPath: ExecutionPathEntry[] = []
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  for (const nodeId of sortResult.sorted) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    const nodeStart = Date.now()
    const inEdges = graph.edges.filter((e) => e.targetNodeId === nodeId)
    const hasInEdges = inEdges.length > 0
    const hasActiveInput = inEdges.some((e) => activeEdges.has(e.id))

    // 비활성 경로 스킵: 입력 엣지가 있지만 활성 입력이 없음
    if (hasInEdges && !hasActiveInput) {
      results.set(nodeId, {
        nodeId,
        outputs: {},
        status: "skipped",
      })
      executionPath.push({
        nodeId,
        nodeType: node.type,
        status: "skipped",
        reason: "비활성 경로",
        durationMs: Date.now() - nodeStart,
      })
      continue
    }

    // 입력값 수집
    const inputs = collectActiveInputs(nodeId, graph, results, activeEdges)

    // 노드 실행
    try {
      const result = await executeNode(nodeId, node.type, node.data, inputs, ctx)
      results.set(nodeId, result)

      if (result.status === "success") {
        updateActiveEdges(node, result, graph, activeEdges)
        executionPath.push({
          nodeId,
          nodeType: node.type,
          status: "executed",
          durationMs: Date.now() - nodeStart,
        })
      } else if (result.status === "error") {
        executionPath.push({
          nodeId,
          nodeType: node.type,
          status: "error",
          reason: result.error,
          durationMs: Date.now() - nodeStart,
        })
      } else {
        executionPath.push({
          nodeId,
          nodeType: node.type,
          status: "skipped",
          reason: result.error ?? "실행 스킵",
          durationMs: Date.now() - nodeStart,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.set(nodeId, {
        nodeId,
        outputs: {},
        status: "error",
        error: message,
      })
      executionPath.push({
        nodeId,
        nodeType: node.type,
        status: "error",
        reason: message,
        durationMs: Date.now() - nodeStart,
      })
    }
  }

  return {
    state: {
      results,
      activeEdges,
      executionOrder: sortResult.sorted,
      completed: true,
    },
    executionPath,
    totalDurationMs: Date.now() - startTime,
  }
}

// ── 부분 실행 (특정 노드부터) ─────────────────────────────────

export async function executeFromNode(
  graph: GraphState,
  startNodeId: string,
  existingResults: Map<string, NodeExecutionResult>,
  ctx: ExecutionContext = {}
): Promise<ExecutionEngineResult> {
  const startTime = Date.now()
  const sortResult = topologicalSort(graph)

  if (sortResult.hasCycle) {
    return {
      state: {
        results: existingResults,
        activeEdges: new Set(),
        executionOrder: [],
        completed: false,
      },
      executionPath: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  // startNode 이후만 실행
  const startIdx = sortResult.sorted.indexOf(startNodeId)
  if (startIdx === -1) {
    return {
      state: {
        results: existingResults,
        activeEdges: new Set(),
        executionOrder: [],
        completed: false,
      },
      executionPath: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  const nodesToExecute = sortResult.sorted.slice(startIdx)
  const results = new Map(existingResults)
  const activeEdges = new Set<string>()
  const executionPath: ExecutionPathEntry[] = []
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  // 기존 결과에서 활성 엣지 복원
  for (const [resultNodeId, result] of results) {
    if (result.status === "success") {
      const node = nodeMap.get(resultNodeId)
      if (node) {
        updateActiveEdges(node, result, graph, activeEdges)
      }
    }
  }

  for (const nodeId of nodesToExecute) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    const nodeStart = Date.now()
    const inEdges = graph.edges.filter((e) => e.targetNodeId === nodeId)
    const hasInEdges = inEdges.length > 0
    const hasActiveInput = inEdges.some((e) => activeEdges.has(e.id))

    if (hasInEdges && !hasActiveInput) {
      results.set(nodeId, { nodeId, outputs: {}, status: "skipped" })
      executionPath.push({
        nodeId,
        nodeType: node.type,
        status: "skipped",
        reason: "비활성 경로",
        durationMs: Date.now() - nodeStart,
      })
      continue
    }

    const inputs = collectActiveInputs(nodeId, graph, results, activeEdges)

    try {
      const result = await executeNode(nodeId, node.type, node.data, inputs, ctx)
      results.set(nodeId, result)

      if (result.status === "success") {
        updateActiveEdges(node, result, graph, activeEdges)
      }

      executionPath.push({
        nodeId,
        nodeType: node.type,
        status:
          result.status === "success"
            ? "executed"
            : result.status === "error"
              ? "error"
              : "skipped",
        reason: result.error,
        durationMs: Date.now() - nodeStart,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.set(nodeId, { nodeId, outputs: {}, status: "error", error: message })
      executionPath.push({
        nodeId,
        nodeType: node.type,
        status: "error",
        reason: message,
        durationMs: Date.now() - nodeStart,
      })
    }
  }

  return {
    state: {
      results,
      activeEdges,
      executionOrder: sortResult.sorted,
      completed: true,
    },
    executionPath,
    totalDurationMs: Date.now() - startTime,
  }
}

// ── 실행 요약 생성 ────────────────────────────────────────────

export function summarizeExecution(result: ExecutionEngineResult): {
  total: number
  executed: number
  skipped: number
  errors: number
  avgDurationMs: number
} {
  const path = result.executionPath
  const executed = path.filter((e) => e.status === "executed").length
  const skipped = path.filter((e) => e.status === "skipped").length
  const errors = path.filter((e) => e.status === "error").length
  const totalDuration = path.reduce((sum, e) => sum + e.durationMs, 0)

  return {
    total: path.length,
    executed,
    skipped,
    errors,
    avgDurationMs: path.length > 0 ? Math.round(totalDuration / path.length) : 0,
  }
}
