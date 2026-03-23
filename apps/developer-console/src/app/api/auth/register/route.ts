import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { SECURITY_CONFIG } from "@/config/app.config"

const registerSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다").max(100),
  email: z.string().email("유효한 이메일을 입력해주세요").max(254),
  password: z
    .string()
    .min(
      SECURITY_CONFIG.passwordMinLength,
      `비밀번호는 최소 ${SECURITY_CONFIG.passwordMinLength}자`
    )
    .max(
      SECURITY_CONFIG.passwordMaxLength,
      `비밀번호는 최대 ${SECURITY_CONFIG.passwordMaxLength}자`
    )
    .regex(/[A-Z]/, "대문자 1개 이상 필요")
    .regex(/[a-z]/, "소문자 1개 이상 필요")
    .regex(/\d/, "숫자 1개 이상 필요")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "특수문자 1개 이상 필요"),
  company: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { name, email, password, company } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // 이메일 중복 확인
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "이미 가입된 이메일입니다",
          },
        },
        { status: 409 }
      )
    }

    // 비밀번호 해싱 + 사용자 생성 + 기본 조직 생성
    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    })

    // 기본 조직 + OWNER 멤버십 자동 생성 (Google OAuth와 동일 로직)
    const org = await prisma.organization.create({
      data: {
        name: company || `${name}의 조직`,
        slug: user.id,
      },
    })
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "OWNER",
        acceptedAt: new Date(),
      },
    })

    return NextResponse.json(
      { success: true, data: { message: "회원가입이 완료되었습니다" } },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Register] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "회원가입 처리 중 오류가 발생했습니다",
        },
      },
      { status: 500 }
    )
  }
}
