// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Admin API (T359)
// GET  /api/internal/persona-world-admin/media — 소스 목록 + 최근 아이템
// POST /api/internal/persona-world-admin/media — 소스 추가 | 수동 수집 | 프리셋
// PUT  /api/internal/persona-world-admin/media — 소스 활성화/비활성화
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  executeMediaAutoFetch,
  PRESET_MEDIA_SOURCES,
} from "@/lib/persona-world/media/media-auto-fetch"
import type { MediaSourceType } from "@/lib/persona-world/media/media-auto-fetch"
import type { MediaItemType, Prisma } from "@/generated/prisma"

/** 연속 실패 자동 비활성화 임계치 */
const AUTO_DISABLE_THRESHOLD = 3

// ── GET: 소스 목록 + 최근 미디어 아이템 ──────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const [sources, recentItems] = await Promise.all([
      prisma.mediaSource.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      }),
      prisma.mediaItem.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          mediaType: true,
          creator: true,
          venue: true,
          region: true,
          importanceScore: true,
          releaseDate: true,
          sourceId: true,
          createdAt: true,
          _count: { select: { reactingPosts: true } },
        },
      }),
    ])

    // 등록되지 않은 프리셋 목록
    const registeredTypes = new Set(sources.map((s) => s.sourceType))
    const availablePresets = PRESET_MEDIA_SOURCES.filter(
      (p) => !registeredTypes.has(p.sourceType as MediaSourceType)
    )

    return NextResponse.json({
      success: true,
      data: {
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          sourceType: s.sourceType,
          region: s.region,
          isActive: s.isActive,
          lastFetchAt: s.lastFetchAt?.toISOString() ?? null,
          consecutiveFailures: s.consecutiveFailures,
          lastError: s.lastError,
          itemCount: s._count.items,
        })),
        presets: availablePresets,
        recentItems: recentItems.map((item) => ({
          id: item.id,
          title: item.title,
          mediaType: item.mediaType,
          creator: item.creator,
          venue: item.venue,
          region: item.region,
          importanceScore: Number(item.importanceScore),
          releaseDate: item.releaseDate?.toISOString() ?? null,
          sourceId: item.sourceId,
          reactionCount: item._count.reactingPosts,
          createdAt: item.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MEDIA_READ_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── POST: 소스 추가 | 수동 수집 | 프리셋 등록 ─────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      // 신규 소스 수동 등록
      case "add_source": {
        const {
          name,
          sourceType,
          region = "KR",
        } = body as {
          action: string
          name: string
          sourceType: MediaSourceType
          region?: string
        }

        if (!name?.trim() || !sourceType) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "MISSING_PARAM", message: "name, sourceType required" },
            },
            { status: 400 }
          )
        }

        const source = await prisma.mediaSource.create({
          data: { name: name.trim(), sourceType, region },
        })

        return NextResponse.json({ success: true, data: { source } })
      }

      // 특정 소스 수동 즉시 수집
      case "fetch_source": {
        const { sourceId } = body as { action: string; sourceId: string }
        if (!sourceId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "sourceId required" } },
            { status: 400 }
          )
        }

        const source = await prisma.mediaSource.findUnique({ where: { id: sourceId } })
        if (!source) {
          return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "MediaSource not found" } },
            { status: 404 }
          )
        }

        // 단일 소스 수집 (전체 수집과 동일 로직, 특정 소스만 실행)
        const result = await executeMediaAutoFetch({
          getSourceCount: async () => 1,
          seedPresets: async () => ({ added: 0 }),
          getActiveSources: async () => [
            {
              id: source.id,
              name: source.name,
              sourceType: source.sourceType as MediaSourceType,
              region: source.region,
            },
          ],
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
        })

        return NextResponse.json({ success: true, data: result })
      }

      // 프리셋 일괄 등록
      case "add_presets": {
        const { sourceTypes } = body as { action: string; sourceTypes?: MediaSourceType[] }

        const registeredTypes = new Set(
          (await prisma.mediaSource.findMany({ select: { sourceType: true } })).map(
            (s) => s.sourceType
          )
        )

        const targets =
          sourceTypes && sourceTypes.length > 0
            ? PRESET_MEDIA_SOURCES.filter((p) =>
                sourceTypes.includes(p.sourceType as MediaSourceType)
              )
            : PRESET_MEDIA_SOURCES

        const toAdd = targets.filter((p) => !registeredTypes.has(p.sourceType))

        if (toAdd.length > 0) {
          await prisma.mediaSource.createMany({
            data: toAdd.map((p) => ({
              name: p.name,
              sourceType: p.sourceType,
              region: p.region,
            })),
            skipDuplicates: true,
          })
        }

        return NextResponse.json({
          success: true,
          data: { added: toAdd.length, skipped: targets.length - toAdd.length },
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MEDIA_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── PUT: 소스 활성화/비활성화 ────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id, isActive } = (await request.json()) as { id: string; isActive: boolean }
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "id required" } },
        { status: 400 }
      )
    }

    await prisma.mediaSource.update({ where: { id }, data: { isActive } })
    return NextResponse.json({ success: true, data: { id, isActive } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MEDIA_UPDATE_ERROR", message } },
      { status: 500 }
    )
  }
}
