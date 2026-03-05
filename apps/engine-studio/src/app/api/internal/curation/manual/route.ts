import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/internal/curation/manual
 *
 * 수동 페르소나-콘텐츠 큐레이션 생성 (status = APPROVED)
 */
export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireAuth()
  if (authResponse) return authResponse

  try {
    const body = await request.json()
    const { personaId, contentItemId, curationScore, curationReason, highlights } = body

    // 입력 검증
    if (!personaId || !contentItemId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "personaId와 contentItemId는 필수입니다" },
        },
        { status: 400 }
      )
    }

    const score = Number(curationScore ?? 1.0)
    if (isNaN(score) || score < 0 || score > 1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "curationScore는 0~1 사이여야 합니다" },
        },
        { status: 400 }
      )
    }

    // Persona + ContentItem 존재 확인
    const [persona, contentItem] = await Promise.all([
      prisma.persona.findUnique({ where: { id: personaId }, select: { id: true } }),
      prisma.contentItem.findUnique({ where: { id: contentItemId }, select: { id: true } }),
    ])

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }
    if (!contentItem) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "콘텐츠를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 중복 확인
    const existing = await prisma.personaCuratedContent.findUnique({
      where: { personaId_contentItemId: { personaId, contentItemId } },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "이미 해당 페르소나-콘텐츠 큐레이션이 존재합니다",
          },
        },
        { status: 409 }
      )
    }

    // APPROVED로 직접 생성
    const created = await prisma.personaCuratedContent.create({
      data: {
        personaId,
        contentItemId,
        curationScore: score,
        curationReason: curationReason ?? null,
        highlights: Array.isArray(highlights) ? highlights : [],
        status: "APPROVED",
      },
      select: {
        id: true,
        personaId: true,
        contentItemId: true,
        curationScore: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...created,
        curationScore: Number(created.curationScore),
        createdAt: created.createdAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MANUAL_CURATION_ERROR", message } },
      { status: 500 }
    )
  }
}
