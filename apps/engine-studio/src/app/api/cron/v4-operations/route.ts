import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { aggregateAndSaveDailyCostReport } from "@/lib/persona-world/cost/cost-runner"
import type { CostRunnerProvider } from "@/lib/persona-world/cost/cost-runner"
import { applyDailyRecovery } from "@/lib/persona-world/security/trust-score-crud"
import { runAsyncAnalysis } from "@/lib/persona-world/moderation/moderation-runner"
import type { AsyncAnalysisProvider } from "@/lib/persona-world/moderation/moderation-runner"
import {
  runInteractionPatternCheck,
  savePISSnapshot,
} from "@/lib/persona-world/quality/quality-runner"
import type { QualityRunnerProvider } from "@/lib/persona-world/quality/quality-runner"
import type { InteractionPatternLog } from "@/lib/persona-world/quality/quality-logger"
import { Prisma } from "@/generated/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * GET /api/cron/v4-operations
 *
 * v4.0 일일 운영 배치 작업 (T315~T320):
 * 1. DailyCostReport 집계 (T315)
 * 2. Trust Score 일일 회복 (T316)
 * 3. 비동기 모더레이션 Stage 3 (T317)
 * 4. 인터랙션 패턴 분석 (T318)
 * 5. PIS 스냅샷 저장 (T319)
 * 6. 관계 감쇠 (T320)
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "CRON_SECRET not configured" } },
        { status: 500 }
      )
    }
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      )
    }

    const results: Record<string, unknown> = {}

    // ── T315: DailyCostReport 집계 ──────────────────────────────
    try {
      const costProvider = createCostRunnerProvider()
      const costResult = await aggregateAndSaveDailyCostReport(costProvider)
      results.dailyCostReport = { success: true, ...costResult }
    } catch (err) {
      console.error("[v4-operations] DailyCostReport failed:", err)
      results.dailyCostReport = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── T316: Trust Score 일일 회복 ─────────────────────────────
    try {
      const recoveredCount = await applyDailyRecovery(prisma)
      results.trustRecovery = { success: true, recoveredCount }
    } catch (err) {
      console.error("[v4-operations] Trust recovery failed:", err)
      results.trustRecovery = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── T317: 비동기 모더레이션 Stage 3 ─────────────────────────
    try {
      const moderationProvider = createAsyncAnalysisProvider()
      const moderationResults = await runAsyncAnalysis(moderationProvider, 24)
      const flagged = moderationResults.filter((r) => r.flagged)
      results.asyncModeration = {
        success: true,
        analyzed: moderationResults.length,
        flagged: flagged.length,
      }
    } catch (err) {
      console.error("[v4-operations] Async moderation failed:", err)
      results.asyncModeration = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── T318: 인터랙션 패턴 분석 ───────────────────────────────
    let patternLogs: InteractionPatternLog[] = []
    try {
      const qualityProvider = createQualityRunnerProvider()
      patternLogs = await runInteractionPatternCheck(qualityProvider, "DAILY")
      const anomalous = patternLogs.filter((l) => l.anomalies.length > 0)
      results.interactionPatterns = {
        success: true,
        analyzed: patternLogs.length,
        anomalous: anomalous.length,
      }
    } catch (err) {
      console.error("[v4-operations] Interaction pattern check failed:", err)
      results.interactionPatterns = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── T319: PIS 스냅샷 저장 ──────────────────────────────────
    try {
      const qualityProvider = createQualityRunnerProvider()
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        select: { id: true, qualityScore: true },
      })
      const personaScores = personas.map((p) => ({
        personaId: p.id,
        pis: Number(p.qualityScore ?? 0.8),
      }))
      await savePISSnapshot(qualityProvider, personaScores)
      results.pisSnapshot = { success: true, personas: personaScores.length }
    } catch (err) {
      console.error("[v4-operations] PIS snapshot failed:", err)
      results.pisSnapshot = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    // ── T320: 관계 감쇠 ────────────────────────────────────────
    try {
      const decayResult = await applyRelationshipDecay()
      results.relationshipDecay = { success: true, ...decayResult }
    } catch (err) {
      console.error("[v4-operations] Relationship decay failed:", err)
      results.relationshipDecay = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown",
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        executedAt: new Date().toISOString(),
        results,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "CRON_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── T315: CostRunnerProvider ────────────────────────────────────

function createCostRunnerProvider(): CostRunnerProvider {
  return {
    async aggregateDailyUsage(date: Date) {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const logs = await prisma.llmUsageLog.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        select: {
          callType: true,
          estimatedCostUsd: true,
          inputTokens: true,
          cacheReadInputTokens: true,
        },
      })

      let postingCost = 0,
        commentCost = 0,
        interviewCost = 0,
        arenaCost = 0,
        otherCost = 0
      let totalInputTokens = 0,
        totalCachedTokens = 0

      for (const log of logs) {
        const cost = Number(log.estimatedCostUsd)
        const ct = log.callType.toLowerCase()
        if (ct === "post") postingCost += cost
        else if (ct === "comment") commentCost += cost
        else if (ct === "interview" || ct === "test-generate") interviewCost += cost
        else if (ct === "arena" || ct === "judge") arenaCost += cost
        else otherCost += cost
        totalInputTokens += log.inputTokens
        totalCachedTokens += log.cacheReadInputTokens ?? 0
      }

      return {
        totalCost:
          Math.round((postingCost + commentCost + interviewCost + arenaCost + otherCost) * 10000) /
          10000,
        postingCost: Math.round(postingCost * 10000) / 10000,
        commentCost: Math.round(commentCost * 10000) / 10000,
        interviewCost: Math.round(interviewCost * 10000) / 10000,
        arenaCost: Math.round(arenaCost * 10000) / 10000,
        otherCost: Math.round(otherCost * 10000) / 10000,
        llmCalls: logs.length,
        cacheHitRate:
          totalInputTokens > 0 ? Math.round((totalCachedTokens / totalInputTokens) * 100) / 100 : 0,
      }
    },

    async saveDailyCostReport(params) {
      const report = await prisma.dailyCostReport.upsert({
        where: { date: params.date },
        update: {
          totalCost: params.totalCost,
          postingCost: params.postingCost,
          commentCost: params.commentCost,
          interviewCost: params.interviewCost,
          arenaCost: params.arenaCost,
          otherCost: params.otherCost,
          llmCalls: params.llmCalls,
          cacheHitRate: params.cacheHitRate,
        },
        create: {
          date: params.date,
          totalCost: params.totalCost,
          postingCost: params.postingCost,
          commentCost: params.commentCost,
          interviewCost: params.interviewCost,
          arenaCost: params.arenaCost,
          otherCost: params.otherCost,
          llmCalls: params.llmCalls,
          cacheHitRate: params.cacheHitRate,
        },
      })
      return { id: report.id }
    },

    async getMonthlyDailyReports(monthStart, monthEnd) {
      const reports = await prisma.dailyCostReport.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        orderBy: { date: "asc" },
      })
      return reports.map((r) => ({
        date: r.date,
        totalCost: Number(r.totalCost),
        postingCost: Number(r.postingCost),
        commentCost: Number(r.commentCost),
        interviewCost: Number(r.interviewCost),
        arenaCost: Number(r.arenaCost),
        otherCost: Number(r.otherCost),
        llmCalls: r.llmCalls,
        cacheHitRate: r.cacheHitRate !== null ? Number(r.cacheHitRate) : null,
      }))
    },

    async getBudgetConfig() {
      const config = await prisma.budgetConfig
        .findUnique({ where: { id: "singleton" } })
        .catch(() => null)
      if (!config) {
        return {
          id: "singleton",
          dailyBudget: 50,
          monthlyBudget: 1000,
          costMode: "BALANCE" as const,
          alertThresholds: null,
          autoActions: null,
          updatedAt: new Date(),
          updatedBy: null,
        }
      }
      return {
        id: config.id,
        dailyBudget: Number(config.dailyBudget),
        monthlyBudget: Number(config.monthlyBudget),
        costMode: config.costMode as "QUALITY" | "BALANCE" | "COST_PRIORITY",
        alertThresholds: config.alertThresholds as {
          info: number
          warning: number
          critical: number
          emergency: number
        } | null,
        autoActions: config.autoActions as Record<string, unknown> | null,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      }
    },

    async updateBudgetConfig() {
      // Not used in cron context
      return this.getBudgetConfig()
    },

    async getMonthlySpending() {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const result = await prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { estimatedCostUsd: true },
      })
      return Number(result._sum.estimatedCostUsd ?? 0)
    },

    async getDailySpending() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const result = await prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { estimatedCostUsd: true },
      })
      return Number(result._sum.estimatedCostUsd ?? 0)
    },
  }
}

// ── T317: AsyncAnalysisProvider ─────────────────────────────────

function createAsyncAnalysisProvider(): AsyncAnalysisProvider {
  return {
    async getRecentContents(hours) {
      const since = new Date()
      since.setHours(since.getHours() - hours)

      const [posts, comments] = await Promise.all([
        prisma.personaPost.findMany({
          where: { createdAt: { gte: since }, isHidden: false },
          select: { id: true, personaId: true, content: true, createdAt: true },
          take: 500,
        }),
        prisma.personaComment.findMany({
          where: { createdAt: { gte: since }, isHidden: false, personaId: { not: null } },
          select: { id: true, personaId: true, content: true, createdAt: true },
          take: 500,
        }),
      ])

      return [
        ...posts.map((p) => ({
          id: p.id,
          type: "POST" as const,
          personaId: p.personaId,
          content: p.content,
          createdAt: p.createdAt,
        })),
        ...comments
          .filter((c): c is typeof c & { personaId: string } => c.personaId !== null)
          .map((c) => ({
            id: c.id,
            type: "COMMENT" as const,
            personaId: c.personaId,
            content: c.content,
            createdAt: c.createdAt,
          })),
      ]
    },

    async getEngagementRates(personaId) {
      const posts = await prisma.personaPost.findMany({
        where: { personaId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { likeCount: true, commentCount: true, repostCount: true },
      })
      return posts.map((p) => p.likeCount + p.commentCount + (p.repostCount ?? 0))
    },

    async getToneHistory(personaId) {
      const comments = await prisma.personaComment.findMany({
        where: { personaId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { tone: true },
      })
      return comments.map((c) => c.tone ?? "neutral")
    },

    async getAvgEngagement(personaId) {
      const result = await prisma.personaPost.aggregate({
        where: { personaId },
        _avg: { likeCount: true },
      })
      return result._avg.likeCount ?? 0
    },

    async saveModerationLog(params) {
      await prisma.moderationLog.create({
        data: {
          contentType: params.contentType,
          contentId: params.contentId,
          personaId: params.personaId ?? null,
          stage: params.stage,
          verdict: params.verdict,
          violations: (params.violations as Prisma.InputJsonValue) ?? undefined,
        },
      })
    },
  }
}

// ── T318: QualityRunnerProvider ─────────────────────────────────

function createQualityRunnerProvider(): QualityRunnerProvider {
  return {
    async getActivityStats(personaId, _period) {
      const since = new Date()
      since.setDate(since.getDate() - 1) // DAILY

      const [posts, comments, likes, follows, reposts] = await Promise.all([
        prisma.personaPost.count({ where: { personaId, createdAt: { gte: since } } }),
        prisma.personaComment.count({ where: { personaId, createdAt: { gte: since } } }),
        prisma.personaPostLike.count({ where: { personaId, createdAt: { gte: since } } }),
        prisma.personaFollow.count({
          where: { followerPersonaId: personaId, createdAt: { gte: since } },
        }),
        prisma.personaRepost.count({ where: { personaId, createdAt: { gte: since } } }),
      ])

      return {
        postsCreated: posts,
        commentsWritten: comments,
        likesGiven: likes,
        followsInitiated: follows,
        repostsShared: reposts,
      }
    },

    async getPersonaEnergy(personaId) {
      const state = await prisma.personaState.findUnique({
        where: { personaId },
        select: { energy: true },
      })
      return Number(state?.energy ?? 1.0)
    },

    async getActivityPatterns(personaId, _period) {
      const since = new Date()
      since.setDate(since.getDate() - 1)

      const activities = await prisma.personaActivityLog.findMany({
        where: { personaId, createdAt: { gte: since } },
        select: { createdAt: true, activityType: true },
      })

      const activeHours = [...new Set(activities.map((a) => a.createdAt.getHours()))]

      // 평균 간격 계산
      let avgInterval = 60
      if (activities.length > 1) {
        const sorted = activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        let totalGap = 0
        for (let i = 1; i < sorted.length; i++) {
          totalGap += sorted[i].createdAt.getTime() - sorted[i - 1].createdAt.getTime()
        }
        avgInterval = totalGap / (sorted.length - 1) / 60000 // minutes
      }

      // 주제/대상 다양성 (간단한 근사)
      const types = new Set(activities.map((a) => a.activityType))

      return {
        activeHours,
        avgIntervalMinutes: Math.round(avgInterval),
        targetDiversity: Math.min(1, types.size / 5),
        topicDiversity: Math.min(1, types.size / 5),
        energyCorrelation: 0.5, // placeholder
      }
    },

    async saveKPISnapshot(params) {
      await prisma.kPISnapshot.create({
        data: {
          snapshotType: params.snapshotType,
          metrics: params.metrics as Prisma.InputJsonValue,
          period: params.period,
        },
      })
    },

    async getActivePersonaIds() {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        select: { id: true },
      })
      return personas.map((p) => p.id)
    },

    async getPersonaPIS(personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: { qualityScore: true },
      })
      return persona ? Number(persona.qualityScore ?? 0.8) : null
    },

    async getRecentKPISnapshots(snapshotType, limit) {
      const snapshots = await prisma.kPISnapshot.findMany({
        where: { snapshotType },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return snapshots.map((s) => ({
        metrics: s.metrics as Record<string, unknown>,
        period: s.period,
        createdAt: s.createdAt,
      }))
    },
  }
}

// ── T320: 관계 감쇠 ────────────────────────────────────────────

/**
 * 관계 감쇠: 장기간 상호작용 없는 관계의 warmth/frequency 감소.
 *
 * 7일 이상 상호작용 없으면 warmth × 0.99, frequency × 0.98 감쇠.
 */
async function applyRelationshipDecay(): Promise<{ updated: number }> {
  const decayThreshold = new Date()
  decayThreshold.setDate(decayThreshold.getDate() - 7) // 7일 비활동

  // lastInteractionAt이 null이거나 7일 이전인 관계
  const staleRelationships = await prisma.personaRelationship.findMany({
    where: {
      OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: decayThreshold } }],
    },
    select: { id: true, warmth: true, frequency: true },
    take: 1000,
  })

  let updated = 0
  for (const rel of staleRelationships) {
    const currentWarmth = Number(rel.warmth)
    const currentFrequency = Number(rel.frequency)

    // 이미 거의 0이면 스킵
    if (currentWarmth < 0.01 && currentFrequency < 0.01) continue

    await prisma.personaRelationship.update({
      where: { id: rel.id },
      data: {
        warmth: Math.max(0, currentWarmth * 0.99),
        frequency: Math.max(0, currentFrequency * 0.98),
      },
    })
    updated++
  }

  return { updated }
}
