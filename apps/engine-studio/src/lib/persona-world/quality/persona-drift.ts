// ═══════════════════════════════════════════════════════════════
// PersonaDrift 감지 — VoiceStyleParams baseline vs current
// T178: 페르소나 일관성 드리프트 측정
//
// VoiceStyleParams(6D)의 baseline과 현재값을 코사인 유사도로 비교.
// Arena 교정 루프의 핵심 입력이 되는 드리프트 점수를 제공.
// ═══════════════════════════════════════════════════════════════

import type { VoiceStyleParams } from "../types"

// ── 드리프트 결과 ─────────────────────────────────────────────

export interface DriftResult {
  /** 드리프트 점수 (0.0 = 완전 일치, 1.0 = 완전 이탈) */
  score: number
  /** 심각도 판정 */
  severity: DriftSeverity
  /** 차원별 이탈도 (0.0~1.0) */
  dimensionDrifts: Record<keyof VoiceStyleParams, number>
  /** 가장 크게 이탈한 차원 */
  topDriftDimension: keyof VoiceStyleParams
}

export type DriftSeverity = "STABLE" | "WARNING" | "CRITICAL"

// ── 임계값 ──────────────────────────────────────────────────

/** 드리프트 경고 임계값 (코사인 거리) */
export const DRIFT_WARNING_THRESHOLD = 0.15

/** 드리프트 위험 임계값 (코사인 거리) */
export const DRIFT_CRITICAL_THRESHOLD = 0.3

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * VoiceStyleParams baseline과 현재값 사이의 드리프트를 측정.
 *
 * 공식: driftScore = 1 - cosineSimilarity(baseline, current)
 *
 * @param baseline 생성 시점의 VoiceStyleParams
 * @param current 현재 측정된 VoiceStyleParams
 */
export function measureDrift(baseline: VoiceStyleParams, current: VoiceStyleParams): DriftResult {
  const baselineVec = voiceStyleToVector(baseline)
  const currentVec = voiceStyleToVector(current)

  const similarity = cosineSimilarity(baselineVec, currentVec)
  const score = round(1 - similarity)

  const dimensionDrifts = computeDimensionDrifts(baseline, current)
  const topDriftDimension = findTopDriftDimension(dimensionDrifts)

  const severity = classifySeverity(score)

  return { score, severity, dimensionDrifts, topDriftDimension }
}

/**
 * 드리프트 심각도 판정.
 */
export function classifySeverity(driftScore: number): DriftSeverity {
  if (driftScore >= DRIFT_CRITICAL_THRESHOLD) return "CRITICAL"
  if (driftScore >= DRIFT_WARNING_THRESHOLD) return "WARNING"
  return "STABLE"
}

/**
 * 차원별 이탈도 계산.
 * 각 차원의 |baseline - current| 값.
 */
export function computeDimensionDrifts(
  baseline: VoiceStyleParams,
  current: VoiceStyleParams
): Record<keyof VoiceStyleParams, number> {
  return {
    formality: round(Math.abs(baseline.formality - current.formality)),
    humor: round(Math.abs(baseline.humor - current.humor)),
    sentenceLength: round(Math.abs(baseline.sentenceLength - current.sentenceLength)),
    emotionExpression: round(Math.abs(baseline.emotionExpression - current.emotionExpression)),
    assertiveness: round(Math.abs(baseline.assertiveness - current.assertiveness)),
    vocabularyLevel: round(Math.abs(baseline.vocabularyLevel - current.vocabularyLevel)),
  }
}

/**
 * 가장 크게 이탈한 차원 반환.
 */
export function findTopDriftDimension(
  drifts: Record<keyof VoiceStyleParams, number>
): keyof VoiceStyleParams {
  const entries = Object.entries(drifts) as Array<[keyof VoiceStyleParams, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

/**
 * 드리프트 요약 텍스트 생성 (품질 리포트용).
 */
export function summarizeDrift(result: DriftResult): string {
  if (result.severity === "STABLE") {
    return `음성 스타일 안정 (drift=${result.score.toFixed(3)})`
  }

  const dimLabel: Record<keyof VoiceStyleParams, string> = {
    formality: "격식체 수준",
    humor: "유머 수준",
    sentenceLength: "문장 길이",
    emotionExpression: "감정 표현",
    assertiveness: "단정적 표현",
    vocabularyLevel: "어휘 수준",
  }

  const topDim = dimLabel[result.topDriftDimension]
  const topDrift = result.dimensionDrifts[result.topDriftDimension]

  if (result.severity === "CRITICAL") {
    return `음성 스타일 위험 이탈 (drift=${result.score.toFixed(3)}). 주요 이탈: ${topDim} Δ${topDrift.toFixed(2)}`
  }

  return `음성 스타일 경고 (drift=${result.score.toFixed(3)}). 주요 이탈: ${topDim} Δ${topDrift.toFixed(2)}`
}

// ── 유틸리티 ────────────────────────────────────────────────

/** VoiceStyleParams → number[] 벡터 변환 */
function voiceStyleToVector(params: VoiceStyleParams): number[] {
  return [
    params.formality,
    params.humor,
    params.sentenceLength,
    params.emotionExpression,
    params.assertiveness,
    params.vocabularyLevel,
  ]
}

/** 코사인 유사도 (0~1 범위로 클램프) */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return Math.max(0, Math.min(1, dotProduct / denominator))
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000
}
