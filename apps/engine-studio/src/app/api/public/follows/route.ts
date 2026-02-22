import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma"
import { notifyFollowed } from "@/lib/persona-world/notification-service"
import { verifyInternalToken } from "@/lib/internal-auth"

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
  const authError = verifyInternalToken(request)
  if (authError) return authError

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
      select: { id: true, name: true },
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

    // followerUserId가 있으면 PersonaWorldUser 존재 보장 (없으면 생성)
    if (followerUserId) {
      try {
        await prisma.personaWorldUser.upsert({
          where: { id: followerUserId },
          update: { lastLoginAt: new Date() },
          create: { id: followerUserId, email: `${followerUserId}@anonymous.local` },
        })
      } catch (upsertError) {
        // email 중복 등 — findOrCreate 패턴으로 fallback
        const existing = await prisma.personaWorldUser
          .findUnique({ where: { id: followerUserId } })
          .catch(() => null)
        if (!existing) {
          console.error("[follows] PersonaWorldUser upsert failed:", upsertError)
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "USER_UPSERT_FAILED",
                message: upsertError instanceof Error ? upsertError.message : "유저 생성/조회 실패",
              },
            },
            { status: 500 }
          )
        }
        // existing이 있으면 upsert 실패해도 진행 가능
      }
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

    // 팔로우 — unique constraint 위반 시 (race condition) 기존 레코드 반환
    try {
      await prisma.personaFollow.create({
        data: {
          followingPersonaId,
          followerPersonaId: followerPersonaId ?? null,
          followerUserId: followerUserId ?? null,
        },
      })
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        // Unique constraint violation — 이미 팔로우 중 (race condition)
        return NextResponse.json({
          success: true,
          data: { following: true, followingPersonaId },
        })
      }
      throw createError
    }

    // 팔로우 알림 (fire-and-forget) — 유저 팔로우인 경우만
    if (followerUserId) {
      void notifyFollowed({
        followerUserId,
        followedPersonaId: followingPersonaId,
        followedPersonaName: target.name ?? "페르소나",
      })
    }

    return NextResponse.json({
      success: true,
      data: { following: true, followingPersonaId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `FOLLOW_DB_${error.code}`
        : "FOLLOW_ERROR"
    console.error("[follows] Unhandled error:", error)
    return NextResponse.json({ success: false, error: { code, message } }, { status: 500 })
  }
}
