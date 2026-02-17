// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Gate Guard Rules (Phase 6-A)
// 운영 설계서 §10.2 — 유저 입력 보안 검증
// ═══════════════════════════════════════════════════════════════

export type GateAction = "PASS" | "WARN" | "BLOCK"
export type GateSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface GateRuleResult {
  action: GateAction
  severity: GateSeverity
  category: string
  matchedPattern?: string
}

// ── 패턴 기반 규칙 ──────────────────────────────────────────

interface PatternRule {
  category: string
  patterns: RegExp[]
  action: GateAction
  severity: GateSeverity
}

const PATTERN_RULES: PatternRule[] = [
  {
    category: "persona_manipulation",
    patterns: [
      /너의?\s*(성격|벡터|설정|시스템).*바꿔/i,
      /ignore\s*(previous|above)\s*instructions/i,
      /act\s+as\s+(a\s+)?different/i,
      /forget\s+(everything|your\s+personality)/i,
    ],
    action: "BLOCK",
    severity: "HIGH",
  },
  {
    category: "info_extraction",
    patterns: [
      /시스템\s*프롬프트.*알려/i,
      /벡터\s*값.*몇/i,
      /너의?\s*(OCEAN|L[123]).*수치/i,
      /what.*your.*prompt/i,
    ],
    action: "BLOCK",
    severity: "HIGH",
  },
  {
    category: "spam_url",
    patterns: [
      // 3개 이상 URL 포함
      /(https?:\/\/\S+.*){3,}/i,
    ],
    action: "BLOCK",
    severity: "MEDIUM",
  },
  {
    category: "profanity",
    patterns: [/시[발빨]|개새|병신|미친\s*놈|씹/i],
    action: "WARN",
    severity: "MEDIUM",
  },
]

// ── 구조적 검사 ──────────────────────────────────────────────

interface StructuralCheck {
  category: string
  check: (text: string) => boolean
  action: GateAction
  severity: GateSeverity
}

const STRUCTURAL_CHECKS: StructuralCheck[] = [
  {
    category: "excessive_length",
    check: (text) => text.length > 5000,
    action: "BLOCK",
    severity: "LOW",
  },
  {
    category: "repeated_chars",
    check: (text) => /(.)\1{19,}/.test(text), // 같은 문자 20회 이상 반복
    action: "WARN",
    severity: "LOW",
  },
  {
    category: "encoding_bypass",
    check: (text) => /[\u200B-\u200D\uFEFF]/.test(text), // 제로 폭 문자
    action: "WARN",
    severity: "MEDIUM",
  },
  {
    category: "mention_spam",
    check: (text) => {
      const mentions = text.match(/@\w+/g)
      return (mentions?.length ?? 0) > 5
    },
    action: "BLOCK",
    severity: "MEDIUM",
  },
]

// ── Rate Limiting 설정 ───────────────────────────────────────

export interface RateLimitConfig {
  action: string
  maxPerHour: number
  maxPerDay: number
}

export const RATE_LIMITS: RateLimitConfig[] = [
  { action: "COMMENT", maxPerHour: 30, maxPerDay: 100 },
  { action: "LIKE", maxPerHour: 60, maxPerDay: 500 },
  { action: "FOLLOW", maxPerHour: 20, maxPerDay: 50 },
  { action: "REPORT", maxPerHour: 10, maxPerDay: 30 },
]

// ── 메인 검증 함수 ──────────────────────────────────────────

/**
 * Gate Guard: 유저 입력 텍스트 검증.
 *
 * 1. 패턴 기반 검사 (주입, 추출, 스팸)
 * 2. 구조적 검사 (길이, 반복, 인코딩)
 * 3. 가장 심각한 결과 반환
 */
export function inspectInput(text: string): GateRuleResult {
  const results: GateRuleResult[] = []

  // 패턴 기반
  for (const rule of PATTERN_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        results.push({
          action: rule.action,
          severity: rule.severity,
          category: rule.category,
          matchedPattern: pattern.source,
        })
        break // 같은 카테고리에서 하나만
      }
    }
  }

  // 구조적 검사
  for (const check of STRUCTURAL_CHECKS) {
    if (check.check(text)) {
      results.push({
        action: check.action,
        severity: check.severity,
        category: check.category,
      })
    }
  }

  if (results.length === 0) {
    return { action: "PASS", severity: "LOW", category: "clean" }
  }

  // 가장 심각한 결과 반환
  const severityOrder: GateSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  results.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))

  return results[0]
}
