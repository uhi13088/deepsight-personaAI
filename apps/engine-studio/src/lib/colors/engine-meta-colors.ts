// ═══════════════════════════════════════════════════════════════
// Engine Meta Colors — 엔진 지표별 색상
// 설계서 §12 기준
// ═══════════════════════════════════════════════════════════════

// ── Paradox Score 히트맵 ────────────────────────────────────
export const PARADOX_SCORE_COLORS = {
  primary: "#EF4444",
  scale: ["#FEE2E2", "#FECACA", "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C"] as const,
  labels: ["0-15%", "15-30%", "30-45%", "45-60%", "60-75%", "75-90%", "90-100%"] as const,
} as const

// ── Pressure 히트맵 ─────────────────────────────────────────
export const PRESSURE_COLORS = {
  primary: "#F97316",
  scale: ["#FED7AA", "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#C2410C"] as const,
  labels: ["P=0", "P=0.2", "P=0.4", "P=0.6", "P=0.8", "P=1.0"] as const,
} as const

// ── V_Final 결과 ────────────────────────────────────────────
export const VFINAL_COLORS = {
  primary: "#22C55E",
  bg: "#F0FDF4",
  border: "#86EFAC",
} as const

// ── α / β 가중치 ───────────────────────────────────────────
export const WEIGHT_COLORS = {
  alpha: { primary: "#F59E0B", range: ["#FEF3C7", "#F59E0B"] as const },
  beta: { primary: "#8B5CF6", range: ["#EDE9FE", "#8B5CF6"] as const },
} as const

// ── Dimensionality Score ────────────────────────────────────
export const DIMENSIONALITY_COLORS = {
  primary: "#06B6D4",
  scale: ["#CFFAFE", "#67E8F9", "#22D3EE", "#06B6D4", "#0891B2"] as const,
} as const

// ── Consistency / Integrity ─────────────────────────────────
export const CONSISTENCY_COLORS = {
  excellent: "#22C55E",
  warning: "#EAB308",
  poor: "#EF4444",
} as const
