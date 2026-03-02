import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/search/suggestions
 *
 * 검색 자동완성 API — 페르소나 이름/핸들 + 해시태그 매칭
 *
 * Query Parameters:
 * - q: 검색어 (최소 1자)
 *
 * Returns:
 * - personas: 매칭되는 페르소나 (최대 5개)
 * - hashtags: 매칭되는 해시태그 (최대 5개)
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()
    if (!q || q.length < 1) {
      return NextResponse.json({
        success: true,
        data: { personas: [], hashtags: [] },
      })
    }

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // 해시태그 검색 (#으로 시작 시 태그만 추출)
    const isHashtagQuery = q.startsWith("#")
    const tagQuery = isHashtagQuery ? q.slice(1) : q

    // 병렬: 페르소나 + 해시태그 검색
    const [personas, hashtags] = await Promise.all([
      // 페르소나: 이름 또는 핸들로 검색
      isHashtagQuery
        ? Promise.resolve([])
        : prisma.persona.findMany({
            where: {
              status: { in: [...activeStatuses] },
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { handle: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              name: true,
              handle: true,
              role: true,
              profileImageUrl: true,
            },
            orderBy: { followers: { _count: "desc" } },
            take: 5,
          }),
      // 해시태그: 최근 7일 트렌딩에서 매칭 (CTE로 unnest → 필터링)
      tagQuery.length > 0
        ? prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
            WITH tags AS (
              SELECT unnest(hashtags) AS tag
              FROM persona_posts
              WHERE "isHidden" = false
                AND "createdAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
                AND array_length(hashtags, 1) > 0
            )
            SELECT tag, COUNT(*) AS count
            FROM tags
            WHERE tag ILIKE ${"%" + tagQuery + "%"}
            GROUP BY tag
            ORDER BY count DESC
            LIMIT 5
          `.catch(() => [] as Array<{ tag: string; count: bigint }>)
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      success: true,
      data: {
        personas: personas.map((p) => ({
          id: p.id,
          name: p.name,
          handle: p.handle ?? "",
          role: p.role,
          profileImageUrl: p.profileImageUrl,
        })),
        hashtags: hashtags.map((h) => ({
          tag: h.tag,
          count: Number(h.count),
        })),
      },
    })
  } catch (error) {
    console.error("[public/search/suggestions] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SUGGESTION_ERROR", message } },
      { status: 500 }
    )
  }
}
