// ═══════════════════════════════════════════════════════════════
// 인큐베이터 배치 실행 — 공유 로직 (POST route + cron 공용)
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import { executePersonaGenerationPipeline } from "@/lib/persona-generation/pipeline"

export interface BatchRunResult {
  batchId: string
  message: string
  generated: number
  passed: number
  failed: number
  errors: number
  userRequestsProcessed: number
  durationMs: number
  skipped: boolean
  results: Array<{
    personaId: string
    name: string
    archetypeId: string | null
    paradoxScore: number
    status: string
    failReason: string | null
    source: "user_request" | "auto"
  }>
}

function computeFailReason(
  dimensionality: number,
  paradoxScore: number,
  passThreshold: number
): string {
  const reasons: string[] = []
  if (paradoxScore < 0.15) {
    reasons.push(`모순 점수 과소 (${paradoxScore.toFixed(3)})`)
  } else if (paradoxScore > 0.6) {
    reasons.push(`모순 점수 과다 (${paradoxScore.toFixed(3)})`)
  }
  const gap = passThreshold - dimensionality
  if (gap > 0.3) {
    reasons.push(`차원성 크게 미달 (${dimensionality.toFixed(3)} < ${passThreshold})`)
  } else if (gap > 0) {
    reasons.push(`차원성 미달 (${dimensionality.toFixed(3)} < ${passThreshold})`)
  }
  return reasons.length > 0 ? reasons.join(", ") : `품질 미달 (${dimensionality.toFixed(3)})`
}

export async function runIncubatorBatch({
  dailyLimit,
  passThreshold,
  batchIdPrefix = "batch",
}: {
  dailyLimit: number
  passThreshold: number
  batchIdPrefix?: string
}): Promise<BatchRunResult> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 오늘 이미 생성된 수 확인 → 잔여 슬롯 계산
  const todayGeneratedCount = await prisma.incubatorLog
    .count({ where: { batchDate: { gte: todayStart } } })
    .catch(() => 0)

  const effectiveLimit = Math.max(0, dailyLimit - todayGeneratedCount)

  if (effectiveLimit === 0) {
    return {
      batchId: `${batchIdPrefix}-skip-${Date.now()}`,
      message: `오늘 일일 생성 한도(${dailyLimit}개)에 이미 도달했습니다. (오늘 생성: ${todayGeneratedCount}개)`,
      generated: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      userRequestsProcessed: 0,
      durationMs: 0,
      skipped: true,
      results: [],
    }
  }

  const batchId = `${batchIdPrefix}-${Date.now()}`
  const startTime = Date.now()
  const results: BatchRunResult["results"] = []
  const errors: string[] = []

  // ── Phase 1: 사용자 페르소나 생성 요청 처리 (우선) ──────
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const pendingRequests = await prisma.personaGenerationRequest
    .findMany({
      where: {
        status: { in: ["PENDING", "SCHEDULED"] },
        scheduledDate: { lte: todayEnd },
      },
      orderBy: { createdAt: "asc" },
      take: effectiveLimit,
    })
    .catch(() => [])

  let userRequestsProcessed = 0

  for (const req of pendingRequests) {
    if (userRequestsProcessed >= effectiveLimit) break

    try {
      await prisma.personaGenerationRequest.update({
        where: { id: req.id },
        data: { status: "GENERATING" },
      })

      const generated = await executePersonaGenerationPipeline({ status: "DRAFT" })

      const p = generated.paradoxScore
      const dimensionality = Math.exp(-((p - 0.35) ** 2) / (2 * 0.2 ** 2))
      const passed = dimensionality >= passThreshold
      const status = passed ? "PASSED" : "FAILED"
      const failReason = passed ? null : computeFailReason(dimensionality, p, passThreshold)

      results.push({
        personaId: generated.id,
        name: generated.name,
        archetypeId: generated.archetypeId,
        paradoxScore: generated.paradoxScore,
        status,
        failReason,
        source: "user_request",
      })

      if (passed) {
        await prisma.persona.update({
          where: { id: generated.id },
          data: { status: "ACTIVE", source: "USER_REQUEST" },
        })
        await prisma.personaGenerationRequest.update({
          where: { id: req.id },
          data: {
            status: "COMPLETED",
            generatedPersonaId: generated.id,
            completedAt: new Date(),
          },
        })
      } else {
        await prisma.personaGenerationRequest.update({
          where: { id: req.id },
          data: {
            status: "FAILED",
            failReason: failReason ?? `품질 미달 (dimensionality: ${dimensionality.toFixed(3)})`,
            completedAt: new Date(),
          },
        })
      }

      await prisma.incubatorLog.create({
        data: {
          batchId,
          batchDate: new Date(),
          personaConfig: { archetypeId: generated.archetypeId, userRequestId: req.id },
          generatedPrompt: generated.name,
          testSampleIds: [],
          consistencyScore: dimensionality,
          vectorAlignmentScore: dimensionality,
          toneMatchScore: p,
          reasoningQualityScore: dimensionality,
          status,
          failReason,
        },
      })

      userRequestsProcessed++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Request ${req.id} error`)
      await prisma.personaGenerationRequest
        .update({
          where: { id: req.id },
          data: { status: "FAILED", failReason: "생성 오류", completedAt: new Date() },
        })
        .catch(() => {})
    }
  }

  // ── Phase 2: 남은 슬롯에 자동 생성 ────────────────────
  const remainingSlots = effectiveLimit - userRequestsProcessed

  for (let i = 0; i < remainingSlots; i++) {
    try {
      const generated = await executePersonaGenerationPipeline({ status: "DRAFT" })

      const p = generated.paradoxScore
      const dimensionality = Math.exp(-((p - 0.35) ** 2) / (2 * 0.2 ** 2))
      const passed = dimensionality >= passThreshold
      const status = passed ? "PASSED" : "FAILED"
      const failReason = passed ? null : computeFailReason(dimensionality, p, passThreshold)

      results.push({
        personaId: generated.id,
        name: generated.name,
        archetypeId: generated.archetypeId,
        paradoxScore: generated.paradoxScore,
        status,
        failReason,
        source: "auto",
      })

      if (passed) {
        await prisma.persona.update({
          where: { id: generated.id },
          data: { status: "ACTIVE" },
        })
      }

      await prisma.incubatorLog.create({
        data: {
          batchId,
          batchDate: new Date(),
          personaConfig: { archetypeId: generated.archetypeId },
          generatedPrompt: generated.name,
          testSampleIds: [],
          consistencyScore: dimensionality,
          vectorAlignmentScore: dimensionality,
          toneMatchScore: p,
          reasoningQualityScore: dimensionality,
          status,
          failReason,
        },
      })
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Slot ${i} error`)
    }
  }

  const passedCount = results.filter((r) => r.status === "PASSED").length
  const failedCount = results.filter((r) => r.status === "FAILED").length

  return {
    batchId,
    message: `배치 완료: ${results.length}개 생성 (사용자 요청 ${userRequestsProcessed}건 처리), ${passedCount}개 합격, ${failedCount}개 불합격`,
    generated: results.length,
    passed: passedCount,
    failed: failedCount,
    errors: errors.length,
    userRequestsProcessed,
    durationMs: Date.now() - startTime,
    skipped: false,
    results,
  }
}
