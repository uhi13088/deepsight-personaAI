// ═══════════════════════════════════════════════════════════════
// 83 Cross-Layer Axis Definitions (106D+)
// 설계서 §3.8, 구현계획서 §14.2 기준
//
// L1×L2 = 35, L1×L3 = 28, L2×L3 = 20 → Total 83
//
// Score Formulas by Relationship:
//   paradox:     |dimA - f(dimB)|      → 괴리가 클수록 높은 점수
//   reinforcing: 1 - |dimA - dimB|     → 정렬이 클수록 높은 점수
//   modulating:  dimA × dimB           → 곱 = 한쪽이 다른쪽 표현 조절
//   neutral:     (dimA + dimB) / 2     → 독립 차원의 평균
//
// f(dimB) = (1 - dimB) for neuroticism, agreeableness
//         = dimB       for all others
// ═══════════════════════════════════════════════════════════════

import type { CrossAxisType, CrossAxisRelationship } from "@/types"

export interface CrossAxisDef {
  id: string
  dimA: string
  layerA: "L1" | "L2" | "L3"
  dimB: string
  layerB: "L1" | "L2" | "L3"
  type: CrossAxisType
  relationship: CrossAxisRelationship
  invertB: boolean // true → f(dimB) = 1 - dimB
  label: string
}

// ── Helper: 축 생성 ──────────────────────────────────────────
function def(
  layerA: "L1" | "L2" | "L3",
  dimA: string,
  layerB: "L1" | "L2" | "L3",
  dimB: string,
  type: CrossAxisType,
  relationship: CrossAxisRelationship,
  invertB: boolean,
  label: string
): CrossAxisDef {
  return {
    id: `${layerA.toLowerCase()}_${dimA}__${layerB.toLowerCase()}_${dimB}`,
    dimA,
    layerA,
    dimB,
    layerB,
    type,
    relationship,
    invertB,
    label,
  }
}

// ── invertB 규칙: neuroticism, agreeableness만 true ─────────
const INV = true
const NO = false

// ═══════════════════════════════════════════════════════════════
// L1 × L2 (7 × 5 = 35 axes)
// ═══════════════════════════════════════════════════════════════
export const L1_L2_AXES: CrossAxisDef[] = [
  // ── depth (L1) × L2 ────────────────────────────────────────
  def("L1", "depth", "L2", "openness", "L1xL2", "paradox", NO, "분석 깊이 × 개방성"),
  def("L1", "depth", "L2", "conscientiousness", "L1xL2", "reinforcing", NO, "분석 깊이 × 성실성"),
  def("L1", "depth", "L2", "extraversion", "L1xL2", "neutral", NO, "분석 깊이 × 외향성"),
  def("L1", "depth", "L2", "agreeableness", "L1xL2", "neutral", INV, "분석 깊이 × 친화성"),
  def("L1", "depth", "L2", "neuroticism", "L1xL2", "modulating", INV, "분석 깊이 × 신경성"),

  // ── lens (L1) × L2 ─────────────────────────────────────────
  def("L1", "lens", "L2", "openness", "L1xL2", "modulating", NO, "판단 렌즈 × 개방성"),
  def("L1", "lens", "L2", "conscientiousness", "L1xL2", "neutral", NO, "판단 렌즈 × 성실성"),
  def("L1", "lens", "L2", "extraversion", "L1xL2", "neutral", NO, "판단 렌즈 × 외향성"),
  def("L1", "lens", "L2", "agreeableness", "L1xL2", "modulating", INV, "판단 렌즈 × 친화성"),
  def("L1", "lens", "L2", "neuroticism", "L1xL2", "paradox", INV, "감성/논리 × 신경성"),

  // ── stance (L1) × L2 ───────────────────────────────────────
  def("L1", "stance", "L2", "openness", "L1xL2", "modulating", NO, "평가 태도 × 개방성"),
  def("L1", "stance", "L2", "conscientiousness", "L1xL2", "neutral", NO, "평가 태도 × 성실성"),
  def("L1", "stance", "L2", "extraversion", "L1xL2", "neutral", NO, "평가 태도 × 외향성"),
  def("L1", "stance", "L2", "agreeableness", "L1xL2", "paradox", INV, "비판 태도 × 친화성"),
  def("L1", "stance", "L2", "neuroticism", "L1xL2", "modulating", INV, "평가 태도 × 신경성"),

  // ── scope (L1) × L2 ────────────────────────────────────────
  def("L1", "scope", "L2", "openness", "L1xL2", "reinforcing", NO, "관심 범위 × 개방성"),
  def("L1", "scope", "L2", "conscientiousness", "L1xL2", "paradox", NO, "디테일 관심 × 성실성"),
  def("L1", "scope", "L2", "extraversion", "L1xL2", "neutral", NO, "관심 범위 × 외향성"),
  def("L1", "scope", "L2", "agreeableness", "L1xL2", "neutral", INV, "관심 범위 × 친화성"),
  def("L1", "scope", "L2", "neuroticism", "L1xL2", "modulating", INV, "관심 범위 × 신경성"),

  // ── taste (L1) × L2 ────────────────────────────────────────
  def("L1", "taste", "L2", "openness", "L1xL2", "paradox", NO, "실험적 취향 × 개방성"),
  def("L1", "taste", "L2", "conscientiousness", "L1xL2", "neutral", NO, "취향 성향 × 성실성"),
  def("L1", "taste", "L2", "extraversion", "L1xL2", "neutral", NO, "취향 성향 × 외향성"),
  def("L1", "taste", "L2", "agreeableness", "L1xL2", "neutral", INV, "취향 성향 × 친화성"),
  def("L1", "taste", "L2", "neuroticism", "L1xL2", "modulating", INV, "취향 성향 × 신경성"),

  // ── purpose (L1) × L2 ──────────────────────────────────────
  def("L1", "purpose", "L2", "openness", "L1xL2", "reinforcing", NO, "소비 목적 × 개방성"),
  def("L1", "purpose", "L2", "conscientiousness", "L1xL2", "paradox", NO, "의미 추구 × 성실성"),
  def("L1", "purpose", "L2", "extraversion", "L1xL2", "neutral", NO, "소비 목적 × 외향성"),
  def("L1", "purpose", "L2", "agreeableness", "L1xL2", "modulating", INV, "소비 목적 × 친화성"),
  def("L1", "purpose", "L2", "neuroticism", "L1xL2", "modulating", INV, "소비 목적 × 신경성"),

  // ── sociability (L1) × L2 ──────────────────────────────────
  def("L1", "sociability", "L2", "openness", "L1xL2", "reinforcing", NO, "사교성 × 개방성"),
  def("L1", "sociability", "L2", "conscientiousness", "L1xL2", "neutral", NO, "사교성 × 성실성"),
  def("L1", "sociability", "L2", "extraversion", "L1xL2", "paradox", NO, "사교성 × 외향성"),
  def("L1", "sociability", "L2", "agreeableness", "L1xL2", "reinforcing", INV, "사교성 × 친화성"),
  def("L1", "sociability", "L2", "neuroticism", "L1xL2", "modulating", INV, "사교성 × 신경성"),
]

// ═══════════════════════════════════════════════════════════════
// L1 × L3 (7 × 4 = 28 axes)
// ═══════════════════════════════════════════════════════════════
export const L1_L3_AXES: CrossAxisDef[] = [
  // ── depth (L1) × L3 ────────────────────────────────────────
  def("L1", "depth", "L3", "lack", "L1xL3", "modulating", NO, "분석 깊이 × 결핍"),
  def("L1", "depth", "L3", "moralCompass", "L1xL3", "reinforcing", NO, "분석 깊이 × 도덕 나침반"),
  def("L1", "depth", "L3", "volatility", "L1xL3", "modulating", NO, "분석 깊이 × 변동성"),
  def("L1", "depth", "L3", "growthArc", "L1xL3", "reinforcing", NO, "분석 깊이 × 성장 곡선"),

  // ── lens (L1) × L3 ─────────────────────────────────────────
  def("L1", "lens", "L3", "lack", "L1xL3", "modulating", NO, "판단 렌즈 × 결핍"),
  def("L1", "lens", "L3", "moralCompass", "L1xL3", "modulating", NO, "판단 렌즈 × 도덕 나침반"),
  def("L1", "lens", "L3", "volatility", "L1xL3", "paradox", NO, "감성/논리 × 변동성"),
  def("L1", "lens", "L3", "growthArc", "L1xL3", "neutral", NO, "판단 렌즈 × 성장 곡선"),

  // ── stance (L1) × L3 ───────────────────────────────────────
  def("L1", "stance", "L3", "lack", "L1xL3", "modulating", NO, "평가 태도 × 결핍"),
  def("L1", "stance", "L3", "moralCompass", "L1xL3", "reinforcing", NO, "평가 태도 × 도덕 나침반"),
  def("L1", "stance", "L3", "volatility", "L1xL3", "modulating", NO, "평가 태도 × 변동성"),
  def("L1", "stance", "L3", "growthArc", "L1xL3", "modulating", NO, "평가 태도 × 성장 곡선"),

  // ── scope (L1) × L3 ────────────────────────────────────────
  def("L1", "scope", "L3", "lack", "L1xL3", "neutral", NO, "관심 범위 × 결핍"),
  def("L1", "scope", "L3", "moralCompass", "L1xL3", "reinforcing", NO, "관심 범위 × 도덕 나침반"),
  def("L1", "scope", "L3", "volatility", "L1xL3", "modulating", NO, "관심 범위 × 변동성"),
  def("L1", "scope", "L3", "growthArc", "L1xL3", "neutral", NO, "관심 범위 × 성장 곡선"),

  // ── taste (L1) × L3 ────────────────────────────────────────
  def("L1", "taste", "L3", "lack", "L1xL3", "modulating", NO, "취향 성향 × 결핍"),
  def("L1", "taste", "L3", "moralCompass", "L1xL3", "neutral", NO, "취향 성향 × 도덕 나침반"),
  def("L1", "taste", "L3", "volatility", "L1xL3", "modulating", NO, "취향 성향 × 변동성"),
  def("L1", "taste", "L3", "growthArc", "L1xL3", "reinforcing", NO, "취향 성향 × 성장 곡선"),

  // ── purpose (L1) × L3 ──────────────────────────────────────
  def("L1", "purpose", "L3", "lack", "L1xL3", "reinforcing", NO, "소비 목적 × 결핍"),
  def("L1", "purpose", "L3", "moralCompass", "L1xL3", "reinforcing", NO, "소비 목적 × 도덕 나침반"),
  def("L1", "purpose", "L3", "volatility", "L1xL3", "modulating", NO, "소비 목적 × 변동성"),
  def("L1", "purpose", "L3", "growthArc", "L1xL3", "reinforcing", NO, "소비 목적 × 성장 곡선"),

  // ── sociability (L1) × L3 ──────────────────────────────────
  def("L1", "sociability", "L3", "lack", "L1xL3", "modulating", NO, "사교성 × 결핍"),
  def("L1", "sociability", "L3", "moralCompass", "L1xL3", "neutral", NO, "사교성 × 도덕 나침반"),
  def("L1", "sociability", "L3", "volatility", "L1xL3", "modulating", NO, "사교성 × 변동성"),
  def("L1", "sociability", "L3", "growthArc", "L1xL3", "reinforcing", NO, "사교성 × 성장 곡선"),
]

// ═══════════════════════════════════════════════════════════════
// L2 × L3 (5 × 4 = 20 axes)
// ═══════════════════════════════════════════════════════════════
export const L2_L3_AXES: CrossAxisDef[] = [
  // ── openness (L2) × L3 ─────────────────────────────────────
  def("L2", "openness", "L3", "lack", "L2xL3", "modulating", NO, "개방성 × 결핍"),
  def("L2", "openness", "L3", "moralCompass", "L2xL3", "modulating", NO, "개방성 × 도덕 나침반"),
  def("L2", "openness", "L3", "volatility", "L2xL3", "modulating", NO, "개방성 × 변동성"),
  def("L2", "openness", "L3", "growthArc", "L2xL3", "reinforcing", NO, "개방성 × 성장 곡선"),

  // ── conscientiousness (L2) × L3 ────────────────────────────
  def("L2", "conscientiousness", "L3", "lack", "L2xL3", "reinforcing", NO, "성실성 × 결핍"),
  def(
    "L2",
    "conscientiousness",
    "L3",
    "moralCompass",
    "L2xL3",
    "reinforcing",
    NO,
    "성실성 × 도덕 나침반"
  ),
  def("L2", "conscientiousness", "L3", "volatility", "L2xL3", "paradox", NO, "성실성 × 변동성"),
  def(
    "L2",
    "conscientiousness",
    "L3",
    "growthArc",
    "L2xL3",
    "modulating",
    NO,
    "성실성 × 성장 곡선"
  ),

  // ── extraversion (L2) × L3 ─────────────────────────────────
  def("L2", "extraversion", "L3", "lack", "L2xL3", "modulating", NO, "외향성 × 결핍"),
  def("L2", "extraversion", "L3", "moralCompass", "L2xL3", "neutral", NO, "외향성 × 도덕 나침반"),
  def("L2", "extraversion", "L3", "volatility", "L2xL3", "modulating", NO, "외향성 × 변동성"),
  def("L2", "extraversion", "L3", "growthArc", "L2xL3", "modulating", NO, "외향성 × 성장 곡선"),

  // ── agreeableness (L2) × L3 ────────────────────────────────
  def("L2", "agreeableness", "L3", "lack", "L2xL3", "modulating", NO, "친화성 × 결핍"),
  def(
    "L2",
    "agreeableness",
    "L3",
    "moralCompass",
    "L2xL3",
    "reinforcing",
    NO,
    "친화성 × 도덕 나침반"
  ),
  def("L2", "agreeableness", "L3", "volatility", "L2xL3", "paradox", NO, "친화성 × 변동성"),
  def("L2", "agreeableness", "L3", "growthArc", "L2xL3", "neutral", NO, "친화성 × 성장 곡선"),

  // ── neuroticism (L2) × L3 ──────────────────────────────────
  def("L2", "neuroticism", "L3", "lack", "L2xL3", "reinforcing", NO, "신경성 × 결핍"),
  def("L2", "neuroticism", "L3", "moralCompass", "L2xL3", "modulating", NO, "신경성 × 도덕 나침반"),
  def("L2", "neuroticism", "L3", "volatility", "L2xL3", "reinforcing", NO, "신경성 × 변동성"),
  def("L2", "neuroticism", "L3", "growthArc", "L2xL3", "modulating", NO, "신경성 × 성장 곡선"),
]

// ═══════════════════════════════════════════════════════════════
// 전체 83 축 통합
// ═══════════════════════════════════════════════════════════════
export const ALL_CROSS_AXES: CrossAxisDef[] = [...L1_L2_AXES, ...L1_L3_AXES, ...L2_L3_AXES]

// ── 축 개수 검증 (35 + 28 + 20 = 83) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _AXIS_COUNT_CHECK: 83 = (L1_L2_AXES.length + L1_L3_AXES.length + L2_L3_AXES.length) as 83

// ── Score 계산 공식 상수 ─────────────────────────────────────
export const CROSS_AXIS_SCORE_FORMULAS = {
  paradox: (dimA: number, dimB: number, invertB: boolean) => {
    const b = invertB ? 1 - dimB : dimB
    return Math.abs(dimA - b)
  },
  reinforcing: (dimA: number, dimB: number) => {
    return 1 - Math.abs(dimA - dimB)
  },
  modulating: (dimA: number, dimB: number) => {
    return dimA * dimB
  },
  neutral: (dimA: number, dimB: number) => {
    return (dimA + dimB) / 2
  },
} as const

// ── 차원 반전 대상 목록 ─────────────────────────────────────
export const INVERTED_DIMENSIONS = new Set(["neuroticism", "agreeableness"])
