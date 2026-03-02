// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Quality Runner (T289, T291, T292)
// 주기적 품질 체크 + PIS 이력 + Arena 자동 트리거
// ═══════════════════════════════════════════════════════════════

import {
  createInteractionPatternLog,
  type InteractionPatternLog,
  type PatternPeriod,
} from "./quality-logger"

// ── 품질 러너 데이터 프로바이더 ──────────────────────────────

export interface QualityRunnerProvider {
  /** 페르소나별 활동 통계 집계 */
  getActivityStats(
    personaId: string,
    period: PatternPeriod
  ): Promise<{
    postsCreated: number
    commentsWritten: number
    likesGiven: number
    followsInitiated: number
    repostsShared: number
  }>

  /** 페르소나 현재 에너지 */
  getPersonaEnergy(personaId: string): Promise<number>

  /** 활동 패턴 통계 */
  getActivityPatterns(
    personaId: string,
    period: PatternPeriod
  ): Promise<{
    activeHours: number[]
    avgIntervalMinutes: number
    targetDiversity: number
    topicDiversity: number
    energyCorrelation: number
  }>

  /** KPI 스냅샷 저장 (T291) */
  saveKPISnapshot(params: {
    snapshotType: string
    metrics: Record<string, unknown>
    period: string
  }): Promise<void>

  /** 활성 페르소나 ID 목록 */
  getActivePersonaIds(): Promise<string[]>

  /** PIS 점수 조회 */
  getPersonaPIS?(personaId: string): Promise<number | null>

  /** 최근 KPI 스냅샷 조회 (추세 분석용) */
  getRecentKPISnapshots?(
    snapshotType: string,
    limit: number
  ): Promise<Array<{ metrics: Record<string, unknown>; period: string; createdAt: Date }>>

  /** Arena 세션 생성 (T292) */
  createArenaSession?(personaId: string, reason: string): Promise<{ id: string }>
}

// ── T289: InteractionPatternLog 주기 집계 ────────────────────

/**
 * 전체 활성 페르소나에 대해 활동 패턴 집계.
 *
 * cron 등 주기 배치에서 호출.
 */
export async function runInteractionPatternCheck(
  provider: QualityRunnerProvider,
  period: PatternPeriod = "DAILY"
): Promise<InteractionPatternLog[]> {
  const personaIds = await provider.getActivePersonaIds()
  const logs: InteractionPatternLog[] = []

  for (const personaId of personaIds) {
    try {
      const [stats, patterns, energy] = await Promise.all([
        provider.getActivityStats(personaId, period),
        provider.getActivityPatterns(personaId, period),
        provider.getPersonaEnergy(personaId),
      ])

      const log = createInteractionPatternLog({
        personaId,
        period,
        stats,
        patterns,
        energy,
      })

      logs.push(log)

      // 이상 패턴 감지 시 로깅
      if (log.anomalies.length > 0) {
        console.warn(
          `[QualityRunner] ${personaId}: ${log.anomalies.length} anomalies detected`,
          log.anomalies.map((a) => `${a.type}(${a.severity})`)
        )
      }
    } catch (err) {
      console.error(`[QualityRunner] Pattern check failed for ${personaId}:`, err)
    }
  }

  return logs
}

// ── T291: PIS 이력 저장 + 추세 분석 ─────────────────────────

/**
 * PIS 스냅샷 저장.
 *
 * 품질 체크 배치 시 각 페르소나의 PIS를 KPISnapshot에 저장.
 */
export async function savePISSnapshot(
  provider: QualityRunnerProvider,
  personaScores: Array<{ personaId: string; pis: number }>
): Promise<void> {
  if (personaScores.length === 0) return

  const avgPIS = personaScores.reduce((sum, s) => sum + s.pis, 0) / personaScores.length

  const distribution = {
    excellent: personaScores.filter((s) => s.pis >= 0.85).length,
    good: personaScores.filter((s) => s.pis >= 0.7 && s.pis < 0.85).length,
    warning: personaScores.filter((s) => s.pis >= 0.6 && s.pis < 0.7).length,
    critical: personaScores.filter((s) => s.pis < 0.6).length,
  }

  await provider.saveKPISnapshot({
    snapshotType: "DAILY",
    metrics: {
      avgPIS,
      distribution,
      totalPersonas: personaScores.length,
      scores: personaScores,
    },
    period: new Date().toISOString().slice(0, 10), // "2026-03-02"
  })
}

/**
 * PIS 추세 분석.
 *
 * 최근 N일간 KPISnapshot에서 avgPIS 추세 계산.
 */
export async function analyzeKPITrend(
  provider: QualityRunnerProvider,
  days: number = 7
): Promise<{
  trend: "improving" | "stable" | "declining"
  avgPISHistory: Array<{ date: string; avgPIS: number }>
  weeklyDelta: number
}> {
  if (!provider.getRecentKPISnapshots) {
    return { trend: "stable", avgPISHistory: [], weeklyDelta: 0 }
  }

  const snapshots = await provider.getRecentKPISnapshots("DAILY", days)

  if (snapshots.length < 2) {
    return { trend: "stable", avgPISHistory: [], weeklyDelta: 0 }
  }

  const avgPISHistory = snapshots.map((s) => ({
    date: s.period,
    avgPIS: (s.metrics as Record<string, number>).avgPIS ?? 0,
  }))

  const first = avgPISHistory[0].avgPIS
  const last = avgPISHistory[avgPISHistory.length - 1].avgPIS
  const weeklyDelta = last - first

  let trend: "improving" | "stable" | "declining" = "stable"
  if (weeklyDelta > 0.05) trend = "improving"
  else if (weeklyDelta < -0.05) trend = "declining"

  return { trend, avgPISHistory, weeklyDelta }
}

// ── T292: Arena Bridge — PIS/인터뷰 기반 Arena 자동 트리거 ──

const PIS_CRITICAL_THRESHOLD = 0.6
const PIS_WEEKLY_DECLINE_THRESHOLD = 0.1

/**
 * PIS 기반 Arena 자동 트리거 조건 평가.
 *
 * AC1: PIS < 0.60 → 즉시 Arena
 * AC1: PIS 주간 하락 > 0.10 → 4h 내 Arena
 */
export async function checkArenaTriggered(
  provider: QualityRunnerProvider,
  personaId: string
): Promise<{
  shouldTrigger: boolean
  reason: string
  urgency: "immediate" | "within_4h" | "none"
}> {
  if (!provider.getPersonaPIS) {
    return { shouldTrigger: false, reason: "PIS provider not available", urgency: "none" }
  }

  const pis = await provider.getPersonaPIS(personaId)
  if (pis === null) {
    return { shouldTrigger: false, reason: "No PIS data", urgency: "none" }
  }

  // PIS < 0.60 → 즉시 Arena
  if (pis < PIS_CRITICAL_THRESHOLD) {
    return {
      shouldTrigger: true,
      reason: `PIS CRITICAL: ${pis.toFixed(2)} < ${PIS_CRITICAL_THRESHOLD}`,
      urgency: "immediate",
    }
  }

  // 주간 하락 체크
  const trend = await analyzeKPITrend(provider, 7)
  if (Math.abs(trend.weeklyDelta) > PIS_WEEKLY_DECLINE_THRESHOLD && trend.trend === "declining") {
    return {
      shouldTrigger: true,
      reason: `PIS weekly decline: ${trend.weeklyDelta.toFixed(2)} > -${PIS_WEEKLY_DECLINE_THRESHOLD}`,
      urgency: "within_4h",
    }
  }

  return { shouldTrigger: false, reason: "PIS within acceptable range", urgency: "none" }
}

/**
 * Arena 자동 트리거 + 세션 생성.
 */
export async function triggerArenaIfNeeded(
  provider: QualityRunnerProvider,
  personaId: string
): Promise<{ triggered: boolean; sessionId?: string; reason: string }> {
  const check = await checkArenaTriggered(provider, personaId)

  if (!check.shouldTrigger || !provider.createArenaSession) {
    return { triggered: false, reason: check.reason }
  }

  const session = await provider.createArenaSession(personaId, check.reason)
  console.log(
    `[QualityRunner] Arena triggered for ${personaId}: ${check.reason} (${check.urgency})`
  )

  return { triggered: true, sessionId: session.id, reason: check.reason }
}
