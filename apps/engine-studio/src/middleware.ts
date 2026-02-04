import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// ============================================================================
// CORS 설정
// ============================================================================

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_DEVELOPER_CONSOLE_URL,
  ...(process.env.NODE_ENV === "development"
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ]
    : []),
].filter(Boolean) as string[]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-API-Key",
    "Access-Control-Expose-Headers": "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }

  return headers
}

// ============================================================================
// 경로 설정
// ============================================================================

/** 인증이 필요하지 않은 경로 */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/admin/seed"]

/** CORS 허용 API 경로 (외부에서 접근 가능) */
const CORS_API_PATHS = ["/api/personas", "/api/matching", "/api/v1"]

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
  const origin = req.headers.get("origin")

  // 정적 리소스는 통과
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next()
  }

  // CORS API 경로 확인
  const isCorsApiPath = CORS_API_PATHS.some((path) => pathname.startsWith(path))

  // CORS Preflight (OPTIONS) 요청 처리
  if (req.method === "OPTIONS" && isCorsApiPath) {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  // CORS API 경로에 CORS 헤더 추가
  if (isCorsApiPath) {
    const response = NextResponse.next()
    const corsHeaders = getCorsHeaders(origin)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  // 공개 경로 확인
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // JWT 토큰 확인 (Edge Runtime 호환)
  // 프로덕션에서는 __Secure- prefix 쿠키 사용
  const isProduction = process.env.NODE_ENV === "production"
  const cookieName = isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token"

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    cookieName,
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
