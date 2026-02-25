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
  // API 프록시는 route handler에서 fetch()로 처리
  // → middleware가 주입한 x-internal-token, x-authenticated-email 헤더가
  //   engine-studio에 정확히 전달됨 (next.config.ts rewrites는 미들웨어 헤더 미전달)
}

export default nextConfig
