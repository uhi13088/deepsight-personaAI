/**
 * Encryption Utilities - 금융업계 수준 암호화
 * AES-256-GCM, bcrypt, HMAC 등 구현
 */

import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto"

// ============================================================================
// 상수 정의
// ============================================================================

/** 암호화 알고리즘 */
const ENCRYPTION_ALGORITHM = "aes-256-gcm"

/** IV 길이 (bytes) */
const IV_LENGTH = 16

/** Auth Tag 길이 (bytes) */
const AUTH_TAG_LENGTH = 16

/** Salt 길이 (bytes) */
const SALT_LENGTH = 32

/** 비밀번호 해시 반복 횟수 (PBKDF2) */
const HASH_ITERATIONS = 310000 // OWASP 권장 (2023)

/** 해시 키 길이 (bytes) */
const KEY_LENGTH = 32

// ============================================================================
// 비밀번호 해싱 (bcrypt 대체 - PBKDF2 사용)
// ============================================================================

/**
 * 비밀번호를 안전하게 해시합니다 (PBKDF2-SHA512)
 * @param password 평문 비밀번호
 * @returns 해시된 비밀번호 (salt$iterations$hash 형식)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex")

  return new Promise((resolve, reject) => {
    const { pbkdf2 } = require("crypto")
    pbkdf2(
      password,
      salt,
      HASH_ITERATIONS,
      KEY_LENGTH,
      "sha512",
      (err: Error | null, derivedKey: Buffer) => {
        if (err) reject(err)
        resolve(`${salt}$${HASH_ITERATIONS}$${derivedKey.toString("hex")}`)
      }
    )
  })
}

/**
 * 비밀번호를 검증합니다
 * @param password 평문 비밀번호
 * @param storedHash 저장된 해시 (salt$iterations$hash 형식)
 * @returns 일치 여부
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, iterationsStr, hash] = storedHash.split("$")

  if (!salt || !iterationsStr || !hash) {
    return false
  }

  const iterations = parseInt(iterationsStr, 10)

  return new Promise((resolve, reject) => {
    const { pbkdf2 } = require("crypto")
    pbkdf2(
      password,
      salt,
      iterations,
      KEY_LENGTH,
      "sha512",
      (err: Error | null, derivedKey: Buffer) => {
        if (err) reject(err)
        // 타이밍 공격 방지를 위한 constant-time 비교
        const derivedHash = derivedKey.toString("hex")
        resolve(timingSafeEqual(derivedHash, hash))
      }
    )
  })
}

// ============================================================================
// AES-256-GCM 암호화/복호화
// ============================================================================

/**
 * 데이터를 AES-256-GCM으로 암호화합니다
 * @param plaintext 평문 데이터
 * @param secretKey 256-bit 비밀 키 (hex string)
 * @returns 암호문 (iv:authTag:encrypted 형식)
 */
export function encrypt(plaintext: string, secretKey?: string): string {
  const key = getEncryptionKey(secretKey)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // IV:AuthTag:Encrypted 형식으로 반환
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

/**
 * AES-256-GCM으로 암호화된 데이터를 복호화합니다
 * @param ciphertext 암호문 (iv:authTag:encrypted 형식)
 * @param secretKey 256-bit 비밀 키 (hex string)
 * @returns 평문 데이터
 */
export function decrypt(ciphertext: string, secretKey?: string): string {
  const key = getEncryptionKey(secretKey)

  const parts = ciphertext.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format")
  }

  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

/**
 * 암호화 키를 가져옵니다
 */
function getEncryptionKey(secretKey?: string): Buffer {
  const key = secretKey || process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required")
  }

  // 키가 hex string인 경우 Buffer로 변환
  if (key.length === 64) {
    return Buffer.from(key, "hex")
  }

  // 다른 경우 SHA-256으로 키 유도
  return createHash("sha256").update(key).digest()
}

// ============================================================================
// HMAC 서명
// ============================================================================

/**
 * HMAC-SHA256 서명을 생성합니다
 * @param data 서명할 데이터
 * @param secret 비밀 키
 * @returns HMAC 서명 (hex)
 */
export function createSignature(data: string, secret?: string): string {
  const key = secret || process.env.HMAC_SECRET || process.env.NEXTAUTH_SECRET

  if (!key) {
    throw new Error("HMAC secret is required")
  }

  return createHmac("sha256", key).update(data).digest("hex")
}

/**
 * HMAC 서명을 검증합니다
 * @param data 원본 데이터
 * @param signature 검증할 서명
 * @param secret 비밀 키
 * @returns 유효 여부
 */
export function verifySignature(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = createSignature(data, secret)
  return timingSafeEqual(signature, expectedSignature)
}

// ============================================================================
// 해시 함수
// ============================================================================

/**
 * SHA-256 해시를 생성합니다
 * @param data 해시할 데이터
 * @returns 해시 (hex)
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex")
}

/**
 * SHA-512 해시를 생성합니다
 * @param data 해시할 데이터
 * @returns 해시 (hex)
 */
export function sha512(data: string): string {
  return createHash("sha512").update(data).digest("hex")
}

// ============================================================================
// 토큰 생성
// ============================================================================

/**
 * 암호학적으로 안전한 랜덤 토큰을 생성합니다
 * @param length 토큰 길이 (bytes)
 * @returns 랜덤 토큰 (hex)
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex")
}

/**
 * API 키를 생성합니다
 * @param prefix 키 접두사 (예: "sk_", "pk_")
 * @returns API 키
 */
export function generateApiKey(prefix: string = "sk_"): string {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(24).toString("base64url")
  return `${prefix}${timestamp}_${random}`
}

/**
 * CSRF 토큰을 생성합니다
 * @returns CSRF 토큰
 */
export function generateCsrfToken(): string {
  return generateSecureToken(32)
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 타이밍 공격 방지를 위한 constant-time 문자열 비교
 * @param a 첫 번째 문자열
 * @param b 두 번째 문자열
 * @returns 일치 여부
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * 민감한 데이터를 마스킹합니다
 * @param data 마스킹할 데이터
 * @param visibleChars 앞뒤로 보여줄 문자 수
 * @returns 마스킹된 데이터
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return "*".repeat(data.length)
  }

  const prefix = data.substring(0, visibleChars)
  const suffix = data.substring(data.length - visibleChars)
  const maskedLength = data.length - visibleChars * 2

  return `${prefix}${"*".repeat(maskedLength)}${suffix}`
}

/**
 * 이메일을 마스킹합니다
 * @param email 마스킹할 이메일
 * @returns 마스킹된 이메일
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")

  if (!local || !domain) {
    return maskSensitiveData(email)
  }

  const maskedLocal = local.length <= 2
    ? "*".repeat(local.length)
    : local[0] + "*".repeat(local.length - 2) + local[local.length - 1]

  return `${maskedLocal}@${domain}`
}

// ============================================================================
// 비밀번호 강도 검증
// ============================================================================

export interface PasswordStrengthResult {
  valid: boolean
  score: number // 0-100
  issues: string[]
}

/**
 * 비밀번호 강도를 검증합니다 (금융업계 기준)
 * @param password 검증할 비밀번호
 * @returns 검증 결과
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const issues: string[] = []
  let score = 0

  // 최소 길이: 12자 (금융업계 표준)
  if (password.length >= 12) {
    score += 20
  } else if (password.length >= 8) {
    score += 10
    issues.push("비밀번호는 12자 이상을 권장합니다.")
  } else {
    issues.push("비밀번호는 최소 8자 이상이어야 합니다.")
  }

  // 대문자 포함
  if (/[A-Z]/.test(password)) {
    score += 15
  } else {
    issues.push("대문자를 포함해야 합니다.")
  }

  // 소문자 포함
  if (/[a-z]/.test(password)) {
    score += 15
  } else {
    issues.push("소문자를 포함해야 합니다.")
  }

  // 숫자 포함
  if (/[0-9]/.test(password)) {
    score += 15
  } else {
    issues.push("숫자를 포함해야 합니다.")
  }

  // 특수문자 포함
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15
  } else {
    issues.push("특수문자를 포함해야 합니다.")
  }

  // 연속 문자 확인 (aaa, 111, abc, 123)
  if (!/(.)\1{2,}/.test(password)) {
    score += 10
  } else {
    issues.push("연속된 동일 문자는 사용할 수 없습니다.")
  }

  // 일반적인 패턴 확인
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /letmein/i,
  ]

  const hasCommonPattern = commonPatterns.some((pattern) => pattern.test(password))
  if (!hasCommonPattern) {
    score += 10
  } else {
    issues.push("일반적으로 사용되는 패턴은 피해주세요.")
    score -= 20
  }

  // 최종 검증
  const valid = score >= 70 && issues.length === 0

  return {
    valid,
    score: Math.max(0, Math.min(100, score)),
    issues,
  }
}

// Aliases for compatibility
export const hmacSign = createSignature
export const hmacVerify = verifySignature

export default {
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  createSignature,
  verifySignature,
  hmacSign: createSignature,
  hmacVerify: verifySignature,
  sha256,
  sha512,
  generateSecureToken,
  generateApiKey,
  generateCsrfToken,
  timingSafeEqual,
  maskSensitiveData,
  maskEmail,
  validatePasswordStrength,
}
