import { NextResponse } from "next/server"
import type { Session } from "next-auth"

export interface AuthResult {
  session: Session
  response?: never
}

export interface AuthError {
  session?: never
  response: NextResponse
}

/**
 * requireAuth 팩토리 — 앱별 auth() 함수를 주입받아 인증 가드를 생성
 *
 * @example
 * // apps/engine-studio/src/lib/require-auth.ts
 * import { createRequireAuth } from "@deepsight/auth"
 * import { auth } from "./auth"
 * export const requireAuth = createRequireAuth(auth)
 */
export function createRequireAuth(
  authFn: () => Promise<Session | null>
): () => Promise<AuthResult | AuthError> {
  return async function requireAuth(): Promise<AuthResult | AuthError> {
    try {
      const session = await authFn()

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
}
