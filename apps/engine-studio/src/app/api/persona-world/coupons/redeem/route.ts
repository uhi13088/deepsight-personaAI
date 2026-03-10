import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import type { CouponType as PrismaCouponType } from "@/generated/prisma"
import {
  redeemCoupon,
  type CouponDataProvider,
  type CouponRecord,
} from "@/lib/persona-world/coupon-service"
import { addCredits, type CreditDataProvider } from "@/lib/persona-world/credit-service"

// ── Prisma → CouponDataProvider ──────────────────────────

function toCouponRecord(row: {
  id: string
  code: string
  type: PrismaCouponType
  coinAmount: number
  description: string | null
  maxRedemptions: number
  usedCount: number
  isActive: boolean
  expiresAt: Date | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}): CouponRecord {
  return {
    id: row.id,
    code: row.code,
    type: row.type as CouponRecord["type"],
    coinAmount: row.coinAmount,
    description: row.description,
    maxRedemptions: row.maxRedemptions,
    usedCount: row.usedCount,
    isActive: row.isActive,
    expiresAt: row.expiresAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const couponProvider: CouponDataProvider = {
  async findCouponByCode(code) {
    const row = await prisma.coupon.findUnique({ where: { code } })
    return row ? toCouponRecord(row) : null
  },
  async findCouponById(id) {
    const row = await prisma.coupon.findUnique({ where: { id } })
    return row ? toCouponRecord(row) : null
  },
  async createCoupon() {
    throw new Error("Not supported in redeem endpoint")
  },
  async updateCoupon() {
    throw new Error("Not supported in redeem endpoint")
  },
  async incrementUsedCount(id) {
    await prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    })
  },
  async getCoupons() {
    return []
  },
  async getCouponCount() {
    return 0
  },
  async findRedemption(couponId, userId) {
    const row = await prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId, userId } },
    })
    return row
      ? {
          id: row.id,
          couponId: row.couponId,
          userId: row.userId,
          coinAmount: row.coinAmount,
          transactionId: row.transactionId,
          redeemedAt: row.redeemedAt,
        }
      : null
  },
  async createRedemption(data) {
    const row = await prisma.couponRedemption.create({
      data: {
        couponId: data.couponId,
        userId: data.userId,
        coinAmount: data.coinAmount,
        transactionId: data.transactionId ?? null,
      },
    })
    return {
      id: row.id,
      couponId: row.couponId,
      userId: row.userId,
      coinAmount: row.coinAmount,
      transactionId: row.transactionId,
      redeemedAt: row.redeemedAt,
    }
  },
  async getRedemptionsByCoupon() {
    return []
  },
}

// ── Prisma → CreditDataProvider ──────────────────────────

const creditProvider: CreditDataProvider = {
  async getLatestTransaction(userId) {
    const row = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    return row
      ? {
          id: row.id,
          userId: row.userId,
          type: row.type as "EARN" | "PURCHASE" | "SPEND",
          amount: row.amount,
          balanceAfter: row.balanceAfter,
          reason: row.reason,
          orderId: row.orderId,
          paymentKey: row.paymentKey,
          status: row.status as "COMPLETED",
          createdAt: row.createdAt,
        }
      : null
  },
  async createTransaction(data) {
    const row = await prisma.coinTransaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        reason: data.reason ?? null,
        orderId: data.orderId ?? null,
        paymentKey: data.paymentKey ?? null,
        status: data.status ?? "COMPLETED",
      },
    })
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as "EARN" | "PURCHASE" | "SPEND",
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      reason: row.reason,
      orderId: row.orderId,
      paymentKey: row.paymentKey,
      status: row.status as "COMPLETED",
      createdAt: row.createdAt,
    }
  },
  async findByOrderId() {
    return null
  },
  async updateTransaction() {
    throw new Error("Not supported")
  },
  async getTransactions() {
    return []
  },
}

// ── POST: 쿠폰 코드 적용 ────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as {
      userId: string
      code: string
    }

    if (!body.userId || !body.code) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARAM", message: "userId와 code가 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 1. 쿠폰 적용 (검증 + redemption 기록 + usedCount 증가)
    const { redemption, coupon } = await redeemCoupon(couponProvider, body.code, body.userId)

    // 2. 코인 지급 (EARN 트랜잭션)
    const reason = `쿠폰 적용: ${coupon.code}`
    const transaction = await addCredits(creditProvider, body.userId, coupon.coinAmount, reason)

    // 3. redemption에 transactionId 업데이트
    await prisma.couponRedemption.update({
      where: { id: redemption.id },
      data: { transactionId: transaction.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        coinAmount: coupon.coinAmount,
        newBalance: transaction.balanceAfter,
        couponCode: coupon.code,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "쿠폰 적용 실패"

    const errorMap: Record<string, { code: string; status: number; msg: string }> = {
      COUPON_NOT_FOUND: {
        code: "COUPON_NOT_FOUND",
        status: 404,
        msg: "존재하지 않는 쿠폰 코드입니다",
      },
      COUPON_INACTIVE: { code: "COUPON_INACTIVE", status: 400, msg: "비활성화된 쿠폰입니다" },
      COUPON_EXPIRED: { code: "COUPON_EXPIRED", status: 400, msg: "만료된 쿠폰입니다" },
      COUPON_LIMIT_REACHED: {
        code: "COUPON_LIMIT_REACHED",
        status: 400,
        msg: "쿠폰 사용 한도에 도달했습니다",
      },
      COUPON_ALREADY_USED: {
        code: "COUPON_ALREADY_USED",
        status: 409,
        msg: "이미 사용한 쿠폰입니다",
      },
    }

    const mapped = errorMap[message]
    if (mapped) {
      return NextResponse.json(
        { success: false, error: { code: mapped.code, message: mapped.msg } },
        { status: mapped.status }
      )
    }

    console.error("[PW Coupon Redeem]", err)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "쿠폰 적용 실패" } },
      { status: 500 }
    )
  }
}
