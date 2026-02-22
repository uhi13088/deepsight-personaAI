/**
 * OAuth Token Encryption/Decryption (AES-256-GCM)
 *
 * SNS OAuth 토큰을 암호화하여 DB에 안전하게 저장.
 * TOKEN_ENCRYPTION_KEY 환경변수가 설정되지 않으면 평문 저장 (개발 모드).
 *
 * 암호화 형식: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * - v1: 버전 태그 (향후 키 로테이션 대비)
 * - iv: 12바이트 랜덤 초기화 벡터
 * - authTag: 16바이트 인증 태그 (변조 방지)
 * - ciphertext: 암호화된 토큰
 */

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const PREFIX = "enc:v1:"

/**
 * 암호화 키가 설정되어 있는지 확인.
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.TOKEN_ENCRYPTION_KEY
}

/**
 * 환경변수에서 32바이트 키를 파생.
 * TOKEN_ENCRYPTION_KEY는 64자 hex 또는 32+ 문자열.
 */
function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set")
  }

  // 64자 hex → 32바이트 직접 변환
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex")
  }

  // 그 외 문자열 → SHA-256 해시로 32바이트 파생
  return crypto.createHash("sha256").update(raw).digest()
}

/**
 * 토큰을 AES-256-GCM으로 암호화.
 * 키 미설정 시 평문 그대로 반환.
 */
export function encryptToken(plaintext: string): string {
  if (!isEncryptionConfigured()) {
    return plaintext
  }

  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

/**
 * AES-256-GCM으로 암호화된 토큰을 복호화.
 * "enc:v1:" 접두사가 없으면 평문으로 간주하여 그대로 반환 (하위 호환).
 */
export function decryptToken(stored: string): string {
  // 평문 (미암호화 또는 개발 모드)
  if (!stored.startsWith(PREFIX)) {
    return stored
  }

  const key = getKey()
  const parts = stored.slice(PREFIX.length).split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format")
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const ciphertext = Buffer.from(ciphertextHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return decrypted.toString("utf8")
}
