// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — UserTrustScore Prisma CRUD (T283)
// 구현계획서 §9.2 — DB 기반 유저 신뢰도 관리
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from "@/generated/prisma"
import {
  type UserTrustState,
  type TrustEvent,
  type InspectionLevel,
  createInitialTrustState,
  applyTrustEvent,
  getInspectionLevel,
} from "./user-trust"

// ── 신뢰도 변화량 상수 ──────────────────────────────────────

const TRUST_DELTAS: Record<string, number> = {
  block: -0.15,
  warn: -0.05,
  report: -0.03,
  dailyRecovery: 0.01,
}

// ── CRUD 함수 ────────────────────────────────────────────────

/**
 * 유저 신뢰도 조회 (없으면 기본값 0.8로 생성).
 *
 * T283 AC1: getUserTrustScore
 */
export async function getUserTrustScore(
  prisma: PrismaClient,
  userId: string
): Promise<UserTrustState> {
  const record = await prisma.userTrustScore.findUnique({
    where: { userId },
  })

  if (!record) {
    // 기본값 레코드 생성
    const defaultScore = 0.8
    const created = await prisma.userTrustScore.create({
      data: {
        userId,
        score: defaultScore,
        inspectionLevel: "HIGH",
      },
    })
    return {
      score: Number(created.score),
      lastUpdatedAt: created.updatedAt,
    }
  }

  return {
    score: Number(record.score),
    lastUpdatedAt: record.updatedAt,
  }
}

/**
 * 유저 신뢰도 이벤트 기반 업데이트.
 *
 * T283 AC2: updateTrustScore
 * - block: -15%
 * - warn: -5%
 * - report: -3%
 * - dailyRecovery: +1%
 */
export async function updateTrustScore(
  prisma: PrismaClient,
  userId: string,
  event: TrustEvent
): Promise<UserTrustState> {
  const current = await getUserTrustScore(prisma, userId)
  const updated = applyTrustEvent(current, event)
  const inspectionLevel = getInspectionLevel(updated.score)

  // 이벤트 종류에 따른 카운터 증가
  const counterUpdate: Record<string, number> = {}
  if (event === "BLOCK_EVENT") {
    counterUpdate.blockCount = { increment: 1 } as unknown as number
  } else if (event === "WARN_EVENT") {
    counterUpdate.warnCount = { increment: 1 } as unknown as number
  } else if (event === "REPORT_RECEIVED" || event === "REPORT_CONFIRMED") {
    counterUpdate.reportCount = { increment: 1 } as unknown as number
  }

  await prisma.userTrustScore.upsert({
    where: { userId },
    update: {
      score: updated.score,
      inspectionLevel: mapInspectionLevel(inspectionLevel),
      ...counterUpdate,
    },
    create: {
      userId,
      score: updated.score,
      inspectionLevel: mapInspectionLevel(inspectionLevel),
    },
  })

  return updated
}

/**
 * 전체 유저 일간 회복 (배치 작업).
 *
 * T283 AC2: dailyRecovery +1% (최대 0.95)
 */
export async function applyDailyRecovery(prisma: PrismaClient): Promise<number> {
  // BLOCKED가 아닌 유저만 회복
  const users = await prisma.userTrustScore.findMany({
    where: {
      inspectionLevel: { not: "BLOCKED" },
      score: { lt: 0.95 },
    },
  })

  let recoveredCount = 0
  for (const user of users) {
    const currentScore = Number(user.score)
    const newScore = Math.min(0.95, currentScore + TRUST_DELTAS.dailyRecovery)
    const inspectionLevel = getInspectionLevel(newScore)

    await prisma.userTrustScore.update({
      where: { id: user.id },
      data: {
        score: newScore,
        inspectionLevel: mapInspectionLevel(inspectionLevel),
      },
    })
    recoveredCount++
  }

  return recoveredCount
}

// ── inspectionLevel 매핑 ────────────────────────────────────

function mapInspectionLevel(level: InspectionLevel): string {
  // DB 스키마의 inspectionLevel은 HIGH/MEDIUM/LOW/BLOCKED
  // user-trust.ts의 InspectionLevel은 BASIC/ENHANCED/DEEP/BLOCKED
  const mapping: Record<InspectionLevel, string> = {
    BASIC: "HIGH",
    ENHANCED: "MEDIUM",
    DEEP: "LOW",
    BLOCKED: "BLOCKED",
  }
  return mapping[level]
}
