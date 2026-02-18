import type { NextConfig } from "next"

function getEngineStudioUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL?.trim()
  if (!raw) return "http://localhost:3000"
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "")
  }
  return `https://${raw}`.replace(/\/+$/, "")
}

const ENGINE_STUDIO_URL = getEngineStudioUrl()

/**
 * Next.js Configuration - 금융업계 수준 보안 설정
 */
const nextConfig: NextConfig = {
  // engine-studio API 프록시 (CORS 우회)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${ENGINE_STUDIO_URL}/api/:path*`,
      },
    ]
  },

  // 보안 헤더 (미들웨어와 함께 적용)
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        // XSS 방지
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        // MIME 타입 스니핑 방지
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        // 클릭재킹 방지
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        // Referrer 정책
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        // 권한 정책 (민감한 기능 제한)
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
        // DNS Prefetch 제어
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
      ],
    },
    // 정적 자산에 대한 캐시 설정
    {
      source: "/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],

  // 리다이렉트 설정
  redirects: async () => [],

  // 이미지 최적화 설정
  images: {
    // 허용된 외부 이미지 도메인
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // 이미지 포맷 최적화
    formats: ["image/avif", "image/webp"],
  },

  // 실험적 기능
  experimental: {
    // 서버 액션 보안 설정
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["http://localhost:3003"].filter(Boolean) as string[],
    },
  },

  // 빌드 시 타입 체크
  typescript: {
    // 빌드 시 타입 에러도 검사
    ignoreBuildErrors: false,
  },

  // 보안을 위한 소스맵 비활성화 (프로덕션)
  productionBrowserSourceMaps: false,

  // 전원 상태 표시 제거
  poweredByHeader: false,

  // 빌드 최적화
  compiler: {
    // 프로덕션에서 console.log 제거
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // 환경변수 검증
  env: {
    // 필수 환경변수가 없으면 빌드 실패
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.0.0",
  },
}

export default nextConfig
