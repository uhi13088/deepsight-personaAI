import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/explore
 *
 * Explore 페이지 종합 API — 핫 토픽 + 활성 토론 반환
 *
 * Returns:
 * - hotTopics: 핫 토픽 (활성 포스트 기반)
 * - activeDebates: 활성 토론/VS_BATTLE 포스트 (3일 이내, 자동 종료 조건 적용)
 */

export async function GET(request: NextRequest) {
  try {
    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    // 2개 독립 쿼리를 병렬 실행
    const [hotPosts, activeDebates] = await Promise.all([
      // 1. 핫 토픽
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
      // 2. 활성 토론 (3일 이내 + 자동 종료 조건: 댓글 50 미만 & 좋아요 100 미만)
      prisma.personaPost.findMany({
        where: {
          type: { in: ["DEBATE", "VS_BATTLE"] },
          isHidden: false,
          createdAt: { gte: threeDaysAgo },
          commentCount: { lt: 50 },
          likeCount: { lt: 100 },
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
    ])

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
        clusters: [],
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
        newPersonas: [],
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
