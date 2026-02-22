import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import crypto from "crypto"

/**
 * POST /api/team/invite/accept - 초대 수락
 *
 * T222: 토큰을 VerificationToken에서 검증 + acceptedAt 업데이트
 *
 * Body: { token: string, memberId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, memberId } = body as { token?: string; memberId?: string }

    if (!token || !memberId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "토큰과 멤버 ID가 필요합니다." },
        },
        { status: 400 }
      )
    }

    // sha256 해시로 DB 조회
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const identifier = `invite:${memberId}`

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: tokenHash } },
    })

    if (!verificationToken) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "유효하지 않은 초대 링크입니다." },
        },
        { status: 400 }
      )
    }

    // 만료 검증
    if (verificationToken.expires < new Date()) {
      // 만료된 토큰 삭제
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token: tokenHash } },
      })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "초대 링크가 만료되었습니다. 새로운 초대를 요청해주세요.",
          },
        },
        { status: 400 }
      )
    }

    // OrganizationMember 조회
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        organization: { select: { name: true } },
        user: { select: { email: true, name: true } },
      },
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "초대 정보를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (member.acceptedAt) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_ACCEPTED", message: "이미 수락된 초대입니다." } },
        { status: 400 }
      )
    }

    // 트랜잭션: acceptedAt 업데이트 + 토큰 삭제
    await prisma.$transaction([
      prisma.organizationMember.update({
        where: { id: memberId },
        data: { acceptedAt: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token: tokenHash } },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        organizationName: member.organization.name,
        email: member.user.email,
        role: member.role.toLowerCase(),
      },
      message: `${member.organization.name}에 성공적으로 합류했습니다.`,
    })
  } catch (error) {
    console.error("[Team] Invite accept error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "초대 수락에 실패했습니다." } },
      { status: 500 }
    )
  }
}
