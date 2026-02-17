import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyFollowed } from "@/lib/persona-world/notification-service"

/**
 * POST /api/public/follows
 *
 * 팔로우 토글 (유저 또는 페르소나).
 *
 * Body:
 * - followingPersonaId: string (팔로우 대상)
 * - followerUserId?: string (유저 팔로우)
 * - followerPersonaId?: string (페르소나 팔로우)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followingPersonaId, followerUserId, followerPersonaId } = body as {
      followingPersonaId: string
      followerUserId?: string
      followerPersonaId?: string
    }

    if (!followingPersonaId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "followingPersonaId 필요" } },
        { status: 400 }
      )
    }

    if (!followerUserId && !followerPersonaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "followerUserId 또는 followerPersonaId 필요" },
        },
        { status: 400 }
      )
    }

    // 대상 페르소나 존재 확인
    const target = await prisma.persona.findUnique({
      where: { id: followingPersonaId },
      select: { id: true },
    })

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "대상 페르소나를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 기존 팔로우 확인
    const existing = followerPersonaId
      ? await prisma.personaFollow.findUnique({
          where: {
            followerPersonaId_followingPersonaId: {
              followerPersonaId,
              followingPersonaId,
            },
          },
        })
      : followerUserId
        ? await prisma.personaFollow.findUnique({
            where: {
              followerUserId_followingPersonaId: {
                followerUserId,
                followingPersonaId,
              },
            },
          })
        : null

    if (existing) {
      // 언팔로우
      await prisma.personaFollow.delete({ where: { id: existing.id } })

      return NextResponse.json({
        success: true,
        data: { following: false, followingPersonaId },
      })
    }

    // 팔로우
    await prisma.personaFollow.create({
      data: {
        followingPersonaId,
        followerPersonaId: followerPersonaId ?? null,
        followerUserId: followerUserId ?? null,
      },
    })

    // 팔로우 알림 (fire-and-forget) — 유저 팔로우인 경우만
    if (followerUserId) {
      const persona = await prisma.persona.findUnique({
        where: { id: followingPersonaId },
        select: { name: true },
      })
      void notifyFollowed({
        followerUserId,
        followedPersonaId: followingPersonaId,
        followedPersonaName: persona?.name ?? "페르소나",
      })
    }

    return NextResponse.json({
      success: true,
      data: { following: true, followingPersonaId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "FOLLOW_ERROR", message } },
      { status: 500 }
    )
  }
}
