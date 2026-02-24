// ═══════════════════════════════════════════════════════════════
// Consumer Journey — Shared Types & Utilities
// ═══════════════════════════════════════════════════════════════

export type DataSourceType = "real_persona" | "virtual_user" | "synthetic"

export function round(v: number): number {
  return Math.round(v * 100) / 100
}
