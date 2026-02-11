// ═══════════════════════════════════════════════════════════════
// Cross-Axis Colors
// 설계서 §12 기준 — 관계 유형별 + 역설 쌍별 + 히트맵 스케일
// ═══════════════════════════════════════════════════════════════

import type { CrossAxisRelationship } from "@/types"

// ── 관계 유형별 색상 ────────────────────────────────────────
export const RELATIONSHIP_COLORS: Record<CrossAxisRelationship, string> = {
  paradox: "#EF4444", // Red — 역설/모순
  reinforcing: "#22C55E", // Green — 강화/정렬
  modulating: "#F59E0B", // Amber — 조절
  neutral: "#94A3B8", // Slate — 독립
}

// ── 7 Paradox 쌍별 고유 색상 ────────────────────────────────
export interface ParadoxPairColor {
  id: string
  primary: string
  gradient: [string, string, string] // from, mid, to
}

export const PARADOX_PAIR_COLORS: ParadoxPairColor[] = [
  { id: "depth_openness", primary: "#7C5BF0", gradient: ["#EFF6FF", "#7C5BF0", "#4C1D95"] },
  { id: "lens_neuroticism", primary: "#A3884D", gradient: ["#FEF3C7", "#A3884D", "#78350F"] },
  { id: "stance_agreeableness", primary: "#E8783B", gradient: ["#FFEDD5", "#E8783B", "#9A3412"] },
  {
    id: "scope_conscientiousness",
    primary: "#D4A017",
    gradient: ["#FEF9C3", "#D4A017", "#713F12"],
  },
  { id: "taste_openness", primary: "#C865D9", gradient: ["#F3E8FF", "#C865D9", "#701A75"] },
  {
    id: "purpose_conscientiousness",
    primary: "#D4871F",
    gradient: ["#FEF3C7", "#D4871F", "#78350F"],
  },
  {
    id: "sociability_extraversion",
    primary: "#E05287",
    gradient: ["#FECDD3", "#E05287", "#881337"],
  },
]

// ── Cross-Layer Heatmap 스케일 ──────────────────────────────
export const CROSS_LAYER_HEATMAP = {
  L1xL2: { cold: "#DBEAFE", neutral: "#FEF3C7", hot: "#EF4444" },
  L1xL3: { cold: "#DBEAFE", neutral: "#EDE9FE", hot: "#7C3AED" },
  L2xL3: { cold: "#FFFBEB", neutral: "#F3E8FF", hot: "#581C87" },
} as const
