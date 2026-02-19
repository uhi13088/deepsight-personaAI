/**
 * API Route Authentication Guard
 * 모든 보호된 API 라우트에서 사용하는 인증 헬퍼
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { Session } from "next-auth"

interface AuthResult {
  session: Session
  response?: never
}

interface AuthError {
  session?: never
  response: NextResponse
}

/**
 * API 라우트에서 인증을 강제하는 헬퍼
 *
 * @example
 * export async function GET() {
 *   const { session, response } = await requireAuth()
 *   if (response) return response
 *   // session.user.id 사용 가능
 * }
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return {
        response: NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
          { status: 401 }
        ),
      }
    }

    return { session }
  } catch (error) {
    console.error("[Auth Guard] Session check failed:", error)
    return {
      response: NextResponse.json(
        {
          success: false,
          error: { code: "AUTH_ERROR", message: "인증 처리 중 오류가 발생했습니다." },
        },
        { status: 500 }
      ),
    }
  }
}
