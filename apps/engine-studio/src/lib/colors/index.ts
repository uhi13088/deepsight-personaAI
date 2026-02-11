// ═══════════════════════════════════════════════════════════════
// Color System — Unified Re-export + resolveColor Utility
// 설계서 §12 기준
//
// 5-Level Hierarchy:
//   1. Dimension Colors (L1: 7D, L2: 5D, L3: 4D)
//   2. Layer Colors (L1, L2, L3 그룹)
//   3. Cross-Axis Colors (관계 유형별 + 역설 쌍별)
//   4. Engine Meta Colors (Paradox Score, Pressure, V_Final 등)
//   5. Archetype Colors (12 아키타입)
// ═══════════════════════════════════════════════════════════════

export * from "./dimension-colors"
export * from "./layer-colors"
export * from "./cross-axis-colors"
export * from "./engine-meta-colors"
export * from "./archetype-colors"

import { DIMENSION_COLOR_MAP, type DimensionColor } from "./dimension-colors"
import { LAYER_COLORS, type LayerColorScheme } from "./layer-colors"
import { ARCHETYPE_COLOR_MAP, type ArchetypeColor } from "./archetype-colors"

// ═══════════════════════════════════════════════════════════════
// resolveColor — 키로 색상 조회하는 통합 유틸리티
// ═══════════════════════════════════════════════════════════════

type ColorTarget =
  | { type: "dimension"; key: string }
  | { type: "layer"; key: "L1" | "L2" | "L3" }
  | { type: "archetype"; key: string }

type ResolvedColor = DimensionColor | LayerColorScheme | ArchetypeColor | null

export function resolveColor(target: ColorTarget): ResolvedColor {
  switch (target.type) {
    case "dimension":
      return DIMENSION_COLOR_MAP[target.key] ?? null
    case "layer":
      return LAYER_COLORS[target.key] ?? null
    case "archetype":
      return ARCHETYPE_COLOR_MAP[target.key] ?? null
  }
}

// ── Primary HEX만 빠르게 조회 ───────────────────────────────
export function resolvePrimaryHex(target: ColorTarget): string {
  const color = resolveColor(target)
  if (!color) return "#94A3B8" // fallback: slate-400
  return color.primary
}
