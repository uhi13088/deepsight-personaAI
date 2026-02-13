// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — L3 Evolution Algorithm
// T135: L3 4차원 진화 계산 + PersonaLayerVector 버전 관리
// ═══════════════════════════════════════════════════════════════

import type { NarrativeDriveVector } from "@/types/persona-v3"
import type { EvolutionTrend } from "./evolution-analyzer"
import { getEvolutionStage, hasStageTransition } from "./evolution-stages"

// ── 상수 ─────────────────────────────────────────────────────

/** 주당 growthArc 최대 증가량 */
const MAX_GROWTH_ARC_DELTA_PER_WEEK = 0.02

/** 각 L3 차원 delta 절대값 상한 (1회 진화 시) */
const MAX_DIMENSION_DELTA = 0.05

/** 진화 실행 최소 활동 수 */
const MIN_ACTIVITIES_FOR_EVOLUTION = 5

/** 진화 실행 최소 기간 (일) */
const MIN_DAYS_FOR_EVOLUTION = 7

// ── 타입 ─────────────────────────────────────────────────────

export interface L3EvolutionResult {
  /** 진화 실행 여부 (조건 미충족 시 false) */
  evolved: boolean
  /** 이전 L3 벡터 */
  previousL3: NarrativeDriveVector
  /** 새 L3 벡터 */
  newL3: NarrativeDriveVector
  /** 각 차원별 delta */
  deltas: NarrativeDriveVector
  /** 스테이지 전이 발생 여부 */
  stageTransition: {
    transitioned: boolean
    fromStage: string
    toStage: string
  }
  /** 진화 근거 */
  reason: string
}

// ── 메인 알고리즘 ────────────────────────────────────────────

/**
 * L3 진화 계산.
 *
 * 활동 이력 트렌드 기반으로 L3 4차원을 미세 조정:
 * - growthArc: 활동 다양성↑ + 상호작용↑ → 증가 (주당 최대 +0.02)
 * - volatility: 안정적 활동 → 감소, 불규칙 활동 → 증가
 * - lack: 풍부한 상호작용 → 감소 (결핍 해소)
 * - moralCompass: 토론/비판 활동 → 미세 변동
 *
 * 전체 delta는 ±0.05 클램프.
 */
export function computeL3Evolution(
  currentL3: NarrativeDriveVector,
  trend: EvolutionTrend,
  daysSinceCreation: number
): L3EvolutionResult {
  const reasons: string[] = []

  // 진화 조건 확인
  if (trend.totalActivities < MIN_ACTIVITIES_FOR_EVOLUTION) {
    return createNoEvolutionResult(
      currentL3,
      `활동 부족 (${trend.totalActivities}/${MIN_ACTIVITIES_FOR_EVOLUTION})`
    )
  }
  if (trend.periodDays < MIN_DAYS_FOR_EVOLUTION) {
    return createNoEvolutionResult(
      currentL3,
      `기간 부족 (${trend.periodDays}일/${MIN_DAYS_FOR_EVOLUTION}일)`
    )
  }

  // ── growthArc 계산 ──
  // 성장 지표가 높을수록 증가, 활동이 없으면 정체
  const growthDelta = computeGrowthArcDelta(trend, daysSinceCreation)
  if (growthDelta !== 0) {
    reasons.push(
      `growthArc ${growthDelta > 0 ? "+" : ""}${growthDelta.toFixed(4)} (성장지표=${trend.growthIndicator.toFixed(2)})`
    )
  }

  // ── volatility 계산 ──
  // 활동 패턴의 안정성 → volatility 감소
  // 불규칙한 상태 추세 → volatility 증가
  const volatilityDelta = computeVolatilityDelta(trend)
  if (volatilityDelta !== 0) {
    reasons.push(`volatility ${volatilityDelta > 0 ? "+" : ""}${volatilityDelta.toFixed(4)}`)
  }

  // ── lack 계산 ──
  // 풍부한 상호작용 → 결핍 해소 (감소)
  // 활동 없음 → 결핍 증가
  const lackDelta = computeLackDelta(trend)
  if (lackDelta !== 0) {
    reasons.push(`lack ${lackDelta > 0 ? "+" : ""}${lackDelta.toFixed(4)}`)
  }

  // ── moralCompass 계산 ──
  // 현재는 매우 보수적 변동 (향후 토론 내용 분석으로 확장 가능)
  const moralCompassDelta = computeMoralCompassDelta(trend)
  if (moralCompassDelta !== 0) {
    reasons.push(`moralCompass ${moralCompassDelta > 0 ? "+" : ""}${moralCompassDelta.toFixed(4)}`)
  }

  const deltas: NarrativeDriveVector = {
    growthArc: growthDelta,
    volatility: volatilityDelta,
    lack: lackDelta,
    moralCompass: moralCompassDelta,
  }

  // 새 벡터 계산 (0~1 클램프)
  const newL3: NarrativeDriveVector = {
    growthArc: clamp(currentL3.growthArc + deltas.growthArc),
    volatility: clamp(currentL3.volatility + deltas.volatility),
    lack: clamp(currentL3.lack + deltas.lack),
    moralCompass: clamp(currentL3.moralCompass + deltas.moralCompass),
  }

  // 스테이지 전이 확인
  const transition = hasStageTransition(currentL3.growthArc, newL3.growthArc)

  const hasAnyDelta =
    Math.abs(deltas.growthArc) > 0.0001 ||
    Math.abs(deltas.volatility) > 0.0001 ||
    Math.abs(deltas.lack) > 0.0001 ||
    Math.abs(deltas.moralCompass) > 0.0001

  return {
    evolved: hasAnyDelta,
    previousL3: currentL3,
    newL3,
    deltas,
    stageTransition: {
      transitioned: transition.transitioned,
      fromStage: transition.from.id,
      toStage: transition.to.id,
    },
    reason: reasons.length > 0 ? reasons.join("; ") : "변화 없음",
  }
}

// ── 차원별 delta 계산 ────────────────────────────────────────

function computeGrowthArcDelta(trend: EvolutionTrend, daysSinceCreation: number): number {
  // 성장 지표 (0~1)를 주당 delta로 변환
  // growthIndicator > 0.3이면 양의 성장, < 0.1이면 정체
  const weeksFactor = Math.min(1, trend.periodDays / 7)
  let delta = 0

  if (trend.growthIndicator > 0.3) {
    // 활동적 → 성장
    delta = trend.growthIndicator * MAX_GROWTH_ARC_DELTA_PER_WEEK * weeksFactor
  } else if (trend.growthIndicator < 0.1 && trend.totalActivities > 0) {
    // 비활동적 → 미세 정체 (퇴화는 아님)
    delta = 0
  }

  // 초기(생성 후 30일 이내) 페르소나는 성장 속도 약간 빠르게
  if (daysSinceCreation < 30) {
    delta *= 1.5
  }

  return clampDelta(delta)
}

function computeVolatilityDelta(trend: EvolutionTrend): number {
  // 상태 추세의 변동성이 크면 → volatility 증가
  const trendVariance =
    Math.abs(trend.stateTrends.mood) +
    Math.abs(trend.stateTrends.energy) +
    Math.abs(trend.stateTrends.paradoxTension)

  let delta = 0

  if (trendVariance > 1.5) {
    // 극단적 상태 변동 → volatility 소폭 증가
    delta = 0.01
  } else if (trendVariance < 0.3 && trend.totalActivities >= 10) {
    // 안정적 + 충분한 활동 → volatility 소폭 감소
    delta = -0.01
  }

  return clampDelta(delta)
}

function computeLackDelta(trend: EvolutionTrend): number {
  let delta = 0

  // 높은 상호작용 빈도 → 결핍 해소
  if (trend.interactionFrequency > 2) {
    delta = -0.015
  } else if (trend.interactionFrequency > 0.5) {
    delta = -0.005
  }

  // 활동 다양성이 높으면 → 결핍 추가 해소
  if (trend.activityDiversity > 0.6) {
    delta -= 0.005
  }

  // 활동이 거의 없으면 → 결핍 미세 증가
  if (trend.totalActivities < 3 && trend.periodDays >= 7) {
    delta = 0.01
  }

  return clampDelta(delta)
}

function computeMoralCompassDelta(trend: EvolutionTrend): number {
  // moralCompass는 매우 보수적으로 변동
  // 향후 댓글 톤 분석 (counter_argument, analytical 비율) 기반으로 확장 가능
  // 현재는 활동 다양성 + 상호작용에 따라 미세 변동만

  if (trend.activityDiversity > 0.7 && trend.interactionFrequency > 3) {
    // 매우 활발 + 다양 → 약간 유연해짐 (감소)
    return clampDelta(-0.005)
  }

  return 0
}

// ── 유틸리티 ─────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampDelta(delta: number): number {
  return Math.max(-MAX_DIMENSION_DELTA, Math.min(MAX_DIMENSION_DELTA, delta))
}

function createNoEvolutionResult(
  currentL3: NarrativeDriveVector,
  reason: string
): L3EvolutionResult {
  const stage = getEvolutionStage(currentL3.growthArc)
  return {
    evolved: false,
    previousL3: currentL3,
    newL3: { ...currentL3 },
    deltas: { growthArc: 0, volatility: 0, lack: 0, moralCompass: 0 },
    stageTransition: { transitioned: false, fromStage: stage.id, toStage: stage.id },
    reason,
  }
}

// ── Exports for testing ──────────────────────────────────────
export {
  MAX_GROWTH_ARC_DELTA_PER_WEEK,
  MAX_DIMENSION_DELTA,
  MIN_ACTIVITIES_FOR_EVOLUTION,
  MIN_DAYS_FOR_EVOLUTION,
}
