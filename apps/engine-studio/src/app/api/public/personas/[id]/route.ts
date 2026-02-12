import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/personas/[id]
 *
 * 페르소나 상세 API — 프로필, 3-Layer 벡터, 통계, 최근 포스트
 */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const persona = await prisma.persona.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        handle: true,
        tagline: true,
        role: true,
        expertise: true,
        description: true,
        profileImageUrl: true,
        warmth: true,
        archetypeId: true,
        paradoxScore: true,
        dimensionalityScore: true,
        createdAt: true,

        // 3-Layer 벡터
        layerVectors: {
          orderBy: { createdAt: "desc" },
          select: {
            layerType: true,
            dim1: true,
            dim2: true,
            dim3: true,
            dim4: true,
            dim5: true,
            dim6: true,
            dim7: true,
          },
        },

        // 팔로워/팔로잉 수
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },

        // 최근 포스트
        posts: {
          where: { isHidden: false },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            content: true,
            contentId: true,
            metadata: true,
            likeCount: true,
            commentCount: true,
            repostCount: true,
            createdAt: true,
          },
        },
      },
    })

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 3-Layer 벡터 구조화
    const vectorByLayer: Record<string, Record<string, number>> = {}
    for (const lv of persona.layerVectors) {
      const dims: Record<string, number> = {}

      if (lv.layerType === "SOCIAL") {
        // L1: 7D — depth, lens, stance, scope, taste, purpose, sociability
        const keys = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"]
        const vals = [lv.dim1, lv.dim2, lv.dim3, lv.dim4, lv.dim5, lv.dim6, lv.dim7]
        keys.forEach((k, i) => {
          if (vals[i] != null) dims[k] = Number(vals[i])
        })
        vectorByLayer.social = dims
      } else if (lv.layerType === "TEMPERAMENT") {
        // L2: 5D — openness, conscientiousness, extraversion, agreeableness, neuroticism
        const keys = [
          "openness",
          "conscientiousness",
          "extraversion",
          "agreeableness",
          "neuroticism",
        ]
        const vals = [lv.dim1, lv.dim2, lv.dim3, lv.dim4, lv.dim5]
        keys.forEach((k, i) => {
          if (vals[i] != null) dims[k] = Number(vals[i])
        })
        vectorByLayer.temperament = dims
      } else if (lv.layerType === "NARRATIVE") {
        // L3: 4D — lack, moralCompass, volatility, growthArc
        const keys = ["lack", "moralCompass", "volatility", "growthArc"]
        const vals = [lv.dim1, lv.dim2, lv.dim3, lv.dim4]
        keys.forEach((k, i) => {
          if (vals[i] != null) dims[k] = Number(vals[i])
        })
        vectorByLayer.narrative = dims
      }
    }

    const hasVector =
      Object.keys(vectorByLayer.social ?? {}).length > 0 ||
      Object.keys(vectorByLayer.temperament ?? {}).length > 0 ||
      Object.keys(vectorByLayer.narrative ?? {}).length > 0

    return NextResponse.json({
      success: true,
      data: {
        id: persona.id,
        name: persona.name,
        handle: persona.handle ?? "",
        tagline: persona.tagline,
        role: persona.role,
        expertise: persona.expertise ?? [],
        description: persona.description,
        profileImageUrl: persona.profileImageUrl,
        warmth: persona.warmth ? Number(persona.warmth) : 0.5,
        archetypeId: persona.archetypeId,
        paradoxScore: persona.paradoxScore ? Number(persona.paradoxScore) : null,
        dimensionalityScore: persona.dimensionalityScore
          ? Number(persona.dimensionalityScore)
          : null,
        vector: hasVector
          ? {
              social: vectorByLayer.social ?? {},
              temperament: vectorByLayer.temperament ?? {},
              narrative: vectorByLayer.narrative ?? {},
            }
          : null,
        postCount: persona._count.posts,
        followerCount: persona._count.followers,
        followingCount: persona._count.following,
        recentPosts: persona.posts.map((p) => ({
          id: p.id,
          type: p.type,
          content: p.content,
          contentId: p.contentId,
          metadata: p.metadata,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "PERSONA_DETAIL_ERROR", message } },
      { status: 500 }
    )
  }
}
