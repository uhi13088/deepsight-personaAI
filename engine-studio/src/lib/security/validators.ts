/**
 * Input Validators - 금융업계 수준 입력 검증
 * XSS, SQL Injection, Command Injection 방지
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  sanitized?: unknown
}

export interface ValidationError {
  field: string
  code: string
  message: string
}

// ============================================================================
// 위험 패턴 정의
// ============================================================================

/** XSS 공격 패턴 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /data:/gi,
  /vbscript:/gi,
]

/** SQL Injection 패턴 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /('|")\s*(OR|AND)\s*('|"|\d)/gi,
  /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
  /--\s*$/gm,
  /\/\*[\s\S]*?\*\//g,
  /\bOR\b\s+\d+\s*=\s*\d+/gi,
  /\bAND\b\s+\d+\s*=\s*\d+/gi,
]

/** Command Injection 패턴 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]/g,
  /\$\(/g,
  /`[^`]*`/g,
  /\|\|/g,
  /&&/g,
]

/** Path Traversal 패턴 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.%2e\//gi,
  /%2e\.\//gi,
]

// ============================================================================
// 기본 검증 함수
// ============================================================================

/**
 * XSS 공격 패턴 검사
 * Note: Reset lastIndex to avoid global regex state issues
 */
export function containsXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0 // Reset lastIndex to avoid false positives/negatives
    return pattern.test(input)
  })
}

/**
 * SQL Injection 패턴 검사
 * Note: Reset lastIndex to avoid global regex state issues
 */
export function containsSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0 // Reset lastIndex to avoid false positives/negatives
    return pattern.test(input)
  })
}

/**
 * Command Injection 패턴 검사
 * Note: Reset lastIndex to avoid global regex state issues
 */
export function containsCommandInjection(input: string): boolean {
  return COMMAND_INJECTION_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0 // Reset lastIndex to avoid false positives/negatives
    return pattern.test(input)
  })
}

/**
 * Path Traversal 패턴 검사
 * Note: Reset lastIndex to avoid global regex state issues
 */
export function containsPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0 // Reset lastIndex to avoid false positives/negatives
    return pattern.test(input)
  })
}

/**
 * 모든 보안 위협 검사
 */
export function containsSecurityThreat(input: string): {
  hasThreat: boolean
  threats: string[]
} {
  const threats: string[] = []

  if (containsXSS(input)) threats.push("XSS")
  if (containsSQLInjection(input)) threats.push("SQL_INJECTION")
  if (containsCommandInjection(input)) threats.push("COMMAND_INJECTION")
  if (containsPathTraversal(input)) threats.push("PATH_TRAVERSAL")

  return {
    hasThreat: threats.length > 0,
    threats,
  }
}

// ============================================================================
// 문자열 새니타이징
// ============================================================================

/**
 * HTML 엔티티 인코딩
 */
export function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  }

  return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char)
}

/**
 * 위험 문자 제거
 */
export function sanitizeString(input: string): string {
  let sanitized = input.replace(/<[^>]*>/g, "")
  sanitized = escapeHtml(sanitized)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "")
  return sanitized.trim()
}

/**
 * 파일명 새니타이징
 */
export function sanitizeFilename(filename: string): string {
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
  sanitized = sanitized.replace(/\.\./g, "")
  sanitized = sanitized.replace(/^\.+|\.+$/g, "")

  if (sanitized.length > 255) {
    const ext = sanitized.lastIndexOf(".")
    if (ext > 0) {
      const extension = sanitized.slice(ext)
      sanitized = sanitized.slice(0, 255 - extension.length) + extension
    } else {
      sanitized = sanitized.slice(0, 255)
    }
  }

  return sanitized || "unnamed"
}

/**
 * URL 새니타이징
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null
    }
    if (containsXSS(url)) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}

// ============================================================================
// 스키마 기반 검증
// ============================================================================

export type SchemaType =
  | "string"
  | "number"
  | "boolean"
  | "email"
  | "url"
  | "uuid"
  | "date"
  | "array"
  | "object"

export interface FieldSchema {
  type: SchemaType
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: readonly string[]
  items?: FieldSchema
  properties?: Record<string, FieldSchema>
  sanitize?: boolean
  custom?: (value: unknown) => ValidationError | null
}

export type ValidationSchema = Record<string, FieldSchema>

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * UUID v4 형식 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * ISO 8601 날짜 형식 검증
 */
export function isValidISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/
  if (!isoDateRegex.test(date)) return false
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * 스키마 기반 데이터 검증
 */
export function validateSchema(
  data: unknown,
  schema: ValidationSchema
): ValidationResult {
  const errors: ValidationError[] = []
  const sanitized: Record<string, unknown> = {}

  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ field: "_root", code: "INVALID_TYPE", message: "Data must be an object" }],
    }
  }

  const dataObj = data as Record<string, unknown>

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = dataObj[field]
    const fieldErrors = validateField(value, field, fieldSchema)

    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors)
    } else if (value !== undefined) {
      sanitized[field] = fieldSchema.sanitize && typeof value === "string"
        ? sanitizeString(value)
        : value
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  }
}

/**
 * 단일 필드 검증
 */
function validateField(
  value: unknown,
  field: string,
  schema: FieldSchema
): ValidationError[] {
  const errors: ValidationError[] = []

  if (value === undefined || value === null) {
    if (schema.required) {
      errors.push({
        field,
        code: "REQUIRED",
        message: `${field} is required`,
      })
    }
    return errors
  }

  if (typeof value === "string") {
    const threats = containsSecurityThreat(value)
    if (threats.hasThreat) {
      errors.push({
        field,
        code: "SECURITY_THREAT",
        message: `${field} contains potentially malicious content: ${threats.threats.join(", ")}`,
      })
      return errors
    }
  }

  switch (schema.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push({ field, code: "INVALID_TYPE", message: `${field} must be a string` })
      } else {
        if (schema.minLength && value.length < schema.minLength) {
          errors.push({ field, code: "MIN_LENGTH", message: `${field} must be at least ${schema.minLength} characters` })
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          errors.push({ field, code: "MAX_LENGTH", message: `${field} must be at most ${schema.maxLength} characters` })
        }
        if (schema.pattern && !schema.pattern.test(value)) {
          errors.push({ field, code: "PATTERN", message: `${field} has invalid format` })
        }
        if (schema.enum && !schema.enum.includes(value)) {
          errors.push({ field, code: "ENUM", message: `${field} must be one of: ${schema.enum.join(", ")}` })
        }
      }
      break

    case "number":
      if (typeof value !== "number" || isNaN(value)) {
        errors.push({ field, code: "INVALID_TYPE", message: `${field} must be a number` })
      } else {
        if (schema.min !== undefined && value < schema.min) {
          errors.push({ field, code: "MIN", message: `${field} must be at least ${schema.min}` })
        }
        if (schema.max !== undefined && value > schema.max) {
          errors.push({ field, code: "MAX", message: `${field} must be at most ${schema.max}` })
        }
      }
      break

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({ field, code: "INVALID_TYPE", message: `${field} must be a boolean` })
      }
      break

    case "email":
      if (typeof value !== "string" || !isValidEmail(value)) {
        errors.push({ field, code: "INVALID_EMAIL", message: `${field} must be a valid email address` })
      }
      break

    case "url":
      if (typeof value !== "string" || !sanitizeUrl(value)) {
        errors.push({ field, code: "INVALID_URL", message: `${field} must be a valid URL` })
      }
      break

    case "uuid":
      if (typeof value !== "string" || !isValidUUID(value)) {
        errors.push({ field, code: "INVALID_UUID", message: `${field} must be a valid UUID` })
      }
      break

    case "date":
      if (typeof value !== "string" || !isValidISODate(value)) {
        errors.push({ field, code: "INVALID_DATE", message: `${field} must be a valid ISO 8601 date` })
      }
      break

    case "array":
      if (!Array.isArray(value)) {
        errors.push({ field, code: "INVALID_TYPE", message: `${field} must be an array` })
      } else if (schema.items) {
        value.forEach((item, index) => {
          const itemErrors = validateField(item, `${field}[${index}]`, schema.items!)
          errors.push(...itemErrors)
        })
      }
      break

    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({ field, code: "INVALID_TYPE", message: `${field} must be an object` })
      } else if (schema.properties) {
        const result = validateSchema(value, schema.properties)
        errors.push(...result.errors)
      }
      break
  }

  if (schema.custom && errors.length === 0) {
    const customError = schema.custom(value)
    if (customError) {
      errors.push(customError)
    }
  }

  return errors
}

// ============================================================================
// 사전 정의된 검증 스키마
// ============================================================================

export const LOGIN_SCHEMA: ValidationSchema = {
  email: { type: "email", required: true, maxLength: 254 },
  password: { type: "string", required: true, minLength: 8, maxLength: 128 },
}

export const REGISTER_SCHEMA: ValidationSchema = {
  email: { type: "email", required: true, maxLength: 254 },
  password: { type: "string", required: true, minLength: 12, maxLength: 128 },
  name: { type: "string", required: true, minLength: 2, maxLength: 100, sanitize: true },
}

export const PERSONA_CREATE_SCHEMA: ValidationSchema = {
  name: { type: "string", required: true, minLength: 2, maxLength: 100, sanitize: true },
  description: { type: "string", maxLength: 1000, sanitize: true },
  role: { type: "string", required: true, enum: ["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"] as const },
  vector: {
    type: "object",
    required: true,
    properties: {
      depth: { type: "number", required: true, min: 0, max: 1 },
      lens: { type: "number", required: true, min: 0, max: 1 },
      stance: { type: "number", required: true, min: 0, max: 1 },
      scope: { type: "number", required: true, min: 0, max: 1 },
      taste: { type: "number", required: true, min: 0, max: 1 },
      purpose: { type: "number", required: true, min: 0, max: 1 },
    },
  },
}

export const PAGINATION_SCHEMA: ValidationSchema = {
  page: { type: "number", min: 1, max: 10000 },
  limit: { type: "number", min: 1, max: 100 },
  sortBy: { type: "string", maxLength: 50, pattern: /^[a-zA-Z_]+$/ },
  sortOrder: { type: "string", enum: ["asc", "desc"] as const },
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

export function validateRequestBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: ValidationSchema
): { valid: true; data: T } | { valid: false; errors: ValidationError[] } {
  const result = validateSchema(body, schema)

  if (result.valid && result.sanitized) {
    return { valid: true, data: result.sanitized as T }
  }

  return { valid: false, errors: result.errors }
}

export function validateQueryParams(
  params: Record<string, string | string[] | undefined>,
  schema: ValidationSchema
): ValidationResult {
  const converted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue

    const fieldSchema = schema[key]
    if (!fieldSchema) continue

    const stringValue = Array.isArray(value) ? value[0] : value

    switch (fieldSchema.type) {
      case "number":
        converted[key] = Number(stringValue)
        break
      case "boolean":
        converted[key] = stringValue === "true"
        break
      default:
        converted[key] = stringValue
    }
  }

  return validateSchema(converted, schema)
}
