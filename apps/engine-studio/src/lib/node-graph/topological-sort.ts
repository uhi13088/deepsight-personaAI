// ═══════════════════════════════════════════════════════════════
// 위상 정렬 + 순환 탐지
// T59-AC3: Kahn's Algorithm, DFS 순환 탐지
// ═══════════════════════════════════════════════════════════════

// ── 공통 타입 ────────────────────────────────────────────────

export interface NodeInstance {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface EdgeInstance {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface GraphState {
  nodes: NodeInstance[]
  edges: EdgeInstance[]
}

// ── Kahn's Algorithm (위상 정렬) ─────────────────────────────

export interface TopologicalSortResult {
  sorted: string[] // 정렬된 노드 ID
  hasCycle: boolean
  cycleNodes: string[] // 순환에 포함된 노드
}

export function topologicalSort(graph: GraphState): TopologicalSortResult {
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // 초기화
  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }

  // 간선 처리
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue
    adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId)
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1)
  }

  // Kahn's: in-degree 0인 노드부터 처리
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const sorted: string[] = []

  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  // 순환 탐지: 정렬 결과가 전체 노드 수보다 적으면 순환 존재
  const hasCycle = sorted.length < nodeIds.size
  const cycleNodes: string[] = []

  if (hasCycle) {
    for (const [id, degree] of inDegree) {
      if (degree > 0) cycleNodes.push(id)
    }
  }

  return { sorted, hasCycle, cycleNodes }
}

// ── DFS 기반 순환 탐지 ───────────────────────────────────────

export function detectCycle(graph: GraphState): { hasCycle: boolean; cyclePath: string[] } {
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    adjacency.set(id, [])
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) continue
    adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId)
  }

  const WHITE = 0 // 미방문
  const GRAY = 1 // 방문 중 (현재 스택)
  const BLACK = 2 // 완료

  const color = new Map<string, number>()
  const parent = new Map<string, string | null>()

  for (const id of nodeIds) {
    color.set(id, WHITE)
    parent.set(id, null)
  }

  let cyclePath: string[] = []

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY)

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (color.get(neighbor) === GRAY) {
        // 순환 발견 — 경로 역추적
        cyclePath = [neighbor, nodeId]
        let current = nodeId
        while (current !== neighbor) {
          const p = parent.get(current)
          if (p === null || p === undefined) break
          cyclePath.push(p)
          current = p
        }
        cyclePath.reverse()
        return true
      }

      if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, nodeId)
        if (dfs(neighbor)) return true
      }
    }

    color.set(nodeId, BLACK)
    return false
  }

  for (const id of nodeIds) {
    if (color.get(id) === WHITE) {
      if (dfs(id)) return { hasCycle: true, cyclePath }
    }
  }

  return { hasCycle: false, cyclePath: [] }
}

// ── 연결 추가 시 순환 체크 ───────────────────────────────────

export function wouldCreateCycle(
  graph: GraphState,
  sourceNodeId: string,
  targetNodeId: string
): boolean {
  // 임시 엣지를 추가하여 순환 검사
  const tempGraph: GraphState = {
    nodes: graph.nodes,
    edges: [
      ...graph.edges,
      {
        id: "__temp__",
        sourceNodeId,
        sourcePortId: "",
        targetNodeId,
        targetPortId: "",
      },
    ],
  }
  return detectCycle(tempGraph).hasCycle
}
