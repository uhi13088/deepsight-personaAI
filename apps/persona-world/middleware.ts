import { NextRequest, NextResponse } from "next/server"

/**
 * PersonaWorld Auth Middleware
 *
 * NextAuth의 auth() 래퍼 대신 세션 쿠키를 직접 확인.
 * auth() 래퍼를 사용하면 NextAuth 초기화 실패 시 전체 사이트가 다운되므로
 * 쿠키 존재 여부로만 판단하는 안전한 방식을 사용.
 */
export function middleware(request: NextRequest) {
  // NextAuth v5 JWT 세션 쿠키 확인
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value

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
  ],
}
