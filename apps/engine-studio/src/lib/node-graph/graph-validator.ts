// ═══════════════════════════════════════════════════════════════
// 그래프 검증기
// T59-AC5: 연결 유효성, 분기 규칙 4종
// ═══════════════════════════════════════════════════════════════

import type { GraphState } from "./topological-sort"
import { detectCycle } from "./topological-sort"
import { getNodeDefinition } from "./node-registry"
import { isPortCompatible } from "./port-types"
import type { PortType } from "./port-types"

// ── 타입 정의 ─────────────────────────────────────────────────

export type ValidationLevel = "error" | "warning" | "info"

export interface ValidationIssue {
  level: ValidationLevel
  category: string
  message: string
  nodeId?: string
  edgeId?: string
}

export interface ValidationResult {
  valid: boolean // error가 0개면 true
  issues: ValidationIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
}

// ── 필수 노드 검증 ──────────────────────────────────────────

const REQUIRED_NODE_TYPES = [
  { type: "basic-info", label: "기본 정보" },
  { type: "prompt-builder", label: "프롬프트 빌더" },
  { type: "consistency", label: "일관성 검증" },
  { type: "deploy", label: "배포" },
]

function validateRequiredNodes(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeTypes = new Set(graph.nodes.map((n) => n.type))

  for (const req of REQUIRED_NODE_TYPES) {
    if (!nodeTypes.has(req.type)) {
      issues.push({
        level: "error",
        category: "required_node",
        message: `필수 노드 "${req.label}" (${req.type})이 없습니다`,
      })
    }
  }

  // L1 소스 필수: l1-vector 또는 archetype-select 중 하나
  if (!nodeTypes.has("l1-vector") && !nodeTypes.has("archetype-select")) {
    issues.push({
      level: "error",
      category: "required_node",
      message: "L1 소스 노드가 필요합니다 (L1 벡터 또는 아키타입 선택)",
    })
  }

  return issues
}

// ── 포트 연결 유효성 검증 ────────────────────────────────────

function validateConnections(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.sourceNodeId)
    const targetNode = nodeMap.get(edge.targetNodeId)

    if (!sourceNode || !targetNode) {
      issues.push({
        level: "error",
        category: "connection",
        message: `엣지가 존재하지 않는 노드를 참조합니다`,
        edgeId: edge.id,
      })
      continue
    }

    // 포트 타입 호환성 검사
    const sourceDef = getNodeDefinition(sourceNode.type)
    const targetDef = getNodeDefinition(targetNode.type)

    if (sourceDef && targetDef) {
      const sourcePort = sourceDef.outputs.find((p) => p.id === edge.sourcePortId)
      const targetPort = targetDef.inputs.find((p) => p.id === edge.targetPortId)

      if (!sourcePort) {
        issues.push({
          level: "error",
          category: "connection",
          message: `"${sourceDef.label}" 노드에 출력 포트 "${edge.sourcePortId}"가 없습니다`,
          edgeId: edge.id,
          nodeId: sourceNode.id,
        })
      } else if (!targetPort) {
        issues.push({
          level: "error",
          category: "connection",
          message: `"${targetDef.label}" 노드에 입력 포트 "${edge.targetPortId}"가 없습니다`,
          edgeId: edge.id,
          nodeId: targetNode.id,
        })
      } else if (!isPortCompatible(sourcePort.type as PortType, targetPort.type as PortType)) {
        issues.push({
          level: "error",
          category: "connection",
          message: `포트 타입 불일치: ${sourcePort.type} → ${targetPort.type}`,
          edgeId: edge.id,
        })
      }
    }
  }

  return issues
}

// ── 필수 입력 포트 검증 ──────────────────────────────────────

function validateRequiredPorts(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 각 노드의 필수 입력 포트에 연결이 있는지 확인
  const connectedInputs = new Map<string, Set<string>>()
  for (const edge of graph.edges) {
    const key = edge.targetNodeId
    if (!connectedInputs.has(key)) connectedInputs.set(key, new Set())
    connectedInputs.get(key)!.add(edge.targetPortId)
  }

  for (const node of graph.nodes) {
    const def = getNodeDefinition(node.type)
    if (!def) continue

    const connected = connectedInputs.get(node.id) ?? new Set()

    for (const port of def.inputs) {
      if (port.required && !connected.has(port.id)) {
        issues.push({
          level: "warning",
          category: "required_port",
          message: `"${def.label}" 노드의 필수 입력 "${port.label}"이 연결되지 않았습니다`,
          nodeId: node.id,
        })
      }
    }
  }

  return issues
}

// ── 순환 검증 ────────────────────────────────────────────────

function validateNoCycle(graph: GraphState): ValidationIssue[] {
  const result = detectCycle(graph)
  if (result.hasCycle) {
    return [
      {
        level: "error",
        category: "cycle",
        message: `순환이 감지되었습니다: ${result.cyclePath.join(" → ")}`,
      },
    ]
  }
  return []
}

// ── 도달 가능성 검증 (Rule 3) ────────────────────────────────

function validateReachability(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 입력 노드 (input 카테고리만)
  const inputNodeIds = new Set<string>()
  for (const node of graph.nodes) {
    const def = getNodeDefinition(node.type)
    if (def?.category === "input") {
      inputNodeIds.add(node.id)
    }
  }

  // BFS: 입력 노드에서 도달 가능한 노드
  const reachable = new Set<string>()
  const queue = Array.from(inputNodeIds)
  const adjacency = new Map<string, string[]>()
  for (const node of graph.nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue
    reachable.add(current)
    for (const neighbor of adjacency.get(current) ?? []) {
      queue.push(neighbor)
    }
  }

  // 도달 불가능한 노드
  for (const node of graph.nodes) {
    if (!reachable.has(node.id)) {
      const def = getNodeDefinition(node.type)
      issues.push({
        level: "error",
        category: "reachability",
        message: `"${def?.label ?? node.type}" 노드가 입력에서 도달 불가능합니다`,
        nodeId: node.id,
      })
    }
  }

  return issues
}

// ── 분기 규칙 1: Merge Required (Warning) ────────────────────

function validateMergeRequired(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const branchNodes = graph.nodes.filter((n) => n.type === "conditional" || n.type === "switch")

  for (const branchNode of branchNodes) {
    // 분기 후 경로들이 동일 노드에서 만나는지 확인
    const outEdges = graph.edges.filter((e) => e.sourceNodeId === branchNode.id)
    const branchTargets = outEdges.map((e) => e.targetNodeId)

    if (branchTargets.length < 2) continue

    // 각 분기에서 도달 가능한 노드 집합
    const adjacency = new Map<string, string[]>()
    for (const node of graph.nodes) {
      adjacency.set(node.id, [])
    }
    for (const edge of graph.edges) {
      adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId)
    }

    const reachableSets: Set<string>[] = []
    for (const target of branchTargets) {
      const reachable = new Set<string>()
      const q = [target]
      while (q.length > 0) {
        const c = q.shift()!
        if (reachable.has(c)) continue
        reachable.add(c)
        for (const n of adjacency.get(c) ?? []) q.push(n)
      }
      reachableSets.push(reachable)
    }

    // 교집합: 두 경로가 만나는 노드
    if (reachableSets.length >= 2) {
      const intersection = new Set(
        [...reachableSets[0]].filter((id) => reachableSets.slice(1).every((s) => s.has(id)))
      )

      // 교집합에 merge 노드가 없으면 경고
      if (intersection.size > 0) {
        const hasMerge = [...intersection].some((id) => {
          const node = graph.nodes.find((n) => n.id === id)
          return node?.type === "merge"
        })

        if (!hasMerge) {
          const def = getNodeDefinition(branchNode.type)
          issues.push({
            level: "warning",
            category: "merge_required",
            message: `"${def?.label ?? branchNode.type}" 분기의 합류 지점에 Merge 노드가 없습니다`,
            nodeId: branchNode.id,
          })
        }
      }
    }
  }

  return issues
}

// ── 분기 규칙 2: No Dead Ends (Warning) ──────────────────────

function validateNoDeadEnds(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const deployNodes = graph.nodes.filter((n) => n.type === "deploy")
  if (deployNodes.length === 0) return issues

  // 역방향 도달 가능성: deploy에서 역추적
  const reverseAdj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    reverseAdj.set(node.id, [])
  }
  for (const edge of graph.edges) {
    reverseAdj.get(edge.targetNodeId)?.push(edge.sourceNodeId)
  }

  const reachFromDeploy = new Set<string>()
  const queue = deployNodes.map((n) => n.id)
  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachFromDeploy.has(current)) continue
    reachFromDeploy.add(current)
    for (const neighbor of reverseAdj.get(current) ?? []) {
      queue.push(neighbor)
    }
  }

  // 분기 노드의 각 출력 경로가 deploy에 도달하는지 확인
  const branchNodes = graph.nodes.filter((n) => n.type === "conditional" || n.type === "switch")

  for (const branchNode of branchNodes) {
    const outEdges = graph.edges.filter((e) => e.sourceNodeId === branchNode.id)

    for (const edge of outEdges) {
      if (!reachFromDeploy.has(edge.targetNodeId)) {
        const def = getNodeDefinition(branchNode.type)
        issues.push({
          level: "warning",
          category: "dead_end",
          message: `"${def?.label ?? branchNode.type}" 노드의 "${edge.sourcePortId}" 분기가 배포 노드에 도달하지 않습니다`,
          nodeId: branchNode.id,
        })
      }
    }
  }

  return issues
}

// ── 분기 규칙 4: Switch Default Case (Info) ──────────────────

function validateSwitchDefault(graph: GraphState): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const switchNodes = graph.nodes.filter((n) => n.type === "switch")

  for (const node of switchNodes) {
    const data = node.data as { defaultCaseId?: string }
    if (!data.defaultCaseId) {
      issues.push({
        level: "info",
        category: "switch_default",
        message:
          "Switch 노드에 기본 케이스가 설정되지 않았습니다. 매칭 실패 시 분기가 건너뛰어집니다",
        nodeId: node.id,
      })
    }
  }

  return issues
}

// ── 종합 검증 ────────────────────────────────────────────────

export function validateGraph(graph: GraphState): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateNoCycle(graph),
    ...validateRequiredNodes(graph),
    ...validateConnections(graph),
    ...validateRequiredPorts(graph),
    ...validateReachability(graph),
    ...validateMergeRequired(graph),
    ...validateNoDeadEnds(graph),
    ...validateSwitchDefault(graph),
  ]

  const errorCount = issues.filter((i) => i.level === "error").length
  const warningCount = issues.filter((i) => i.level === "warning").length
  const infoCount = issues.filter((i) => i.level === "info").length

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
  }
}
