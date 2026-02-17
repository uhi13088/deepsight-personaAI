// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Scheduled Jobs (Phase 7-B)
// 운영 설계서 §11.7 — 8종 예약 작업 (cron)
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type JobCategory = "QUALITY" | "OPERATIONS" | "CLEANUP"
export type JobStatus = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED"

export interface ScheduledJob {
  id: string
  name: string
  category: JobCategory
  schedule: string // cron expression
  description: string
  estimatedDuration: string
  estimatedCost: string
}

export interface JobExecution {
  jobId: string
  status: JobStatus
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  result?: JobResult
  error?: string
}

export interface JobResult {
  processedCount: number
  alertsGenerated: number
  details: string
}

// ── 8종 스케줄 정의 ──────────────────────────────────────────

export const OPERATION_SCHEDULES: ScheduledJob[] = [
  // 품질 관련 (3종)
  {
    id: "daily-interview",
    name: "dailyInterview",
    category: "QUALITY",
    schedule: "0 3 * * *", // 매일 새벽 3시
    description: "전체 20% 페르소나 Auto-Interview 실행",
    estimatedDuration: "30분",
    estimatedCost: "~$0.3",
  },
  {
    id: "weekly-pis-report",
    name: "weeklyPISReport",
    category: "QUALITY",
    schedule: "0 9 * * 1", // 매주 월요일 오전 9시
    description: "전체 PIS 계산 + 리포트 생성",
    estimatedDuration: "15분",
    estimatedCost: "~$0.1",
  },
  {
    id: "daily-pattern-analysis",
    name: "dailyPatternAnalysis",
    category: "QUALITY",
    schedule: "0 4 * * *", // 매일 새벽 4시
    description: "인터랙션 패턴 이상 탐지 배치",
    estimatedDuration: "10분",
    estimatedCost: "무료",
  },
  // 운영 관련 (3종)
  {
    id: "hourly-metrics",
    name: "hourlyMetricsAggregation",
    category: "OPERATIONS",
    schedule: "0 * * * *", // 매시간
    description: "활동/비용/보안 메트릭 집계",
    estimatedDuration: "2분",
    estimatedCost: "무료",
  },
  {
    id: "daily-cost-report",
    name: "dailyCostReport",
    category: "OPERATIONS",
    schedule: "0 23 * * *", // 매일 밤 11시
    description: "일일 비용 리포트 + 예산 경고",
    estimatedDuration: "1분",
    estimatedCost: "무료",
  },
  {
    id: "weekly-arena",
    name: "weeklyArenaSchedule",
    category: "OPERATIONS",
    schedule: "0 2 * * 3", // 매주 수요일 새벽 2시
    description: "정기 Arena 세션 예약 (WARNING 이하 페르소나)",
    estimatedDuration: "가변",
    estimatedCost: "가변",
  },
  // 정리 관련 (2종)
  {
    id: "daily-log-cleanup",
    name: "dailyLogCleanup",
    category: "CLEANUP",
    schedule: "0 5 * * *", // 매일 새벽 5시
    description: "보존 기간 초과 로그 아카이빙",
    estimatedDuration: "5분",
    estimatedCost: "무료",
  },
  {
    id: "daily-quarantine-expiry",
    name: "dailyQuarantineExpiry",
    category: "CLEANUP",
    schedule: "0 6 * * *", // 매일 새벽 6시
    description: "만료된 격리 콘텐츠 자동 거부 처리",
    estimatedDuration: "1분",
    estimatedCost: "무료",
  },
]

// ── Job 실행 관리 ──────────────────────────────────────────────

/**
 * Job 실행 시작 기록.
 */
export function startJobExecution(jobId: string): JobExecution {
  return {
    jobId,
    status: "RUNNING",
    startedAt: new Date(),
  }
}

/**
 * Job 실행 완료 기록.
 */
export function completeJobExecution(execution: JobExecution, result: JobResult): JobExecution {
  const now = new Date()
  return {
    ...execution,
    status: "COMPLETED",
    completedAt: now,
    durationMs: now.getTime() - execution.startedAt.getTime(),
    result,
  }
}

/**
 * Job 실행 실패 기록.
 */
export function failJobExecution(execution: JobExecution, error: string): JobExecution {
  const now = new Date()
  return {
    ...execution,
    status: "FAILED",
    completedAt: now,
    durationMs: now.getTime() - execution.startedAt.getTime(),
    error,
  }
}

// ── cron 스케줄 파싱 ──────────────────────────────────────────

/**
 * cron expression에서 다음 실행 시간 계산 (간략 구현).
 * 실제 운영 환경에서는 node-cron 등의 라이브러리 사용.
 */
export function getNextRunTime(schedule: string, from: Date = new Date()): Date {
  const parts = schedule.split(" ")
  if (parts.length !== 5) return from

  const [minute, hour, , , dayOfWeek] = parts

  const next = new Date(from)
  next.setSeconds(0)
  next.setMilliseconds(0)

  // 매시간 (0 * * * *)
  if (hour === "*") {
    next.setMinutes(parseInt(minute))
    if (next <= from) {
      next.setHours(next.getHours() + 1)
    }
    return next
  }

  // 매일 (0 3 * * *)
  if (dayOfWeek === "*") {
    next.setMinutes(parseInt(minute))
    next.setHours(parseInt(hour))
    if (next <= from) {
      next.setDate(next.getDate() + 1)
    }
    return next
  }

  // 매주 특정 요일 (0 9 * * 1)
  const targetDay = parseInt(dayOfWeek)
  next.setMinutes(parseInt(minute))
  next.setHours(parseInt(hour))
  const currentDay = next.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil < 0) daysUntil += 7
  if (daysUntil === 0 && next <= from) daysUntil = 7
  next.setDate(next.getDate() + daysUntil)
  return next
}

// ── Job 조회 ──────────────────────────────────────────────────

/**
 * 카테고리별 Job 조회.
 */
export function getJobsByCategory(category: JobCategory): ScheduledJob[] {
  return OPERATION_SCHEDULES.filter((j) => j.category === category)
}

/**
 * 현재 실행해야 할 Job 조회.
 */
export function shouldRunNow(job: ScheduledJob, now: Date = new Date()): boolean {
  const parts = job.schedule.split(" ")
  if (parts.length !== 5) return false

  const [cronMin, cronHour, , , cronDow] = parts
  const currentMin = now.getMinutes()
  const currentHour = now.getHours()
  const currentDow = now.getDay()

  const minMatch = cronMin === "*" || parseInt(cronMin) === currentMin
  const hourMatch = cronHour === "*" || parseInt(cronHour) === currentHour
  const dowMatch = cronDow === "*" || parseInt(cronDow) === currentDow

  return minMatch && hourMatch && dowMatch
}

/**
 * Job 실행 이력 요약.
 */
export interface JobExecutionSummary {
  totalRuns: number
  successCount: number
  failureCount: number
  averageDurationMs: number
  lastRun?: JobExecution
}

export function summarizeExecutions(executions: JobExecution[]): JobExecutionSummary {
  if (executions.length === 0) {
    return { totalRuns: 0, successCount: 0, failureCount: 0, averageDurationMs: 0 }
  }

  const completed = executions.filter((e) => e.status === "COMPLETED")
  const failed = executions.filter((e) => e.status === "FAILED")
  const durations = executions.filter((e) => e.durationMs !== undefined).map((e) => e.durationMs!)

  return {
    totalRuns: executions.length,
    successCount: completed.length,
    failureCount: failed.length,
    averageDurationMs:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    lastRun: executions[executions.length - 1],
  }
}
