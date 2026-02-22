import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

/**
 * PersonaWorld Auth Middleware
 *
 * 1. 페이지 라우트: 세션 쿠키 없으면 로그인 페이지로 리다이렉트
 * 2. API 프록시 라우트: 세션 쿠키 검증 + X-Internal-Token + X-Authenticated-Email 헤더 주입
 *    → engine-studio에 전달되어 서비스간 인증 + 유저 소유권 검증으로 사용
 */
export async function middleware(request: NextRequest) {
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

    // 프록시 요청에 내부 인증 토큰 + 인증된 유저 이메일 주입
    const requestHeaders = new Headers(request.headers)

    const internalSecret = process.env.INTERNAL_API_SECRET
    if (internalSecret) {
      requestHeaders.set("x-internal-token", internalSecret)
    }

    // JWT에서 이메일 추출 → 유저 소유권 검증에 사용
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
      })
      if (token?.email) {
        requestHeaders.set("x-authenticated-email", token.email as string)
      }
    } catch {
      // JWT 디코딩 실패 시에도 요청은 통과 (x-internal-token 검증은 별도)
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
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
