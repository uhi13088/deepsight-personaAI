import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  validateCoupon,
  redeemCoupon,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  getCoupons,
  getCouponByCode,
  generateCouponCode,
  type CouponDataProvider,
  type CouponRecord,
  type RedemptionRecord,
} from "@/lib/persona-world/coupon-service"

// ── Mock Provider ────────────────────────────────────────

function makeCoupon(overrides: Partial<CouponRecord> = {}): CouponRecord {
  return {
    id: "coupon-1",
    code: "WELCOME100",
    type: "MANUAL",
    coinAmount: 100,
    description: null,
    maxRedemptions: 10,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    createdBy: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  }
}

function makeRedemption(overrides: Partial<RedemptionRecord> = {}): RedemptionRecord {
  return {
    id: "redemption-1",
    couponId: "coupon-1",
    userId: "user-1",
    coinAmount: 100,
    transactionId: null,
    redeemedAt: new Date(),
    ...overrides,
  }
}

function createMockProvider(coupon: CouponRecord | null = null): CouponDataProvider {
  return {
    findCouponByCode: vi.fn().mockResolvedValue(coupon),
    findCouponById: vi.fn().mockResolvedValue(coupon),
    createCoupon: vi
      .fn()
      .mockImplementation(async (data) => makeCoupon({ ...data, id: "new-coupon" })),
    updateCoupon: vi.fn().mockImplementation(async (id, data) => makeCoupon({ id, ...data })),
    incrementUsedCount: vi.fn().mockResolvedValue(undefined),
    getCoupons: vi.fn().mockResolvedValue(coupon ? [coupon] : []),
    getCouponCount: vi.fn().mockResolvedValue(coupon ? 1 : 0),
    findRedemption: vi.fn().mockResolvedValue(null),
    createRedemption: vi.fn().mockImplementation(async (data) => makeRedemption(data)),
    getRedemptionsByCoupon: vi.fn().mockResolvedValue([]),
  }
}

// ── validateCoupon ───────────────────────────────────────

describe("validateCoupon", () => {
  it("유효한 쿠폰 → valid: true 반환", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)

    const result = await validateCoupon(provider, "WELCOME100", "user-1")

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.coupon.code).toBe("WELCOME100")
    }
  })

  it("코드를 대문자로 정규화", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)

    await validateCoupon(provider, "  welcome100  ", "user-1")

    expect(provider.findCouponByCode).toHaveBeenCalledWith("WELCOME100")
  })

  it("존재하지 않는 쿠폰 → COUPON_NOT_FOUND", async () => {
    const provider = createMockProvider(null)

    const result = await validateCoupon(provider, "INVALID", "user-1")

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe("COUPON_NOT_FOUND")
  })

  it("비활성 쿠폰 → COUPON_INACTIVE", async () => {
    const coupon = makeCoupon({ isActive: false })
    const provider = createMockProvider(coupon)

    const result = await validateCoupon(provider, "WELCOME100", "user-1")

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe("COUPON_INACTIVE")
  })

  it("만료된 쿠폰 → COUPON_EXPIRED", async () => {
    const coupon = makeCoupon({ expiresAt: new Date("2025-01-01") })
    const provider = createMockProvider(coupon)

    const result = await validateCoupon(provider, "WELCOME100", "user-1")

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe("COUPON_EXPIRED")
  })

  it("만료일 미래면 유효", async () => {
    const coupon = makeCoupon({ expiresAt: new Date("2030-12-31") })
    const provider = createMockProvider(coupon)

    const result = await validateCoupon(provider, "WELCOME100", "user-1")

    expect(result.valid).toBe(true)
  })

  it("사용 한도 도달 → COUPON_LIMIT_REACHED", async () => {
    const coupon = makeCoupon({ maxRedemptions: 5, usedCount: 5 })
    const provider = createMockProvider(coupon)

    const result = await validateCoupon(provider, "WELCOME100", "user-1")

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe("COUPON_LIMIT_REACHED")
  })

  it("이미 사용한 유저 → COUPON_ALREADY_USED", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)
    ;(provider.findRedemption as ReturnType<typeof vi.fn>).mockResolvedValue(makeRedemption())

    const result = await validateCoupon(provider, "WELCOME100", "user-1")

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBe("COUPON_ALREADY_USED")
  })
})

// ── redeemCoupon ─────────────────────────────────────────

describe("redeemCoupon", () => {
  it("유효한 쿠폰 적용 → redemption 생성 + usedCount 증가", async () => {
    const coupon = makeCoupon({ coinAmount: 500 })
    const provider = createMockProvider(coupon)

    const result = await redeemCoupon(provider, "WELCOME100", "user-1", "tx-1")

    expect(result.redemption.coinAmount).toBe(500)
    expect(result.coupon.code).toBe("WELCOME100")
    expect(provider.createRedemption).toHaveBeenCalledWith({
      couponId: "coupon-1",
      userId: "user-1",
      coinAmount: 500,
      transactionId: "tx-1",
    })
    expect(provider.incrementUsedCount).toHaveBeenCalledWith("coupon-1")
  })

  it("유효하지 않은 쿠폰 → throw", async () => {
    const provider = createMockProvider(null)

    await expect(redeemCoupon(provider, "INVALID", "user-1")).rejects.toThrow("COUPON_NOT_FOUND")
  })

  it("만료된 쿠폰 적용 시도 → throw COUPON_EXPIRED", async () => {
    const coupon = makeCoupon({ expiresAt: new Date("2025-01-01") })
    const provider = createMockProvider(coupon)

    await expect(redeemCoupon(provider, "WELCOME100", "user-1")).rejects.toThrow("COUPON_EXPIRED")
  })
})

// ── createCoupon ─────────────────────────────────────────

describe("createCoupon", () => {
  it("코드를 대문자로 정규화하여 생성", async () => {
    const provider = createMockProvider()

    await createCoupon(provider, {
      code: "  summer2026  ",
      coinAmount: 200,
    })

    expect(provider.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SUMMER2026" })
    )
  })

  it("타입 지정 가능", async () => {
    const provider = createMockProvider()

    await createCoupon(provider, {
      code: "WELCOME",
      coinAmount: 100,
      type: "WELCOME",
    })

    expect(provider.createCoupon).toHaveBeenCalledWith(expect.objectContaining({ type: "WELCOME" }))
  })
})

// ── updateCoupon / deactivateCoupon ──────────────────────

describe("updateCoupon", () => {
  it("쿠폰 정보 수정", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)

    await updateCoupon(provider, "coupon-1", { coinAmount: 300 })

    expect(provider.updateCoupon).toHaveBeenCalledWith("coupon-1", {
      coinAmount: 300,
    })
  })
})

describe("deactivateCoupon", () => {
  it("isActive를 false로 설정", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)

    await deactivateCoupon(provider, "coupon-1")

    expect(provider.updateCoupon).toHaveBeenCalledWith("coupon-1", {
      isActive: false,
    })
  })
})

// ── getCoupons ───────────────────────────────────────────

describe("getCoupons", () => {
  it("목록 + total 반환", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)

    const result = await getCoupons(provider, { type: "MANUAL" })

    expect(result.coupons).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it("빈 목록", async () => {
    const provider = createMockProvider(null)

    const result = await getCoupons(provider)

    expect(result.coupons).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

// ── getCouponByCode ──────────────────────────────────────

describe("getCouponByCode", () => {
  it("코드로 조회 (정규화)", async () => {
    const coupon = makeCoupon()
    const provider = createMockProvider(coupon)

    await getCouponByCode(provider, "  welcome100 ")

    expect(provider.findCouponByCode).toHaveBeenCalledWith("WELCOME100")
  })
})

// ── generateCouponCode ───────────────────────────────────

describe("generateCouponCode", () => {
  it("기본 8자 코드 생성", () => {
    const code = generateCouponCode()
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[A-Z2-9]+$/)
  })

  it("접두사 포함 코드 생성", () => {
    const code = generateCouponCode("EVENT")
    expect(code).toMatch(/^EVENT-[A-Z2-9]{8}$/)
  })

  it("길이 지정 가능", () => {
    const code = generateCouponCode(undefined, 12)
    expect(code).toHaveLength(12)
  })

  it("혼동 문자(I, O, 0, 1) 미포함", () => {
    // 100번 생성해서 확인
    for (let i = 0; i < 100; i++) {
      const code = generateCouponCode()
      expect(code).not.toMatch(/[IO01]/)
    }
  })
})
