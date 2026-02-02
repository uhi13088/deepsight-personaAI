/**
 * Security Module - 금융업계 수준 보안
 * 중앙 집중식 보안 유틸리티 export
 */

// Rate Limiter
export {
  createRateLimiter,
  checkRateLimit,
  isBlocked,
  getBlockedInfo,
  getRateLimitInfo,
  cleanupExpiredEntries,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfigType as RateLimitConfig,
  type RateLimitResultType as RateLimitResult,
  type RateLimitInfo,
} from "./rate-limiter"

// Encryption
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  encrypt,
  decrypt,
  hmacSign,
  hmacVerify,
  generateSecureToken,
  sha256,
  type PasswordStrengthResult,
} from "./encryption"

// Security Headers
export {
  SECURITY_HEADERS,
  CORS_CONFIG,
  applySecurityHeaders,
  applyCorsHeaders,
  generateCSP,
  type CorsConfig,
} from "./headers"

// Validators
export {
  containsXSS,
  containsSQLInjection,
  containsCommandInjection,
  containsPathTraversal,
  containsSecurityThreat,
  escapeHtml,
  sanitizeString,
  sanitizeFilename,
  sanitizeUrl,
  isValidEmail,
  isValidUUID,
  isValidISODate,
  validateSchema,
  validateRequestBody,
  validateQueryParams,
  LOGIN_SCHEMA,
  REGISTER_SCHEMA,
  PERSONA_CREATE_SCHEMA,
  PAGINATION_SCHEMA,
  type ValidationResult,
  type ValidationError,
  type ValidationSchema,
  type FieldSchema,
  type SchemaType,
} from "./validators"

// Audit Logger
export {
  auditLogger,
  type AuditCategory,
  type AuditSeverity,
  type AuditAction,
  type AuditLogEntry,
  type AuditContext,
} from "./audit-logger"
