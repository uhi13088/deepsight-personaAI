// ═══════════════════════════════════════════════════════════════
// v5.0 Growth Arc Updater (L3 실질 진화)
//
// Memory Consolidation 완료 후 SemanticMemory의 l3Influence를
// 누적하여 L3 PersonaLayerVector를 조금씩 업데이트.
//
// 규칙:
// - lack, moralCompass: 생애 최대 ±0.10 (거의 불변)
// - volatility: 월 최대 ±0.02, 생애 최대 ±0.20
// - growthArc: 월 최대 ±0.05 (성장 방향성)
//
// L3 mapping:
//   dim1 = lack, dim2 = moralCompass, dim3 = volatility, dim4 = growthArc
// ═══════════════════════════════════════════════════════════════

import type { L3Influence } from "./memory-consolidation"
export type { L3Influence }

// ── 경계 상수 ───────────────────────────────────────────────────

/** 생애 최대 변화폭 (원래 값 기준) */
export const L3_LIFETIME_MAX_DRIFT = {
  lack: 0.1,
  moralCompass: 0.1,
  volatility: 0.2,
  growthArc: 0.4, // growthArc은 성장 방향이므로 더 많이 변할 수 있음
} as const

/** 월 최대 변화폭 */
export const L3_MONTHLY_MAX_DELTA = {
  lack: 0.005,
  moralCompass: 0.005,
  volatility: 0.02,
  growthArc: 0.05,
} as const

/** 단일 consolidation에서 적용할 최대 delta */
export const L3_PER_CONSOLIDATION_MAX = {
  lack: 0.001,
  moralCompass: 0.001,
  volatility: 0.002,
  growthArc: 0.005,
} as const

// ── 타입 ────────────────────────────────────────────────────────

export interface L3Vector {
  lack: number // dim1: 결핍 동기 (0.0~1.0)
  moralCompass: number // dim2: 도덕 나침반 (0.0~1.0)
  volatility: number // dim3: 변동성 (0.0~1.0)
  growthArc: number // dim4: 성장 방향 (0.0~1.0)
}

export interface GrowthArcProvider {
  /** 현재 L3 PersonaLayerVector 조회 (NARRATIVE 레이어) */
  getL3Vector(personaId: string): Promise<L3Vector | null>

  /** 생성 시점 L3 기준값 조회 (lifetime drift 계산용) */
  getOriginalL3Vector(personaId: string): Promise<L3Vector | null>

  /** 최근 30일 SemanticMemory l3Influence 합산 조회 */
  getRecentL3Influences(personaId: string, sinceDays: number): Promise<L3Influence[]>

  /** L3 PersonaLayerVector 업데이트 (version++) */
  updateL3Vector(personaId: string, vector: L3Vector): Promise<{ newVersion: number }>
}

// ── 핵심 계산 함수 ───────────────────────────────────────────────

/**
 * 누적 l3Influence 합산.
 */
export function sumL3Influences(influences: L3Influence[]): L3Influence {
  return influences.reduce(
    (acc, inf) => ({
      lack: acc.lack + inf.lack,
      moralCompass: acc.moralCompass + inf.moralCompass,
      volatility: acc.volatility + inf.volatility,
      growthArc: acc.growthArc + inf.growthArc,
    }),
    { lack: 0, moralCompass: 0, volatility: 0, growthArc: 0 }
  )
}

/**
 * L3 delta 적용.
 *
 * 세 가지 제약 동시 적용:
 * 1. 단일 consolidation 최대 delta
 * 2. lifetime drift 한도 (원래 값에서 ±max)
 * 3. 값 범위 0.0~1.0 clamp
 */
export function applyL3Delta(
  current: L3Vector,
  original: L3Vector,
  rawDelta: L3Influence
): L3Vector {
  const dims = ["lack", "moralCompass", "volatility", "growthArc"] as const

  const result = { ...current }

  for (const dim of dims) {
    // 1. 단일 consolidation 최대 delta clamp
    const maxPerConsolidation = L3_PER_CONSOLIDATION_MAX[dim]
    const clampedDelta = Math.max(
      -maxPerConsolidation,
      Math.min(maxPerConsolidation, rawDelta[dim])
    )

    const candidate = current[dim] + clampedDelta

    // 2. lifetime drift 한도 체크
    const maxDrift = L3_LIFETIME_MAX_DRIFT[dim]
    const lowerBound = Math.max(0, original[dim] - maxDrift)
    const upperBound = Math.min(1, original[dim] + maxDrift)

    // 3. 최종 clamp
    result[dim] = Math.max(lowerBound, Math.min(upperBound, candidate))
  }

  return result
}

// ── 메인 함수 ───────────────────────────────────────────────────

export interface GrowthArcResult {
  personaId: string
  previousVector: L3Vector
  newVector: L3Vector
  appliedDelta: L3Influence
  newVersion: number
  skipped: boolean
  skipReason?: string
}

/**
 * 페르소나 1개의 Growth Arc 업데이트.
 *
 * - 최근 30일 SemanticMemory l3Influence 누적
 * - 경계 내에서 L3 벡터 업데이트
 * - PersonaLayerVector version++ 저장
 */
export async function updateGrowthArc(
  provider: GrowthArcProvider,
  personaId: string
): Promise<GrowthArcResult> {
  const skippedBase = {
    personaId,
    previousVector: { lack: 0, moralCompass: 0, volatility: 0, growthArc: 0 },
    newVector: { lack: 0, moralCompass: 0, volatility: 0, growthArc: 0 },
    appliedDelta: { lack: 0, moralCompass: 0, volatility: 0, growthArc: 0 },
    newVersion: 0,
    skipped: true,
  }

  // 1. 현재 L3 벡터 조회
  const current = await provider.getL3Vector(personaId)
  if (!current) {
    return { ...skippedBase, skipReason: "no_l3_vector" }
  }

  // 2. 원본 벡터 조회 (최초 생성 시 값)
  const original = await provider.getOriginalL3Vector(personaId)
  if (!original) {
    return { ...skippedBase, previousVector: current, skipReason: "no_original_vector" }
  }

  // 3. 최근 30일 l3Influence 누적
  const influences = await provider.getRecentL3Influences(personaId, 30)
  if (influences.length === 0) {
    return { ...skippedBase, previousVector: current, skipReason: "no_influences" }
  }

  const rawDelta = sumL3Influences(influences)

  // 4. 의미 있는 변화인지 확인 (모두 0이면 skip)
  const totalMagnitude =
    Math.abs(rawDelta.lack) +
    Math.abs(rawDelta.moralCompass) +
    Math.abs(rawDelta.volatility) +
    Math.abs(rawDelta.growthArc)

  if (totalMagnitude < 0.0001) {
    return { ...skippedBase, previousVector: current, skipReason: "delta_too_small" }
  }

  // 5. 경계 내에서 적용
  const newVector = applyL3Delta(current, original, rawDelta)

  // 6. 실제 변화가 있을 때만 저장
  const actualDelta: L3Influence = {
    lack: newVector.lack - current.lack,
    moralCompass: newVector.moralCompass - current.moralCompass,
    volatility: newVector.volatility - current.volatility,
    growthArc: newVector.growthArc - current.growthArc,
  }

  const { newVersion } = await provider.updateL3Vector(personaId, newVector)

  return {
    personaId,
    previousVector: current,
    newVector,
    appliedDelta: actualDelta,
    newVersion,
    skipped: false,
  }
}
