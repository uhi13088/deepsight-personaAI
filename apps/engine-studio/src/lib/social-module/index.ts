// ═══════════════════════════════════════════════════════════════
// Social Module — Barrel Export
// T147: Social Module System — Connectivity (보안 전용)
// ═══════════════════════════════════════════════════════════════

export type {
  SocialModuleConfig,
  SocialModuleEntry,
  FeatureBindings,
  RelationshipEdge,
  NodeMetrics,
  GraphStats,
  NodeClassification,
  AnomalyAlert,
} from "./types"

export {
  DEFAULT_SOCIAL_MODULE_CONFIG,
  FEATURE_BINDINGS,
  HUB_PERCENTILE,
  ISOLATE_MAX_DEGREE,
  CONNECTION_SPIKE_THRESHOLD,
  TENSION_CLUSTER_THRESHOLD,
  BOT_PATTERN_VARIANCE_THRESHOLD,
  PERIPHERAL_RATIO,
  buildAdjacencyMap,
  extractNodeIds,
  computeNodeDegree,
  computeClusteringCoefficient,
  computeNodeMetrics,
  computeAllNodeMetrics,
  computeGraphStats,
  classifyNode,
  detectHubs,
  detectIsolates,
  detectAnomalies,
  getEnabledModulesForFeature,
  validateSocialModuleConfig,
} from "./connectivity"
