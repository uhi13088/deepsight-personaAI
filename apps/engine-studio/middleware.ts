import { NextRequest, NextResponse } from "next/server"
import { createAuthMiddleware } from "@deepsight/auth"

const authMiddleware = createAuthMiddleware({
  loginPath: "/login",
  apiPrefix: "/api/internal",
})

export function middleware(request: NextRequest) {
  return authMiddleware(request) ?? NextResponse.next()
}

export const config = {
  matcher: [
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
    "/security/:path*",
    "/api/internal/:path*",
  ],
}
