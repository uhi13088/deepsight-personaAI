// ═══════════════════════════════════════════════════════════════
// Output Sentinel — 출력 보안 계층 (Output Security Layer)
// T140: 페르소나 생성 콘텐츠가 유저에 도달하기 전 마지막 관문
// ═══════════════════════════════════════════════════════════════

import type { ImmutableFact } from "@/types"

// ── 타입 ──────────────────────────────────────────────────────

export type OutputViolationCategory = "pii" | "system_leak" | "profanity" | "factbook_violation"

export interface OutputViolation {
  category: OutputViolationCategory
  rule: string
  severity: "low" | "medium" | "high"
  detail: string
  /** 위반이 발견된 위치 (인덱스) */
  matchIndex?: number
}

export type OutputVerdict = "clean" | "flagged" | "blocked"

export interface OutputSentinelResult {
  verdict: OutputVerdict
  violations: OutputViolation[]
  /** 격리 필요 여부 */
  shouldQuarantine: boolean
  processingTimeMs: number
}

/** 격리 엔트리 상태 */
export type QuarantineStatus = "pending" | "approved" | "rejected" | "deleted"

/** 격리 엔트리 */
export interface QuarantineEntry {
  id: string
  content: string
  source: string
  personaId: string
  reason: string
  violations: OutputViolation[]
  status: QuarantineStatus
  reviewedBy: string | null
  reviewedAt: number | null
  createdAt: number
}

// ── 상수 ──────────────────────────────────────────────────────

/** PII 패턴 (개인정보 보호) */
export const PII_PATTERNS: ReadonlyArray<{
  pattern: RegExp
  label: string
  severity: "medium" | "high"
}> = [
  // 한국 전화번호
  { pattern: /01[016789]-?\d{3,4}-?\d{4}/g, label: "phone_kr", severity: "high" },
  // 국제 전화번호
  {
    pattern: /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{0,4}/g,
    label: "phone_intl",
    severity: "high",
  },
  // 이메일
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: "email", severity: "high" },
  // 주민등록번호 (한국)
  { pattern: /\d{6}-?[1-4]\d{6}/g, label: "rrn_kr", severity: "high" },
  // 신용카드 번호 (16자리)
  { pattern: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, label: "credit_card", severity: "high" },
  // IP 주소
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, label: "ip_address", severity: "medium" },
]

/** 시스템 정보 유출 패턴 */
export const SYSTEM_LEAK_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /system\s*prompt/i, label: "system_prompt_mention" },
  { pattern: /내부\s*프롬프트/i, label: "internal_prompt_mention" },
  { pattern: /API[_\s]*KEY/i, label: "api_key_mention" },
  { pattern: /SECRET[_\s]*KEY/i, label: "secret_key_mention" },
  { pattern: /database\s*(url|connection|password)/i, label: "db_credential" },
  { pattern: /\/api\/internal\//i, label: "internal_api_path" },
  { pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g, label: "bearer_token" },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, label: "api_key_pattern" },
]

/** 욕설/혐오 표현 패턴 */
export const PROFANITY_PATTERNS: ReadonlyArray<{
  pattern: RegExp
  label: string
  severity: "medium" | "high"
}> = [
  // 혐오 표현 (심각)
  {
    pattern: /자살\s*(해|하[라자]|방법|하는\s*법)/g,
    label: "suicide_instruction",
    severity: "high",
  },
  { pattern: /살인\s*(방법|하는\s*법|계획)/g, label: "murder_instruction", severity: "high" },
  // 차별적 발언 (중간)
  { pattern: /장애인\s*(새끼|놈|년)/g, label: "disability_slur", severity: "high" },
  { pattern: /(?:흑인|백인|황인)\s*(?:새끼|놈|년)/g, label: "racial_slur", severity: "high" },
]

/** 팩트북 위반: 부정적 키워드 매칭 패턴 */
export const FACTBOOK_NEGATION_PATTERNS = [
  /(?:사실은|실제로는|원래는|진짜는)\s*(?:아니|않|없)/,
  /(?:이전에|과거에|예전에)\s*(?:말한|설정한|정한)\s*것과\s*(?:다르|반대)/,
  /(?:잊어버리|무시하|버리)/,
] as const

// ── AC1: 규칙 기반 출력 필터 ─────────────────────────────────

/** PII 검출 */
export function checkPII(content: string): OutputViolation[] {
  const violations: OutputViolation[] = []

  for (const { pattern, label, severity } of PII_PATTERNS) {
    // Reset regex state for global patterns
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      violations.push({
        category: "pii",
        rule: `pii:${label}`,
        severity,
        detail: `PII detected: ${label}`,
        matchIndex: match.index,
      })
    }
  }

  return violations
}

/** 시스템 정보 유출 검출 */
export function checkSystemLeak(content: string): OutputViolation[] {
  const violations: OutputViolation[] = []

  for (const { pattern, label } of SYSTEM_LEAK_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    if (regex.test(content)) {
      violations.push({
        category: "system_leak",
        rule: `system_leak:${label}`,
        severity: "high",
        detail: `System information leak: ${label}`,
      })
    }
  }

  return violations
}

/** 욕설/혐오 검출 */
export function checkProfanity(content: string): OutputViolation[] {
  const violations: OutputViolation[] = []

  for (const { pattern, label, severity } of PROFANITY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    if (regex.test(content)) {
      violations.push({
        category: "profanity",
        rule: `profanity:${label}`,
        severity,
        detail: `Profanity/hate speech detected: ${label}`,
      })
    }
  }

  return violations
}

// ── AC2: 팩트북 위반 검증 ───────────────────────────────────

/** 팩트북 위반 검사 (immutableFacts 키워드 매칭) */
export function checkFactbookViolation(
  content: string,
  immutableFacts: ImmutableFact[]
): OutputViolation[] {
  const violations: OutputViolation[] = []

  for (const fact of immutableFacts) {
    // 사실의 핵심 키워드 추출 (4자 이상 단어)
    const keywords = extractKeywords(fact.content)

    for (const keyword of keywords) {
      // 콘텐츠에서 해당 키워드가 부정적 맥락에서 사용되는지 확인
      for (const negPattern of FACTBOOK_NEGATION_PATTERNS) {
        // 키워드 주변에 부정 패턴이 있는지 확인
        const contextPattern = new RegExp(
          `(?:${keyword}[^.]{0,30}${negPattern.source}|${negPattern.source}[^.]{0,30}${keyword})`,
          "i"
        )
        if (contextPattern.test(content)) {
          violations.push({
            category: "factbook_violation",
            rule: `factbook:negation_of_${fact.category}`,
            severity: "medium",
            detail: `Factbook violation: content contradicts immutable fact (${fact.category}): "${keyword}"`,
          })
          break // 하나의 fact에 대해 하나의 위반만 보고
        }
      }
    }
  }

  return violations
}

/** 텍스트에서 핵심 키워드 추출 (4자 이상) */
function extractKeywords(text: string): string[] {
  const words = text.split(/[\s,.\-;:!?。！？、]+/).filter((w) => w.length >= 4)
  // 중복 제거 + 최대 5개
  return [...new Set(words)].slice(0, 5)
}

// ── 통합 출력 필터 파이프라인 ────────────────────────────────

/** Output Sentinel 전체 파이프라인 실행 */
export function runOutputSentinel(
  content: string,
  immutableFacts?: ImmutableFact[]
): OutputSentinelResult {
  const startTime = performance.now()

  const violations: OutputViolation[] = [
    ...checkPII(content),
    ...checkSystemLeak(content),
    ...checkProfanity(content),
    ...(immutableFacts ? checkFactbookViolation(content, immutableFacts) : []),
  ]

  const hasHighSeverity = violations.some((v) => v.severity === "high")
  const hasMediumSeverity = violations.some((v) => v.severity === "medium")

  let verdict: OutputVerdict = "clean"
  if (hasHighSeverity) {
    verdict = "blocked"
  } else if (hasMediumSeverity) {
    verdict = "flagged"
  }

  return {
    verdict,
    violations,
    shouldQuarantine: verdict !== "clean",
    processingTimeMs: performance.now() - startTime,
  }
}

// ── AC3: 격리 시스템 ─────────────────────────────────────────

/** 격리 엔트리 생성 */
export function createQuarantineEntry(params: {
  id: string
  content: string
  source: string
  personaId: string
  sentinelResult: OutputSentinelResult
}): QuarantineEntry {
  const reasons = params.sentinelResult.violations.map((v) => `${v.category}:${v.rule}`).join(", ")

  return {
    id: params.id,
    content: params.content,
    source: params.source,
    personaId: params.personaId,
    reason: reasons,
    violations: params.sentinelResult.violations,
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: Date.now(),
  }
}

/** 격리 엔트리 리뷰 (관리자 승인/거절/삭제) */
export function reviewQuarantineEntry(
  entry: QuarantineEntry,
  action: "approved" | "rejected" | "deleted",
  reviewerId: string
): QuarantineEntry {
  return {
    ...entry,
    status: action,
    reviewedBy: reviewerId,
    reviewedAt: Date.now(),
  }
}

/** 대기 중인 격리 엔트리 수 */
export function countPendingQuarantine(entries: QuarantineEntry[]): number {
  return entries.filter((e) => e.status === "pending").length
}
