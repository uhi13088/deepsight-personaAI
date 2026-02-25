import type { NextConfig } from "next"
import { securityHeaders } from "@deepsight/config"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ]
  },
  // API 프록시는 middleware.ts에서 NextResponse.rewrite()로 처리
  // → 헤더 주입(x-internal-token, x-authenticated-email)이 rewrite와 함께 보장됨
}

export default nextConfig
