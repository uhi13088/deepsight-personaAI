// ═══════════════════════════════════════════════════════════════
// Gate Guard — 입력 보안 계층 (Input Security Layer)
// T138: 유저 발화/페르소나 간 메시지가 메모리에 닿기 전 1차 방어선
// ═══════════════════════════════════════════════════════════════

import type {
  GateVerdict,
  GateResult,
  RuleViolation,
  MemorySource,
  TrustLevel,
  MemoryEntry,
} from "@/types"

// ── 상수 ──────────────────────────────────────────────────────

/** Injection 패턴 (정규식) */
export const INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, label: "ignore_previous" },
  { pattern: /you\s+are\s+now\s+(a|an)\s+/i, label: "role_override" },
  { pattern: /system\s*:\s*/i, label: "system_prefix" },
  { pattern: /\[INST\]/i, label: "inst_tag" },
  { pattern: /<\/?system>/i, label: "system_tag" },
  { pattern: /act\s+as\s+(if\s+)?(you\s+are\s+)?/i, label: "act_as" },
  { pattern: /pretend\s+(you\s+are|to\s+be)/i, label: "pretend" },
  { pattern: /forget\s+(everything|all|your)\s/i, label: "forget_command" },
  { pattern: /override\s+(your\s+)?(rules|instructions|safety)/i, label: "override_attempt" },
  { pattern: /do\s+not\s+follow\s+(your\s+)?(rules|guidelines)/i, label: "ignore_rules" },
  { pattern: /jailbreak/i, label: "jailbreak" },
  { pattern: /DAN\s+(mode|prompt)/i, label: "dan_mode" },
]

/** 금지어 목록 */
export const FORBIDDEN_WORDS: ReadonlyArray<string> = [
  "system_prompt",
  "내부_프롬프트",
  "API_KEY",
  "SECRET_KEY",
  "admin_override",
  "root_access",
  "sudo",
  "rm -rf",
  "DROP TABLE",
  "DELETE FROM",
  "exec(",
  "eval(",
  "__proto__",
  "constructor.prototype",
]

/** 구조적 검증 제한 */
export const STRUCTURAL_LIMITS = {
  /** 메시지 최대 길이 (characters) */
  maxLength: 10000,
  /** 최소 길이 (whitespace만 있는 경우 차단) */
  minLength: 1,
  /** 연속 반복 문자 최대 수 */
  maxRepeatChars: 50,
  /** URL 최대 수 */
  maxUrls: 5,
  /** 특수문자 비율 상한 */
  maxSpecialCharRatio: 0.5,
} as const

/** 신뢰도 전파 규칙 */
export const TRUST_PROPAGATION = {
  /** 직접 경험: 1.0 */
  direct: 1.0,
  /** 1단계 전달: 0.7× */
  oneHop: 0.7,
  /** 2단계 전달: 0.5× */
  twoHop: 0.5,
  /** 3단계 이상: 자동 격리 */
  quarantineDepth: 3,
} as const

/** 소스별 기본 신뢰도 */
export const SOURCE_TRUST: Record<MemorySource, number> = {
  direct_experience: 1.0,
  user_input: 0.8,
  persona_interaction: 0.7,
  system_generated: 0.9,
  external_feed: 0.5,
}

// ── 규칙 기반 필터 (AC1) ─────────────────────────────────────

/** Injection 패턴 검사 */
export function checkInjectionPatterns(input: string): RuleViolation[] {
  const violations: RuleViolation[] = []

  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      violations.push({
        rule: `injection:${label}`,
        category: "injection",
        severity: "high",
        detail: `Injection pattern detected: ${label}`,
      })
    }
  }

  return violations
}

/** 금지어 검사 */
export function checkForbiddenWords(input: string): RuleViolation[] {
  const violations: RuleViolation[] = []
  const lowerInput = input.toLowerCase()

  for (const word of FORBIDDEN_WORDS) {
    if (lowerInput.includes(word.toLowerCase())) {
      violations.push({
        rule: `forbidden:${word}`,
        category: "forbidden",
        severity: "medium",
        detail: `Forbidden word detected: ${word}`,
      })
    }
  }

  return violations
}

/** 구조적 검증 */
export function checkStructuralValidity(input: string): RuleViolation[] {
  const violations: RuleViolation[] = []

  // 길이 검증
  const trimmed = input.trim()
  if (trimmed.length < STRUCTURAL_LIMITS.minLength) {
    violations.push({
      rule: "structural:empty",
      category: "structural",
      severity: "low",
      detail: "Input is empty or whitespace-only",
    })
  }

  if (input.length > STRUCTURAL_LIMITS.maxLength) {
    violations.push({
      rule: "structural:too_long",
      category: "structural",
      severity: "medium",
      detail: `Input exceeds max length: ${input.length} > ${STRUCTURAL_LIMITS.maxLength}`,
    })
  }

  // 반복 문자 검사
  const repeatMatch = input.match(/(.)\1+/g)
  if (repeatMatch) {
    const maxRepeat = Math.max(...repeatMatch.map((m) => m.length))
    if (maxRepeat > STRUCTURAL_LIMITS.maxRepeatChars) {
      violations.push({
        rule: "structural:repeat_chars",
        category: "structural",
        severity: "low",
        detail: `Excessive character repetition: ${maxRepeat} consecutive`,
      })
    }
  }

  // URL 수 검사
  const urlPattern = /https?:\/\/[^\s]+/gi
  const urls = input.match(urlPattern)
  if (urls && urls.length > STRUCTURAL_LIMITS.maxUrls) {
    violations.push({
      rule: "structural:too_many_urls",
      category: "structural",
      severity: "medium",
      detail: `Too many URLs: ${urls.length} > ${STRUCTURAL_LIMITS.maxUrls}`,
    })
  }

  // 특수문자 비율
  if (trimmed.length > 0) {
    const specialChars = trimmed.replace(/[\w\s가-힣ㄱ-ㅎㅏ-ㅣ.,!?;:'"()@#\-]/g, "")
    const ratio = specialChars.length / trimmed.length
    if (ratio > STRUCTURAL_LIMITS.maxSpecialCharRatio) {
      violations.push({
        rule: "structural:special_chars",
        category: "structural",
        severity: "medium",
        detail: `Special character ratio too high: ${(ratio * 100).toFixed(1)}%`,
      })
    }
  }

  return violations
}

/** 규칙 기반 필터 통합 실행 */
export function runRuleFilter(input: string): {
  passed: boolean
  violations: RuleViolation[]
} {
  const violations = [
    ...checkInjectionPatterns(input),
    ...checkForbiddenWords(input),
    ...checkStructuralValidity(input),
  ]

  const hasHighSeverity = violations.some((v) => v.severity === "high")
  return {
    passed: violations.length === 0,
    violations,
  }
}

// ── 의미론적 필터 (AC2) ─────────────────────────────────────

/** Haiku 모델 호출 인터페이스 (DI) */
export interface SemanticFilterProvider {
  /** suspicious 입력에 대한 2차 검증 — Haiku 모델 사용 */
  checkSemantic(input: string): Promise<{
    passed: boolean
    reason: string
    confidence: number
  }>
}

/** 의미론적 필터 판정: suspicious → Haiku 2차 검증 */
export async function runSemanticFilter(
  input: string,
  provider: SemanticFilterProvider
): Promise<{
  passed: boolean
  reason: string
  confidence: number
}> {
  return provider.checkSemantic(input)
}

// ── Gate Guard 메인 (AC1+AC2 통합) ──────────────────────────

/** Gate Guard 판정 결과 생성 */
function determineVerdict(
  ruleResult: { passed: boolean; violations: RuleViolation[] },
  semanticResult?: { passed: boolean; reason: string; confidence: number }
): GateVerdict {
  // 규칙 기반에서 high severity → 즉시 차단
  const hasHighSeverity = ruleResult.violations.some((v) => v.severity === "high")
  if (hasHighSeverity) return "blocked"

  // 규칙 기반 위반 있으나 high가 아닌 경우
  if (!ruleResult.passed) {
    // 의미론적 검증 실행됨
    if (semanticResult) {
      return semanticResult.passed ? "pass" : "blocked"
    }
    // 의미론적 검증 안 했으면 suspicious 유지
    return "suspicious"
  }

  return "pass"
}

/** Gate Guard 전체 파이프라인 실행 */
export async function runGateGuard(
  input: string,
  semanticProvider?: SemanticFilterProvider
): Promise<GateResult> {
  const startTime = performance.now()

  // Step 1: 규칙 기반 필터
  const ruleResult = runRuleFilter(input)

  // Step 2: 규칙 통과 → 바로 pass
  if (ruleResult.passed) {
    return {
      verdict: "pass",
      ruleResult,
      processingTimeMs: performance.now() - startTime,
    }
  }

  // Step 3: high severity → 즉시 차단 (LLM 비용 0)
  const hasHighSeverity = ruleResult.violations.some((v) => v.severity === "high")
  if (hasHighSeverity) {
    return {
      verdict: "blocked",
      ruleResult,
      processingTimeMs: performance.now() - startTime,
    }
  }

  // Step 4: suspicious → 의미론적 필터 (Haiku 2차 검증)
  if (semanticProvider) {
    const semanticResult = await runSemanticFilter(input, semanticProvider)
    return {
      verdict: semanticResult.passed ? "pass" : "blocked",
      ruleResult,
      semanticResult,
      processingTimeMs: performance.now() - startTime,
    }
  }

  // 의미론적 필터 미제공 → suspicious 유지
  return {
    verdict: "suspicious",
    ruleResult,
    processingTimeMs: performance.now() - startTime,
  }
}

// ── 신뢰도 전파 (AC4) ───────────────────────────────────────

/** 전파 깊이에 따른 신뢰도 감쇠 계수 계산 */
export function computeTrustDecay(propagationDepth: number): number {
  if (propagationDepth <= 0) return TRUST_PROPAGATION.direct
  if (propagationDepth === 1) return TRUST_PROPAGATION.oneHop
  if (propagationDepth === 2) return TRUST_PROPAGATION.twoHop
  return 0 // 3단계+ → 격리 (trustScore = 0)
}

/** 전파 깊이에 따른 신뢰도 등급 결정 */
export function determineTrustLevel(propagationDepth: number, trustScore: number): TrustLevel {
  if (propagationDepth >= TRUST_PROPAGATION.quarantineDepth) return "quarantined"
  if (trustScore >= 0.8) return "trusted"
  if (trustScore >= 0.5) return "standard"
  return "low"
}

/** 최종 신뢰도 점수 계산 */
export function computeTrustScore(
  source: MemorySource,
  propagationDepth: number
): { trustScore: number; trustLevel: TrustLevel } {
  const baseTrust = SOURCE_TRUST[source]
  const decay = computeTrustDecay(propagationDepth)
  const trustScore = Math.max(0, Math.min(1, baseTrust * decay))
  const trustLevel = determineTrustLevel(propagationDepth, trustScore)

  return { trustScore, trustLevel }
}

// ── 출처 태깅 (AC3) ─────────────────────────────────────────

/** Gate Guard 결과를 포함한 MemoryEntry 생성 */
export function createMemoryEntry(params: {
  id: string
  content: string
  source: MemorySource
  propagationDepth: number
  gateResult: GateResult
}): MemoryEntry {
  const { trustScore, trustLevel } = computeTrustScore(params.source, params.propagationDepth)

  return {
    id: params.id,
    content: params.content,
    source: params.source,
    trustLevel,
    propagationDepth: params.propagationDepth,
    gateResult: params.gateResult,
    originalTrust: SOURCE_TRUST[params.source],
    trustScore,
    createdAt: Date.now(),
  }
}

/** 전파된 메모리 엔트리 생성 (기존 엔트리에서 전파) */
export function propagateMemoryEntry(
  original: MemoryEntry,
  newId: string,
  additionalContent?: string
): MemoryEntry {
  const newDepth = original.propagationDepth + 1
  const { trustScore, trustLevel } = computeTrustScore(original.source, newDepth)

  return {
    id: newId,
    content: additionalContent ?? original.content,
    source: original.source,
    trustLevel,
    propagationDepth: newDepth,
    gateResult: original.gateResult,
    originalTrust: original.originalTrust,
    trustScore,
    createdAt: Date.now(),
  }
}

/** 메모리 엔트리가 격리 대상인지 확인 */
export function isQuarantined(entry: MemoryEntry): boolean {
  return entry.trustLevel === "quarantined" || entry.gateResult.verdict === "blocked"
}
