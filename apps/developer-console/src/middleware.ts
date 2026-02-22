import { NextRequest, NextResponse } from "next/server"

/**
 * API 보안 미들웨어
 *
 * T220: 보안 응답 헤더 추가
 * T221: 요청 크기 제한 (1MB)
 *
 * /api/* 라우트에만 적용
 */

const REQUEST_SIZE_LIMIT = 1 * 1024 * 1024 // 1MB

export function middleware(request: NextRequest) {
  // T221: 요청 크기 제한
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > REQUEST_SIZE_LIMIT) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "요청 크기가 너무 큽니다. (최대 1MB)",
        },
      },
      { status: 413 }
    )
  }

  const response = NextResponse.next()

  // T220: 보안 응답 헤더
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )

  return response
}

export const config = {
  matcher: "/api/:path*",
}
