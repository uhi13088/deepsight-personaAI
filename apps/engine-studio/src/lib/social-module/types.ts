// ═══════════════════════════════════════════════════════════════
// Social Module Types v4.0
// T151: 소셜 모듈 B — Connectivity (보안용)
// ═══════════════════════════════════════════════════════════════

// ── 모듈 설정 ────────────────────────────────────────────────

/** 소셜 모듈 개별 설정 */
export interface SocialModuleEntry {
  enabled: boolean
  weight: number // 0~1
}

/** 소셜 모듈 전역 설정 */
export interface SocialModuleConfig {
  authority: SocialModuleEntry
  connectivity: SocialModuleEntry
  reputation: SocialModuleEntry
  tribalism: SocialModuleEntry
}

/** 기능별 모듈 바인딩 */
export interface FeatureBindings {
  matching: (keyof SocialModuleConfig)[]
  feed: (keyof SocialModuleConfig)[]
  arena: (keyof SocialModuleConfig)[]
  security: (keyof SocialModuleConfig)[]
}

// ── 그래프 타입 ──────────────────────────────────────────────

/** 관계 엣지 */
export interface RelationshipEdge {
  sourceId: string
  targetId: string
  warmth: number
  tension: number
  frequency: number
  depth: number
  lastInteractionAt: number | null
}

/** 노드 메트릭 */
export interface NodeMetrics {
  personaId: string
  inDegree: number
  outDegree: number
  totalDegree: number
  avgWarmth: number
  avgTension: number
  clusteringCoefficient: number
  /** 커넥티비티 점수 (종합) */
  connectivityScore: number
}

/** 그래프 전체 통계 */
export interface GraphStats {
  totalNodes: number
  totalEdges: number
  avgDegree: number
  avgClusteringCoefficient: number
  density: number // 0~1
  hubCount: number
  isolateCount: number
}

/** 노드 분류 */
export type NodeClassification = "HUB" | "NORMAL" | "PERIPHERAL" | "ISOLATE"

/** 이상 탐지 결과 */
export interface AnomalyAlert {
  type: "sudden_connection_spike" | "isolation_risk" | "tension_cluster" | "bot_pattern"
  personaId: string
  severity: "low" | "medium" | "high"
  description: string
  detectedAt: number
  evidence: Record<string, number>
}
