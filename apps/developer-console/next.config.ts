import type { NextConfig } from "next"
import { securityHeaders } from "@deepsight/config"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: securityHeaders(),
    },
  ],
}

export default nextConfig
