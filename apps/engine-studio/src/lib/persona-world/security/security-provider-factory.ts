// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — SecurityMiddlewareProvider Prisma Factory (T321)
// 구현계획서 §9.1 — 보안 미들웨어 DI 프로바이더 구현
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from "@/generated/prisma"
import { Prisma } from "@/generated/prisma"
import type { SecurityMiddlewareProvider } from "./security-middleware"
import type { UserTrustState } from "./user-trust"
import { getInspectionLevel } from "./user-trust"

/**
 * SecurityMiddlewareProvider Prisma 구현 팩토리.
 *
 * UserTrustScore, PWQuarantineEntry, ModerationLog CRUD 제공.
 */
export function createSecurityMiddlewareProvider(prisma: PrismaClient): SecurityMiddlewareProvider {
  return {
    async getUserTrustScore(userId: string): Promise<UserTrustState> {
      const record = await prisma.userTrustScore.findUnique({ where: { userId } }).catch(() => null)

      if (!record) {
        return { score: 0.8, lastUpdatedAt: new Date() }
      }

      return {
        score: Number(record.score),
        lastUpdatedAt: record.updatedAt,
      }
    },

    async updateUserTrustScore(userId: string, trustState: UserTrustState): Promise<void> {
      const inspectionLevel = getInspectionLevel(trustState.score)

      await prisma.userTrustScore.upsert({
        where: { userId },
        update: {
          score: trustState.score,
          inspectionLevel,
        },
        create: {
          userId,
          score: trustState.score,
          inspectionLevel,
        },
      })
    },

    async createQuarantineEntry(params) {
      const entry = await prisma.pWQuarantineEntry.create({
        data: {
          contentType: params.contentType,
          contentId: params.contentId,
          personaId: params.personaId,
          reason: params.reason,
          severity: params.severity,
          expiresAt: params.expiresAt,
        },
      })
      return { id: entry.id }
    },

    async saveModerationLog(params) {
      await prisma.moderationLog.create({
        data: {
          contentType: params.contentType,
          contentId: params.contentId,
          personaId: params.personaId ?? null,
          stage: params.stage,
          verdict: params.verdict,
          violations:
            params.violations != null ? (params.violations as Prisma.InputJsonValue) : undefined,
          processingTimeMs: params.processingTimeMs ?? null,
        },
      })
    },
  }
}
