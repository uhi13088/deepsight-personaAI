import { NextRequest, NextResponse } from "next/server"

/**
 * NextAuth 세션 쿠키 기반 미들웨어 헬퍼
 * 쿠키가 없으면 로그인 페이지로 리다이렉트하거나 401 반환
 */
export function checkAuthCookie(request: NextRequest): boolean {
  const sessionToken =
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value
  return !!sessionToken
}

export interface AuthMiddlewareOptions {
  loginPath?: string
  apiPrefix?: string
}

/**
 * Auth 미들웨어 팩토리 — 앱별 라우트 설정을 주입받아 미들웨어 핸들러 생성
 *
 * API 라우트 → 401 JSON 반환, 페이지 라우트 → 로그인 리다이렉트
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const { loginPath = "/login", apiPrefix = "/api/internal" } = options

  return function middleware(request: NextRequest): NextResponse | undefined {
    const hasSession = checkAuthCookie(request)
    if (hasSession) return undefined

    // API 라우트 → 401 JSON
    if (request.nextUrl.pathname.startsWith(apiPrefix)) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      )
    }

    // 페이지 라우트 → 로그인 리다이렉트
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
}
