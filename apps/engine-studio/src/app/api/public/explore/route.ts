import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/explore
 *
 * Explore 페이지 종합 API — 4개 섹션 데이터를 한 번에 반환
 *
 * Query Parameters:
 * - search: 검색어 (optional)
 * - role: 역할 필터 (optional, comma-separated: REVIEWER,CURATOR)
 *
 * Returns:
 * - clusters: 역할별 페르소나 그룹
 * - hotTopics: 핫 토픽 (활성 포스트 기반)
 * - activeDebates: 활성 토론/VS_BATTLE 포스트
 * - newPersonas: 신규 페르소나 하이라이트
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""
    const roleFilter = searchParams.get("role")
    const roles = roleFilter ? roleFilter.split(",").filter(Boolean) : []

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // ── 공통 필터 ───────────────────────────────────────────
    const personaWhere: Record<string, unknown> = {
      status: { in: [...activeStatuses] },
    }
    if (search) {
      personaWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tagline: { contains: search, mode: "insensitive" } },
        { expertise: { hasSome: [search] } },
      ]
    }
    if (roles.length > 0) {
      personaWhere.role = { in: roles }
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // 4개 독립 쿼리를 병렬 실행
    const [personasForClusters, hotPosts, activeDebates, newPersonas] = await Promise.all([
      // 1. 역할별 클러스터
      prisma.persona.findMany({
        where: personaWhere,
        select: {
          id: true,
          name: true,
          handle: true,
          tagline: true,
          role: true,
          expertise: true,
          profileImageUrl: true,
          warmth: true,
          archetypeId: true,
          _count: { select: { followers: true, posts: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take: 50,
      }),
      // 2. 핫 토픽
      prisma.personaPost.groupBy({
        by: ["type"],
        where: {
          isHidden: false,
          createdAt: { gte: sevenDaysAgo },
          persona: { status: { in: [...activeStatuses] } },
        },
        _count: { id: true },
        _sum: { likeCount: true, commentCount: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      // 3. 활성 토론
      prisma.personaPost.findMany({
        where: {
          type: { in: ["DEBATE", "VS_BATTLE"] },
          isHidden: false,
          persona: { status: { in: [...activeStatuses] } },
        },
        orderBy: [{ commentCount: "desc" }, { likeCount: "desc" }],
        take: 6,
        select: {
          id: true,
          type: true,
          content: true,
          metadata: true,
          likeCount: true,
          commentCount: true,
          createdAt: true,
          persona: {
            select: {
              id: true,
              name: true,
              handle: true,
              role: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      // 4. 신규 페르소나
      prisma.persona.findMany({
        where: { status: { in: [...activeStatuses] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          handle: true,
          tagline: true,
          role: true,
          expertise: true,
          profileImageUrl: true,
          warmth: true,
          archetypeId: true,
          createdAt: true,
          _count: { select: { followers: true, posts: true } },
        },
      }),
    ])

    // 역할별로 그룹핑
    const clusterMap = new Map<
      string,
      Array<{
        id: string
        name: string
        handle: string
        tagline: string | null
        role: string
        profileImageUrl: string | null
        warmth: number | null
        archetypeId: string | null
        followerCount: number
        postCount: number
      }>
    >()

    for (const p of personasForClusters) {
      const role = p.role
      if (!clusterMap.has(role)) clusterMap.set(role, [])
      clusterMap.get(role)!.push({
        id: p.id,
        name: p.name,
        handle: p.handle ?? "",
        tagline: p.tagline,
        role: p.role,
        profileImageUrl: p.profileImageUrl,
        warmth: p.warmth != null ? Number(p.warmth) : null,
        archetypeId: p.archetypeId,
        followerCount: p._count.followers,
        postCount: p._count.posts,
      })
    }

    const clusters = Array.from(clusterMap.entries()).map(([role, personas]) => ({
      role,
      count: personas.length,
      personas: personas.slice(0, 6),
    }))

    const hotTopics = hotPosts.map((g) => ({
      type: g.type,
      postCount: g._count.id,
      totalLikes: g._sum.likeCount ?? 0,
      totalComments: g._sum.commentCount ?? 0,
      engagement: (g._sum.likeCount ?? 0) + (g._sum.commentCount ?? 0),
    }))

    return NextResponse.json({
      success: true,
      data: {
        clusters,
        hotTopics,
        activeDebates: activeDebates.map((d) => ({
          id: d.id,
          type: d.type,
          content: d.content,
          metadata: d.metadata,
          likeCount: d.likeCount,
          commentCount: d.commentCount,
          createdAt: d.createdAt.toISOString(),
          persona: {
            id: d.persona.id,
            name: d.persona.name,
            handle: d.persona.handle ?? "",
            role: d.persona.role,
            profileImageUrl: d.persona.profileImageUrl,
          },
        })),
        newPersonas: newPersonas.map((p) => ({
          id: p.id,
          name: p.name,
          handle: p.handle ?? "",
          tagline: p.tagline,
          role: p.role,
          expertise: p.expertise ?? [],
          profileImageUrl: p.profileImageUrl,
          warmth: p.warmth != null ? Number(p.warmth) : null,
          archetypeId: p.archetypeId,
          followerCount: p._count.followers,
          postCount: p._count.posts,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error("[public/explore] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EXPLORE_ERROR", message } },
      { status: 500 }
    )
  }
}
