// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Job Runner (Phase 7-B)
// 8종 예약 작업의 실제 실행 로직 (DI 기반)
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from "./scheduled-jobs"
import { startJobExecution, completeJobExecution, failJobExecution } from "./scheduled-jobs"
import type { JobExecution } from "./scheduled-jobs"

// ── DI Provider ──────────────────────────────────────────────

export interface JobDataProvider {
  // 품질 관련
  getInterviewCandidateCount(): Promise<number>
  runAutoInterviews(limit: number): Promise<{ processed: number; alerts: number }>
  computeAllPIS(): Promise<{ count: number; avgScore: number; belowThreshold: number }>
  detectPatternAnomalies(): Promise<{ checked: number; anomalies: number }>

  // 운영 관련
  aggregateHourlyMetrics(): Promise<{
    posts: number
    comments: number
    likes: number
    follows: number
    llmCalls: number
    tokenUsage: number
  }>
  generateDailyCostReport(): Promise<{
    totalCost: number
    budgetUsagePercent: number
    alerts: number
  }>
  getWarningPersonaIds(): Promise<string[]>
  scheduleArenaSessions(personaIds: string[]): Promise<{ scheduled: number }>

  // 정리 관련
  archiveExpiredLogs(retentionDays: number): Promise<{ archived: number }>
  expireQuarantinedContent(): Promise<{ expired: number; rejected: number }>
}

// ── Job 실행 함수 (8종) ──────────────────────────────────────

/**
 * 매일 새벽 3시 — 전체 20% 페르소나 Auto-Interview
 */
export async function runDailyInterview(provider: JobDataProvider): Promise<JobResult> {
  const candidateCount = await provider.getInterviewCandidateCount()
  const limit = Math.max(1, Math.ceil(candidateCount * 0.2))
  const { processed, alerts } = await provider.runAutoInterviews(limit)

  return {
    processedCount: processed,
    alertsGenerated: alerts,
    details: `${candidateCount}개 중 ${processed}개 페르소나 인터뷰 완료 (알림 ${alerts}건)`,
  }
}

/**
 * 매주 월요일 오전 9시 — 전체 PIS 계산 + 리포트
 */
export async function runWeeklyPISReport(provider: JobDataProvider): Promise<JobResult> {
  const { count, avgScore, belowThreshold } = await provider.computeAllPIS()

  return {
    processedCount: count,
    alertsGenerated: belowThreshold,
    details: `${count}개 페르소나 PIS 계산 (평균 ${avgScore.toFixed(2)}, 임계 미달 ${belowThreshold}건)`,
  }
}

/**
 * 매일 새벽 4시 — 인터랙션 패턴 이상 탐지
 */
export async function runDailyPatternAnalysis(provider: JobDataProvider): Promise<JobResult> {
  const { checked, anomalies } = await provider.detectPatternAnomalies()

  return {
    processedCount: checked,
    alertsGenerated: anomalies,
    details: `${checked}개 패턴 검사, ${anomalies}건 이상 탐지`,
  }
}

/**
 * 매시간 — 활동/비용/보안 메트릭 집계
 */
export async function runHourlyMetrics(provider: JobDataProvider): Promise<JobResult> {
  const metrics = await provider.aggregateHourlyMetrics()
  const total = metrics.posts + metrics.comments + metrics.likes + metrics.follows

  return {
    processedCount: total,
    alertsGenerated: 0,
    details: `메트릭 집계: P${metrics.posts} C${metrics.comments} L${metrics.likes} F${metrics.follows} LLM${metrics.llmCalls}`,
  }
}

/**
 * 매일 밤 11시 — 일일 비용 리포트 + 예산 경고
 */
export async function runDailyCostReport(provider: JobDataProvider): Promise<JobResult> {
  const { totalCost, budgetUsagePercent, alerts } = await provider.generateDailyCostReport()

  return {
    processedCount: 1,
    alertsGenerated: alerts,
    details: `일일 비용 $${totalCost.toFixed(2)} (예산 대비 ${budgetUsagePercent.toFixed(1)}%)`,
  }
}

/**
 * 매주 수요일 새벽 2시 — WARNING 이하 페르소나 Arena 세션 예약
 */
export async function runWeeklyArena(provider: JobDataProvider): Promise<JobResult> {
  const personaIds = await provider.getWarningPersonaIds()
  if (personaIds.length === 0) {
    return {
      processedCount: 0,
      alertsGenerated: 0,
      details: "WARNING 이하 페르소나 없음 — Arena 세션 예약 불필요",
    }
  }

  const { scheduled } = await provider.scheduleArenaSessions(personaIds)

  return {
    processedCount: scheduled,
    alertsGenerated: 0,
    details: `${personaIds.length}개 대상 중 ${scheduled}개 Arena 세션 예약`,
  }
}

/**
 * 매일 새벽 5시 — 보존 기간 초과 로그 아카이빙
 */
export async function runDailyLogCleanup(provider: JobDataProvider): Promise<JobResult> {
  const RETENTION_DAYS = 90
  const { archived } = await provider.archiveExpiredLogs(RETENTION_DAYS)

  return {
    processedCount: archived,
    alertsGenerated: 0,
    details: `${RETENTION_DAYS}일 초과 로그 ${archived}건 아카이빙`,
  }
}

/**
 * 매일 새벽 6시 — 만료된 격리 콘텐츠 자동 거부
 */
export async function runDailyQuarantineExpiry(provider: JobDataProvider): Promise<JobResult> {
  const { expired, rejected } = await provider.expireQuarantinedContent()

  return {
    processedCount: expired,
    alertsGenerated: rejected,
    details: `${expired}건 만료 처리, ${rejected}건 자동 거부`,
  }
}

// ── Job ID → 실행 함수 매핑 ──────────────────────────────────

const JOB_RUNNERS: Record<string, (provider: JobDataProvider) => Promise<JobResult>> = {
  "daily-interview": runDailyInterview,
  "weekly-pis-report": runWeeklyPISReport,
  "daily-pattern-analysis": runDailyPatternAnalysis,
  "hourly-metrics": runHourlyMetrics,
  "daily-cost-report": runDailyCostReport,
  "weekly-arena": runWeeklyArena,
  "daily-log-cleanup": runDailyLogCleanup,
  "daily-quarantine-expiry": runDailyQuarantineExpiry,
}

/**
 * 단일 Job 실행 (ID 기반).
 */
export async function executeJob(jobId: string, provider: JobDataProvider): Promise<JobExecution> {
  const runner = JOB_RUNNERS[jobId]
  if (!runner) {
    return failJobExecution(startJobExecution(jobId), `Unknown job: ${jobId}`)
  }

  const execution = startJobExecution(jobId)
  try {
    const result = await runner(provider)
    return completeJobExecution(execution, result)
  } catch (error) {
    return failJobExecution(
      execution,
      error instanceof Error ? error.message : "Job execution failed"
    )
  }
}

/**
 * 현재 실행 가능한 모든 Job을 배치 실행.
 */
export async function executeDueJobs(
  provider: JobDataProvider,
  now: Date = new Date()
): Promise<JobExecution[]> {
  const { OPERATION_SCHEDULES, shouldRunNow } = await import("./scheduled-jobs")
  const dueJobs = OPERATION_SCHEDULES.filter((job) => shouldRunNow(job, now))
  const results: JobExecution[] = []

  for (const job of dueJobs) {
    const execution = await executeJob(job.id, provider)
    results.push(execution)
  }

  return results
}
