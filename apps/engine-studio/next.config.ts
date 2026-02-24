import type { NextConfig } from "next"
import { securityHeaders } from "@deepsight/config"

/**
 * Next.js Configuration - 금융업계 수준 보안 설정
 */
const nextConfig: NextConfig = {
  // 보안 헤더 (미들웨어와 함께 적용)
  headers: async () => [
    {
      source: "/:path*",
      headers: securityHeaders({ dnsPrefetchControl: true }),
    },
    // Public API CORS — 허용된 오리진만 (next.config는 동적 Origin 불가하므로 미들웨어에서 처리)
    // 여기서는 Methods/Headers만 선언, Origin은 미들웨어에서 동적 검증
    {
      source: "/api/public/:path*",
      headers: [
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, POST, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type, X-Internal-Token",
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
  redirects: async () => [
    // HTTP를 HTTPS로 리다이렉트 (프로덕션)
    // 보안을 위해 루트 경로 접근 시 대시보드로 이동
    {
      source: "/",
      destination: "/dashboard",
      permanent: false,
    },
  ],

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
      allowedOrigins: [process.env.NEXTAUTH_URL || "http://localhost:3000"].filter(
        Boolean
      ) as string[],
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
