// ═══════════════════════════════════════════════════════════════
// Layer-Level Colors (L1, L2, L3)
// 설계서 §12 기준
// ═══════════════════════════════════════════════════════════════

import type { CielabColor, OklchColor } from "./dimension-colors"

export interface LayerColorScheme {
  primary: string
  bg: string
  border: string
  fill: string // rgba for chart areas
  text: string
  gradient: string
  lab: CielabColor
  oklch: OklchColor
}

export const LAYER_COLORS: Record<"L1" | "L2" | "L3", LayerColorScheme> = {
  L1: {
    primary: "#3B82F6",
    bg: "#EFF6FF",
    border: "#93C5FD",
    fill: "rgba(59,130,246,0.15)",
    text: "#1E40AF",
    gradient: "linear-gradient(90deg, #DBEAFE, #3B82F6)",
    lab: { L: 47.5, a: -26.8, b: -37.2 },
    oklch: { L: 0.568, C: 0.177, h: 255 },
  },
  L2: {
    primary: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FCD34D",
    fill: "rgba(245,158,11,0.15)",
    text: "#92400E",
    gradient: "linear-gradient(90deg, #FEF3C7, #F59E0B)",
    lab: { L: 61.3, a: 19.4, b: 58.6 },
    oklch: { L: 0.686, C: 0.227, h: 42 },
  },
  L3: {
    primary: "#8B5CF6",
    bg: "#F5F3FF",
    border: "#C4B5FD",
    fill: "rgba(139,92,246,0.15)",
    text: "#5B21B6",
    gradient: "linear-gradient(90deg, #EDE9FE, #8B5CF6)",
    lab: { L: 57.8, a: 36.2, b: -64.4 },
    oklch: { L: 0.656, C: 0.226, h: 296 },
  },
}
