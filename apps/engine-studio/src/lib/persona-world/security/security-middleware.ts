// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Security Middleware (T286)
// 구현계획서 §9.1 — 통합 보안 미들웨어
// 입력 보안 (Gate Guard + Trust) + 출력 보안 (Sentinel + Quarantine)
// ═══════════════════════════════════════════════════════════════

import { inspectInput, type GateRuleResult } from "./pw-gate-rules"
import {
  type UserTrustState,
  getInspectionLevel,
  applyTrustEvent,
  type InspectionLevel,
} from "./user-trust"
import { runOutputSentinel, type OutputSentinelResult } from "@/lib/security/output-sentinel"
import type { ImmutableFact } from "@/types"
import type {
  SecurityCheckResult,
  GateCheckResult,
  SentinelCheckResult,
  PWGateCheckInput,
  PWGateCheckResult,
} from "../types"

// ── 보안 미들웨어 프로바이더 ─────────────────────────────────

export interface SecurityMiddlewareProvider {
  /** 유저 신뢰도 조회 (없으면 기본값 반환) */
  getUserTrustScore(userId: string): Promise<UserTrustState>

  /** 유저 신뢰도 업데이트 */
  updateUserTrustScore(userId: string, trustState: UserTrustState): Promise<void>

  /** PW 격리 큐에 항목 추가 */
  createQuarantineEntry(params: {
    contentType: "POST" | "COMMENT"
    contentId: string
    personaId: string
    reason: string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    expiresAt: Date | null
  }): Promise<{ id: string }>

  /** 모더레이션 로그 저장 */
  saveModerationLog(params: {
    contentType: string
    contentId: string
    personaId?: string
    stage: string
    verdict: string
    violations?: unknown
    processingTimeMs?: number
  }): Promise<void>
}

// ── Severity별 격리 만료 시간 ────────────────────────────────

const QUARANTINE_EXPIRY_HOURS: Record<string, number | null> = {
  LOW: 72,
  MEDIUM: 48,
  HIGH: 24,
  CRITICAL: null, // 수동 검토만
}

function computeExpiryDate(severity: string): Date | null {
  const hours = QUARANTINE_EXPIRY_HOURS[severity]
  if (hours === null || hours === undefined) return null
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

// ── inspectionLevel별 검사 강도 ──────────────────────────────

function shouldRunEnhancedCheck(level: InspectionLevel): boolean {
  return level === "ENHANCED" || level === "DEEP" || level === "BLOCKED"
}

function shouldRunDeepCheck(level: InspectionLevel): boolean {
  return level === "DEEP" || level === "BLOCKED"
}

// ── 입력 보안 미들웨어 (T286 AC1) ───────────────────────────

export interface InputCheckResult {
  passed: boolean
  gateResult: GateRuleResult
  inspectionLevel: InspectionLevel
  reason: string
}

/**
 * 입력 보안 미들웨어.
 *
 * 1. Trust Score → 검사 수준 결정
 * 2. Gate Guard 검사 (조작/추출/레이트리밋/스팸)
 * 3. inspectionLevel별 강도 차등 적용
 */
export async function securityInputMiddleware(
  input: PWGateCheckInput,
  userId: string | undefined,
  provider?: SecurityMiddlewareProvider
): Promise<InputCheckResult> {
  // Trust 기반 inspectionLevel 결정
  let inspectionLevel: InspectionLevel = "BASIC"
  if (userId && provider) {
    const trustState = await provider.getUserTrustScore(userId)
    inspectionLevel = getInspectionLevel(trustState.score)

    // BLOCKED → 즉시 차단
    if (inspectionLevel === "BLOCKED") {
      return {
        passed: false,
        gateResult: { action: "BLOCK", severity: "CRITICAL", category: "trust_blocked" },
        inspectionLevel,
        reason: "User trust score too low (BLOCKED)",
      }
    }
  }

  // Gate Guard 검사
  const gateResult = inspectInput(input.text)
  if (gateResult.action === "BLOCK") {
    // Trust 업데이트: BLOCK 이벤트
    if (userId && provider) {
      const trustState = await provider.getUserTrustScore(userId)
      const updated = applyTrustEvent(trustState, "BLOCK_EVENT")
      await provider.updateUserTrustScore(userId, updated)
    }

    return {
      passed: false,
      gateResult,
      inspectionLevel,
      reason: `Gate BLOCK: ${gateResult.category}${gateResult.matchedPattern ? ` (${gateResult.matchedPattern})` : ""}`,
    }
  }

  if (gateResult.action === "WARN") {
    // Trust 업데이트: WARN 이벤트
    if (userId && provider) {
      const trustState = await provider.getUserTrustScore(userId)
      const updated = applyTrustEvent(trustState, "WARN_EVENT")
      await provider.updateUserTrustScore(userId, updated)
    }

    // ENHANCED 이상은 WARN도 차단
    if (shouldRunEnhancedCheck(inspectionLevel)) {
      return {
        passed: false,
        gateResult,
        inspectionLevel,
        reason: `Gate WARN escalated to BLOCK (inspectionLevel=${inspectionLevel}): ${gateResult.category}`,
      }
    }
  }

  return {
    passed: true,
    gateResult,
    inspectionLevel,
    reason: gateResult.action === "WARN" ? `Gate WARN (passed): ${gateResult.category}` : "PASS",
  }
}

// ── 출력 보안 미들웨어 (T286 AC2) ───────────────────────────

export interface OutputCheckResult {
  passed: boolean
  sentinelResult: OutputSentinelResult
  sanitizedContent?: string
  shouldQuarantine: boolean
  reason: string
}

/**
 * 출력 보안 미들웨어.
 *
 * 1. Output Sentinel 실행 (PII/시스템유출/혐오/팩트북 위반)
 * 2. blocked → quarantine + 중단
 * 3. flagged → PII 마스킹 후 통과
 */
export function securityOutputMiddleware(
  content: string,
  immutableFacts?: ImmutableFact[]
): OutputCheckResult {
  const sentinelResult = runOutputSentinel(content, immutableFacts)

  if (sentinelResult.verdict === "blocked") {
    return {
      passed: false,
      sentinelResult,
      shouldQuarantine: true,
      reason: `Output BLOCKED: ${sentinelResult.violations.map((v) => v.rule).join(", ")}`,
    }
  }

  if (sentinelResult.verdict === "flagged") {
    // 중간 심각도: PII 마스킹 적용 후 통과
    const sanitized = maskPII(content)
    return {
      passed: true,
      sentinelResult,
      sanitizedContent: sanitized,
      shouldQuarantine: true, // flagged도 quarantine에 기록 (but 포스트는 저장)
      reason: `Output FLAGGED (sanitized): ${sentinelResult.violations.map((v) => v.rule).join(", ")}`,
    }
  }

  return {
    passed: true,
    sentinelResult,
    shouldQuarantine: false,
    reason: "PASS",
  }
}

// ── Quarantine 생성 헬퍼 ────────────────────────────────────

/**
 * 보안 위반 시 격리 항목 생성.
 *
 * severity 기반 자동 만료:
 * - LOW: 72시간
 * - MEDIUM: 48시간
 * - HIGH: 24시간
 * - CRITICAL: 수동 검토만
 */
export async function createSecurityQuarantine(
  provider: SecurityMiddlewareProvider,
  params: {
    contentType: "POST" | "COMMENT"
    contentId: string
    personaId: string
    sentinelResult: OutputSentinelResult
  }
): Promise<{ id: string } | null> {
  if (!params.sentinelResult.shouldQuarantine) return null

  const hasHigh = params.sentinelResult.violations.some((v) => v.severity === "high")
  const severity = hasHigh ? "HIGH" : "MEDIUM"
  const reason = params.sentinelResult.violations.map((v) => `${v.category}:${v.rule}`).join(", ")

  const entry = await provider.createQuarantineEntry({
    contentType: params.contentType,
    contentId: params.contentId,
    personaId: params.personaId,
    reason,
    severity,
    expiresAt: computeExpiryDate(severity),
  })

  // 모더레이션 로그 저장
  await provider.saveModerationLog({
    contentType: params.contentType,
    contentId: params.contentId,
    personaId: params.personaId,
    stage: "OUTPUT_SENTINEL",
    verdict: params.sentinelResult.verdict === "blocked" ? "BLOCK" : "QUARANTINE",
    violations: params.sentinelResult.violations,
    processingTimeMs: params.sentinelResult.processingTimeMs,
  })

  return entry
}

// ── 통합 SecurityCheckResult 빌더 ───────────────────────────

export function buildSecurityCheckResult(
  inputCheck: InputCheckResult,
  outputCheck?: OutputCheckResult
): SecurityCheckResult {
  const gateCheck: GateCheckResult = {
    action: inputCheck.gateResult.action,
    severity: inputCheck.gateResult.severity,
    category: inputCheck.gateResult.category,
    matchedPattern: inputCheck.gateResult.matchedPattern,
  }

  let sentinelCheck: SentinelCheckResult | undefined
  if (outputCheck) {
    sentinelCheck = {
      passed: outputCheck.passed,
      violations: outputCheck.sentinelResult.violations.map((v) => ({
        type: v.category,
        severity: v.severity === "high" ? "HIGH" : v.severity === "medium" ? "MEDIUM" : "LOW",
        description: v.detail,
      })),
      processingTimeMs: outputCheck.sentinelResult.processingTimeMs,
    }
  }

  const blockedReasons: string[] = []
  if (!inputCheck.passed) blockedReasons.push(inputCheck.reason)
  if (outputCheck && !outputCheck.passed) blockedReasons.push(outputCheck.reason)

  return {
    gateCheck,
    sentinelCheck,
    overallPass: inputCheck.passed && (outputCheck?.passed ?? true),
    blockedReasons,
  }
}

// ── PII 마스킹 유틸 ─────────────────────────────────────────

function maskPII(content: string): string {
  let masked = content
  // 전화번호 마스킹
  masked = masked.replace(/01[016789]-?\d{3,4}-?\d{4}/g, "***-****-****")
  // 이메일 마스킹
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "****@****.***")
  // 주민등록번호 마스킹
  masked = masked.replace(/\d{6}-?[1-4]\d{6}/g, "******-*******")
  // 카드번호 마스킹
  masked = masked.replace(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, "****-****-****-****")
  return masked
}
