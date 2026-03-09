// ═══════════════════════════════════════════════════════════════
// T402: 자율 교정 분기 — AutonomyPolicy 기반 auto-apply 결정
// Critical은 항상 관리자 승인 필요 (하드코딩)
// ═══════════════════════════════════════════════════════════════

import type { CorrectionConfig, AutonomyPolicy } from "./autonomy-policy"
import { DEFAULT_AUTONOMY_POLICY } from "./autonomy-policy"
import { AUTO_APPLY_MAX_SEVERITY } from "../arena/correction-loop"

// ── 타입 ────────────────────────────────────────────────────

export interface AutoApplyConfig {
  /** 자동 적용 가능한 최대 심각도 */
  maxSeverity: "minor" | "major"
  /** 최소 confidence 임계값 */
  minConfidence: number
  /** 일일 최대 자율 교정 횟수 */
  dailyLimit: number
}

export interface AutoApplyDecision {
  /** 자동 적용 가능 여부 */
  canAutoApply: boolean
  /** 불가 사유 (canAutoApply=false일 때) */
  reason?: string
}

// ── 상수 ────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  minor: 1,
  major: 2,
  critical: 3,
}

// ── 핵심 함수 ────────────────────────────────────────────────

/**
 * AutonomyPolicy에서 auto-apply 설정 추출.
 * policy가 null/undefined이면 기존 상수(AUTO_APPLY_MAX_SEVERITY) 기반 폴백.
 */
export function getAutoApplyConfig(policy: AutonomyPolicy | null): AutoApplyConfig {
  if (!policy || !policy.autoCorrection) {
    // policy 없거나 자율 교정 비활성 → 기존 동작 유지 (minor만)
    return {
      maxSeverity: AUTO_APPLY_MAX_SEVERITY as "minor" | "major",
      minConfidence: DEFAULT_AUTONOMY_POLICY.correctionConfig.minConfidence,
      dailyLimit: DEFAULT_AUTONOMY_POLICY.correctionConfig.dailyLimit,
    }
  }

  return {
    maxSeverity: policy.correctionConfig.maxAutoSeverity,
    minConfidence: policy.correctionConfig.minConfidence,
    dailyLimit: policy.correctionConfig.dailyLimit,
  }
}

/**
 * 교정 제안의 자동 적용 가능 여부 판정.
 *
 * 규칙:
 * 1. Critical은 policy 무관하게 항상 관리자 승인 필요
 * 2. autoCorrection=false이면 기존 동작(minor만)
 * 3. autoCorrection=true이면 maxAutoSeverity까지 자동 적용
 * 4. confidence ≥ minConfidence 필수
 * 5. dailyLimit 초과 시 불가
 */
export function checkAutoApply(params: {
  severity: "minor" | "major" | "critical"
  confidence: number
  dailyCorrectionCount: number
  policy: AutonomyPolicy | null
}): AutoApplyDecision {
  const { severity, confidence, dailyCorrectionCount, policy } = params

  // Rule 1: Critical은 항상 관리자 승인
  if (severity === "critical") {
    return {
      canAutoApply: false,
      reason: "critical 교정은 항상 관리자 승인이 필요합니다",
    }
  }

  const config = getAutoApplyConfig(policy)

  // Rule 2-3: 심각도 체크
  const severityLevel = SEVERITY_ORDER[severity] ?? 0
  const maxLevel = SEVERITY_ORDER[config.maxSeverity] ?? 0
  if (severityLevel > maxLevel) {
    return {
      canAutoApply: false,
      reason: `심각도 ${severity}이(가) 최대 자동 적용 수준 ${config.maxSeverity}을(를) 초과합니다`,
    }
  }

  // Rule 4: confidence 체크
  if (confidence < config.minConfidence) {
    return {
      canAutoApply: false,
      reason: `confidence ${confidence} < 최소 임계값 ${config.minConfidence}`,
    }
  }

  // Rule 5: 일일 한도 체크
  if (dailyCorrectionCount >= config.dailyLimit) {
    return {
      canAutoApply: false,
      reason: `일일 자율 교정 한도 초과: ${dailyCorrectionCount}/${config.dailyLimit}`,
    }
  }

  return { canAutoApply: true }
}

/**
 * CorrectionSuggestion의 autoApplicable 필드를 policy 기반으로 재평가.
 */
export function isAutoApplicable(
  severity: "minor" | "major" | "critical",
  confidence: number,
  dailyCorrectionCount: number,
  policy: AutonomyPolicy | null
): boolean {
  const decision = checkAutoApply({ severity, confidence, dailyCorrectionCount, policy })
  return decision.canAutoApply
}
