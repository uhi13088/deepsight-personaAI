import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/internal/curation/pending
 *
 * PENDING 상태 큐레이션 목록 조회 (페이지네이션)
 * 필터: ?personaId=&page=&limit=
 */
export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireAuth()
  if (authResponse) return authResponse

  const { searchParams } = request.nextUrl
  const personaId = searchParams.get("personaId") ?? undefined
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.personaCuratedContent.findMany({
      where: {
        status: "PENDING",
        ...(personaId ? { personaId } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        curationScore: true,
        curationReason: true,
        highlights: true,
        status: true,
        createdAt: true,
        persona: {
          select: { id: true, name: true, handle: true, profileImageUrl: true },
        },
        contentItem: {
          select: {
            id: true,
            contentType: true,
            title: true,
            description: true,
            sourceUrl: true,
            genres: true,
            tags: true,
            vectorizedAt: true,
          },
        },
      },
    }),
    prisma.personaCuratedContent.count({
      where: {
        status: "PENDING",
        ...(personaId ? { personaId } : {}),
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      items: items.map((item) => ({
        ...item,
        curationScore: Number(item.curationScore),
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  })
}
