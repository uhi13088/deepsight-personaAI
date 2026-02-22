import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import crypto from "crypto"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"

const roleMapping: Record<string, "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | "BILLING"> = {
  owner: "OWNER",
  admin: "ADMIN",
  developer: "DEVELOPER",
  viewer: "VIEWER",
}

const INVITE_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000 // 7일

/**
 * POST /api/team/invite - 팀원 초대 (DB + 이메일)
 */
export async function POST(request: NextRequest) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "이메일과 역할을 입력해주세요." },
        },
        { status: 400 }
      )
    }

    const membership = await getUserOrganization(session.user.id)
    const organization = membership?.organization ?? null

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_ORGANIZATION", message: "조직이 존재하지 않습니다." },
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Create user if not exists (pending invitation state)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: email.split("@")[0],
        },
      })
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ALREADY_MEMBER", message: "이미 팀 멤버입니다." },
        },
        { status: 400 }
      )
    }

    // Create organization member with pending status (acceptedAt is null)
    const member = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: roleMapping[role] || "DEVELOPER",
        invitedAt: new Date(),
      },
    })

    // T222: 초대 토큰 생성 + DB 저장
    // rawToken은 이메일 URL에 포함, sha256 해시만 DB에 저장 (rainbow table 방지)
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
    const expiresAt = new Date(Date.now() + INVITE_EXPIRES_MS)

    // 기존 초대 토큰 삭제 후 새로 생성 (재초대 처리)
    const tokenIdentifier = `invite:${member.id}`
    await prisma.verificationToken.deleteMany({
      where: { identifier: tokenIdentifier },
    })
    await prisma.verificationToken.create({
      data: {
        identifier: tokenIdentifier,
        token: tokenHash,
        expires: expiresAt,
      },
    })

    // T222: localhost:3001 폴백 제거
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      console.error("[Team] NEXT_PUBLIC_APP_URL is not configured")
      return NextResponse.json(
        { success: false, error: { code: "MISCONFIGURED", message: "서버 설정 오류" } },
        { status: 500 }
      )
    }
    const inviteUrl = `${baseUrl}/invite?token=${rawToken}&memberId=${member.id}`

    // Send invite email if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "DeepSight <noreply@deepsight.ai>",
            to: email,
            subject: `[DeepSight] ${organization.name}에 초대되었습니다`,
            html: `
              <h2>DeepSight 팀 초대</h2>
              <p>${organization.name}에서 당신을 초대했습니다.</p>
              <p>아래 링크를 클릭하여 초대를 수락하세요:</p>
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
                초대 수락하기
              </a>
              <p style="color:#666;font-size:12px;margin-top:20px;">
                이 링크는 7일 후 만료됩니다.
              </p>
            `,
          }),
        })
        console.log(`[Team] Invite email sent to ${email.substring(0, 3)}***`)
      } catch (emailError) {
        console.error("[Team] Failed to send invite email:", emailError)
        // Continue even if email fails
      }
    } else {
      console.log(`[Team] Resend not configured, skipping email for ${email.substring(0, 3)}***`)
    }

    const invite = {
      id: member.id,
      email,
      role,
      invitedBy: session.user.name || "관리자",
      invitedAt: member.invitedAt?.toISOString() || new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: { invite },
      message: process.env.RESEND_API_KEY
        ? "초대 이메일이 발송되었습니다."
        : "초대가 생성되었습니다. (이메일 설정 필요)",
    })
  } catch (error) {
    console.error("[Team] Invite error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVITE_FAILED", message: "초대 발송에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}
