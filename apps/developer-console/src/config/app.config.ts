/**
 * DeepSight Developer Console - Application Configuration
 */

// =============================================================================
// Session Configuration
// =============================================================================

export const SESSION_CONFIG = {
  /** 세션 최대 유지 시간 (초) */
  maxAge: parseInt(process.env.SESSION_MAX_AGE || "28800", 10), // 8시간

  /** 세션 갱신 간격 (초) */
  updateAge: parseInt(process.env.SESSION_UPDATE_AGE || "3600", 10), // 1시간
} as const

// =============================================================================
// Security Configuration
// =============================================================================

export const SECURITY_CONFIG = {
  /** 비밀번호 최소 길이 */
  passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10),

  /** 비밀번호 최대 길이 */
  passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || "128", 10),
} as const
