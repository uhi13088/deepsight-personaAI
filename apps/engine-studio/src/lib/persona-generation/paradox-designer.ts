// ═══════════════════════════════════════════════════════════════
// Paradox 디자이너
// T52-AC3: 역설 패턴 매핑, 긴장도 조절, 벡터 조정
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  PersonaArchetype,
  ParadoxTension,
  ParadoxProfile,
  SocialDimension,
  TemperamentDimension,
} from "@/types"
import { L1_L2_PARADOX_MAPPINGS } from "@/constants/v3"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ParadoxDesignResult {
  adjustedL1: SocialPersonaVector
  adjustedL2: CoreTemperamentVector
  adjustedL3: NarrativeDriveVector
  paradoxProfile: ParadoxProfile
  tensionMap: TensionMapEntry[]
  withinExpectedRange: boolean
}

export interface TensionMapEntry {
  l1Dim: SocialDimension
  l2Dim: TemperamentDimension
  l1Value: number
  l2Value: number
  paradoxScore: number
  targetTension: ParadoxTension
  actualTension: ParadoxTension
  aligned: boolean
}

// ── 긴장도 범위 정의 ─────────────────────────────────────────

const TENSION_RANGES: Record<ParadoxTension, [number, number]> = {
  LOW: [0.0, 0.25],
  MEDIUM: [0.25, 0.5],
  HIGH: [0.5, 1.0],
}

function classifyTension(score: number): ParadoxTension {
  if (score >= TENSION_RANGES.HIGH[0]) return "HIGH"
  if (score >= TENSION_RANGES.MEDIUM[0]) return "MEDIUM"
  return "LOW"
}

// ── Paradox 설계 (아키타입 기반) ──────────────────────────────

export function designParadox(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): ParadoxDesignResult {
  // 현재 상태로 tension map 생성
  const tensionMap = buildTensionMap(l1, l2, archetype)

  // 아키타입이 있으면 기대 역설 범위로 조정
  let adjustedL1 = { ...l1 }
  let adjustedL2 = { ...l2 }
  const adjustedL3 = { ...l3 }

  if (archetype) {
    const result = adjustForTension(adjustedL1, adjustedL2, archetype)
    adjustedL1 = result.l1
    adjustedL2 = result.l2
  }

  // 최종 Paradox Profile 계산
  const crossAxisProfile = calculateCrossAxisProfile(adjustedL1, adjustedL2, adjustedL3)
  const paradoxProfile = calculateExtendedParadoxScore(
    adjustedL1,
    adjustedL2,
    adjustedL3,
    crossAxisProfile
  )

  // 기대 범위 확인
  const withinExpectedRange = archetype
    ? paradoxProfile.overall >= archetype.expectedParadoxRange[0] &&
      paradoxProfile.overall <= archetype.expectedParadoxRange[1]
    : true

  // 재계산된 tension map
  const finalTensionMap = buildTensionMap(adjustedL1, adjustedL2, archetype)

  return {
    adjustedL1,
    adjustedL2,
    adjustedL3,
    paradoxProfile,
    tensionMap: finalTensionMap,
    withinExpectedRange,
  }
}

// ── Tension Map 구축 ──────────────────────────────────────────

function buildTensionMap(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  archetype?: PersonaArchetype
): TensionMapEntry[] {
  return L1_L2_PARADOX_MAPPINGS.map((mapping) => {
    const l1Value = l1[mapping.l1]
    const l2Value = l2[mapping.l2]
    const adjusted = mapping.direction === "inverse" ? 1 - l2Value : l2Value
    const paradoxScore = Math.abs(l1Value - adjusted)
    const actualTension = classifyTension(paradoxScore)

    // 아키타입의 해당 매핑에 대한 target tension 결정
    let targetTension: ParadoxTension = "MEDIUM"
    if (archetype) {
      if (
        archetype.paradoxPattern.primary.l1 === mapping.l1 &&
        archetype.paradoxPattern.primary.l2 === mapping.l2
      ) {
        targetTension = archetype.paradoxPattern.primary.tension
      } else if (
        archetype.paradoxPattern.secondary?.l1 === mapping.l1 &&
        archetype.paradoxPattern.secondary?.l2 === mapping.l2
      ) {
        targetTension = archetype.paradoxPattern.secondary.tension
      }
    }

    return {
      l1Dim: mapping.l1,
      l2Dim: mapping.l2,
      l1Value,
      l2Value,
      paradoxScore,
      targetTension,
      actualTension,
      aligned: actualTension === targetTension,
    }
  })
}

// ── 긴장도 조정 ───────────────────────────────────────────────

function adjustForTension(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  archetype: PersonaArchetype
): { l1: SocialPersonaVector; l2: CoreTemperamentVector } {
  const adjusted1 = { ...l1 }
  const adjusted2 = { ...l2 }
  const MAX_ITERATIONS = 5
  const STEP = 0.05

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const crossAxis = calculateCrossAxisProfile(
      adjusted1,
      adjusted2,
      { lack: 0, moralCompass: 0, volatility: 0, growthArc: 0 } // dummy L3 for EPS
    )
    const eps = calculateExtendedParadoxScore(adjusted1, adjusted2, undefined, crossAxis)

    const [expectedMin, expectedMax] = archetype.expectedParadoxRange
    if (eps.overall >= expectedMin && eps.overall <= expectedMax) break

    if (eps.overall < expectedMin) {
      // 역설이 부족 → primary pattern의 L1↔L2 차이 증가
      nudgeDimension(
        adjusted1,
        adjusted2,
        archetype.paradoxPattern.primary.l1,
        archetype.paradoxPattern.primary.l2,
        STEP,
        "increase",
        archetype
      )
    } else if (eps.overall > expectedMax) {
      // 역설이 과도 → primary pattern의 L1↔L2 차이 감소
      nudgeDimension(
        adjusted1,
        adjusted2,
        archetype.paradoxPattern.primary.l1,
        archetype.paradoxPattern.primary.l2,
        STEP,
        "decrease",
        archetype
      )
    }
  }

  return { l1: adjusted1, l2: adjusted2 }
}

function nudgeDimension(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l1Dim: SocialDimension,
  l2Dim: TemperamentDimension,
  step: number,
  direction: "increase" | "decrease",
  archetype: PersonaArchetype
): void {
  const [l1Min, l1Max] = archetype.layer1[l1Dim]
  const [l2Min, l2Max] = archetype.layer2[l2Dim]

  if (direction === "increase") {
    // L1 값을 올리거나 L2 값을 내려서 차이 증가
    if (l1[l1Dim] + step <= l1Max) {
      l1[l1Dim] = Math.round((l1[l1Dim] + step) * 100) / 100
    } else if (l2[l2Dim] - step >= l2Min) {
      l2[l2Dim] = Math.round((l2[l2Dim] - step) * 100) / 100
    }
  } else {
    // 차이 감소 → L1과 L2를 서로 가깝게
    const mid = (l1[l1Dim] + l2[l2Dim]) / 2
    const newL1 = Math.max(l1Min, Math.min(l1Max, l1[l1Dim] + (mid - l1[l1Dim]) * 0.2))
    const newL2 = Math.max(l2Min, Math.min(l2Max, l2[l2Dim] + (mid - l2[l2Dim]) * 0.2))
    l1[l1Dim] = Math.round(newL1 * 100) / 100
    l2[l2Dim] = Math.round(newL2 * 100) / 100
  }
}

// ── 역설 분석 (사후 분석용) ───────────────────────────────────

export function analyzeParadoxPatterns(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector
): {
  dominantParadox: { l1Dim: SocialDimension; l2Dim: TemperamentDimension; score: number }
  tensionLevel: ParadoxTension
  patterns: TensionMapEntry[]
} {
  const patterns = buildTensionMap(l1, l2)
  const sorted = [...patterns].sort((a, b) => b.paradoxScore - a.paradoxScore)
  const dominant = sorted[0]

  return {
    dominantParadox: {
      l1Dim: dominant.l1Dim,
      l2Dim: dominant.l2Dim,
      score: dominant.paradoxScore,
    },
    tensionLevel: dominant.actualTension,
    patterns,
  }
}
