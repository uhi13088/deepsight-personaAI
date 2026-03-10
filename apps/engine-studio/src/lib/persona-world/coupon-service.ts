/**
 * PersonaWorld 쿠폰 서비스 (v4.2.0 — T410)
 *
 * 쿠폰 생성, 검증, 적용, 관리
 * DI 패턴 — credit-service와 동일 구조
 */

// ── Types ────────────────────────────────────────────────

export type CouponType = "MANUAL" | "WELCOME" | "REFERRAL"

export interface CouponRecord {
  id: string
  code: string
  type: CouponType
  coinAmount: number
  description: string | null
  maxRedemptions: number
  usedCount: number
  isActive: boolean
  expiresAt: Date | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RedemptionRecord {
  id: string
  couponId: string
  userId: string
  coinAmount: number
  transactionId: string | null
  redeemedAt: Date
}

export interface CreateCouponInput {
  code: string
  type?: CouponType
  coinAmount: number
  description?: string
  maxRedemptions?: number
  expiresAt?: Date | null
  createdBy?: string
}

export interface UpdateCouponInput {
  coinAmount?: number
  description?: string
  maxRedemptions?: number
  isActive?: boolean
  expiresAt?: Date | null
}

export interface CouponListOptions {
  type?: CouponType
  isActive?: boolean
  search?: string
  limit?: number
  offset?: number
}

// ── Validation Result ────────────────────────────────────

export interface ValidationSuccess {
  valid: true
  coupon: CouponRecord
}

export interface ValidationError {
  valid: false
  error: string
}

export type ValidationResult = ValidationSuccess | ValidationError

// ── DI Provider ──────────────────────────────────────────

export interface CouponDataProvider {
  findCouponByCode(code: string): Promise<CouponRecord | null>
  findCouponById(id: string): Promise<CouponRecord | null>
  createCoupon(data: CreateCouponInput): Promise<CouponRecord>
  updateCoupon(id: string, data: UpdateCouponInput): Promise<CouponRecord>
  incrementUsedCount(id: string): Promise<void>
  getCoupons(options: CouponListOptions): Promise<CouponRecord[]>
  getCouponCount(options: Omit<CouponListOptions, "limit" | "offset">): Promise<number>

  findRedemption(couponId: string, userId: string): Promise<RedemptionRecord | null>
  createRedemption(data: {
    couponId: string
    userId: string
    coinAmount: number
    transactionId?: string
  }): Promise<RedemptionRecord>
  getRedemptionsByCoupon(couponId: string): Promise<RedemptionRecord[]>
}

// ── Service ──────────────────────────────────────────────

/**
 * 쿠폰 코드 유효성 검증
 * - 존재 여부, 활성 상태, 만료, 사용 한도, 중복 사용 체크
 */
export async function validateCoupon(
  provider: CouponDataProvider,
  code: string,
  userId: string
): Promise<ValidationResult> {
  const normalized = code.trim().toUpperCase()

  const coupon = await provider.findCouponByCode(normalized)
  if (!coupon) {
    return { valid: false, error: "COUPON_NOT_FOUND" }
  }

  if (!coupon.isActive) {
    return { valid: false, error: "COUPON_INACTIVE" }
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, error: "COUPON_EXPIRED" }
  }

  if (coupon.usedCount >= coupon.maxRedemptions) {
    return { valid: false, error: "COUPON_LIMIT_REACHED" }
  }

  const existing = await provider.findRedemption(coupon.id, userId)
  if (existing) {
    return { valid: false, error: "COUPON_ALREADY_USED" }
  }

  return { valid: true, coupon }
}

/**
 * 쿠폰 적용 (검증 + 코인 지급 준비 + 사용 기록)
 * 반환값의 redemption + coinAmount를 사용해 addCredits() 호출 필요
 */
export async function redeemCoupon(
  provider: CouponDataProvider,
  code: string,
  userId: string,
  transactionId?: string
): Promise<{ redemption: RedemptionRecord; coupon: CouponRecord }> {
  const validation = await validateCoupon(provider, code, userId)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const { coupon } = validation

  const redemption = await provider.createRedemption({
    couponId: coupon.id,
    userId,
    coinAmount: coupon.coinAmount,
    transactionId,
  })

  await provider.incrementUsedCount(coupon.id)

  return { redemption, coupon }
}

/**
 * 쿠폰 생성
 */
export async function createCoupon(
  provider: CouponDataProvider,
  input: CreateCouponInput
): Promise<CouponRecord> {
  const normalized: CreateCouponInput = {
    ...input,
    code: input.code.trim().toUpperCase(),
  }
  return provider.createCoupon(normalized)
}

/**
 * 쿠폰 수정
 */
export async function updateCoupon(
  provider: CouponDataProvider,
  id: string,
  data: UpdateCouponInput
): Promise<CouponRecord> {
  return provider.updateCoupon(id, data)
}

/**
 * 쿠폰 비활성화 (soft delete)
 */
export async function deactivateCoupon(
  provider: CouponDataProvider,
  id: string
): Promise<CouponRecord> {
  return provider.updateCoupon(id, { isActive: false })
}

/**
 * 쿠폰 목록 조회 (관리자)
 */
export async function getCoupons(
  provider: CouponDataProvider,
  options: CouponListOptions = {}
): Promise<{ coupons: CouponRecord[]; total: number }> {
  const [coupons, total] = await Promise.all([
    provider.getCoupons(options),
    provider.getCouponCount({
      type: options.type,
      isActive: options.isActive,
      search: options.search,
    }),
  ])
  return { coupons, total }
}

/**
 * 단건 코드 조회
 */
export async function getCouponByCode(
  provider: CouponDataProvider,
  code: string
): Promise<CouponRecord | null> {
  return provider.findCouponByCode(code.trim().toUpperCase())
}

/**
 * 쿠폰 사용 내역 조회
 */
export async function getRedemptions(
  provider: CouponDataProvider,
  couponId: string
): Promise<RedemptionRecord[]> {
  return provider.getRedemptionsByCoupon(couponId)
}

/**
 * 랜덤 쿠폰 코드 생성 유틸
 */
export function generateCouponCode(prefix?: string, length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 혼동 방지: I/O/0/1 제외
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return prefix ? `${prefix}-${code}` : code
}
