import type { NextConfig } from "next"
import { securityHeaders } from "@deepsight/config"

function getEngineStudioUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL?.trim()
  if (!raw) {
    if (process.env.VERCEL) {
      console.warn(
        "\x1b[33m[persona-world] WARNING: NEXT_PUBLIC_ENGINE_STUDIO_URL is not set!\x1b[0m\n" +
          "All API calls will fail. Set this env var in Vercel project settings.\n" +
          "Example: NEXT_PUBLIC_ENGINE_STUDIO_URL=https://your-engine-studio.vercel.app"
      )
    }
    return "http://localhost:3000"
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "")
  }
  return `https://${raw}`.replace(/\/+$/, "")
}

const ENGINE_STUDIO_URL = getEngineStudioUrl()

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
