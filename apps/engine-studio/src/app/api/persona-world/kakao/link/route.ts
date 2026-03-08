import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken, verifyUserOwnership } from "@/lib/internal-auth"

/**
 * GET /api/persona-world/kakao/link?userId=xxx
 * 현재 카카오톡 연동 상태 조회
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  const ownershipError = await verifyUserOwnership(request, userId)
  if (ownershipError) return ownershipError

  try {
    const link = await prisma.kakaoLink.findUnique({
      where: { userId },
      include: {
        persona: {
          select: { id: true, name: true, profileImageUrl: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        linked: !!link && link.isActive,
        link: link
          ? {
              id: link.id,
              personaId: link.personaId,
              personaName: link.persona.name,
              personaImageUrl: link.persona.profileImageUrl,
              kakaoUserKey: link.kakaoUserKey,
              isActive: link.isActive,
              createdAt: link.createdAt.toISOString(),
            }
          : null,
      },
    })
  } catch (error) {
    console.error("[kakao/link GET]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch kakao link" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/kakao/link
 * 카카오톡 연동 생성/변경
 * Body: { userId, personaId, kakaoUserKey }
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, personaId, kakaoUserKey } = body

    if (!userId || !personaId || !kakaoUserKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_PARAM",
            message: "userId, personaId, kakaoUserKey required",
          },
        },
        { status: 400 }
      )
    }

    const ownershipError = await verifyUserOwnership(request, userId)
    if (ownershipError) return ownershipError

    // 페르소나 존재 + 활성 확인
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: { id: true, status: true },
    })
    if (!persona || persona.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "PERSONA_NOT_FOUND", message: "Persona not found or not active" },
        },
        { status: 404 }
      )
    }

    // kakaoUserKey가 다른 유저에게 이미 연동된 경우 차단
    const existingByKakao = await prisma.kakaoLink.findUnique({
      where: { kakaoUserKey },
    })
    if (existingByKakao && existingByKakao.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "KAKAO_KEY_TAKEN",
            message: "This Kakao account is already linked to another user",
          },
        },
        { status: 409 }
      )
    }

    // upsert — 유저당 1개만 허용
    const link = await prisma.kakaoLink.upsert({
      where: { userId },
      create: {
        userId,
        personaId,
        kakaoUserKey,
        isActive: true,
      },
      update: {
        personaId,
        kakaoUserKey,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: link.id,
        personaId: link.personaId,
        kakaoUserKey: link.kakaoUserKey,
        isActive: link.isActive,
        createdAt: link.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[kakao/link POST]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to create kakao link" } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/persona-world/kakao/link?userId=xxx
 * 카카오톡 연동 해제 (isActive = false, 데이터 보존)
 */
export async function DELETE(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  const ownershipError = await verifyUserOwnership(request, userId)
  if (ownershipError) return ownershipError

  try {
    const existing = await prisma.kakaoLink.findUnique({
      where: { userId },
    })

    if (!existing || !existing.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No active kakao link found" } },
        { status: 404 }
      )
    }

    await prisma.kakaoLink.update({
      where: { userId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { unlinked: true } })
  } catch (error) {
    console.error("[kakao/link DELETE]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to unlink kakao" } },
      { status: 500 }
    )
  }
}
