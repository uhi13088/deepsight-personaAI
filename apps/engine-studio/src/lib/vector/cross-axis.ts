// ═══════════════════════════════════════════════════════════════
// Cross-Axis Calculation Engine (83 axes)
// 구현계획서 Phase 1, Task 1-4
//
// L1×L2=35, L1×L3=28, L2×L3=20 → Total 83
// 4 관계 유형: paradox, reinforcing, modulating, neutral
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  CrossAxisScore,
  CrossAxisProfile,
  CrossAxisRelationship,
} from "@/types"
import { ALL_CROSS_AXES, CROSS_AXIS_SCORE_FORMULAS, type CrossAxisDef } from "@/constants/v3"
import { CROSS_AXIS_INTERPRETATION } from "@/constants/v3"

// ── 레이어별 벡터 값 조회 ───────────────────────────────────
function getLayerValue(
  layer: "L1" | "L2" | "L3",
  key: string,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): number {
  if (layer === "L1") return l1[key as keyof SocialPersonaVector]
  if (layer === "L2") return l2[key as keyof CoreTemperamentVector]
  return l3[key as keyof NarrativeDriveVector]
}

// ── 해석 텍스트 선택 (threshold=0.5) ────────────────────────
function selectInterpretation(
  valA: number,
  valB: number,
  relationship: CrossAxisRelationship
): string {
  const template = CROSS_AXIS_INTERPRETATION[relationship]
  if (valA >= 0.5 && valB >= 0.5) return template.highHigh
  if (valA >= 0.5 && valB < 0.5) return template.highLow
  if (valA < 0.5 && valB >= 0.5) return template.lowHigh
  return template.lowLow
}

// ── 단일 축 스코어 계산 ─────────────────────────────────────
function computeAxisScore(axisDef: CrossAxisDef, valA: number, valB: number): number {
  const formula = CROSS_AXIS_SCORE_FORMULAS[axisDef.relationship]
  if (axisDef.relationship === "paradox") {
    return (formula as (a: number, b: number, inv: boolean) => number)(valA, valB, axisDef.invertB)
  }
  return (formula as (a: number, b: number) => number)(valA, valB)
}

/**
 * 83개 교차축 전체 계산
 *
 * @param l1 - Social Persona Vector (7D)
 * @param l2 - Core Temperament Vector (5D)
 * @param l3 - Narrative Drive Vector (4D)
 * @returns CrossAxisProfile (83 axes + byType + summary)
 */
export function calculateCrossAxisProfile(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): CrossAxisProfile {
  const axes: CrossAxisScore[] = ALL_CROSS_AXES.map((axisDef) => {
    const valA = getLayerValue(axisDef.layerA, axisDef.dimA, l1, l2, l3)
    const valB = getLayerValue(axisDef.layerB, axisDef.dimB, l1, l2, l3)
    const score = computeAxisScore(axisDef, valA, valB)

    return {
      axisId: axisDef.id,
      type: axisDef.type,
      relationship: axisDef.relationship,
      score,
      dimA: { layer: axisDef.layerA, key: axisDef.dimA, value: valA },
      dimB: { layer: axisDef.layerB, key: axisDef.dimB, value: valB },
      interpretation: selectInterpretation(valA, valB, axisDef.relationship),
    }
  })

  // ── 레이어별 분류 ──────────────────────────────────────────
  const byType = {
    l1l2: axes.filter((a) => a.type === "L1xL2"),
    l1l3: axes.filter((a) => a.type === "L1xL3"),
    l2l3: axes.filter((a) => a.type === "L2xL3"),
  }

  // ── 요약 통계 ──────────────────────────────────────────────
  const paradoxAxes = axes.filter((a) => a.relationship === "paradox" && a.score > 0.5)
  const reinforcingAxes = axes.filter((a) => a.relationship === "reinforcing" && a.score > 0.7)
  const modulatingAxes = axes.filter((a) => a.relationship === "modulating")
  const modulatingIntensity =
    modulatingAxes.length > 0
      ? modulatingAxes.reduce((sum, a) => sum + a.score, 0) / modulatingAxes.length
      : 0

  const dominantRelationship: CrossAxisRelationship =
    paradoxAxes.length > reinforcingAxes.length ? "paradox" : "reinforcing"

  // characterComplexity: paradox 비율 + modulating 강도 기반
  const characterComplexity = Math.min(
    1.0,
    (paradoxAxes.length / axes.length) * 1.5 + modulatingIntensity * 0.3
  )

  return {
    axes,
    byType,
    summary: {
      paradoxCount: paradoxAxes.length,
      reinforcingCount: reinforcingAxes.length,
      modulatingIntensity,
      dominantRelationship,
      characterComplexity,
    },
  }
}
