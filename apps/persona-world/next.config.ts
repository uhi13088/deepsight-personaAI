import type { NextConfig } from "next"
import { securityHeaders, getEngineStudioUrl } from "@deepsight/config"

const ENGINE_STUDIO_URL = getEngineStudioUrl({ appName: "persona-world" })

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
  async rewrites() {
    return [
      {
        source: "/api/persona-world/:path*",
        destination: `${ENGINE_STUDIO_URL}/api/persona-world/:path*`,
      },
      {
        source: "/api/public/:path*",
        destination: `${ENGINE_STUDIO_URL}/api/public/:path*`,
      },
    ]
  },
}

export default nextConfig
