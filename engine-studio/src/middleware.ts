import { auth } from "@/lib/auth"
import { NextResponse, type NextRequest } from "next/server"
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter"
import { SECURITY_HEADERS, applyCorsHeaders, CORS_CONFIG } from "@/lib/security/headers"

// ============================================================================
// 경로 설정
// ============================================================================

/** 인증이 필요하지 않은 경로 */
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
]

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
  CONTENT_MANAGER: [
    "/dashboard",
    "/personas",
  ],
  ANALYST: [
    "/dashboard",
    "/personas",
    "/matching-lab/performance",
  ],
}

// ============================================================================
// 보안 헤더 적용
// ============================================================================

function applySecurityHeadersToResponse(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

// ============================================================================
// Rate Limiting 체크
// ============================================================================

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown"
  return ip
}

function getRateLimitConfig(pathname: string): { maxRequests: number; windowMs: number; blockDurationMs?: number } {
  if (pathname.startsWith("/api/auth")) {
    return RATE_LIMIT_CONFIGS.AUTH
  }
  if (pathname.startsWith("/api/admin")) {
    return RATE_LIMIT_CONFIGS.ADMIN
  }
  if (pathname.startsWith("/api/")) {
    return RATE_LIMIT_CONFIGS.API
  }
  return RATE_LIMIT_CONFIGS.GENERAL
}

// ============================================================================
// API Route 미들웨어
// ============================================================================

async function handleApiRoute(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname
  const clientId = getClientIdentifier(request)
  const config = getRateLimitConfig(pathname)

  // Rate Limit 체크
  const rateLimitKey = `${pathname}:${clientId}`
  const rateLimitResult = checkRateLimit(rateLimitKey, config)

  // Rate Limit 초과 시
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 }
    )

    response.headers.set("Retry-After", String(rateLimitResult.retryAfter))
    response.headers.set("X-RateLimit-Limit", String(config.maxRequests))
    response.headers.set("X-RateLimit-Remaining", "0")
    response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime))

    return applySecurityHeadersToResponse(response)
  }

  // CORS Preflight 처리
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 })
    applyCorsHeaders(response.headers, request.headers.get("origin") || "")
    return applySecurityHeadersToResponse(response)
  }

  // API 요청 통과
  const response = NextResponse.next()

  // Rate Limit 헤더 추가
  response.headers.set("X-RateLimit-Limit", String(config.maxRequests))
  response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining))
  response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime))

  // CORS 헤더 적용
  const origin = request.headers.get("origin") || ""
  if (CORS_CONFIG.allowedOrigins.includes("*") || CORS_CONFIG.allowedOrigins.includes(origin)) {
    applyCorsHeaders(response.headers, origin)
  }

  return applySecurityHeadersToResponse(response)
}

// ============================================================================
// 메인 미들웨어
// ============================================================================

export default auth(async (req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  // API 라우트 처리
  if (pathname.startsWith("/api/")) {
    // 인증 관련 API는 통과
    if (pathname.startsWith("/api/auth")) {
      const response = await handleApiRoute(req)
      return response
    }

    // 기타 API는 Rate Limit + 보안 헤더 적용
    return handleApiRoute(req)
  }

  // 정적 리소스는 보안 헤더만 적용
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return applySecurityHeadersToResponse(NextResponse.next())
  }

  const isLoggedIn = !!req.auth

  // 공개 경로 확인
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    pathname.startsWith(path)
  )

  if (isPublicPath) {
    return applySecurityHeadersToResponse(NextResponse.next())
  }

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
  const userRole = req.auth?.user?.role || "ANALYST"
  const allowedPaths = ROLE_PERMISSIONS[userRole] || []

  if (allowedPaths.includes("*")) {
    return applySecurityHeadersToResponse(NextResponse.next())
  }

  const hasAccess = allowedPaths.some((path) =>
    pathname.startsWith(path)
  )

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return applySecurityHeadersToResponse(NextResponse.next())
})

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
