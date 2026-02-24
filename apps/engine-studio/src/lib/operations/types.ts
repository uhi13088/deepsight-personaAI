// ═══════════════════════════════════════════════════════════════
// Shared types and utilities for operations module
// ═══════════════════════════════════════════════════════════════

export type MetricType =
  | "active_personas"
  | "llm_calls"
  | "llm_cost"
  | "llm_error_rate"
  | "avg_latency"
  | "matching_count"

export function roundMetric(v: number): number {
  return Math.round(v * 100) / 100
}
