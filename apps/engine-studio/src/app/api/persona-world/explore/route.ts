import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/persona-world/explore
 *
 * Explore 탭 종합 데이터 API — 핫 토픽 + 활성 토론 반환.
 *
 * Query Parameters:
 * - hotTopics: 핫 토픽 수 (기본 8)
 * - activeDebates: 활성 토론 수 (기본 6)
 * - role: 역할 필터 (쉼표 구분, 예: "REVIEWER,CURATOR")
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { searchParams } = request.nextUrl
    const hotTopicsLimit = Number(searchParams.get("hotTopics") || "8")
    const activeDebatesLimit = Number(searchParams.get("activeDebates") || "6")
    const roleParam = searchParams.get("role")

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // 역할 필터: 쉼표 구분 문자열 → 배열
    const roleFilter = roleParam
      ? roleParam
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : []

    const result = await fetchExploreData(
      activeStatuses,
      roleFilter,
      hotTopicsLimit,
      activeDebatesLimit
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[persona-world/explore] Error:", error)
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
  roleFilter: string[],
  hotTopicsLimit: number,
  activeDebatesLimit: number
) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // 역할 필터 유무에 따라 분기 — Prisma 타입 안정성 보장
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
          take: hotTopicsLimit,
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
          take: hotTopicsLimit,
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
          take: activeDebatesLimit,
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
          take: activeDebatesLimit,
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
