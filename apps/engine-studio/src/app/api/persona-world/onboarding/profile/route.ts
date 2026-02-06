import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import {
  mergeVectors,
  smoothMerge,
  calculateProfileQuality,
  similarityScore,
  type Vector6D,
  type DataSourceInfo,
} from "@/lib/onboarding"

// 프로필 업데이트 스키마
const updateProfileSchema = z.object({
  userId: z.string().min(1, "유저 ID는 필수입니다"),
  name: z.string().min(1).optional(),
  profileImageUrl: z.string().url().optional(),
  preferences: z
    .object({
      favoriteGenres: z.array(z.string()).optional(),
      dislikedGenres: z.array(z.string()).optional(),
      warmthPreference: z.number().min(0).max(1).optional(),
      expertiseLevelPref: z.enum(["CASUAL", "ENTHUSIAST", "EXPERT", "CRITIC"]).optional(),
    })
    .optional(),
})

// 활동 기반 학습 스키마
const learnFromActivitySchema = z.object({
  userId: z.string().min(1, "유저 ID는 필수입니다"),
  learningRate: z.number().min(0).max(1).default(0.1),
})

// GET /api/persona-world/onboarding/profile - 프로필 상세 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const includeRecommendations = searchParams.get("includeRecommendations") === "true"

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "userId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      include: {
        surveyResponses: {
          select: {
            surveyLevel: true,
            completedAt: true,
          },
        },
        following: {
          select: {
            followingPersonaId: true,
          },
        },
        likes: {
          select: {
            postId: true,
          },
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // SNS 연결 정보
    const snsConnections = await prisma.sNSConnection.findMany({
      where: { userId },
      select: {
        platform: true,
        lastSyncAt: true,
        extractedData: true,
      },
    })

    // 프로필 품질 계산
    const dataSources = user.dataSources as DataSourceInfo
    const qualityResult = calculateProfileQuality(dataSources || {})

    // 벡터 데이터
    const userVector: Vector6D | null =
      user.depth !== null
        ? {
            depth: Number(user.depth),
            lens: Number(user.lens),
            stance: Number(user.stance),
            scope: Number(user.scope),
            taste: Number(user.taste),
            purpose: Number(user.purpose),
          }
        : null

    let recommendations = null
    if (includeRecommendations && userVector) {
      recommendations = await getPersonaRecommendations(
        userVector,
        user.following.map((f) => f.followingPersonaId)
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        vector: userVector,
        profileQuality: user.profileQuality,
        confidenceScore: user.confidenceScore ? Number(user.confidenceScore) : null,
        qualityDetails: qualityResult,
        preferences: user.preferences,
        dataSources: user.dataSources,
        snsExtendedData: user.snsExtendedData,
        snsConnections: snsConnections.map((c) => ({
          platform: c.platform,
          lastSyncAt: c.lastSyncAt,
          hasData: !!c.extractedData,
        })),
        surveyResponses: user.surveyResponses,
        stats: {
          followingCount: user.following.length,
          likeCount: user.likes.length,
        },
        recommendations,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (error) {
    console.error("프로필 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "프로필 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/persona-world/onboarding/profile - 프로필 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = updateProfileSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { userId, name, profileImageUrl, preferences } = validationResult.data

    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 기존 선호도와 병합
    const existingPreferences = (user.preferences as Record<string, unknown>) || {}
    const mergedPreferences = preferences
      ? { ...existingPreferences, ...preferences }
      : existingPreferences

    const updatedUser = await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        name: name ?? undefined,
        profileImageUrl: profileImageUrl ?? undefined,
        preferences: mergedPreferences as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        profileImageUrl: updatedUser.profileImageUrl,
        preferences: updatedUser.preferences,
        message: "프로필이 업데이트되었습니다",
      },
    })
  } catch (error) {
    console.error("프로필 업데이트 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "프로필 업데이트에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/onboarding/profile - 활동 기반 학습
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = learnFromActivitySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { userId, learningRate } = validationResult.data

    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    if (user.depth === null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_VECTOR",
            message: "벡터가 없습니다. Cold Start 또는 SNS 연동을 먼저 진행해주세요.",
          },
        },
        { status: 400 }
      )
    }

    // 최근 30일 활동 데이터 조회
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // 좋아요한 포스트의 페르소나 벡터 가져오기
    const likedPosts = await prisma.personaPostLike.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        post: {
          include: {
            persona: {
              include: {
                vectors: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    // 팔로우한 페르소나 벡터 가져오기
    const followedPersonas = await prisma.personaFollow.findMany({
      where: {
        followerUserId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        followingPersona: {
          include: {
            vectors: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
    })

    // 댓글 단 포스트의 페르소나 벡터 가져오기
    const commentedPosts = await prisma.personaComment.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        post: {
          include: {
            persona: {
              include: {
                vectors: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    // 벡터 추출 및 가중 평균 계산
    const likedVectors = likedPosts
      .map((l) => l.post.persona.vectors[0])
      .filter(Boolean)
      .map((v) => ({
        depth: Number(v.depth),
        lens: Number(v.lens),
        stance: Number(v.stance),
        scope: Number(v.scope),
        taste: Number(v.taste),
        purpose: Number(v.purpose),
      }))

    const followedVectors = followedPersonas
      .map((f) => f.followingPersona.vectors[0])
      .filter(Boolean)
      .map((v) => ({
        depth: Number(v.depth),
        lens: Number(v.lens),
        stance: Number(v.stance),
        scope: Number(v.scope),
        taste: Number(v.taste),
        purpose: Number(v.purpose),
      }))

    const commentedVectors = commentedPosts
      .map((c) => c.post.persona.vectors[0])
      .filter(Boolean)
      .map((v) => ({
        depth: Number(v.depth),
        lens: Number(v.lens),
        stance: Number(v.stance),
        scope: Number(v.scope),
        taste: Number(v.taste),
        purpose: Number(v.purpose),
      }))

    // 가중 평균으로 선호 벡터 추정
    const inferredVector = calculateWeightedAverage([
      { vectors: likedVectors, weight: 0.4 },
      { vectors: followedVectors, weight: 0.4 },
      { vectors: commentedVectors, weight: 0.2 },
    ])

    if (!inferredVector) {
      return NextResponse.json({
        success: true,
        data: {
          message: "활동 데이터가 충분하지 않습니다",
          activityStats: {
            likesCount: likedVectors.length,
            followsCount: followedVectors.length,
            commentsCount: commentedVectors.length,
          },
        },
      })
    }

    // 현재 벡터
    const currentVector: Vector6D = {
      depth: Number(user.depth),
      lens: Number(user.lens),
      stance: Number(user.stance),
      scope: Number(user.scope),
      taste: Number(user.taste),
      purpose: Number(user.purpose),
    }

    // 점진적 병합
    const updatedVector = smoothMerge(currentVector, inferredVector, learningRate)

    // 데이터 소스 업데이트
    const dataSources = (user.dataSources as DataSourceInfo) || {}
    const updatedDataSources: DataSourceInfo = {
      ...dataSources,
      activity: {
        likesGiven: likedVectors.length,
        commentsGiven: commentedVectors.length,
        followedPersonas: followedPersonas.map((f) => f.followingPersonaId),
        lastUpdatedAt: new Date(),
      },
    }

    // 유저 업데이트
    await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        depth: updatedVector.depth,
        lens: updatedVector.lens,
        stance: updatedVector.stance,
        scope: updatedVector.scope,
        taste: updatedVector.taste,
        purpose: updatedVector.purpose,
        dataSources: updatedDataSources as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: "활동 기반 학습이 완료되었습니다",
        previousVector: currentVector,
        inferredVector,
        updatedVector,
        learningRate,
        activityStats: {
          likesCount: likedVectors.length,
          followsCount: followedVectors.length,
          commentsCount: commentedVectors.length,
        },
      },
    })
  } catch (error) {
    console.error("활동 기반 학습 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "활동 기반 학습에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// 가중 평균 계산 헬퍼
function calculateWeightedAverage(
  groups: { vectors: Vector6D[]; weight: number }[]
): Partial<Vector6D> | null {
  const totals: Record<keyof Vector6D, number> = {
    depth: 0,
    lens: 0,
    stance: 0,
    scope: 0,
    taste: 0,
    purpose: 0,
  }
  let totalWeight = 0

  for (const group of groups) {
    if (group.vectors.length === 0) continue

    // 그룹 내 평균
    const groupAvg = group.vectors.reduce(
      (acc, v) => ({
        depth: acc.depth + v.depth / group.vectors.length,
        lens: acc.lens + v.lens / group.vectors.length,
        stance: acc.stance + v.stance / group.vectors.length,
        scope: acc.scope + v.scope / group.vectors.length,
        taste: acc.taste + v.taste / group.vectors.length,
        purpose: acc.purpose + v.purpose / group.vectors.length,
      }),
      { depth: 0, lens: 0, stance: 0, scope: 0, taste: 0, purpose: 0 }
    )

    // 가중치 적용
    totals.depth += groupAvg.depth * group.weight
    totals.lens += groupAvg.lens * group.weight
    totals.stance += groupAvg.stance * group.weight
    totals.scope += groupAvg.scope * group.weight
    totals.taste += groupAvg.taste * group.weight
    totals.purpose += groupAvg.purpose * group.weight
    totalWeight += group.weight
  }

  if (totalWeight === 0) return null

  return {
    depth: totals.depth / totalWeight,
    lens: totals.lens / totalWeight,
    stance: totals.stance / totalWeight,
    scope: totals.scope / totalWeight,
    taste: totals.taste / totalWeight,
    purpose: totals.purpose / totalWeight,
  }
}

// 페르소나 추천 헬퍼
async function getPersonaRecommendations(
  userVector: Vector6D,
  followingIds: string[]
): Promise<
  {
    persona: { id: string; name: string; handle: string | null; tagline: string | null }
    similarity: number
    reason: string
  }[]
> {
  // 활성 페르소나 조회
  const personas = await prisma.persona.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: followingIds },
    },
    include: {
      vectors: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    take: 50,
  })

  // 유사도 계산 및 정렬
  const recommendations = personas
    .filter((p) => p.vectors.length > 0)
    .map((p) => {
      const personaVector: Vector6D = {
        depth: Number(p.vectors[0].depth),
        lens: Number(p.vectors[0].lens),
        stance: Number(p.vectors[0].stance),
        scope: Number(p.vectors[0].scope),
        taste: Number(p.vectors[0].taste),
        purpose: Number(p.vectors[0].purpose),
      }

      const similarity = similarityScore(userVector, personaVector)

      return {
        persona: {
          id: p.id,
          name: p.name,
          handle: p.handle,
          tagline: p.tagline,
        },
        similarity,
        reason: generateRecommendationReason(userVector, personaVector, p.favoriteGenres),
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)

  return recommendations
}

// 추천 이유 생성 헬퍼
function generateRecommendationReason(
  userVector: Vector6D,
  personaVector: Vector6D,
  favoriteGenres: string[]
): string {
  const similarities: string[] = []

  // 가장 유사한 차원 찾기
  const dimensions: { key: keyof Vector6D; label: string }[] = [
    { key: "depth", label: "분석 깊이" },
    { key: "lens", label: "감상 스타일" },
    { key: "stance", label: "평가 관점" },
    { key: "taste", label: "취향 성향" },
    { key: "purpose", label: "감상 목적" },
  ]

  for (const dim of dimensions) {
    const diff = Math.abs(userVector[dim.key] - personaVector[dim.key])
    if (diff < 0.15) {
      similarities.push(dim.label)
    }
  }

  if (similarities.length > 0) {
    return `${similarities.slice(0, 2).join(", ")}이 비슷해요!`
  }

  if (favoriteGenres.length > 0) {
    return `${favoriteGenres[0]} 장르를 좋아해요`
  }

  return "취향이 잘 맞을 것 같아요!"
}
