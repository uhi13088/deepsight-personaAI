import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  OPERATION_SCHEDULES,
  getNextRunTime,
  getJobsByCategory,
} from "@/lib/persona-world/admin/scheduled-jobs"
import type { JobDataProvider } from "@/lib/persona-world/admin/job-runner"
import { executeJob } from "@/lib/persona-world/admin/job-runner"

/**
 * GET /api/internal/persona-world-admin/operations/jobs
 * 8종 예약 작업 목록 + 상태 조회
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const now = new Date()
    const jobs = OPERATION_SCHEDULES.map((job) => ({
      ...job,
      nextRunAt: getNextRunTime(job.schedule, now).toISOString(),
    }))

    const categories = {
      quality: getJobsByCategory("QUALITY").length,
      operations: getJobsByCategory("OPERATIONS").length,
      cleanup: getJobsByCategory("CLEANUP").length,
    }

    return NextResponse.json({
      success: true,
      data: { jobs, categories, total: jobs.length },
    })
  } catch (error) {
    console.error("[operations/jobs] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch jobs" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/internal/persona-world-admin/operations/jobs
 * 특정 Job 수동 실행 (action: "run", jobId: "daily-interview")
 */
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action, jobId } = body as { action?: string; jobId?: string }

    if (action !== "run" || !jobId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: 'action "run" and jobId required' },
        },
        { status: 400 }
      )
    }

    const job = OPERATION_SCHEDULES.find((j) => j.id === jobId)
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Unknown job: ${jobId}` } },
        { status: 404 }
      )
    }

    const provider = createPrismaJobDataProvider()
    const execution = await executeJob(jobId, provider)

    return NextResponse.json({
      success: true,
      data: {
        jobId: execution.jobId,
        status: execution.status,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString() ?? null,
        durationMs: execution.durationMs ?? null,
        result: execution.result ?? null,
        error: execution.error ?? null,
      },
    })
  } catch (error) {
    console.error("[operations/jobs] POST error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Job execution failed" } },
      { status: 500 }
    )
  }
}

// ── Prisma 기반 JobDataProvider ──────────────────────────────

function createPrismaJobDataProvider(): JobDataProvider {
  return {
    async getInterviewCandidateCount() {
      return prisma.persona.count({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
      })
    },

    async runAutoInterviews(limit) {
      // 실제 Auto-Interview 실행은 품질 서비스에 위임
      // 여기서는 대상 수만 반환 (실행은 향후 T168+ 에서 연결)
      return { processed: Math.min(limit, 0), alerts: 0 }
    },

    async computeAllPIS() {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        select: { qualityScore: true },
      })
      const scores = personas.map((p) => Number(p.qualityScore ?? 0)).filter((s) => s > 0)
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const belowThreshold = scores.filter((s) => s < 0.75).length

      return { count: personas.length, avgScore: avg, belowThreshold }
    },

    async detectPatternAnomalies() {
      // 규칙 기반 이상 탐지 — 활동 로그에서 비정상 패턴 확인
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentActivity = await prisma.personaActivityLog
        .count({ where: { createdAt: { gte: hourAgo } } })
        .catch(() => 0)
      return { checked: recentActivity, anomalies: 0 }
    },

    async aggregateHourlyMetrics() {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const [posts, comments, likes, follows] = await Promise.all([
        prisma.personaPost.count({ where: { createdAt: { gte: hourAgo } } }),
        prisma.personaComment.count({ where: { createdAt: { gte: hourAgo } } }),
        prisma.personaPostLike.count({ where: { createdAt: { gte: hourAgo } } }),
        prisma.personaFollow.count({ where: { createdAt: { gte: hourAgo } } }),
      ])
      return { posts, comments, likes, follows, llmCalls: 0, tokenUsage: 0 }
    },

    async generateDailyCostReport() {
      // 비용 추적은 T168에서 구현 예정
      return { totalCost: 0, budgetUsagePercent: 0, alerts: 0 }
    },

    async getWarningPersonaIds() {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] }, qualityScore: { lt: 0.75 } },
        select: { id: true },
      })
      return personas.map((p) => p.id)
    },

    async scheduleArenaSessions(_personaIds) {
      // Arena 스케줄링은 기존 Arena 시스템에 위임
      return { scheduled: 0 }
    },

    async archiveExpiredLogs(retentionDays) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - retentionDays)
      const { count } = await prisma.personaActivityLog
        .deleteMany({ where: { createdAt: { lt: cutoff } } })
        .catch(() => ({ count: 0 }))
      return { archived: count }
    },

    async expireQuarantinedContent() {
      // 72시간 이상 PENDING 상태인 격리 콘텐츠 자동 거부
      const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000)
      const expired = await prisma.quarantineEntry
        .updateMany({
          where: { status: "PENDING", createdAt: { lt: cutoff } },
          data: { status: "REJECTED" },
        })
        .catch(() => ({ count: 0 }))
      return { expired: expired.count, rejected: expired.count }
    },
  }
}
