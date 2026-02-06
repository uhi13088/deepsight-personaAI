import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserFeed, recommendPersonas, DEFAULT_WEIGHTS } from "@/lib/feed"

/**
 * 메인 피드 API
 *
 * GET /api/persona-world/feed
 * - 팔로우 기반 피드 (60%)
 * - 6D 유사도 기반 추천 피드 (30%)
 * - 트렌딩 피드 (10%)
 *
 * Query params:
 * - cursor: 페이지네이션 커서
 * - limit: 게시물 수 (default: 20)
 * - userId: PersonaWorld 유저 ID (필수)
 * - following: 팔로우 피드 가중치 (0-1)
 * - recommended: 추천 피드 가중치 (0-1)
 * - trending: 트렌딩 피드 가중치 (0-1)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const cursor = searchParams.get("cursor") ?? undefined
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50)

    // 가중치 파라미터
    const followingWeight = parseFloat(searchParams.get("following") ?? "")
    const recommendedWeight = parseFloat(searchParams.get("recommended") ?? "")
    const trendingWeight = parseFloat(searchParams.get("trending") ?? "")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "userId가 필요합니다" } },
        { status: 400 }
      )
    }

    const weights =
      !isNaN(followingWeight) || !isNaN(recommendedWeight) || !isNaN(trendingWeight)
        ? {
            following: !isNaN(followingWeight) ? followingWeight : DEFAULT_WEIGHTS.following,
            recommended: !isNaN(recommendedWeight)
              ? recommendedWeight
              : DEFAULT_WEIGHTS.recommended,
            trending: !isNaN(trendingWeight) ? trendingWeight : DEFAULT_WEIGHTS.trending,
          }
        : undefined

    const feed = await getUserFeed({
      userId,
      cursor,
      limit,
      weights,
    })

    return NextResponse.json({
      success: true,
      data: {
        posts: feed.posts,
        nextCursor: feed.nextCursor,
        hasMore: feed.hasMore,
        meta: {
          ...feed.meta,
          weights: weights ?? DEFAULT_WEIGHTS,
        },
      },
    })
  } catch (error) {
    console.error("Feed API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "피드를 불러오는데 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

/**
 * 추천 페르소나 조회
 *
 * GET /api/persona-world/feed/recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, limit = 10 } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "userId가 필요합니다" } },
        { status: 400 }
      )
    }

    const recommendations = await recommendPersonas(userId, limit)

    return NextResponse.json({
      success: true,
      data: {
        recommendations: recommendations.map((r) => ({
          persona: {
            id: r.persona.id,
            name: r.persona.name,
            handle: r.persona.handle,
            avatarUrl: r.persona.profileImageUrl,
          },
          similarity: r.similarity,
          reason: r.reason,
        })),
        total: recommendations.length,
      },
    })
  } catch (error) {
    console.error("Recommendations API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "추천을 불러오는데 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
