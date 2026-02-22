import { NextRequest, NextResponse } from "next/server"

/**
 * PersonaWorld Auth Middleware
 *
 * 1. 페이지 라우트: 세션 쿠키 없으면 로그인 페이지로 리다이렉트
 * 2. API 프록시 라우트: 세션 쿠키 검증 + X-Internal-Token 헤더 주입
 *    → engine-studio에 전달되어 서비스간 인증으로 사용
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // NextAuth v5 JWT 세션 쿠키 확인
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value

  // ── API 프록시 라우트: 인증 + 내부 토큰 주입 ──────────────
  if (pathname.startsWith("/api/public/") || pathname.startsWith("/api/persona-world/")) {
    // /api/public/auth/* 는 로그인 전에 호출되므로 인증 제외
    if (pathname.startsWith("/api/public/auth/")) {
      return NextResponse.next()
    }

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      )
    }

    // 프록시 요청에 내부 인증 토큰 주입
    const internalSecret = process.env.INTERNAL_API_SECRET
    if (internalSecret) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-internal-token", internalSecret)
      return NextResponse.next({
        request: { headers: requestHeaders },
      })
    }

    return NextResponse.next()
  }

  // ── 페이지 라우트: 세션 없으면 로그인 리다이렉트 ───────────
  if (!sessionToken) {
    const loginUrl = new URL("/", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/feed/:path*",
    "/explore/:path*",
    "/profile/:path*",
    "/persona/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
    "/shop/:path*",
    "/settings/:path*",
    "/api/public/:path*",
    "/api/persona-world/:path*",
  ],
}
