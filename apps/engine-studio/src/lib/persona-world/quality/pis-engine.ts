// ═══════════════════════════════════════════════════════════════
// PIS Engine — 데이터 기반 PIS 자동 측정 (Phase 6-B)
// 운영 설계서 §13.2 — ContextRecall + SettingConsistency + CharacterStability
//
// DI 패턴으로 실제 페르소나 데이터를 수집하여
// integrity-score.ts의 순수 계산 함수에 전달한다.
// ═══════════════════════════════════════════════════════════════

import {
  computePIS,
  getPISAction,
  type ContextRecallDetails,
  type SettingConsistencyDetails,
  type CharacterStabilityDetails,
  type PWIntegrityScore,
  type PISAction,
} from "./integrity-score"
import { measureDrift } from "./persona-drift"
import { checkAllTriggers, type ArenaTrigger } from "./arena-bridge"
import type { VoiceStyleParams } from "../types"

// ── 데이터 프로바이더 (DI) ──────────────────────────────────

/**
 * PIS 측정에 필요한 데이터를 제공하는 인터페이스.
 *
 * 각 앱(API 라우트, 스케줄러 등)에서 Prisma/DB 기반으로 구현한다.
 */
export interface PISDataProvider {
  /**
   * AC1: ContextRecall — 기억 보유율 통계.
   * 시간 윈도우별 총 기억 수와 유지 기억 수를 반환한다.
   * 기억의 "유지"는 retention ≥ RETENTION_CUTOFF (0.05) 기준.
   */
  getMemoryRetentionStats(personaId: string): Promise<MemoryRetentionStats>

  /**
   * AC2: SettingConsistency — 품질 로그 집계.
   * 최근 N일 포스트/댓글 품질 로그에서 준수율을 집계한다.
   */
  getQualityLogStats(personaId: string): Promise<QualityLogStats>

  /**
   * AC3: CharacterStability — VoiceStyle 기준점 + 현재값.
   * 생성 시점 baseline과 현재 측정값을 반환한다.
   * 데이터 없으면 null.
   */
  getVoiceStyleParams(personaId: string): Promise<VoiceStyleSnapshot | null>

  /**
   * AC3: GrowthArc 정합성.
   * 의도된 성장 방향과 실제 변화의 정합도를 반환한다 (0.0~1.0).
   */
  getGrowthArcAlignment(personaId: string): Promise<number>

  /**
   * PIS 변화 추적용 이전 PIS 값.
   * 이력 없으면 null.
   */
  getPreviousPIS(personaId: string): Promise<number | null>

  /**
   * PIS 측정 결과 저장.
   */
  savePISResult(personaId: string, result: PISMeasurement): Promise<void>
}

// ── 통계 타입 ───────────────────────────────────────────────

export interface MemoryRetentionStats {
  /** 최근 7일 기억 수 */
  recentCount: number
  /** 최근 7일 유지 기억 수 */
  recentRetained: number
  /** 7~30일 기억 수 */
  mediumCount: number
  /** 7~30일 유지 기억 수 */
  mediumRetained: number
  /** 핵심 기억 (Poignancy ≥ 0.8) 수 */
  coreCount: number
  /** 핵심 기억 유지 수 */
  coreRetained: number
}

export interface QualityLogStats {
  /** 포스트 품질 */
  posts: {
    total: number
    factbookCompliant: number // factbook 위반 0건인 포스트 수
    voiceSpecAdherent: number // voiceSpecMatch ≥ 0.7인 포스트 수
  }
  /** 댓글 품질 */
  comments: {
    total: number
    toneAligned: number // toneMatchScore ≥ 0.6인 댓글 수
  }
}

export interface VoiceStyleSnapshot {
  baseline: VoiceStyleParams
  current: VoiceStyleParams
}

// ── 측정 결과 타입 ──────────────────────────────────────────

export interface PISMeasurement {
  pis: PWIntegrityScore
  action: PISAction
  triggers: ArenaTrigger[]
  dataQuality: PISDataQuality
}

export interface PISDataQuality {
  /** 총 샘플 수 (포스트 + 댓글 + 기억) */
  sampleSize: number
  /** 데이터 충분성 경고 (샘플 < 10이면 true) */
  insufficientData: boolean
  /** 각 컴포넌트별 데이터 유무 */
  hasMemoryData: boolean
  hasQualityLogs: boolean
  hasVoiceData: boolean
}

// ── AC1: ContextRecall 측정 ─────────────────────────────────

/**
 * 기억 보유율 기반 ContextRecall 측정.
 *
 * 설계서 §13.2.2:
 * - recentMemoryAccuracy: 7일 기억 유지율
 * - mediumTermAccuracy: 7~30일 기억 유지율
 * - coreMemoryRetention: Poignancy≥0.8 핵심 기억 유지율
 *
 * 데이터 없는 윈도우는 기본값 1.0 (감점하지 않음).
 */
export function measureContextRecall(stats: MemoryRetentionStats): ContextRecallDetails {
  return {
    recentMemoryAccuracy: safeRatio(stats.recentRetained, stats.recentCount, 1.0),
    mediumTermAccuracy: safeRatio(stats.mediumRetained, stats.mediumCount, 1.0),
    coreMemoryRetention: safeRatio(stats.coreRetained, stats.coreCount, 1.0),
  }
}

// ── AC2: SettingConsistency 측정 ────────────────────────────

/**
 * 품질 로그 기반 SettingConsistency 측정.
 *
 * 설계서 §13.2.3:
 * - factbookCompliance: 포스트 중 팩트북 위반 없는 비율
 * - voiceSpecAdherence: 포스트 중 보이스 스펙 준수 비율
 * - vectorBehaviorAlign: 댓글 중 톤 매치 정합 비율
 *
 * 데이터 없으면 기본값 1.0 (감점하지 않음).
 */
export function measureSettingConsistency(stats: QualityLogStats): SettingConsistencyDetails {
  return {
    factbookCompliance: safeRatio(stats.posts.factbookCompliant, stats.posts.total, 1.0),
    voiceSpecAdherence: safeRatio(stats.posts.voiceSpecAdherent, stats.posts.total, 1.0),
    vectorBehaviorAlign: safeRatio(stats.comments.toneAligned, stats.comments.total, 1.0),
  }
}

// ── AC3: CharacterStability 측정 ────────────────────────────

/**
 * VoiceStyle 드리프트 기반 CharacterStability 측정.
 *
 * 설계서 §13.2.4:
 * - weeklyDrift: baseline↔current 코사인 거리 (persona-drift.ts)
 * - toneVariance: VoiceStyle 차원별 절대 차이의 평균
 * - growthArcAlignment: 의도된 성장 방향과의 정합도
 *
 * VoiceStyle 데이터 없으면 drift/variance는 0 (안정으로 간주).
 */
export function measureCharacterStability(
  voiceSnapshot: VoiceStyleSnapshot | null,
  growthArcAlignment: number
): CharacterStabilityDetails {
  if (!voiceSnapshot) {
    return {
      weeklyDrift: 0,
      toneVariance: 0,
      growthArcAlignment: clamp01(growthArcAlignment),
    }
  }

  const driftResult = measureDrift(voiceSnapshot.baseline, voiceSnapshot.current)
  const toneVariance = computeToneVariance(voiceSnapshot.baseline, voiceSnapshot.current)

  return {
    weeklyDrift: driftResult.score,
    toneVariance,
    growthArcAlignment: clamp01(growthArcAlignment),
  }
}

/**
 * VoiceStyleParams 6차원 절대 차이의 평균.
 * 전체 톤 분산을 하나의 수치로 표현한다.
 */
export function computeToneVariance(baseline: VoiceStyleParams, current: VoiceStyleParams): number {
  const dims: (keyof VoiceStyleParams)[] = [
    "formality",
    "humor",
    "sentenceLength",
    "emotionExpression",
    "assertiveness",
    "vocabularyLevel",
  ]

  const totalDiff = dims.reduce((sum, d) => sum + Math.abs(baseline[d] - current[d]), 0)
  return round(totalDiff / dims.length)
}

// ── AC4: PIS 통합 측정 파이프라인 ───────────────────────────

/**
 * 전체 PIS 측정 파이프라인.
 *
 * 1. 3개 컴포넌트 데이터 수집 (DI Provider)
 * 2. 각 컴포넌트 측정
 * 3. PIS 종합 계산 (integrity-score.ts)
 * 4. 등급 판정 + 자동 조치
 * 5. Arena 트리거 확인
 * 6. 결과 저장
 */
export async function measurePIS(
  provider: PISDataProvider,
  personaId: string
): Promise<PISMeasurement> {
  // 1. 데이터 수집 (병렬)
  const [memoryStats, qualityStats, voiceSnapshot, growthAlignment, previousPIS] =
    await Promise.all([
      provider.getMemoryRetentionStats(personaId),
      provider.getQualityLogStats(personaId),
      provider.getVoiceStyleParams(personaId),
      provider.getGrowthArcAlignment(personaId),
      provider.getPreviousPIS(personaId),
    ])

  // 2. 컴포넌트 측정
  const contextRecall = measureContextRecall(memoryStats)
  const settingConsistency = measureSettingConsistency(qualityStats)
  const characterStability = measureCharacterStability(voiceSnapshot, growthAlignment)

  // 3. 샘플 수 산정
  const sampleSize =
    memoryStats.recentCount +
    memoryStats.mediumCount +
    qualityStats.posts.total +
    qualityStats.comments.total

  // 4. PIS 계산
  const pis = computePIS(contextRecall, settingConsistency, characterStability, sampleSize)
  const action = getPISAction(pis.grade)

  // 5. Arena 트리거 확인
  const triggers = checkAllTriggers({
    personaId,
    currentPIS: pis.overall,
    previousPIS: previousPIS ?? undefined,
  })

  // 6. 데이터 품질 정보
  const dataQuality: PISDataQuality = {
    sampleSize,
    insufficientData: sampleSize < 10,
    hasMemoryData: memoryStats.recentCount > 0 || memoryStats.coreCount > 0,
    hasQualityLogs: qualityStats.posts.total > 0 || qualityStats.comments.total > 0,
    hasVoiceData: voiceSnapshot !== null,
  }

  const measurement: PISMeasurement = { pis, action, triggers, dataQuality }

  // 7. 결과 저장
  await provider.savePISResult(personaId, measurement)

  return measurement
}

// ── 배치 측정 ───────────────────────────────────────────────

/**
 * 여러 페르소나에 대해 PIS를 일괄 측정한다.
 * 개별 실패는 에러로 기록하고 계속 진행한다.
 */
export async function measurePISBatch(
  provider: PISDataProvider,
  personaIds: string[]
): Promise<PISBatchResult> {
  const results: Array<{ personaId: string; measurement: PISMeasurement }> = []
  const errors: Array<{ personaId: string; error: string }> = []

  for (const personaId of personaIds) {
    try {
      const measurement = await measurePIS(provider, personaId)
      results.push({ personaId, measurement })
    } catch (err) {
      errors.push({
        personaId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    measured: results.length,
    failed: errors.length,
    results,
    errors,
    summary: buildBatchSummary(results),
  }
}

export interface PISBatchResult {
  measured: number
  failed: number
  results: Array<{ personaId: string; measurement: PISMeasurement }>
  errors: Array<{ personaId: string; error: string }>
  summary: PISBatchSummary
}

export interface PISBatchSummary {
  averagePIS: number
  gradeDistribution: Record<string, number>
  triggerCount: number
  insufficientDataCount: number
}

// ── 유틸리티 ────────────────────────────────────────────────

/** 안전한 비율 계산 (0 나누기 방지) */
function safeRatio(numerator: number, denominator: number, defaultValue: number): number {
  if (denominator <= 0) return defaultValue
  return round(Math.max(0, Math.min(1, numerator / denominator)))
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}

function buildBatchSummary(
  results: Array<{ personaId: string; measurement: PISMeasurement }>
): PISBatchSummary {
  if (results.length === 0) {
    return {
      averagePIS: 0,
      gradeDistribution: {},
      triggerCount: 0,
      insufficientDataCount: 0,
    }
  }

  const totalPIS = results.reduce((sum, r) => sum + r.measurement.pis.overall, 0)

  const gradeDistribution: Record<string, number> = {}
  let triggerCount = 0
  let insufficientDataCount = 0

  for (const r of results) {
    const grade = r.measurement.pis.grade
    gradeDistribution[grade] = (gradeDistribution[grade] ?? 0) + 1
    triggerCount += r.measurement.triggers.length
    if (r.measurement.dataQuality.insufficientData) insufficientDataCount++
  }

  return {
    averagePIS: round(totalPIS / results.length),
    gradeDistribution,
    triggerCount,
    insufficientDataCount,
  }
}
