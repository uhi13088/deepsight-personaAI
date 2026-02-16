// ═══════════════════════════════════════════════════════════════
// Integrity Monitor — 내부 감시 계층 (Internal Monitoring Layer)
// T139: 저장 후 시간이 지나면서 발생하는 오염 탐지
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, Factbook, MutableContext } from "@/types"
import { computeFactbookHash } from "@/lib/persona-world/factbook"

// ── 상수 ──────────────────────────────────────────────────────

/** L1 드리프트 임계값 */
export const DRIFT_THRESHOLDS = {
  /** 경고: cosine similarity ≤ 0.85 */
  warning: 0.85,
  /** 붕괴 위험: cosine similarity ≤ 0.70 */
  critical: 0.7,
} as const

/** mutableContext 변경 제한 */
export const CHANGE_LIMITS = {
  /** 하루 동일 항목 변경 최대 횟수 */
  maxDailyChangesPerItem: 5,
  /** 하루 전체 변경 최대 횟수 */
  maxDailyTotalChanges: 20,
} as const

/** 집단 이상 탐지 임계값 */
export const COLLECTIVE_THRESHOLDS = {
  /** 집단 우울 경고: 평균 mood ≤ 0.3 */
  depressionWarning: 0.3,
  /** 집단 흥분 경고: 평균 mood ≥ 0.9 */
  euphoriaWarning: 0.9,
  /** 최소 표본 크기 */
  minSampleSize: 3,
} as const

// ── 드리프트 상태 타입 ──────────────────────────────────────

export type DriftStatus = "stable" | "warning" | "critical"

export interface DriftCheckResult {
  status: DriftStatus
  similarity: number
  /** 가장 많이 변한 차원 */
  dominantDrift: {
    dimension: keyof SocialPersonaVector
    delta: number
  } | null
}

// ── 변경 로그 타입 ──────────────────────────────────────────

export interface ChangeLogEntry {
  contextId: string
  category: MutableContext["category"]
  previousContent: string
  newContent: string
  changedAt: number
}

export interface ChangeLogCheckResult {
  /** 과도한 변경이 감지된 항목 ID 목록 */
  flaggedContextIds: string[]
  /** 하루 전체 변경 횟수 */
  totalDailyChanges: number
  /** 전체 변경 횟수 초과 여부 */
  totalLimitExceeded: boolean
}

// ── 집단 이상 타입 ──────────────────────────────────────────

export type CollectiveAnomalyType = "depression" | "euphoria" | "none"

export interface CollectiveAnomalyResult {
  anomaly: CollectiveAnomalyType
  averageMood: number
  sampleSize: number
  /** 표본 충분 여부 */
  isSufficientSample: boolean
}

// ── 전체 모니터 결과 ─────────────────────────────────────────

export type IntegrityAlertLevel = "ok" | "warning" | "critical"

export interface IntegrityMonitorResult {
  alertLevel: IntegrityAlertLevel
  factbookIntegrity: {
    verified: boolean
    hashMatch: boolean
  }
  drift: DriftCheckResult
  changeLog: ChangeLogCheckResult
  collective: CollectiveAnomalyResult
  /** 발생한 경고 메시지 목록 */
  alerts: string[]
}

// ── AC1: 팩트북 해시 검증 ───────────────────────────────────

/** 팩트북 무결성 검증 (immutableFacts 변조 감지) */
export async function verifyFactbookHash(factbook: Factbook): Promise<{
  verified: boolean
  hashMatch: boolean
}> {
  if (factbook.immutableFacts.length === 0) {
    return { verified: true, hashMatch: true }
  }

  const currentHash = await computeFactbookHash(factbook.immutableFacts)
  const hashMatch = currentHash === factbook.integrityHash

  return { verified: hashMatch, hashMatch }
}

// ── AC2: 상태 드리프트 감지 ─────────────────────────────────

/** L1 벡터 코사인 유사도 */
export function vectorCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 1.0

  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  if (magnitude === 0) return 1.0
  return dot / magnitude
}

/** SocialPersonaVector → number[] 변환 */
export function l1ToArray(v: SocialPersonaVector): number[] {
  return [v.depth, v.lens, v.stance, v.scope, v.taste, v.purpose, v.sociability]
}

/** L1 드리프트 검사 */
export function checkL1Drift(
  original: SocialPersonaVector,
  current: SocialPersonaVector
): DriftCheckResult {
  const origArr = l1ToArray(original)
  const currArr = l1ToArray(current)
  const similarity = vectorCosineSimilarity(origArr, currArr)

  // 가장 많이 변한 차원 찾기
  const dimensions: (keyof SocialPersonaVector)[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  let maxDelta = 0
  let maxDim: keyof SocialPersonaVector = "depth"

  for (const dim of dimensions) {
    const delta = Math.abs(original[dim] - current[dim])
    if (delta > maxDelta) {
      maxDelta = delta
      maxDim = dim
    }
  }

  let status: DriftStatus
  if (similarity <= DRIFT_THRESHOLDS.critical) {
    status = "critical"
  } else if (similarity <= DRIFT_THRESHOLDS.warning) {
    status = "warning"
  } else {
    status = "stable"
  }

  return {
    status,
    similarity: Math.round(similarity * 1000) / 1000,
    dominantDrift:
      maxDelta > 0 ? { dimension: maxDim, delta: Math.round(maxDelta * 1000) / 1000 } : null,
  }
}

// ── AC3: mutableContext 변경 로그 ────────────────────────────

/** 하루 이내 변경 로그를 기준으로 과도한 변경 감지 */
export function checkChangeLog(
  changeLogs: ChangeLogEntry[],
  referenceTime?: number
): ChangeLogCheckResult {
  const now = referenceTime ?? Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // 하루 이내 로그만 필터
  const recentLogs = changeLogs.filter((log) => log.changedAt >= oneDayAgo)
  const totalDailyChanges = recentLogs.length

  // 항목별 변경 횟수 집계
  const changeCountByContext = new Map<string, number>()
  for (const log of recentLogs) {
    const count = changeCountByContext.get(log.contextId) ?? 0
    changeCountByContext.set(log.contextId, count + 1)
  }

  // 임계값 초과 항목 식별
  const flaggedContextIds: string[] = []
  for (const [contextId, count] of changeCountByContext) {
    if (count >= CHANGE_LIMITS.maxDailyChangesPerItem) {
      flaggedContextIds.push(contextId)
    }
  }

  return {
    flaggedContextIds,
    totalDailyChanges,
    totalLimitExceeded: totalDailyChanges >= CHANGE_LIMITS.maxDailyTotalChanges,
  }
}

// ── AC4: 집단 이상 탐지 ─────────────────────────────────────

/** 전체 페르소나 집단의 mood 이상 탐지 */
export function checkCollectiveAnomaly(moods: number[]): CollectiveAnomalyResult {
  if (moods.length < COLLECTIVE_THRESHOLDS.minSampleSize) {
    return {
      anomaly: "none",
      averageMood: moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0.5,
      sampleSize: moods.length,
      isSufficientSample: false,
    }
  }

  const averageMood = moods.reduce((a, b) => a + b, 0) / moods.length
  const roundedMood = Math.round(averageMood * 1000) / 1000

  let anomaly: CollectiveAnomalyType = "none"
  if (roundedMood <= COLLECTIVE_THRESHOLDS.depressionWarning) {
    anomaly = "depression"
  } else if (roundedMood >= COLLECTIVE_THRESHOLDS.euphoriaWarning) {
    anomaly = "euphoria"
  }

  return {
    anomaly,
    averageMood: roundedMood,
    sampleSize: moods.length,
    isSufficientSample: true,
  }
}

// ── 통합 모니터 실행 ─────────────────────────────────────────

/** Integrity Monitor 전체 파이프라인 실행 */
export async function runIntegrityMonitor(params: {
  factbook: Factbook
  originalL1: SocialPersonaVector
  currentL1: SocialPersonaVector
  changeLogs: ChangeLogEntry[]
  collectiveMoods: number[]
}): Promise<IntegrityMonitorResult> {
  const alerts: string[] = []

  // 1. 팩트북 해시 검증
  const factbookIntegrity = await verifyFactbookHash(params.factbook)
  if (!factbookIntegrity.hashMatch) {
    alerts.push("CRITICAL: immutableFacts 변조 감지 — 해시 불일치")
  }

  // 2. L1 드리프트 감지
  const drift = checkL1Drift(params.originalL1, params.currentL1)
  if (drift.status === "critical") {
    alerts.push(
      `CRITICAL: L1 드리프트 붕괴 위험 (similarity=${drift.similarity}, dominant=${drift.dominantDrift?.dimension})`
    )
  } else if (drift.status === "warning") {
    alerts.push(
      `WARNING: L1 드리프트 경고 (similarity=${drift.similarity}, dominant=${drift.dominantDrift?.dimension})`
    )
  }

  // 3. 변경 로그 검사
  const changeLog = checkChangeLog(params.changeLogs)
  if (changeLog.flaggedContextIds.length > 0) {
    alerts.push(
      `WARNING: mutableContext 과도한 변경 감지 — ${changeLog.flaggedContextIds.length}개 항목 플래그`
    )
  }
  if (changeLog.totalLimitExceeded) {
    alerts.push(
      `WARNING: 일일 전체 변경 횟수 초과 (${changeLog.totalDailyChanges}/${CHANGE_LIMITS.maxDailyTotalChanges})`
    )
  }

  // 4. 집단 이상 탐지
  const collective = checkCollectiveAnomaly(params.collectiveMoods)
  if (collective.anomaly === "depression") {
    alerts.push(`WARNING: 집단 우울 경고 — 평균 mood=${collective.averageMood}`)
  } else if (collective.anomaly === "euphoria") {
    alerts.push(`WARNING: 집단 흥분 경고 — 평균 mood=${collective.averageMood}`)
  }

  // 전체 경고 수준 결정
  let alertLevel: IntegrityAlertLevel = "ok"
  if (!factbookIntegrity.hashMatch || drift.status === "critical") {
    alertLevel = "critical"
  } else if (
    drift.status === "warning" ||
    changeLog.flaggedContextIds.length > 0 ||
    changeLog.totalLimitExceeded ||
    collective.anomaly !== "none"
  ) {
    alertLevel = "warning"
  }

  return {
    alertLevel,
    factbookIntegrity,
    drift,
    changeLog,
    collective,
    alerts,
  }
}
