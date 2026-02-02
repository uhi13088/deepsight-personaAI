/**
 * Rate Limiter - 금융업계 수준 속도 제한
 * DDoS 방어 및 브루트포스 공격 방지
 */

import { NextRequest, NextResponse } from "next/server"

// ============================================================================
// 타입 정의
// ============================================================================

interface RateLimitConfig {
  /** 윈도우 당 최대 요청 수 */
  maxRequests: number
  /** 윈도우 크기 (밀리초) */
  windowMs: number
  /** 차단 시 대기 시간 (밀리초) */
  blockDurationMs?: number
  /** 차단 해제 후 요청 수 감소량 */
  decayRate?: number
}

interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
  blocked: boolean
  blockedUntil?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

// ============================================================================
// 금융업계 표준 Rate Limit 설정
// ============================================================================

export const RATE_LIMIT_CONFIGS = {
  /** 인증 엔드포인트 - 매우 엄격 (브루트포스 방지) */
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15분
    blockDurationMs: 30 * 60 * 1000, // 30분 차단
  },
  /** 일반 API 엔드포인트 */
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1분
    blockDurationMs: 5 * 60 * 1000, // 5분 차단
  },
  /** 민감한 작업 (생성, 수정, 삭제) */
  SENSITIVE: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1분
    blockDurationMs: 10 * 60 * 1000, // 10분 차단
  },
  /** 검색 및 조회 */
  READ: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1분
  },
  /** 파일 업로드 */
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1분
    blockDurationMs: 15 * 60 * 1000, // 15분 차단
  },
  /** 관리자 엔드포인트 */
  ADMIN: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1분
    blockDurationMs: 10 * 60 * 1000, // 10분 차단
  },
  /** 일반 페이지 접근 */
  GENERAL: {
    maxRequests: 300,
    windowMs: 60 * 1000, // 1분
    blockDurationMs: 5 * 60 * 1000, // 5분 차단
  },
} as const

// Rate Limit 타입 export
export type RateLimitConfigType = typeof RATE_LIMIT_CONFIGS.API
export type RateLimitResultType = {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}
export type RateLimitInfo = {
  limit: number
  remaining: number
  reset: number
}

// ============================================================================
// 인메모리 저장소 (프로덕션에서는 Redis 사용 권장)
// ============================================================================

class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 10분마다 만료된 엔트리 정리
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000)
    }
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  private cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1시간

    for (const [key, entry] of this.store) {
      if (now - entry.lastRequest > maxAge) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// 싱글톤 스토어
const rateLimitStore = new RateLimitStore()

// ============================================================================
// Rate Limiter 클래스
// ============================================================================

export class RateLimiter {
  private config: Required<RateLimitConfig>
  private keyPrefix: string

  constructor(config: RateLimitConfig, keyPrefix: string = "rl") {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      blockDurationMs: config.blockDurationMs ?? config.windowMs * 2,
      decayRate: config.decayRate ?? 1,
    }
    this.keyPrefix = keyPrefix
  }

  /**
   * 클라이언트 식별자 생성
   */
  private getClientIdentifier(request: NextRequest): string {
    // IP 주소 (프록시 뒤에서 실제 IP 가져오기)
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwardedFor?.split(",")[0].trim() || realIp || "unknown"

    // User-Agent 해시 (추가 식별)
    const userAgent = request.headers.get("user-agent") || "unknown"
    const uaHash = this.simpleHash(userAgent)

    return `${this.keyPrefix}:${ip}:${uaHash}`
  }

  /**
   * 간단한 해시 함수
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(16).substring(0, 8)
  }

  /**
   * Rate Limit 체크
   */
  check(request: NextRequest): RateLimitResult {
    const key = this.getClientIdentifier(request)
    const now = Date.now()
    let entry = rateLimitStore.get(key)

    // 새 클라이언트
    if (!entry) {
      entry = {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      }
      rateLimitStore.set(key, entry)

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      }
    }

    // 차단 중인지 확인
    if (entry.blocked && entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.blockedUntil,
          retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
        }
      } else {
        // 차단 해제
        entry.blocked = false
        entry.blockedUntil = undefined
        entry.count = 1
        entry.firstRequest = now
      }
    }

    // 윈도우 만료 확인
    if (now - entry.firstRequest > this.config.windowMs) {
      // 새 윈도우 시작
      entry.count = 1
      entry.firstRequest = now
      entry.lastRequest = now
      rateLimitStore.set(key, entry)

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      }
    }

    // 요청 카운트 증가
    entry.count++
    entry.lastRequest = now

    // 한도 초과 시 차단
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true
      entry.blockedUntil = now + this.config.blockDurationMs
      rateLimitStore.set(key, entry)

      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.blockedUntil,
        retryAfter: Math.ceil(this.config.blockDurationMs / 1000),
      }
    }

    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.firstRequest + this.config.windowMs,
    }
  }

  /**
   * Rate Limit 적용된 응답 반환
   */
  createResponse(result: RateLimitResult, message?: string): NextResponse {
    const headers = new Headers({
      "X-RateLimit-Limit": this.config.maxRequests.toString(),
      "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
      "X-RateLimit-Reset": Math.floor(result.resetAt / 1000).toString(),
    })

    if (!result.allowed) {
      headers.set("Retry-After", (result.retryAfter ?? 60).toString())

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: message ?? "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
            retryAfter: result.retryAfter,
          },
        },
        {
          status: 429,
          headers,
        }
      )
    }

    return NextResponse.next({ headers })
  }
}

// ============================================================================
// 미리 설정된 Rate Limiter 인스턴스
// ============================================================================

export const authRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.AUTH, "auth")
export const apiRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.API, "api")
export const sensitiveRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.SENSITIVE, "sensitive")
export const readRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.READ, "read")
export const uploadRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.UPLOAD, "upload")

// ============================================================================
// 미들웨어 헬퍼
// ============================================================================

/**
 * Rate Limit 미들웨어
 */
export function withRateLimit(
  limiter: RateLimiter,
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = limiter.check(request)

    if (!result.allowed) {
      return limiter.createResponse(result)
    }

    const response = await handler(request)

    // Rate Limit 헤더 추가
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
    response.headers.set("X-RateLimit-Reset", Math.floor(result.resetAt / 1000).toString())

    return response
  }
}

// ============================================================================
// 간단한 Rate Limit 함수 (미들웨어용)
// ============================================================================

// 간단한 인메모리 스토어
const simpleStore = new Map<
  string,
  { count: number; resetTime: number; blocked: boolean; blockedUntil: number }
>()

/**
 * 간단한 Rate Limit 체크 함수
 */
export function checkRateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number; blockDurationMs?: number }
): RateLimitResultType {
  const now = Date.now()
  let entry = simpleStore.get(key)

  // 새 엔트리
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false,
      blockedUntil: 0,
    }
    simpleStore.set(key, entry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    }
  }

  // 차단 중
  if (entry.blocked && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    }
  }

  // 차단 해제
  if (entry.blocked && now >= entry.blockedUntil) {
    entry.blocked = false
    entry.count = 1
    entry.resetTime = now + config.windowMs
    simpleStore.set(key, entry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    }
  }

  // 카운트 증가
  entry.count++

  // 한도 초과
  if (entry.count > config.maxRequests) {
    entry.blocked = true
    entry.blockedUntil = now + (config.blockDurationMs ?? config.windowMs * 2)
    simpleStore.set(key, entry)
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    }
  }

  simpleStore.set(key, entry)
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * IP가 차단되었는지 확인
 */
export function isBlocked(key: string): boolean {
  const entry = simpleStore.get(key)
  if (!entry) return false
  return entry.blocked && Date.now() < entry.blockedUntil
}

/**
 * 차단 정보 조회
 */
export function getBlockedInfo(key: string): { blocked: boolean; blockedUntil?: number } {
  const entry = simpleStore.get(key)
  if (!entry || !entry.blocked) return { blocked: false }
  if (Date.now() >= entry.blockedUntil) return { blocked: false }
  return { blocked: true, blockedUntil: entry.blockedUntil }
}

/**
 * Rate Limit 정보 조회
 */
export function getRateLimitInfo(key: string, config: { maxRequests: number }): RateLimitInfo {
  const entry = simpleStore.get(key)
  if (!entry) {
    return { limit: config.maxRequests, remaining: config.maxRequests, reset: Date.now() }
  }
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: entry.resetTime,
  }
}

/**
 * 만료된 엔트리 정리
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of simpleStore) {
    if (now > entry.resetTime && !entry.blocked) {
      simpleStore.delete(key)
    } else if (entry.blocked && now > entry.blockedUntil) {
      simpleStore.delete(key)
    }
  }
}

/**
 * Rate Limiter 생성 함수
 */
export function createRateLimiter(config: RateLimitConfig, keyPrefix: string = "rl"): RateLimiter {
  return new RateLimiter(config as unknown as RateLimitConfigInternal, keyPrefix)
}

// 내부 타입
interface RateLimitConfigInternal {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number
  decayRate?: number
}

export default RateLimiter
