// ═══════════════════════════════════════════════════════════════
// 컬러지문 UI — 공통 타입 + 유틸리티
// T64: 3-Layer 시각화 Props, 색상 상수, 계산 함수
// ═══════════════════════════════════════════════════════════════

// ── L1/L2/L3 벡터 타입 ──────────────────────────────────────

export interface L1Vector {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
  sociability: number
}

export interface L2Vector {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export interface L3Vector {
  lack: number
  moralCompass: number
  volatility: number
  growthArc: number
}

// ── 공통 Props ──────────────────────────────────────────────

export type FingerprintMode = "compact" | "l1-l2" | "full"

export interface FingerprintBaseProps {
  l1: L1Vector
  l2?: L2Vector
  l3?: L3Vector
  paradoxScore?: number // 0~1
  pressure?: number // 0~1
  size?: number
  mode?: FingerprintMode
}

// ── 색상 상수 ────────────────────────────────────────────────

export const L1_COLORS: Record<keyof L1Vector, string> = {
  depth: "#3B82F6", // blue
  lens: "#10B981", // emerald
  stance: "#F59E0B", // amber
  scope: "#8B5CF6", // violet
  taste: "#EC4899", // pink
  purpose: "#06B6D4", // cyan
  sociability: "#F97316", // orange
}

export const L2_COLORS: Record<keyof L2Vector, string> = {
  openness: "#F59E0B", // amber
  conscientiousness: "#D97706", // amber-dark
  extraversion: "#FBBF24", // yellow
  agreeableness: "#B45309", // amber-deeper
  neuroticism: "#92400E", // amber-darkest
}

export const L3_COLORS: Record<keyof L3Vector, string> = {
  lack: "#7C3AED", // violet
  moralCompass: "#6D28D9", // violet-dark
  volatility: "#8B5CF6", // violet-light
  growthArc: "#5B21B6", // violet-deeper
}

export const L1_LABELS: Record<keyof L1Vector, string> = {
  depth: "분석깊이",
  lens: "판단렌즈",
  stance: "비평태도",
  scope: "탐색범위",
  taste: "취향실험",
  purpose: "의미추구",
  sociability: "사교성",
}

export const L2_LABELS: Record<keyof L2Vector, string> = {
  openness: "개방성",
  conscientiousness: "성실성",
  extraversion: "외향성",
  agreeableness: "친화성",
  neuroticism: "신경성",
}

export const L3_LABELS: Record<keyof L3Vector, string> = {
  lack: "결핍",
  moralCompass: "도덕나침반",
  volatility: "변동성",
  growthArc: "성장궤적",
}

// ── 유틸리티 함수 ────────────────────────────────────────────

/** 각도 계산 (idx/total → 라디안, 12시 방향 시작) */
export function getAxisAngle(index: number, total: number): number {
  return (index / total) * Math.PI * 2 - Math.PI / 2
}

/** 극좌표 → 직교좌표 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

/** paradoxScore → 색상 (0=green, 0.5=yellow, 1=red) */
export function paradoxToColor(score: number): string {
  if (score <= 0.3) return "#22C55E" // green
  if (score <= 0.6) return "#EAB308" // yellow
  return "#EF4444" // red
}

/** 압력 계수 → 레이어 가중치 */
export function pressureToWeights(pressure: number): { l1: number; l2: number; l3: number } {
  const p = Math.max(0, Math.min(1, pressure))
  return {
    l1: (1 - p) * 0.7 + 0.3,
    l2: p * 0.7 * 0.7 + 0.15,
    l3: p * 0.3 * 0.5 + 0.05,
  }
}

/** L1 벡터를 배열로 변환 (순서 보장) */
export function l1ToArray(l1: L1Vector): number[] {
  return [l1.depth, l1.lens, l1.stance, l1.scope, l1.taste, l1.purpose, l1.sociability]
}

/** L2 벡터를 배열로 변환 */
export function l2ToArray(l2: L2Vector): number[] {
  return [l2.openness, l2.conscientiousness, l2.extraversion, l2.agreeableness, l2.neuroticism]
}

/** L3 벡터를 배열로 변환 */
export function l3ToArray(l3: L3Vector): number[] {
  return [l3.lack, l3.moralCompass, l3.volatility, l3.growthArc]
}

/** L1 키 배열 */
export const L1_KEYS: (keyof L1Vector)[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]

/** L2 키 배열 */
export const L2_KEYS: (keyof L2Vector)[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
]

/** L3 키 배열 */
export const L3_KEYS: (keyof L3Vector)[] = ["lack", "moralCompass", "volatility", "growthArc"]

/** Catmull-Rom spline 경로 생성 */
export function smoothRadarPath(
  points: Array<{ x: number; y: number }>,
  closed: boolean = true
): string {
  if (points.length < 3) {
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ")
  }

  const all = closed ? [...points, points[0], points[1]] : points
  const parts: string[] = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`]

  for (let i = 0; i < all.length - 2; i++) {
    const p0 = all[Math.max(0, i - 1)]
    const p1 = all[i]
    const p2 = all[i + 1]
    const p3 = all[Math.min(all.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    parts.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    )
  }

  if (closed) parts.push("Z")
  return parts.join(" ")
}
