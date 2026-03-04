import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalApiKey } from "@/lib/external-auth"
import { vectorizeContent } from "@/lib/content/content-vectorizer"
import type { ContentItemType } from "@/generated/prisma"

/**
 * POST /api/v1/content/ingest
 *
 * B2B 콘텐츠 단건 등록 — Developer Console API Key 인증
 * ContentItem upsert 후 즉시 벡터화.
 */

const VALID_CONTENT_TYPES: ContentItemType[] = [
  "MOVIE",
  "DRAMA",
  "MUSIC",
  "BOOK",
  "ARTICLE",
  "PRODUCT",
  "VIDEO",
  "PODCAST",
]

export async function POST(request: NextRequest) {
  // ── 인증 ─────────────────────────────────────────────────────
  const authResult = await verifyExternalApiKey(request)
  if (authResult instanceof NextResponse) return authResult
  const { tenantId } = authResult

  try {
    const body = await request.json()

    // ── 입력 검증 ────────────────────────────────────────────────
    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "title은 필수입니다" } },
        { status: 400 }
      )
    }

    if (!VALID_CONTENT_TYPES.includes(body.contentType as ContentItemType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `contentType은 ${VALID_CONTENT_TYPES.join(", ")} 중 하나여야 합니다`,
          },
        },
        { status: 400 }
      )
    }

    const genres: string[] = Array.isArray(body.genres) ? body.genres : []
    const tags: string[] = Array.isArray(body.tags) ? body.tags : []
    const externalId: string | null =
      body.externalId && typeof body.externalId === "string" ? body.externalId : null

    // ── ContentItem upsert ────────────────────────────────────────
    // externalId 있으면 upsert, 없으면 create
    let contentItem
    if (externalId) {
      contentItem = await prisma.contentItem.upsert({
        where: { tenantId_externalId: { tenantId, externalId } },
        update: {
          title: body.title.trim(),
          description: body.description ?? null,
          sourceUrl: body.sourceUrl ?? null,
          genres,
          tags,
        },
        create: {
          tenantId,
          contentType: body.contentType as ContentItemType,
          title: body.title.trim(),
          description: body.description ?? null,
          sourceUrl: body.sourceUrl ?? null,
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
          contentType: body.contentType as ContentItemType,
          title: body.title.trim(),
          description: body.description ?? null,
          sourceUrl: body.sourceUrl ?? null,
          genres,
          tags,
        },
        select: { id: true, vectorizedAt: true },
      })
    }

    // ── 벡터화 (비동기, 실패해도 응답에 영향 없음) ────────────────
    vectorizeContent({
      title: body.title.trim(),
      description: body.description ?? null,
      genres,
      tags,
    })
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
      .catch(() => {
        // 벡터화 실패는 무시 — 나중에 재시도 가능
      })

    return NextResponse.json({
      success: true,
      data: {
        id: contentItem.id,
        vectorizedAt: contentItem.vectorizedAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "INGEST_ERROR", message } },
      { status: 500 }
    )
  }
}
