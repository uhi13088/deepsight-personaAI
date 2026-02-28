import { NextRequest, NextResponse } from "next/server"

/**
 * PersonaWorld Auth Middleware
 *
 * 1. 페이지 라우트: 세션 쿠키 없으면 로그인 페이지로 리다이렉트
 * 2. API 프록시 라우트: 세션/인증 체크만 담당
 *    → 실제 프록시 + 헤더 주입은 route handler (api-proxy.ts)에서 처리
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // NextAuth v5 JWT 세션 쿠키 확인
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value

  // ── /api/public/*: 공개 API — 세션 불필요, 프록시 route handler가 처리 ──
  if (pathname.startsWith("/api/public/")) {
    return NextResponse.next()
  }

  // ── /api/persona-world/onboarding/sns/callback/*: OAuth 콜백 — 세션 불필요 ──
  // OAuth 제공자(Instagram 등)가 브라우저를 redirect하므로 세션 쿠키 없음.
  // 보안은 engine-studio의 state 파라미터 검증(CSRF 방지 + 10분 만료)으로 처리.
  if (pathname.startsWith("/api/persona-world/onboarding/sns/callback/")) {
    return NextResponse.next()
  }

  // ── /api/persona-world/*: 인증 필수, 프록시 route handler가 헤더 주입 처리 ──
  if (pathname.startsWith("/api/persona-world/")) {
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      )
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
