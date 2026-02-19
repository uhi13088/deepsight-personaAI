import { NextRequest, NextResponse } from "next/server"

/**
 * Developer Console Auth Middleware
 *
 * NextAuth의 auth() 래퍼 대신 세션 쿠키를 직접 확인.
 * auth() 래퍼를 사용하면 NextAuth 초기화 실패 시 전체 사이트가 다운되므로
 * 쿠키 존재 여부로만 판단하는 안전한 방식을 사용.
 */
export function middleware(request: NextRequest) {
  // NextAuth v5 JWT 세션 쿠키 확인 (production: __Secure- prefix)
  const sessionToken =
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api-keys/:path*",
    "/logs/:path*",
    "/webhooks/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/team/:path*",
    "/support/:path*",
    "/docs/:path*",
  ],
}
