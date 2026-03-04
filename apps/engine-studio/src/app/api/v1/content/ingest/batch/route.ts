import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalApiKey } from "@/lib/external-auth"
import { vectorizeContent } from "@/lib/content/content-vectorizer"
import type { ContentItemType } from "@/generated/prisma"

/**
 * POST /api/v1/content/ingest/batch
 *
 * B2B 콘텐츠 배치 등록 (최대 100건)
 */

const VALID_CONTENT_TYPES = new Set<string>([
  "MOVIE",
  "DRAMA",
  "MUSIC",
  "BOOK",
  "ARTICLE",
  "PRODUCT",
  "VIDEO",
  "PODCAST",
])

const MAX_BATCH_SIZE = 100

interface IngestInput {
  contentType: string
  title: string
  description?: string
  sourceUrl?: string
  externalId?: string
  genres?: string[]
  tags?: string[]
}

interface BatchResultItem {
  index: number
  status: "created" | "updated" | "failed"
  id?: string
  error?: string
}

export async function POST(request: NextRequest) {
  // ── 인증 ─────────────────────────────────────────────────────
  const authResult = await verifyExternalApiKey(request)
  if (authResult instanceof NextResponse) return authResult
  const { tenantId } = authResult

  try {
    const body = await request.json()
    const items: IngestInput[] = Array.isArray(body.items) ? body.items : []

    // ── 배치 크기 검증 ────────────────────────────────────────────
    if (items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `배치 최대 ${MAX_BATCH_SIZE}건까지 허용됩니다 (요청: ${items.length}건)`,
          },
        },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "items 배열이 비어있습니다" },
        },
        { status: 400 }
      )
    }

    // ── 개별 처리 ─────────────────────────────────────────────────
    const results: BatchResultItem[] = []
    let created = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      try {
        // 기본 검증
        if (!item.title || typeof item.title !== "string" || item.title.trim() === "") {
          throw new Error("title은 필수입니다")
        }
        if (!VALID_CONTENT_TYPES.has(item.contentType)) {
          throw new Error(`유효하지 않은 contentType: ${item.contentType}`)
        }

        const genres: string[] = Array.isArray(item.genres) ? item.genres : []
        const tags: string[] = Array.isArray(item.tags) ? item.tags : []
        const externalId = item.externalId ?? null

        let contentItem: { id: string; vectorizedAt: Date | null }
        let isUpdate = false

        if (externalId) {
          const existing = await prisma.contentItem.findUnique({
            where: { tenantId_externalId: { tenantId, externalId } },
            select: { id: true },
          })
          isUpdate = !!existing

          contentItem = await prisma.contentItem.upsert({
            where: { tenantId_externalId: { tenantId, externalId } },
            update: {
              title: item.title.trim(),
              description: item.description ?? null,
              sourceUrl: item.sourceUrl ?? null,
              genres,
              tags,
            },
            create: {
              tenantId,
              contentType: item.contentType as ContentItemType,
              title: item.title.trim(),
              description: item.description ?? null,
              sourceUrl: item.sourceUrl ?? null,
              externalId,
              genres,
              tags,
            },
            select: { id: true, vectorizedAt: true },
          })
        } else {
          contentItem = await prisma.contentItem.create({
            data: {
              tenantId,
              contentType: item.contentType as ContentItemType,
              title: item.title.trim(),
              description: item.description ?? null,
              sourceUrl: item.sourceUrl ?? null,
              genres,
              tags,
            },
            select: { id: true, vectorizedAt: true },
          })
        }

        // 비동기 벡터화
        vectorizeContent({ title: item.title.trim(), description: item.description, genres, tags })
          .then(({ contentVector, narrativeTheme }) =>
            prisma.contentItem.update({
              where: { id: contentItem.id },
              data: {
                contentVector: contentVector as unknown as object,
                narrativeTheme: narrativeTheme as unknown as object,
                vectorizedAt: new Date(),
              },
            })
          )
          .catch(() => {})

        if (isUpdate) {
          updated++
          results.push({ index: i, status: "updated", id: contentItem.id })
        } else {
          created++
          results.push({ index: i, status: "created", id: contentItem.id })
        }
      } catch (err) {
        failed++
        results.push({
          index: i,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        updated,
        failed,
        items: results,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "BATCH_INGEST_ERROR", message } },
      { status: 500 }
    )
  }
}
