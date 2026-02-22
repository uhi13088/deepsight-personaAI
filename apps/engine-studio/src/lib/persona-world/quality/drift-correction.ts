// ═══════════════════════════════════════════════════════════════
// DriftCorrection — VoiceStyle baseline 자동 pull-back
// T183: PersonaDrift WARNING/CRITICAL 시 보정된 VoiceStyleParams 자동 생성
//
// 운영자 개입 없이 이탈된 차원을 baseline 방향으로 수식 보정.
// LLM 비용 0, 순수 수학 처리.
// ═══════════════════════════════════════════════════════════════

import type { VoiceStyleParams } from "../types"
import type { DriftSeverity } from "./persona-drift"

// ── 보정 강도 상수 ───────────────────────────────────────────

/** WARNING 시 baseline 방향 보정 비율 (30%) */
export const CORRECTION_ALPHA_WARNING = 0.3

/** CRITICAL 시 baseline 방향 보정 비율 (70%) */
export const CORRECTION_ALPHA_CRITICAL = 0.7

// ── 결과 타입 ─────────────────────────────────────────────────

export interface DriftCorrectionResult {
  /** 보정이 적용되었는지 여부 */
  applied: boolean
  /** 보정된 VoiceStyleParams (미적용 시 null) */
  corrected: VoiceStyleParams | null
  /** 적용된 보정 강도 (0 = 미적용) */
  alpha: number
  /** 보정 내역 요약 (운영자 사후 확인용) */
  summary: string | null
}

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * severity에 따른 보정 강도(α) 반환.
 *
 * STABLE  → 0.0 (보정 없음)
 * WARNING → 0.3 (30% baseline 방향 이동)
 * CRITICAL → 0.7 (70% baseline 방향 이동)
 */
export function getCorrectionStrength(severity: DriftSeverity): number {
  switch (severity) {
    case "STABLE":
      return 0
    case "WARNING":
      return CORRECTION_ALPHA_WARNING
    case "CRITICAL":
      return CORRECTION_ALPHA_CRITICAL
  }
}

/**
 * 이탈된 VoiceStyleParams를 baseline 방향으로 보정.
 *
 * 공식: corrected[dim] = current[dim] + (baseline[dim] - current[dim]) * α
 * α = getCorrectionStrength(severity)
 *
 * STABLE이면 보정 없이 null 반환.
 *
 * @param current 현재 측정된 VoiceStyleParams
 * @param baseline 생성 시점 기준값
 * @param severity measureDrift() 결과의 severity
 */
export function applyDriftCorrection(
  current: VoiceStyleParams,
  baseline: VoiceStyleParams,
  severity: DriftSeverity
): DriftCorrectionResult {
  const alpha = getCorrectionStrength(severity)

  if (alpha === 0) {
    return { applied: false, corrected: null, alpha: 0, summary: null }
  }

  const corrected: VoiceStyleParams = {
    formality: clamp(current.formality + (baseline.formality - current.formality) * alpha),
    humor: clamp(current.humor + (baseline.humor - current.humor) * alpha),
    sentenceLength: clamp(
      current.sentenceLength + (baseline.sentenceLength - current.sentenceLength) * alpha
    ),
    emotionExpression: clamp(
      current.emotionExpression + (baseline.emotionExpression - current.emotionExpression) * alpha
    ),
    assertiveness: clamp(
      current.assertiveness + (baseline.assertiveness - current.assertiveness) * alpha
    ),
    vocabularyLevel: clamp(
      current.vocabularyLevel + (baseline.vocabularyLevel - current.vocabularyLevel) * alpha
    ),
  }

  const summary = buildCorrectionSummary(severity, alpha, current, baseline, corrected)

  return { applied: true, corrected, alpha, summary }
}

// ── 유틸리티 ────────────────────────────────────────────────

/** 보정 내역 요약 텍스트 생성 (운영자 로그용) */
function buildCorrectionSummary(
  severity: DriftSeverity,
  alpha: number,
  current: VoiceStyleParams,
  baseline: VoiceStyleParams,
  corrected: VoiceStyleParams
): string {
  const label = severity === "CRITICAL" ? "강한 교정" : "약한 교정"
  const dims = (Object.keys(baseline) as Array<keyof VoiceStyleParams>)
    .filter((k) => Math.abs(current[k] - baseline[k]) > 0.01)
    .map((k) => `${k}: ${current[k].toFixed(2)}→${corrected[k].toFixed(2)}`)
    .join(", ")

  return `VoiceStyle ${label} 적용 (α=${alpha}, severity=${severity})${dims ? `. 변경: ${dims}` : ""}`
}

/** 0~1 범위로 클램프 */
function clamp(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000))
}
