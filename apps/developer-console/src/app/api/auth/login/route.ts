import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요").max(254),
  password: z.string().min(1, "비밀번호를 입력해주세요").max(128, "비밀번호가 너무 깁니다"),
})

/**
 * POST /api/auth/login - 이메일/비밀번호 자격증명 검증
 *
 * 브라우저 로그인은 NextAuth Credentials Provider(/api/auth/[...nextauth])를 사용.
 * 이 엔드포인트는 API 클라이언트가 자격증명을 검증할 때 사용한다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // DB에서 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        image: true,
      },
    })

    // 사용자 없음 (타이밍 공격 방지: 동일 응답 시간 유지)
    if (!user || !user.password) {
      await verifyPassword(
        password,
        "$2b$12$invalidhashpadding000000000000000000000000000000000000"
      )
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "이메일 또는 비밀번호가 올바르지 않습니다.",
          },
        },
        { status: 401 }
      )
    }

    // 비밀번호 검증
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "이메일 또는 비밀번호가 올바르지 않습니다.",
          },
        },
        { status: 401 }
      )
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || "",
          image: user.image || null,
        },
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "로그인 처리 중 오류가 발생했습니다." },
      },
      { status: 500 }
    )
  }
}
