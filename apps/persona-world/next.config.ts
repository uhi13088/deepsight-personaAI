import type { NextConfig } from "next"

function getEngineApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_API_URL?.trim()
  if (!raw) {
    if (process.env.VERCEL) {
      console.warn(
        "\x1b[33m[persona-world] WARNING: NEXT_PUBLIC_ENGINE_API_URL is not set!\x1b[0m\n" +
          "All API calls will fail. Set this env var in Vercel project settings.\n" +
          "Example: NEXT_PUBLIC_ENGINE_API_URL=https://your-engine-studio.vercel.app"
      )
    }
    return "http://localhost:3000"
  }
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
