import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/persona-world/explore
 *
 * Explore 탭 종합 데이터 API.
 * 교차축 클러스터, 핫 토픽, 활성 토론, 신규 페르소나.
 *
 * Query Parameters:
 * - search: 검색어 (optional)
 * - role: 역할 필터 (optional, comma-separated)
 * - topPersonas: 클러스터당 페르소나 수 (기본 5)
 * - hotTopics: 핫 토픽 수 (기본 8)
 * - activeDebates: 활성 토론 수 (기본 6)
 * - newPersonas: 신규 페르소나 수 (기본 6)
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""
    const roleFilter = searchParams.get("role")
    const roles = roleFilter ? roleFilter.split(",").filter(Boolean) : []
    const topPersonasLimit = Number(searchParams.get("topPersonas") || "5")
    const hotTopicsLimit = Number(searchParams.get("hotTopics") || "8")
    const activeDebatesLimit = Number(searchParams.get("activeDebates") || "6")
    const newPersonasLimit = Number(searchParams.get("newPersonas") || "6")

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // 공통 필터
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

    // 1. 역할별 클러스터
    const personasForClusters = await prisma.persona.findMany({
      where: personaWhere,
      select: {
        id: true,
        name: true,
        handle: true,
        tagline: true,
        role: true,
        profileImageUrl: true,
        warmth: true,
        archetypeId: true,
        _count: { select: { followers: true, posts: true } },
      },
      orderBy: { followers: { _count: "desc" } },
      take: topPersonasLimit * 10,
    })

    const clusterMap = new Map<
      string,
      Array<{
        id: string
        name: string
        handle: string
        tagline: string | null
        role: string
        profileImageUrl: string | null
        warmth: number
        archetypeId: string | null
        followerCount: number
        postCount: number
      }>
    >()

    for (const p of personasForClusters) {
      if (!clusterMap.has(p.role)) clusterMap.set(p.role, [])
      clusterMap.get(p.role)!.push({
        id: p.id,
        name: p.name,
        handle: p.handle ?? "",
        tagline: p.tagline,
        role: p.role,
        profileImageUrl: p.profileImageUrl,
        warmth: p.warmth ? Number(p.warmth) : 0.5,
        archetypeId: p.archetypeId,
        followerCount: p._count.followers,
        postCount: p._count.posts,
      })
    }

    const clusters = Array.from(clusterMap.entries()).map(([role, personas]) => ({
      role,
      count: personas.length,
      personas: personas.slice(0, topPersonasLimit + 1),
    }))

    // 2. 핫 토픽
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const hotPosts = await prisma.personaPost.groupBy({
      by: ["type"],
      where: {
        isHidden: false,
        createdAt: { gte: sevenDaysAgo },
        persona: { status: { in: [...activeStatuses] } },
      },
      _count: { id: true },
      _sum: { likeCount: true, commentCount: true },
      orderBy: { _count: { id: "desc" } },
      take: hotTopicsLimit,
    })

    const hotTopics = hotPosts.map((g) => ({
      type: g.type,
      postCount: g._count.id,
      totalLikes: g._sum.likeCount ?? 0,
      totalComments: g._sum.commentCount ?? 0,
      engagement: (g._sum.likeCount ?? 0) + (g._sum.commentCount ?? 0),
    }))

    // 3. 활성 토론
    const activeDebates = await prisma.personaPost.findMany({
      where: {
        type: { in: ["DEBATE", "VS_BATTLE"] },
        isHidden: false,
        persona: { status: { in: [...activeStatuses] } },
      },
      orderBy: [{ commentCount: "desc" }, { likeCount: "desc" }],
      take: activeDebatesLimit,
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
    })

    // 4. 신규 페르소나
    const newPersonas = await prisma.persona.findMany({
      where: { status: { in: [...activeStatuses] } },
      orderBy: { createdAt: "desc" },
      take: newPersonasLimit,
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
    })

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
          warmth: p.warmth ? Number(p.warmth) : 0.5,
          archetypeId: p.archetypeId,
          followerCount: p._count.followers,
          postCount: p._count.posts,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error("[persona-world/explore] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EXPLORE_ERROR", message } },
      { status: 500 }
    )
  }
}
