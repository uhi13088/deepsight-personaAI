/**
 * Security Headers - 금융업계 수준 보안 헤더
 * OWASP 권장 보안 헤더 구현
 */

// ============================================================================
// CSP (Content Security Policy) 설정
// ============================================================================

/**
 * 금융업계 표준 CSP 정책
 */
export const CSP_DIRECTIVES = {
  // 기본 정책: 모든 리소스 자기 출처에서만 로드
  "default-src": ["'self'"],

  // 스크립트 소스: Next.js에서 필요한 설정
  // Note: 'unsafe-eval' and 'unsafe-inline' are added conditionally in generateCSP() for development only
  "script-src": [
    "'self'",
    "https://www.googletagmanager.com", // Analytics (필요한 경우)
  ],

  // 스타일 소스
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Tailwind CSS inline styles
  ],

  // 이미지 소스
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https:", // HTTPS 이미지만 허용
  ],

  // 폰트 소스
  "font-src": ["'self'", "data:"],

  // 연결 소스 (API, WebSocket 등)
  "connect-src": [
    "'self'",
    "https://api.openai.com", // OpenAI API
    "https://api.anthropic.com", // Anthropic API
  ],

  // 프레임 소스: 프레임 삽입 차단
  "frame-src": ["'none'"],

  // 객체 소스: Flash 등 차단
  "object-src": ["'none'"],

  // 기본 URI
  "base-uri": ["'self'"],

  // Form action
  "form-action": ["'self'"],

  // Frame ancestors: 클릭재킹 방지
  "frame-ancestors": ["'none'"],

  // 업그레이드 insecure requests
  "upgrade-insecure-requests": [],

  // 블록 모든 mixed content
  "block-all-mixed-content": [],
} as const

/**
 * CSP 헤더 문자열 생성
 */
export function generateCSP(isDevelopment: boolean = false): string {
  // CSP 디렉티브를 가변 객체로 복사
  const directives: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(CSP_DIRECTIVES)) {
    directives[key] = [...value]
  }

  // 개발 모드에서 추가 설정 (unsafe-eval/unsafe-inline은 프로덕션에서 보안 위험)
  if (isDevelopment) {
    directives["script-src"].push("'unsafe-eval'", "'unsafe-inline'")
    directives["connect-src"].push("ws:", "wss:")
  }

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key
      }
      return `${key} ${values.join(" ")}`
    })
    .join("; ")
}

// ============================================================================
// 보안 헤더 설정
// ============================================================================

/**
 * 금융업계 표준 보안 헤더
 */
export const SECURITY_HEADERS = {
  // Content Security Policy
  "Content-Security-Policy": generateCSP(process.env.NODE_ENV === "development"),

  // X-Frame-Options: 클릭재킹 방지
  "X-Frame-Options": "DENY",

  // X-Content-Type-Options: MIME 스니핑 방지
  "X-Content-Type-Options": "nosniff",

  // X-XSS-Protection: XSS 필터 활성화 (레거시 브라우저용)
  "X-XSS-Protection": "1; mode=block",

  // Strict-Transport-Security: HTTPS 강제 (2년)
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",

  // Referrer-Policy: 리퍼러 정보 제한
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions-Policy: 브라우저 기능 제한
  "Permissions-Policy": [
    "accelerometer=()",
    "ambient-light-sensor=()",
    "autoplay=()",
    "battery=()",
    "camera=()",
    "cross-origin-isolated=()",
    "display-capture=()",
    "document-domain=()",
    "encrypted-media=()",
    "execution-while-not-rendered=()",
    "execution-while-out-of-viewport=()",
    "fullscreen=(self)",
    "geolocation=()",
    "gyroscope=()",
    "keyboard-map=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "navigation-override=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=()",
    "screen-wake-lock=()",
    "sync-xhr=()",
    "usb=()",
    "web-share=()",
    "xr-spatial-tracking=()",
  ].join(", "),

  // X-DNS-Prefetch-Control: DNS 프리페치 비활성화 (프라이버시)
  "X-DNS-Prefetch-Control": "off",

  // X-Download-Options: IE 다운로드 실행 방지
  "X-Download-Options": "noopen",

  // X-Permitted-Cross-Domain-Policies: Flash/PDF 정책
  "X-Permitted-Cross-Domain-Policies": "none",

  // Cache-Control: 민감한 페이지 캐시 방지
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",

  // Pragma: HTTP/1.0 캐시 방지
  Pragma: "no-cache",

  // Expires: 캐시 만료
  Expires: "0",
} as const

/**
 * API 응답용 보안 헤더 (일부 제외)
 */
export const API_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const

// ============================================================================
// CORS 설정
// ============================================================================

/**
 * 허용된 CORS Origin 목록
 */
export const ALLOWED_ORIGINS = [
  // 프로덕션 도메인 (환경변수에서 설정)
  process.env.NEXT_PUBLIC_APP_URL,
  // 개발 환경
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
].filter(Boolean) as string[]

/**
 * CORS 설정
 */
export const CORS_CONFIG = {
  // 허용된 Origin 목록
  allowedOrigins: [
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000", "*"]
      : []),
  ],

  // 허용된 HTTP 메서드
  allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // 허용된 헤더
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "X-Request-ID",
  ],

  // 노출되는 헤더
  exposedHeaders: [
    "X-Request-ID",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],

  // 자격 증명 허용
  credentials: true,

  // 프리플라이트 캐시 시간 (초)
  maxAge: 86400, // 24시간
} as const

/**
 * CORS 헤더 생성
 */
export function generateCORSHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {}

  // Origin 검증
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }

  headers["Access-Control-Allow-Methods"] = CORS_CONFIG.allowedMethods.join(", ")
  headers["Access-Control-Allow-Headers"] = CORS_CONFIG.allowedHeaders.join(", ")
  headers["Access-Control-Expose-Headers"] = CORS_CONFIG.exposedHeaders.join(", ")
  headers["Access-Control-Max-Age"] = CORS_CONFIG.maxAge.toString()

  if (CORS_CONFIG.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true"
  }

  return headers
}

/**
 * Origin 검증
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin)
}

// ============================================================================
// 헤더 적용 유틸리티
// ============================================================================

/**
 * Response에 보안 헤더 적용
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * API Response에 보안 헤더 적용
 */
export function applyAPISecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)

  Object.entries(API_SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ============================================================================
// 미들웨어용 헬퍼 함수
// ============================================================================

export interface CorsConfig {
  allowedOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  exposedHeaders: string[]
  credentials: boolean
  maxAge: number
}

/**
 * Headers 객체에 CORS 헤더 적용
 */
export function applyCorsHeaders(headers: Headers, origin: string): void {
  // Origin 검증
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", origin)
  }

  headers.set("Access-Control-Allow-Methods", CORS_CONFIG.allowedMethods.join(", "))
  headers.set("Access-Control-Allow-Headers", CORS_CONFIG.allowedHeaders.join(", "))
  headers.set("Access-Control-Expose-Headers", CORS_CONFIG.exposedHeaders.join(", "))
  headers.set("Access-Control-Max-Age", CORS_CONFIG.maxAge.toString())

  if (CORS_CONFIG.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true")
  }
}

const headersUtils = {
  SECURITY_HEADERS,
  API_SECURITY_HEADERS,
  CSP_DIRECTIVES,
  CORS_CONFIG,
  ALLOWED_ORIGINS,
  generateCSP,
  generateCORSHeaders,
  isAllowedOrigin,
  applySecurityHeaders,
  applyAPISecurityHeaders,
  applyCorsHeaders,
}

export default headersUtils
