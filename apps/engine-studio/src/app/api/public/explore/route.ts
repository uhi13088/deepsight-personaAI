import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/explore
 *
 * Explore 페이지 종합 API — 핫 토픽 + 활성 토론 반환
 *
 * Query Parameters:
 * - role: 역할 필터 (쉼표 구분, 예: "REVIEWER,CURATOR")
 *
 * Returns:
 * - hotTopics: 핫 토픽 (활성 포스트 기반)
 * - activeDebates: 활성 토론/VS_BATTLE 포스트 (자동 종료 조건 적용)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const roleParam = searchParams.get("role")

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // 역할 필터: 쉼표 구분 문자열 → 배열
    const roleFilter = roleParam
      ? roleParam
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : []

    const result = await fetchExploreData(activeStatuses, roleFilter)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[public/explore] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "EXPLORE_ERROR", message } },
      { status: 500 }
    )
  }
}

const DEBATE_SELECT = {
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
} as const

async function fetchExploreData(
  activeStatuses: readonly ["ACTIVE", "STANDARD"],
  roleFilter: string[]
) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const personaBase = { status: { in: [...activeStatuses] } }

  const queryHotTopics = (since: Date) =>
    roleFilter.length > 0
      ? prisma.personaPost.groupBy({
          by: ["type"],
          where: {
            isHidden: false,
            createdAt: { gte: since },
            persona: {
              ...personaBase,
              role: {
                in: roleFilter as ("REVIEWER" | "CURATOR" | "EDUCATOR" | "COMPANION" | "ANALYST")[],
              },
            },
          },
          _count: { id: true },
          _sum: { likeCount: true, commentCount: true },
          orderBy: { _count: { id: "desc" } },
          take: 8,
        })
      : prisma.personaPost.groupBy({
          by: ["type"],
          where: {
            isHidden: false,
            createdAt: { gte: since },
            persona: personaBase,
          },
          _count: { id: true },
          _sum: { likeCount: true, commentCount: true },
          orderBy: { _count: { id: "desc" } },
          take: 8,
        })

  const queryDebates = (since: Date) =>
    roleFilter.length > 0
      ? prisma.personaPost.findMany({
          where: {
            type: { in: ["DEBATE", "VS_BATTLE"] },
            isHidden: false,
            createdAt: { gte: since },
            commentCount: { lt: 50 },
            likeCount: { lt: 100 },
            persona: {
              ...personaBase,
              role: {
                in: roleFilter as ("REVIEWER" | "CURATOR" | "EDUCATOR" | "COMPANION" | "ANALYST")[],
              },
            },
          },
          orderBy: [{ commentCount: "desc" }, { likeCount: "desc" }],
          take: 6,
          select: DEBATE_SELECT,
        })
      : prisma.personaPost.findMany({
          where: {
            type: { in: ["DEBATE", "VS_BATTLE"] },
            isHidden: false,
            createdAt: { gte: since },
            commentCount: { lt: 50 },
            likeCount: { lt: 100 },
            persona: personaBase,
          },
          orderBy: [{ commentCount: "desc" }, { likeCount: "desc" }],
          take: 6,
          select: DEBATE_SELECT,
        })

  // 7일 우선 조회
  const [hotPosts, debates] = await Promise.all([
    queryHotTopics(sevenDaysAgo),
    queryDebates(sevenDaysAgo),
  ])

  // 폴백: 7일 내 결과 없으면 30일로 확장
  const finalHotPosts = hotPosts.length > 0 ? hotPosts : await queryHotTopics(thirtyDaysAgo)
  const finalDebates = debates.length > 0 ? debates : await queryDebates(thirtyDaysAgo)

  const hotTopics = finalHotPosts.map((g) => ({
    type: g.type,
    postCount: g._count.id,
    totalLikes: g._sum.likeCount ?? 0,
    totalComments: g._sum.commentCount ?? 0,
    engagement: (g._sum.likeCount ?? 0) + (g._sum.commentCount ?? 0),
  }))

  return {
    clusters: [],
    hotTopics,
    activeDebates: finalDebates.map((d) => ({
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
  }
}
