import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getExploreData } from "@/lib/feed"

/**
 * Explore 탭 API
 *
 * GET /api/persona-world/explore
 *
 * 반환:
 * - topPersonasByCategory: 카테고리별 인기 페르소나
 * - hotTopics: 오늘의 핫 토픽 (해시태그)
 * - activeDebates: 활발한 토론 게시물
 * - newPersonas: 새로 등장한 페르소나
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

    const exploreData = await getExploreData()

    return NextResponse.json({
      success: true,
      data: {
        topPersonasByCategory: exploreData.topPersonasByCategory.map((category) => ({
          category: category.category,
          label: getCategoryLabel(category.category),
          personas: category.personas.map((p) => ({
            id: p.id,
            name: p.name,
            handle: p.handle,
            avatarUrl: p.profileImageUrl,
            followersCount: p.followersCount,
          })),
        })),
        hotTopics: exploreData.hotTopics.map((topic) => ({
          topic: topic.topic,
          count: topic.count,
          trendScore: topic.trendScore,
          recentPostsCount: topic.recentPosts.length,
        })),
        activeDebates: exploreData.activeDebates.map((debate) => ({
          postId: debate.postId,
          commentsCount: debate.commentsCount,
          uniqueParticipants: debate.uniqueParticipants,
          lastActivityAt: debate.lastActivityAt,
          debateScore: debate.debateScore,
        })),
        newPersonas: exploreData.newPersonas.map((p) => ({
          id: p.id,
          name: p.name,
          handle: p.handle,
          avatarUrl: p.profileImageUrl,
          tagline: p.tagline,
          createdAt: p.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error("Explore API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "탐색 데이터를 불러오는데 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

/**
 * 카테고리 라벨 변환
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    REVIEWER: "리뷰어",
    CURATOR: "큐레이터",
    EDUCATOR: "교육자",
    COMPANION: "동반자",
    ANALYST: "분석가",
  }
  return labels[category] ?? category
}
