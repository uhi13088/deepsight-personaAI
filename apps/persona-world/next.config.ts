import type { NextConfig } from "next"

const ENGINE_API_URL = process.env.NEXT_PUBLIC_ENGINE_API_URL || "http://localhost:3000"

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
