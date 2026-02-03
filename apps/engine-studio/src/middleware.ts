import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// ============================================================================
// 경로 설정
// ============================================================================

/** 인증이 필요하지 않은 경로 */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/admin/seed"]

/** 역할별 접근 가능 경로 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"],
  AI_ENGINEER: [
    "/dashboard",
    "/personas",
    "/user-insight",
    "/matching-lab",
    "/system-integration",
    "/operations",
  ],
  CONTENT_MANAGER: ["/dashboard", "/personas"],
  ANALYST: ["/dashboard", "/personas", "/matching-lab/performance"],
}

// ============================================================================
// 메인 미들웨어 (Edge Runtime 호환)
// ============================================================================

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  // 정적 리소스는 통과
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next()
  }

  // 공개 경로 확인
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // JWT 토큰 확인 (Edge Runtime 호환)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token

  // 로그인 필요
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 루트 경로면 대시보드로 리다이렉트
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // 역할 기반 접근 제어
  const userRole = (token.role as string) || "ANALYST"
  const allowedPaths = ROLE_PERMISSIONS[userRole] || []

  if (allowedPaths.includes("*")) {
    return NextResponse.next()
  }

  const hasAccess = allowedPaths.some((path) => pathname.startsWith(path))

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|sitemap.xml|robots.txt).*)",
  ],
}
