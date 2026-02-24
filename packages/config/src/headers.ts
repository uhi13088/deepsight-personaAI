/**
 * 공통 보안 헤더 — 금융업계 수준 보안 설정
 *
 * 모든 앱에서 동일하게 적용되는 보안 헤더를 반환합니다.
 */

interface Header {
  key: string
  value: string
}

export interface SecurityHeadersOptions {
  /** DNS Prefetch 제어 헤더 포함 여부 (기본: false) */
  dnsPrefetchControl?: boolean
}

/**
 * 공통 보안 헤더 배열을 반환합니다.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { securityHeaders } from "@deepsight/config"
 *
 * headers: async () => [
 *   { source: "/:path*", headers: securityHeaders() },
 * ]
 * ```
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): Header[] {
  const { dnsPrefetchControl = false } = options

  const headers: Header[] = [
    // XSS 방지
    { key: "X-XSS-Protection", value: "1; mode=block" },
    // MIME 타입 스니핑 방지
    { key: "X-Content-Type-Options", value: "nosniff" },
    // 클릭재킹 방지
    { key: "X-Frame-Options", value: "DENY" },
    // Referrer 정책
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // 권한 정책 (민감한 기능 제한)
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
  ]

  if (dnsPrefetchControl) {
    headers.push({ key: "X-DNS-Prefetch-Control", value: "on" })
  }

  return headers
}
