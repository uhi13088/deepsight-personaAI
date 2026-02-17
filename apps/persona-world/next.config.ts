import type { NextConfig } from "next"

function getEngineApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_API_URL?.trim()
  if (!raw) return "http://localhost:3000"
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "")
  }
  return `https://${raw}`.replace(/\/+$/, "")
}

const ENGINE_API_URL = getEngineApiUrl()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${ENGINE_API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
