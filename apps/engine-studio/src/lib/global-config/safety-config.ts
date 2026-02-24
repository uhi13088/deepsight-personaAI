// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC2: 안전 필터                                                ║
// ║ 필터 강도 설정, 커스텀 금기어, 필터 로그                        ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 안전 필터 타입 정의 ───────────────────────────────────────

export type FilterLevel = "strict" | "moderate" | "permissive" | "off"

export type FilterAction = "block" | "warn" | "flag" | "pass"

export interface ForbiddenWord {
  word: string
  category: string
  severity: "critical" | "high" | "medium" | "low"
  exactMatch: boolean // true: 정확히 일치, false: 포함 여부
}

export interface FilterLogEntry {
  id: string
  timestamp: number
  input: string
  matchedRule: string
  matchedWord: string | null
  filterLevel: FilterLevel
  action: FilterAction
  details: string
}

export interface SafetyFilterConfig {
  level: FilterLevel
  forbiddenWords: ForbiddenWord[]
  maxLogEntries: number
  enableLogging: boolean
}

export interface SafetyFilter {
  config: SafetyFilterConfig
  logs: FilterLogEntry[]
}

// ── 기본 금기어 목록 ──────────────────────────────────────────

export const DEFAULT_FORBIDDEN_WORDS: ForbiddenWord[] = [
  { word: "폭력", category: "violence", severity: "critical", exactMatch: false },
  { word: "자해", category: "self_harm", severity: "critical", exactMatch: false },
  { word: "차별", category: "discrimination", severity: "high", exactMatch: false },
  { word: "혐오", category: "hate_speech", severity: "high", exactMatch: false },
  { word: "음란", category: "explicit", severity: "high", exactMatch: false },
  { word: "마약", category: "illegal", severity: "critical", exactMatch: false },
  { word: "도박", category: "illegal", severity: "medium", exactMatch: false },
  { word: "사기", category: "fraud", severity: "high", exactMatch: false },
]

// ── 필터 강도별 액션 매핑 ─────────────────────────────────────

const LEVEL_ACTION_MAP: Record<FilterLevel, Record<ForbiddenWord["severity"], FilterAction>> = {
  strict: {
    critical: "block",
    high: "block",
    medium: "warn",
    low: "flag",
  },
  moderate: {
    critical: "block",
    high: "warn",
    medium: "flag",
    low: "pass",
  },
  permissive: {
    critical: "block",
    high: "flag",
    medium: "pass",
    low: "pass",
  },
  off: {
    critical: "pass",
    high: "pass",
    medium: "pass",
    low: "pass",
  },
}

// ── 안전 필터 생성 ────────────────────────────────────────────

export function createSafetyFilter(overrides?: Partial<SafetyFilterConfig>): SafetyFilter {
  return {
    config: {
      level: overrides?.level ?? "moderate",
      forbiddenWords: overrides?.forbiddenWords ?? [...DEFAULT_FORBIDDEN_WORDS],
      maxLogEntries: overrides?.maxLogEntries ?? 10_000,
      enableLogging: overrides?.enableLogging ?? true,
    },
    logs: [],
  }
}

// ── 필터 평가 ─────────────────────────────────────────────────

export interface FilterEvaluationResult {
  passed: boolean
  action: FilterAction
  matchedWords: Array<{ word: string; category: string; severity: ForbiddenWord["severity"] }>
  logEntry: FilterLogEntry | null
}

export function evaluateFilter(
  filter: SafetyFilter,
  input: string
): { result: FilterEvaluationResult; updatedFilter: SafetyFilter } {
  const normalizedInput = input.toLowerCase().trim()
  const matchedWords: FilterEvaluationResult["matchedWords"] = []

  for (const fw of filter.config.forbiddenWords) {
    const normalizedWord = fw.word.toLowerCase()
    const found = fw.exactMatch
      ? normalizedInput === normalizedWord
      : normalizedInput.includes(normalizedWord)

    if (found) {
      matchedWords.push({
        word: fw.word,
        category: fw.category,
        severity: fw.severity,
      })
    }
  }

  // 가장 높은 심각도 기준으로 액션 결정
  let finalAction: FilterAction = "pass"
  const severityOrder: ForbiddenWord["severity"][] = ["critical", "high", "medium", "low"]

  for (const severity of severityOrder) {
    if (matchedWords.some((m) => m.severity === severity)) {
      finalAction = LEVEL_ACTION_MAP[filter.config.level][severity]
      break
    }
  }

  const logEntry: FilterLogEntry | null = filter.config.enableLogging
    ? {
        id: `flog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        input: input.length > 200 ? input.slice(0, 200) + "..." : input,
        matchedRule:
          matchedWords.length > 0
            ? matchedWords.map((m) => `${m.category}:${m.severity}`).join(", ")
            : "none",
        matchedWord: matchedWords.length > 0 ? matchedWords.map((m) => m.word).join(", ") : null,
        filterLevel: filter.config.level,
        action: finalAction,
        details:
          matchedWords.length > 0
            ? `${matchedWords.length}개 금기어 탐지 → ${finalAction}`
            : "필터 통과",
      }
    : null

  // 로그 추가 (최대 제한 적용)
  let updatedLogs = [...filter.logs]
  if (logEntry) {
    updatedLogs.push(logEntry)
    if (updatedLogs.length > filter.config.maxLogEntries) {
      updatedLogs = updatedLogs.slice(updatedLogs.length - filter.config.maxLogEntries)
    }
  }

  return {
    result: {
      passed: finalAction === "pass" || finalAction === "flag",
      action: finalAction,
      matchedWords,
      logEntry,
    },
    updatedFilter: {
      ...filter,
      logs: updatedLogs,
    },
  }
}

// ── 금기어 관리 ───────────────────────────────────────────────

export function addForbiddenWord(filter: SafetyFilter, word: ForbiddenWord): SafetyFilter {
  const exists = filter.config.forbiddenWords.some(
    (fw) => fw.word.toLowerCase() === word.word.toLowerCase() && fw.category === word.category
  )
  if (exists) {
    throw new Error(`금기어가 이미 존재합니다: "${word.word}" (${word.category})`)
  }
  return {
    ...filter,
    config: {
      ...filter.config,
      forbiddenWords: [...filter.config.forbiddenWords, word],
    },
  }
}

export function removeForbiddenWord(
  filter: SafetyFilter,
  word: string,
  category: string
): SafetyFilter {
  const filtered = filter.config.forbiddenWords.filter(
    (fw) => !(fw.word.toLowerCase() === word.toLowerCase() && fw.category === category)
  )
  if (filtered.length === filter.config.forbiddenWords.length) {
    throw new Error(`금기어를 찾을 수 없습니다: "${word}" (${category})`)
  }
  return {
    ...filter,
    config: {
      ...filter.config,
      forbiddenWords: filtered,
    },
  }
}

export function getFilterLogSummary(filter: SafetyFilter): {
  totalEntries: number
  byAction: Record<FilterAction, number>
  byLevel: Record<FilterLevel, number>
  recentBlocks: FilterLogEntry[]
} {
  const byAction: Record<FilterAction, number> = { block: 0, warn: 0, flag: 0, pass: 0 }
  const byLevel: Record<FilterLevel, number> = { strict: 0, moderate: 0, permissive: 0, off: 0 }

  for (const log of filter.logs) {
    byAction[log.action]++
    byLevel[log.filterLevel]++
  }

  const recentBlocks = filter.logs.filter((l) => l.action === "block").slice(-10)

  return {
    totalEntries: filter.logs.length,
    byAction,
    byLevel,
    recentBlocks,
  }
}
