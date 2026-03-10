import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { CouponType as PrismaCouponType } from "@/generated/prisma"
import {
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  getCoupons,
  getRedemptions,
  generateCouponCode,
  type CouponDataProvider,
  type CouponListOptions,
  type CreateCouponInput,
  type CouponRecord,
} from "@/lib/persona-world/coupon-service"

// ── Prisma → CouponDataProvider 어댑터 ──────────────────

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

function buildWhereClause(options: Omit<CouponListOptions, "limit" | "offset">) {
  const where: Record<string, unknown> = {}
  if (options.type) where.type = options.type
  if (options.isActive !== undefined) where.isActive = options.isActive
  if (options.search) {
    where.OR = [
      { code: { contains: options.search, mode: "insensitive" } },
      { description: { contains: options.search, mode: "insensitive" } },
    ]
  }
  return where
}

const provider: CouponDataProvider = {
  async findCouponByCode(code) {
    const row = await prisma.coupon.findUnique({ where: { code } })
    return row ? toCouponRecord(row) : null
  },
  async findCouponById(id) {
    const row = await prisma.coupon.findUnique({ where: { id } })
    return row ? toCouponRecord(row) : null
  },
  async createCoupon(data) {
    const row = await prisma.coupon.create({
      data: {
        code: data.code,
        type: (data.type ?? "MANUAL") as PrismaCouponType,
        coinAmount: data.coinAmount,
        description: data.description ?? null,
        maxRedemptions: data.maxRedemptions ?? 1,
        expiresAt: data.expiresAt ?? null,
        createdBy: data.createdBy ?? null,
      },
    })
    return toCouponRecord(row)
  },
  async updateCoupon(id, data) {
    const updateData: Record<string, unknown> = {}
    if (data.coinAmount !== undefined) updateData.coinAmount = data.coinAmount
    if (data.description !== undefined) updateData.description = data.description
    if (data.maxRedemptions !== undefined) updateData.maxRedemptions = data.maxRedemptions
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt
    const row = await prisma.coupon.update({ where: { id }, data: updateData })
    return toCouponRecord(row)
  },
  async incrementUsedCount(id) {
    await prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    })
  },
  async getCoupons(options) {
    const where = buildWhereClause(options)
    const rows = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    })
    return rows.map(toCouponRecord)
  },
  async getCouponCount(options) {
    const where = buildWhereClause(options)
    return prisma.coupon.count({ where })
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
  async getRedemptionsByCoupon(couponId) {
    const rows = await prisma.couponRedemption.findMany({
      where: { couponId },
      orderBy: { redeemedAt: "desc" },
    })
    return rows.map((r) => ({
      id: r.id,
      couponId: r.couponId,
      userId: r.userId,
      coinAmount: r.coinAmount,
      transactionId: r.transactionId,
      redeemedAt: r.redeemedAt,
    }))
  },
}

// ── GET: 쿠폰 목록 조회 ─────────────────────────────────

export async function GET(req: NextRequest) {
  const { response, session } = await requireAuth()
  if (response) return response

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type") as CouponListOptions["type"]
    const isActiveParam = url.searchParams.get("isActive")
    const search = url.searchParams.get("search") ?? undefined
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100)
    const offset = Number(url.searchParams.get("offset") ?? 0)

    const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined

    const result = await getCoupons(provider, {
      type: type ?? undefined,
      isActive,
      search,
      limit,
      offset,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error("[PW Admin Coupons GET]", err)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "쿠폰 목록 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: 쿠폰 생성 ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const { response, session } = await requireAuth()
  if (response) return response

  try {
    const body = (await req.json()) as {
      code?: string
      autoGenerate?: boolean
      prefix?: string
      type?: CreateCouponInput["type"]
      coinAmount: number
      description?: string
      maxRedemptions?: number
      expiresAt?: string | null
    }

    if (!body.coinAmount || body.coinAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "coinAmount는 1 이상이어야 합니다" },
        },
        { status: 400 }
      )
    }

    const code = body.autoGenerate ? generateCouponCode(body.prefix) : body.code

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "code 또는 autoGenerate가 필요합니다",
          },
        },
        { status: 400 }
      )
    }

    const coupon = await createCoupon(provider, {
      code,
      type: body.type,
      coinAmount: body.coinAmount,
      description: body.description,
      maxRedemptions: body.maxRedemptions,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: session?.user?.id ?? null,
    })

    return NextResponse.json({ success: true, data: coupon }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "쿠폰 생성 실패"
    console.error("[PW Admin Coupons POST]", err)

    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE_CODE", message: "이미 존재하는 쿠폰 코드입니다" },
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── PUT: 쿠폰 수정 ──────────────────────────────────────

export async function PUT(req: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await req.json()) as {
      id: string
      coinAmount?: number
      description?: string
      maxRedemptions?: number
      isActive?: boolean
      expiresAt?: string | null
    }

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "id는 필수입니다" },
        },
        { status: 400 }
      )
    }

    const coupon = await updateCoupon(provider, body.id, {
      ...(body.coinAmount !== undefined && { coinAmount: body.coinAmount }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.maxRedemptions !== undefined && {
        maxRedemptions: body.maxRedemptions,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.expiresAt !== undefined && {
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      }),
    })

    return NextResponse.json({ success: true, data: coupon })
  } catch (err) {
    console.error("[PW Admin Coupons PUT]", err)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "쿠폰 수정 실패" },
      },
      { status: 500 }
    )
  }
}

// ── DELETE: 쿠폰 비활성화 ────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "id가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const coupon = await deactivateCoupon(provider, id)
    return NextResponse.json({ success: true, data: coupon })
  } catch (err) {
    console.error("[PW Admin Coupons DELETE]", err)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "쿠폰 비활성화 실패" },
      },
      { status: 500 }
    )
  }
}
