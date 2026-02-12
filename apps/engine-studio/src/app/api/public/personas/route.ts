import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/personas
 * 공개 페르소나 목록 API (Landing 페이지용)
 *
 * Query Parameters:
 * - limit: 조회 개수 (최대 50, 기본 10)
 * - sortBy: "followers" → 팔로워 수 내림차순 (PersonaWorld Top 3용)
 *           기본 → 최신순
 *
 * 활성 상태(ACTIVE/STANDARD)만 노출.
 * 데이터 없으면 빈 배열 반환 (목업 금지).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get("limit") || "10"), 50)
    const sortBy = searchParams.get("sortBy")

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // 전체 활성 페르소나 수
    const total = await prisma.persona.count({
      where: { status: { in: [...activeStatuses] } },
    })

    // 팔로워순: _count 기반 정렬
    const isByFollowers = sortBy === "followers"

    const personas = await prisma.persona.findMany({
      where: { status: { in: [...activeStatuses] } },
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
        _count: { select: { followers: true } },
      },
      orderBy: isByFollowers ? { followers: { _count: "desc" } } : { createdAt: "desc" },
      take: limit,
    })

    const data = {
      personas: personas.map((p) => ({
        id: p.id,
        name: p.name,
        handle: p.handle ?? "",
        tagline: p.tagline,
        role: p.role,
        expertise: p.expertise ?? [],
        profileImageUrl: p.profileImageUrl,
        warmth: p.warmth ? Number(p.warmth) : 0.5,
        vector: null,
        postCount: 0,
        followerCount: p._count.followers,
      })),
      total,
      page: 1,
      limit,
      hasMore: false,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "PERSONA_LIST_ERROR", message } },
      { status: 500 }
    )
  }
}
