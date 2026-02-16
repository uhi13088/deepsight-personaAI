// ═══════════════════════════════════════════════════════════════
// Social Module — Connectivity Engine v4.0
// T151: 관계 그래프 분석, Hub/Isolate 탐지, 보안 이상 감지
// LLM 비용: 0 (순수 규칙 기반)
// ═══════════════════════════════════════════════════════════════

import type {
  SocialModuleConfig,
  FeatureBindings,
  RelationshipEdge,
  NodeMetrics,
  GraphStats,
  NodeClassification,
  AnomalyAlert,
} from "./types"

// ── 상수 ────────────────────────────────────────────────────

/** 기본 소셜 모듈 설정 */
export const DEFAULT_SOCIAL_MODULE_CONFIG: SocialModuleConfig = {
  authority: { enabled: false, weight: 0.2 },
  connectivity: { enabled: true, weight: 0.3 },
  reputation: { enabled: true, weight: 0.3 },
  tribalism: { enabled: false, weight: 0.2 },
}

/** 기능별 모듈 바인딩 */
export const FEATURE_BINDINGS: FeatureBindings = {
  matching: ["reputation"],
  feed: ["authority", "reputation"],
  arena: ["tribalism"],
  security: ["connectivity"],
}

/** Hub 임계값 (degree 상위 %) */
export const HUB_PERCENTILE = 0.9

/** Isolate 임계값 (degree) */
export const ISOLATE_MAX_DEGREE = 1

/** 이상 탐지 — 연결 급증 임계 (일주일 내 새 연결 수) */
export const CONNECTION_SPIKE_THRESHOLD = 10

/** 이상 탐지 — 긴장 클러스터 임계 */
export const TENSION_CLUSTER_THRESHOLD = 0.6

/** 이상 탐지 — 봇 패턴 임계 (균등 인터랙션) */
export const BOT_PATTERN_VARIANCE_THRESHOLD = 0.02

/** Peripheral 노드 기준 (평균 이하) */
export const PERIPHERAL_RATIO = 0.5

// ══════════════════════════════════════════════════════════════
// 그래프 구축 & 분석
// ══════════════════════════════════════════════════════════════

/** 인접 리스트 구축 (방향 그래프) */
export function buildAdjacencyMap(edges: RelationshipEdge[]): Map<string, RelationshipEdge[]> {
  const map = new Map<string, RelationshipEdge[]>()

  for (const edge of edges) {
    if (!map.has(edge.sourceId)) map.set(edge.sourceId, [])
    map.get(edge.sourceId)!.push(edge)

    // 노드 등록 (targetId도 포함)
    if (!map.has(edge.targetId)) map.set(edge.targetId, [])
  }

  return map
}

/** 전체 노드 ID 추출 */
export function extractNodeIds(edges: RelationshipEdge[]): string[] {
  const nodeSet = new Set<string>()
  for (const edge of edges) {
    nodeSet.add(edge.sourceId)
    nodeSet.add(edge.targetId)
  }
  return Array.from(nodeSet)
}

// ══════════════════════════════════════════════════════════════
// 노드 메트릭 계산
// ══════════════════════════════════════════════════════════════

/** 단일 노드의 degree 계산 */
export function computeNodeDegree(
  personaId: string,
  edges: RelationshipEdge[]
): { inDegree: number; outDegree: number } {
  let inDegree = 0
  let outDegree = 0

  for (const edge of edges) {
    if (edge.sourceId === personaId) outDegree++
    if (edge.targetId === personaId) inDegree++
  }

  return { inDegree, outDegree }
}

/** 클러스터링 계수: 이웃 간 실제 연결 / 가능한 연결 */
export function computeClusteringCoefficient(personaId: string, edges: RelationshipEdge[]): number {
  // 이웃 집합 (방향 무시)
  const neighbors = new Set<string>()
  for (const edge of edges) {
    if (edge.sourceId === personaId) neighbors.add(edge.targetId)
    if (edge.targetId === personaId) neighbors.add(edge.sourceId)
  }

  const k = neighbors.size
  if (k < 2) return 0

  // 이웃 간 연결 수
  const neighborArray = Array.from(neighbors)
  let connectionsBetweenNeighbors = 0

  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      const connected = edges.some(
        (e) =>
          (e.sourceId === neighborArray[i] && e.targetId === neighborArray[j]) ||
          (e.sourceId === neighborArray[j] && e.targetId === neighborArray[i])
      )
      if (connected) connectionsBetweenNeighbors++
    }
  }

  const possibleConnections = (k * (k - 1)) / 2
  return possibleConnections > 0 ? connectionsBetweenNeighbors / possibleConnections : 0
}

/** 단일 노드의 전체 메트릭 계산 */
export function computeNodeMetrics(personaId: string, edges: RelationshipEdge[]): NodeMetrics {
  const { inDegree, outDegree } = computeNodeDegree(personaId, edges)

  // 관련 엣지의 평균 warmth/tension
  const relatedEdges = edges.filter((e) => e.sourceId === personaId || e.targetId === personaId)

  const avgWarmth =
    relatedEdges.length > 0
      ? relatedEdges.reduce((s, e) => s + e.warmth, 0) / relatedEdges.length
      : 0
  const avgTension =
    relatedEdges.length > 0
      ? relatedEdges.reduce((s, e) => s + e.tension, 0) / relatedEdges.length
      : 0

  const clusteringCoefficient = computeClusteringCoefficient(personaId, edges)
  const totalDegree = inDegree + outDegree

  // 종합 커넥티비티 점수
  const connectivityScore = computeConnectivityScore(totalDegree, clusteringCoefficient, avgWarmth)

  return {
    personaId,
    inDegree,
    outDegree,
    totalDegree,
    avgWarmth: round3(avgWarmth),
    avgTension: round3(avgTension),
    clusteringCoefficient: round3(clusteringCoefficient),
    connectivityScore: round3(connectivityScore),
  }
}

/** 모든 노드의 메트릭 일괄 계산 */
export function computeAllNodeMetrics(edges: RelationshipEdge[]): NodeMetrics[] {
  const nodeIds = extractNodeIds(edges)
  return nodeIds.map((id) => computeNodeMetrics(id, edges))
}

// ══════════════════════════════════════════════════════════════
// 그래프 통계
// ══════════════════════════════════════════════════════════════

/** 그래프 전체 통계 */
export function computeGraphStats(edges: RelationshipEdge[]): GraphStats {
  const nodeIds = extractNodeIds(edges)
  const totalNodes = nodeIds.length
  const totalEdges = edges.length

  if (totalNodes === 0) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      avgDegree: 0,
      avgClusteringCoefficient: 0,
      density: 0,
      hubCount: 0,
      isolateCount: 0,
    }
  }

  const metrics = computeAllNodeMetrics(edges)
  const avgDegree = metrics.reduce((s, m) => s + m.totalDegree, 0) / totalNodes
  const avgCC = metrics.reduce((s, m) => s + m.clusteringCoefficient, 0) / totalNodes

  // 밀도: 실제 엣지 / 가능 엣지
  const maxPossibleEdges = totalNodes * (totalNodes - 1) // 방향 그래프
  const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0

  // Hub/Isolate 분류
  const classifications = metrics.map((m) => classifyNode(m, avgDegree))
  const hubCount = classifications.filter((c) => c === "HUB").length
  const isolateCount = classifications.filter((c) => c === "ISOLATE").length

  return {
    totalNodes,
    totalEdges,
    avgDegree: round3(avgDegree),
    avgClusteringCoefficient: round3(avgCC),
    density: round3(density),
    hubCount,
    isolateCount,
  }
}

// ══════════════════════════════════════════════════════════════
// Hub / Isolate 분류
// ══════════════════════════════════════════════════════════════

/** 노드 분류 */
export function classifyNode(metrics: NodeMetrics, avgDegree: number): NodeClassification {
  if (metrics.totalDegree <= ISOLATE_MAX_DEGREE && metrics.clusteringCoefficient === 0) {
    return "ISOLATE"
  }
  // Hub: 높은 degree + CC, 또는 매우 높은 degree (스타 그래프)
  if (
    (metrics.totalDegree >= avgDegree * 2 && metrics.clusteringCoefficient > 0.3) ||
    metrics.totalDegree >= avgDegree * 2.5
  ) {
    return "HUB"
  }
  if (metrics.totalDegree < avgDegree * PERIPHERAL_RATIO) {
    return "PERIPHERAL"
  }
  return "NORMAL"
}

/** Hub 노드 탐지 */
export function detectHubs(edges: RelationshipEdge[]): NodeMetrics[] {
  const metrics = computeAllNodeMetrics(edges)
  const stats = computeGraphStats(edges)
  return metrics.filter((m) => classifyNode(m, stats.avgDegree) === "HUB")
}

/** Isolate 노드 탐지 */
export function detectIsolates(edges: RelationshipEdge[]): NodeMetrics[] {
  const metrics = computeAllNodeMetrics(edges)
  const stats = computeGraphStats(edges)
  return metrics.filter((m) => classifyNode(m, stats.avgDegree) === "ISOLATE")
}

// ══════════════════════════════════════════════════════════════
// 이상 탐지 (보안)
// ══════════════════════════════════════════════════════════════

/** 보안 이상 탐지 */
export function detectAnomalies(
  edges: RelationshipEdge[],
  recentEdges: RelationshipEdge[],
  windowDays: number = 7
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = []
  const now = Date.now()
  const nodeIds = extractNodeIds(edges)

  for (const personaId of nodeIds) {
    // 1. 연결 급증 탐지
    const recentConnections = recentEdges.filter(
      (e) => e.sourceId === personaId || e.targetId === personaId
    )
    if (recentConnections.length >= CONNECTION_SPIKE_THRESHOLD) {
      alerts.push({
        type: "sudden_connection_spike",
        personaId,
        severity: recentConnections.length >= CONNECTION_SPIKE_THRESHOLD * 2 ? "high" : "medium",
        description: `${windowDays}일 내 ${recentConnections.length}개 새 연결 (임계: ${CONNECTION_SPIKE_THRESHOLD})`,
        detectedAt: now,
        evidence: { recentConnections: recentConnections.length },
      })
    }

    // 2. 긴장 클러스터 탐지
    const relatedEdges = edges.filter((e) => e.sourceId === personaId || e.targetId === personaId)
    const highTensionEdges = relatedEdges.filter((e) => e.tension >= TENSION_CLUSTER_THRESHOLD)
    if (relatedEdges.length >= 3 && highTensionEdges.length >= relatedEdges.length * 0.5) {
      alerts.push({
        type: "tension_cluster",
        personaId,
        severity: highTensionEdges.length >= relatedEdges.length * 0.8 ? "high" : "medium",
        description: `관계의 ${Math.round((highTensionEdges.length / relatedEdges.length) * 100)}%가 높은 긴장도`,
        detectedAt: now,
        evidence: {
          totalRelations: relatedEdges.length,
          highTensionCount: highTensionEdges.length,
        },
      })
    }

    // 3. 봇 패턴 탐지 (균등 인터랙션)
    if (relatedEdges.length >= 5) {
      const frequencies = relatedEdges.map((e) => e.frequency)
      const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length
      if (avgFreq > 0) {
        const variance =
          frequencies.reduce((s, f) => s + (f - avgFreq) ** 2, 0) / frequencies.length
        if (variance < BOT_PATTERN_VARIANCE_THRESHOLD) {
          alerts.push({
            type: "bot_pattern",
            personaId,
            severity: "medium",
            description: `인터랙션 빈도 분산이 매우 낮음 (${round3(variance)}) — 자동화 의심`,
            detectedAt: now,
            evidence: { variance: round3(variance), avgFrequency: round3(avgFreq) },
          })
        }
      }
    }

    // 4. 고립 위험 탐지
    const metrics = computeNodeMetrics(personaId, edges)
    if (metrics.totalDegree <= ISOLATE_MAX_DEGREE && metrics.avgWarmth < 0.3) {
      alerts.push({
        type: "isolation_risk",
        personaId,
        severity: "low",
        description: `낮은 연결도(${metrics.totalDegree}) + 낮은 평균 친밀도(${metrics.avgWarmth})`,
        detectedAt: now,
        evidence: {
          totalDegree: metrics.totalDegree,
          avgWarmth: metrics.avgWarmth,
        },
      })
    }
  }

  return alerts
}

// ══════════════════════════════════════════════════════════════
// 커넥티비티 점수 (종합)
// ══════════════════════════════════════════════════════════════

/** 커넥티비티 점수 = degree + clustering + warmth 기반 */
function computeConnectivityScore(
  totalDegree: number,
  clusteringCoefficient: number,
  avgWarmth: number
): number {
  // degree 정규화 (sigmoid, 10에서 0.5)
  const degreeFactor = 1 / (1 + Math.exp(-0.3 * (totalDegree - 5)))
  // clustering이 높으면 건강한 관계
  const clusterFactor = clusteringCoefficient
  // warmth가 높으면 긍정적 네트워크
  const warmthFactor = avgWarmth

  return round3(degreeFactor * 0.5 + clusterFactor * 0.25 + warmthFactor * 0.25)
}

/** 기능에 바인딩된 모듈 확인 */
export function getEnabledModulesForFeature(
  feature: keyof FeatureBindings,
  config: SocialModuleConfig = DEFAULT_SOCIAL_MODULE_CONFIG
): Array<{ module: keyof SocialModuleConfig; weight: number }> {
  const bindings = FEATURE_BINDINGS[feature]
  return bindings
    .filter((mod) => config[mod].enabled)
    .map((mod) => ({ module: mod, weight: config[mod].weight }))
}

/** 소셜 모듈 설정 검증 */
export function validateSocialModuleConfig(config: SocialModuleConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const modules: (keyof SocialModuleConfig)[] = [
    "authority",
    "connectivity",
    "reputation",
    "tribalism",
  ]

  for (const mod of modules) {
    if (config[mod].weight < 0 || config[mod].weight > 1) {
      errors.push(`${mod}.weight는 0~1 범위여야 합니다`)
    }
  }

  const totalWeight = modules.reduce((s, m) => s + (config[m].enabled ? config[m].weight : 0), 0)
  if (totalWeight > 2) {
    errors.push(`활성 모듈 가중치 합이 너무 높습니다: ${totalWeight}`)
  }

  return { valid: errors.length === 0, errors }
}

// ── 유틸 ────────────────────────────────────────────────────

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
