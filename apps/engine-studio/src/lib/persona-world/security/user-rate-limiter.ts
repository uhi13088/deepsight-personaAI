// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — User Rate Limiter (T304~T307)
// 유저 인터랙션 요청 빈도 제한
// ═══════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number
  resetAt: number
}

// 인메모리 rate limit store (앱 재시작 시 리셋)
const rateLimitStore = new Map<string, RateLimitEntry>()

// 주기적 정리 (10분마다)
const CLEANUP_INTERVAL = 10 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** 최대 요청 수 */
  maxRequests: number
  /** 윈도우 (ms) */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * 유저 rate limit 체크.
 *
 * 인메모리 sliding window 기반.
 */
export function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const key = `${action}:${userId}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // 새 윈도우
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

// ── 기본 rate limit 설정 ─────────────────────────────────────

export const RATE_LIMITS = {
  like: { maxRequests: 60, windowMs: 60 * 60 * 1000 } as RateLimitConfig, // 60/h
  comment: { maxRequests: 30, windowMs: 60 * 60 * 1000 } as RateLimitConfig, // 30/h
  follow: { maxRequests: 20, windowMs: 60 * 60 * 1000 } as RateLimitConfig, // 20/h
  repost: { maxRequests: 30, windowMs: 60 * 60 * 1000 } as RateLimitConfig, // 30/h
} as const
