// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Evolution Module Index
// T135: L3 기반 장기 행동 진화
// ═══════════════════════════════════════════════════════════════

export { EVOLUTION_STAGES, getEvolutionStage, hasStageTransition } from "./evolution-stages"
export type { EvolutionStage } from "./evolution-stages"

export { analyzeEvolutionTrend } from "./evolution-analyzer"
export type {
  EvolutionTrend,
  ActivityLogEntry,
  StateSnapshotEntry,
  EvolutionAnalyzerProvider,
} from "./evolution-analyzer"

export {
  computeL3Evolution,
  MAX_GROWTH_ARC_DELTA_PER_WEEK,
  MAX_DIMENSION_DELTA,
  MIN_ACTIVITIES_FOR_EVOLUTION,
  MIN_DAYS_FOR_EVOLUTION,
} from "./evolution-algorithm"
export type { L3EvolutionResult } from "./evolution-algorithm"

export { runEvolutionBatch } from "./evolution-runner"
export type {
  EvolutionPersona,
  EvolutionRunnerDataProvider,
  EvolutionBatchResult,
} from "./evolution-runner"
