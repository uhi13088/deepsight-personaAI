// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Security Integration (Phase 6-A)
// 운영 설계서 §10.1 — Gate Guard + Trust + Kill Switch + Quarantine 통합
// ═══════════════════════════════════════════════════════════════

import { inspectInput, type GateRuleResult, type GateAction } from "./pw-gate-rules"
import {
  type UserTrustState,
  type InspectionLevel,
  type TrustEvent,
  getInspectionLevel,
  applyTrustEvent,
} from "./user-trust"
import { type PWKillSwitchConfig, type PWFeature, isFeatureEnabled } from "./pw-kill-switch"
import {
  createQuarantineEntry,
  type QuarantineEntry,
  type QuarantineContentType,
  type QuarantineDetector,
} from "./quarantine"

// ── 통합 결과 타입 ──────────────────────────────────────────

export type SecurityVerdict = "PASS" | "WARN" | "BLOCK" | "QUARANTINE"

export interface SecurityCheckResult {
  verdict: SecurityVerdict
  gateResult: GateRuleResult
  inspectionLevel: InspectionLevel
  updatedTrust: UserTrustState
  quarantineEntry?: QuarantineEntry
  reason: string
}

// ── 유저 입력 보안 검증 (경로 1: 유저 입력) ──────────────────

/**
 * 유저 입력에 대한 통합 보안 검증.
 *
 * 설계서 §10.1 경로 1:
 * 1. Kill Switch 확인 (userInteraction 비활성이면 즉시 차단)
 * 2. Trust Score → 검사 수준 결정
 * 3. Gate Guard 검사
 * 4. 결과에 따라 Trust 업데이트 + Quarantine 생성
 */
export function checkUserInput(params: {
  text: string
  userId: string
  contentType: QuarantineContentType
  contentId: string
  userTrust: UserTrustState
  killSwitch: PWKillSwitchConfig
}): SecurityCheckResult {
  const { text, userId, contentType, contentId, userTrust, killSwitch } = params

  // Step 1: Kill Switch 확인
  if (!isFeatureEnabled(killSwitch, "userInteraction")) {
    return {
      verdict: "BLOCK",
      gateResult: { action: "BLOCK", severity: "CRITICAL", category: "kill_switch" },
      inspectionLevel: getInspectionLevel(userTrust.score),
      updatedTrust: userTrust,
      reason: "userInteraction 기능이 Kill Switch에 의해 비활성화됨",
    }
  }

  // Step 2: Trust → 검사 수준
  const inspectionLevel = getInspectionLevel(userTrust.score)

  // BLOCKED 수준이면 입력 자체를 차단
  if (inspectionLevel === "BLOCKED") {
    return {
      verdict: "BLOCK",
      gateResult: { action: "BLOCK", severity: "CRITICAL", category: "trust_blocked" },
      inspectionLevel,
      updatedTrust: userTrust,
      reason: `유저 신뢰 점수 ${userTrust.score.toFixed(2)} — 입력 차단됨`,
    }
  }

  // Step 3: Gate Guard 검사
  const gateResult = inspectInput(text)

  // Step 4: 결과에 따른 Trust 업데이트 + Quarantine
  const trustEvent = mapGateActionToTrustEvent(gateResult.action)
  const updatedTrust = trustEvent ? applyTrustEvent(userTrust, trustEvent) : userTrust

  const verdict = mapToVerdict(gateResult, inspectionLevel)

  // Quarantine 생성 (BLOCK이고 콘텐츠 보존 필요 시)
  let quarantineEntry: QuarantineEntry | undefined
  if (verdict === "QUARANTINE" || (verdict === "BLOCK" && gateResult.severity !== "LOW")) {
    quarantineEntry = createQuarantineEntry({
      contentType,
      contentId,
      userId,
      detector: "GATE_GUARD" as QuarantineDetector,
      category: gateResult.category,
      details: gateResult.matchedPattern ?? gateResult.category,
      severity: gateResult.severity,
      originalContent: text,
    })
  }

  const reason = buildReason(gateResult, inspectionLevel, verdict)

  return {
    verdict,
    gateResult,
    inspectionLevel,
    updatedTrust,
    quarantineEntry,
    reason,
  }
}

// ── 자율 활동 보안 검증 (경로 2: 자율 활동) ──────────────────

/**
 * 페르소나 자율 활동 전 Kill Switch 확인.
 *
 * 설계서 §10.1 경로 2:
 * 스케줄러/인터랙션 실행 전에 해당 기능이 활성인지 확인.
 */
export function checkFeatureAvailability(
  killSwitch: PWKillSwitchConfig,
  feature: PWFeature
): { allowed: boolean; reason: string } {
  if (killSwitch.globalFreeze) {
    return { allowed: false, reason: "글로벌 프리즈 활성화됨" }
  }

  if (!isFeatureEnabled(killSwitch, feature)) {
    const trigger = killSwitch.activeTriggers.find((t) => t.affectedFeatures.includes(feature))
    const triggerInfo = trigger ? ` (트리거: ${trigger.type})` : ""
    return { allowed: false, reason: `${feature} Kill Switch 비활성${triggerInfo}` }
  }

  return { allowed: true, reason: "기능 활성" }
}

// ── 유틸리티 ────────────────────────────────────────────────

/** Gate Guard 결과 → Trust Event 매핑 */
function mapGateActionToTrustEvent(action: GateAction): TrustEvent | null {
  switch (action) {
    case "BLOCK":
      return "BLOCK_EVENT"
    case "WARN":
      return "WARN_EVENT"
    case "PASS":
      return null
  }
}

/** Gate Guard + 검사 수준 → 최종 판정 */
function mapToVerdict(
  gateResult: GateRuleResult,
  inspectionLevel: InspectionLevel
): SecurityVerdict {
  if (gateResult.action === "PASS") return "PASS"

  // DEEP 검사 수준에서는 WARN도 QUARANTINE으로 격상
  if (inspectionLevel === "DEEP" && gateResult.action === "WARN") {
    return "QUARANTINE"
  }

  // ENHANCED 검사 수준에서는 HIGH severity WARN → QUARANTINE
  if (
    inspectionLevel === "ENHANCED" &&
    gateResult.action === "WARN" &&
    (gateResult.severity === "HIGH" || gateResult.severity === "CRITICAL")
  ) {
    return "QUARANTINE"
  }

  if (gateResult.action === "BLOCK") {
    return gateResult.severity === "LOW" ? "WARN" : "BLOCK"
  }

  return gateResult.action === "WARN" ? "WARN" : "PASS"
}

/** 판정 사유 생성 */
function buildReason(
  gateResult: GateRuleResult,
  inspectionLevel: InspectionLevel,
  verdict: SecurityVerdict
): string {
  if (verdict === "PASS") return "검사 통과"

  const parts: string[] = []
  parts.push(`Gate Guard: ${gateResult.category}(${gateResult.action})`)
  parts.push(`검사 수준: ${inspectionLevel}`)
  if (gateResult.matchedPattern) {
    parts.push(`매칭 패턴: ${gateResult.matchedPattern}`)
  }
  parts.push(`판정: ${verdict}`)

  return parts.join(" → ")
}
