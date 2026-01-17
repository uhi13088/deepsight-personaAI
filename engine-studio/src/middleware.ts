import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// 인증이 필요하지 않은 경로
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
]

// 역할별 접근 가능 경로
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ["*"], // 모든 경로 접근 가능
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

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // 공개 경로 확인
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    nextUrl.pathname.startsWith(path)
  )

  if (isPublicPath) {
    return NextResponse.next()
  }

  // 로그인 필요
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 루트 경로면 대시보드로 리다이렉트
  if (nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // 역할 기반 접근 제어
  const userRole = req.auth?.user?.role || "ANALYST"
  const allowedPaths = ROLE_PERMISSIONS[userRole] || []

  if (allowedPaths.includes("*")) {
    return NextResponse.next()
  }

  const hasAccess = allowedPaths.some((path) =>
    nextUrl.pathname.startsWith(path)
  )

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
