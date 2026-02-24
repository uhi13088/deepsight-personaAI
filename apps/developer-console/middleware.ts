import { NextRequest, NextResponse } from "next/server"
import { createAuthMiddleware } from "@deepsight/auth"

const authMiddleware = createAuthMiddleware({ loginPath: "/login" })

export function middleware(request: NextRequest) {
  return authMiddleware(request) ?? NextResponse.next()
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
