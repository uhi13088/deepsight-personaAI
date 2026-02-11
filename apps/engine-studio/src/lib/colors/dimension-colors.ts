// ═══════════════════════════════════════════════════════════════
// Dimension Colors — L1(7D) + L2(5D) + L3(4D) = 16 차원
// 설계서 §12, 구현계획서 §14.2 기준
// Color space: CIELAB(D50) + OKLCH dual
// ═══════════════════════════════════════════════════════════════

export interface CielabColor {
  L: number
  a: number
  b: number
}

export interface OklchColor {
  L: number
  C: number
  h: number
}

export interface DimensionColor {
  key: string
  layer: "L1" | "L2" | "L3"
  primary: string // HEX (display)
  from: string // Gradient start (low value)
  to: string // Gradient end (high value)
  lab: CielabColor
  oklch: OklchColor
}

// ── L1 Social Persona (7D) — Blue/Cool 계열 ─────────────────
export const L1_COLORS: DimensionColor[] = [
  {
    key: "depth",
    layer: "L1",
    primary: "#3B82F6",
    from: "#BFDBFE",
    to: "#1E3A8A",
    lab: { L: 47.5, a: -26.8, b: -37.2 },
    oklch: { L: 0.568, C: 0.177, h: 255 },
  },
  {
    key: "lens",
    layer: "L1",
    primary: "#10B981",
    from: "#FDA4AF",
    to: "#059669",
    lab: { L: 52.2, a: -38.5, b: 42.3 },
    oklch: { L: 0.604, C: 0.187, h: 142 },
  },
  {
    key: "stance",
    layer: "L1",
    primary: "#F59E0B",
    from: "#BBF7D0",
    to: "#EF4444",
    lab: { L: 61.3, a: 19.4, b: 58.6 },
    oklch: { L: 0.686, C: 0.227, h: 42 },
  },
  {
    key: "scope",
    layer: "L1",
    primary: "#EF4444",
    from: "#FEF08A",
    to: "#7C3AED",
    lab: { L: 54.3, a: 52.4, b: 40.7 },
    oklch: { L: 0.623, C: 0.267, h: 27 },
  },
  {
    key: "taste",
    layer: "L1",
    primary: "#8B5CF6",
    from: "#FDE68A",
    to: "#D946EF",
    lab: { L: 57.8, a: 36.2, b: -64.4 },
    oklch: { L: 0.656, C: 0.226, h: 296 },
  },
  {
    key: "purpose",
    layer: "L1",
    primary: "#EC4899",
    from: "#FED7AA",
    to: "#4338CA",
    lab: { L: 58.4, a: 33.8, b: -26.1 },
    oklch: { L: 0.661, C: 0.206, h: 318 },
  },
  {
    key: "sociability",
    layer: "L1",
    primary: "#6366F1",
    from: "#E0E7FF",
    to: "#4F46E5",
    lab: { L: 51.8, a: 24.3, b: -52.1 },
    oklch: { L: 0.584, C: 0.179, h: 272 },
  },
]

// ── L2 Core Temperament / OCEAN (5D) — Warm 계열 ────────────
export const L2_COLORS: DimensionColor[] = [
  {
    key: "openness",
    layer: "L2",
    primary: "#F97316",
    from: "#FED7AA",
    to: "#C2410C",
    lab: { L: 60.2, a: 27.4, b: 55.8 },
    oklch: { L: 0.68, C: 0.217, h: 64 },
  },
  {
    key: "conscientiousness",
    layer: "L2",
    primary: "#EAB308",
    from: "#FEF9C3",
    to: "#A16207",
    lab: { L: 72.5, a: -4.1, b: 63.8 },
    oklch: { L: 0.82, C: 0.208, h: 95 },
  },
  {
    key: "extraversion",
    layer: "L2",
    primary: "#F43F5E",
    from: "#FECDD3",
    to: "#BE123C",
    lab: { L: 54.8, a: 42.1, b: 18.3 },
    oklch: { L: 0.625, C: 0.212, h: 15 },
  },
  {
    key: "agreeableness",
    layer: "L2",
    primary: "#FB923C",
    from: "#FFEDD5",
    to: "#EA580C",
    lab: { L: 64.3, a: 23.7, b: 48.2 },
    oklch: { L: 0.724, C: 0.191, h: 53 },
  },
  {
    key: "neuroticism",
    layer: "L2",
    primary: "#D97706",
    from: "#FDE68A",
    to: "#92400E",
    lab: { L: 58.1, a: 20.3, b: 49.7 },
    oklch: { L: 0.658, C: 0.165, h: 48 },
  },
]

// ── L3 Narrative Drive (4D) — Deep Purple 계열 ──────────────
export const L3_COLORS: DimensionColor[] = [
  {
    key: "lack",
    layer: "L3",
    primary: "#7C3AED",
    from: "#EDE9FE",
    to: "#4C1D95",
    lab: { L: 53.4, a: 34.2, b: -56.8 },
    oklch: { L: 0.605, C: 0.194, h: 290 },
  },
  {
    key: "moralCompass",
    layer: "L3",
    primary: "#6D28D9",
    from: "#DDD6FE",
    to: "#3B0764",
    lab: { L: 50.2, a: 38.1, b: -61.2 },
    oklch: { L: 0.565, C: 0.208, h: 287 },
  },
  {
    key: "volatility",
    layer: "L3",
    primary: "#A855F7",
    from: "#F3E8FF",
    to: "#7E22CE",
    lab: { L: 60.7, a: 35.4, b: -54.3 },
    oklch: { L: 0.687, C: 0.181, h: 293 },
  },
  {
    key: "growthArc",
    layer: "L3",
    primary: "#9333EA",
    from: "#E9D5FF",
    to: "#581C87",
    lab: { L: 58.3, a: 32.6, b: -52.1 },
    oklch: { L: 0.662, C: 0.168, h: 296 },
  },
]

// ── 전체 차원 색상 (16) ─────────────────────────────────────
export const ALL_DIMENSION_COLORS: DimensionColor[] = [...L1_COLORS, ...L2_COLORS, ...L3_COLORS]

// ── key → color 빠른 조회 ───────────────────────────────────
export const DIMENSION_COLOR_MAP: Record<string, DimensionColor> = Object.fromEntries(
  ALL_DIMENSION_COLORS.map((c) => [c.key, c])
)
