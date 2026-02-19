/**
 * Engine Studio Middleware
 * 쿠키 기반 인증 체크 — NextAuth 초기화에 의존하지 않음 (crash 방지)
 */

import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value

  if (!sessionToken) {
    // API 라우트는 401 반환
    if (request.nextUrl.pathname.startsWith("/api/internal")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      )
    }

    // 페이지 라우트는 로그인 페이지로 리다이렉트
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 대시보드 및 모든 관리 페이지
    "/dashboard/:path*",
    "/persona-studio/:path*",
    "/matching-lab/:path*",
    "/global-config/:path*",
    "/operations/:path*",
    "/persona-world-admin/:path*",
    "/system-integration/:path*",
    "/team/:path*",
    "/user-insight/:path*",
    "/arena/:path*",
    // Internal API 라우트
    "/api/internal/:path*",
  ],
}
