// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Fetch Cron Route (T360)
// GET /api/cron/media-fetch
// 6시간마다 TMDB/KOPIS/알라딘/Last.fm 콘텐츠 자동 수집
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeMediaAutoFetch } from "@/lib/persona-world/media/media-auto-fetch"
import { triggerMediaReactionPosts } from "@/lib/persona-world/media/media-reaction-trigger"
import type { MediaSourceType } from "@/lib/persona-world/media/media-auto-fetch"
import type { MediaItemType, Prisma } from "@/generated/prisma"
import type {
  MediaItemForTrigger,
  PersonaForMediaTrigger,
} from "@/lib/persona-world/media/media-reaction-trigger"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const AUTO_DISABLE_THRESHOLD = 3

export async function GET(request: NextRequest) {
  try {
    // CRON_SECRET 인증 (fail-closed)
    const cronSecret = process.env["CRON_SECRET"]
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

    // 반응 트리거 함수 (cron-scheduler-service 패턴과 동일)
    const reactionRunner = async (item: MediaItemForTrigger): Promise<number> => {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        include: { layerVectors: true },
      })

      const personasForTrigger: PersonaForMediaTrigger[] = personas.flatMap((p) => {
        const l2 = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
        if (!l2) return []
        return [
          {
            id: p.id,
            expertise: p.expertise,
            role: p.role,
            country: p.country ?? "KR",
            languages: p.languages,
            temperament: {
              openness: Number(l2.dim1 ?? 0.5),
              conscientiousness: Number(l2.dim2 ?? 0.5),
              extraversion: Number(l2.dim3 ?? 0.5),
              agreeableness: Number(l2.dim4 ?? 0.5),
              neuroticism: Number(l2.dim5 ?? 0.5),
            },
          },
        ]
      })

      const reactions = await triggerMediaReactionPosts(item, {
        getActivePersonas: async () => personasForTrigger,
        hasReactedToMediaItem: async (personaId, mediaItemId) => {
          const existing = await prisma.personaPost.findFirst({
            where: { personaId, mediaItemId },
          })
          return existing !== null
        },
        scheduleMediaReactionPost: async ({ personaId, mediaItemId, topic, interestScore }) => {
          await prisma.personaPost.create({
            data: {
              personaId,
              mediaItemId,
              type: "REVIEW",
              content: topic, // content-generator에서 실제 포스트 생성 시 대체됨
              trigger: "TRENDING",
              metadata: { interestScore, pendingGeneration: true },
            },
          })
        },
      })

      return reactions.length
    }

    const result = await executeMediaAutoFetch(
      {
        getSourceCount: async () => prisma.mediaSource.count(),
        seedPresets: async (presets) => {
          const created = await prisma.mediaSource.createMany({
            data: presets.map((p) => ({
              name: p.name,
              sourceType: p.sourceType,
              region: p.region,
            })),
            skipDuplicates: true,
          })
          return { added: created.count }
        },
        getActiveSources: async () => {
          const sources = await prisma.mediaSource.findMany({
            where: { isActive: true },
            select: { id: true, name: true, sourceType: true, region: true },
          })
          return sources.map((s) => ({
            id: s.id,
            name: s.name,
            sourceType: s.sourceType as MediaSourceType,
            region: s.region,
          }))
        },
        upsertMediaItem: async (item) => {
          const existing = await prisma.mediaItem.findFirst({
            where: { sourceId: item.sourceId, originalId: item.originalId },
          })
          if (existing) {
            await prisma.mediaItem.update({
              where: { id: existing.id },
              data: {
                importanceScore: item.importanceScore,
                rawData: (item.rawData ?? undefined) as Prisma.InputJsonValue | undefined,
              },
            })
            return { id: existing.id, isNew: false }
          }
          const created = await prisma.mediaItem.create({
            data: {
              sourceId: item.sourceId,
              mediaType: item.mediaType as MediaItemType,
              title: item.title,
              originalId: item.originalId,
              description: item.description ?? null,
              releaseDate: item.releaseDate ?? null,
              venue: item.venue ?? null,
              creator: item.creator ?? null,
              genres: item.genres,
              tags: item.tags,
              region: item.region,
              importanceScore: item.importanceScore,
              rawData: (item.rawData ?? undefined) as Prisma.InputJsonValue | undefined,
            },
          })
          return { id: created.id, isNew: true }
        },
        markSourceSuccess: async (id) => {
          await prisma.mediaSource.update({
            where: { id },
            data: { lastFetchAt: new Date(), consecutiveFailures: 0, lastError: null },
          })
        },
        markSourceFailure: async (id, error) => {
          const src = await prisma.mediaSource.findUnique({ where: { id } })
          const failures = (src?.consecutiveFailures ?? 0) + 1
          await prisma.mediaSource.update({
            where: { id },
            data: { consecutiveFailures: failures, lastError: error },
          })
          if (failures >= AUTO_DISABLE_THRESHOLD) {
            await prisma.mediaSource.update({ where: { id }, data: { isActive: false } })
          }
        },
        disableSource: async (id) => {
          await prisma.mediaSource.update({ where: { id }, data: { isActive: false } })
        },
      },
      reactionRunner
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MEDIA_FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
