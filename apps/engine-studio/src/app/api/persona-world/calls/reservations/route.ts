import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { createReservation, getReservations } from "@/lib/persona-world/call-service"
import type { CallDataProvider } from "@/lib/persona-world/call-service"

// ── Prisma Provider (예약 + Credit 관련) ─────────────────────

function buildReservationProvider(): Pick<
  CallDataProvider,
  | "createReservation"
  | "getReservations"
  | "getLatestTransaction"
  | "createTransaction"
  | "findByOrderId"
  | "updateTransaction"
  | "getTransactions"
> {
  return {
    async createReservation(params) {
      const reservation = await prisma.callReservation.create({
        data: {
          personaId: params.personaId,
          userId: params.userId,
          scheduledAt: params.scheduledAt,
          coinSpent: params.coinSpent,
          status: "PENDING",
        },
      })
      return { id: reservation.id }
    },

    async getReservations(userId) {
      const reservations = await prisma.callReservation.findMany({
        where: { userId },
        orderBy: { scheduledAt: "desc" },
        include: {
          persona: { select: { name: true, profileImageUrl: true } },
        },
      })

      return reservations.map((r) => ({
        id: r.id,
        personaId: r.personaId,
        personaName: r.persona.name,
        personaImageUrl: r.persona.profileImageUrl,
        scheduledAt: r.scheduledAt,
        status: r.status,
        coinSpent: r.coinSpent,
      }))
    },

    // ── Credit Provider (CoinTransaction 기반) ──
    async getLatestTransaction(userId) {
      const tx = await prisma.coinTransaction.findFirst({
        where: { userId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      })
      if (!tx) return null
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async createTransaction(data) {
      const tx = await prisma.coinTransaction.create({
        data: {
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          balanceAfter: data.balanceAfter,
          reason: data.reason,
          orderId: data.orderId,
          paymentKey: data.paymentKey,
          status: data.status ?? "COMPLETED",
        },
      })
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async findByOrderId(orderId) {
      const tx = await prisma.coinTransaction.findFirst({ where: { orderId } })
      if (!tx) return null
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async updateTransaction(id, data) {
      const tx = await prisma.coinTransaction.update({ where: { id }, data })
      return {
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }
    },

    async getTransactions(userId, options) {
      const txs = await prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 20,
        skip: options?.offset ?? 0,
      })
      return txs.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        type: tx.type as "EARN" | "PURCHASE" | "SPEND",
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        reason: tx.reason,
        orderId: tx.orderId,
        paymentKey: tx.paymentKey,
        status: tx.status as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
        createdAt: tx.createdAt,
      }))
    },
  }
}

// ── GET: 예약 목록 ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_USER_ID", message: "userId is required" } },
      { status: 400 }
    )
  }

  try {
    const dp = buildReservationProvider() as unknown as CallDataProvider
    const reservations = await getReservations(dp, userId)

    return NextResponse.json({
      success: true,
      data: { reservations },
    })
  } catch (err) {
    console.error("[Call API] getReservations error:", err)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch reservations" },
      },
      { status: 500 }
    )
  }
}

// ── POST: 예약 생성 ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  const body = (await req.json()) as {
    userId?: string
    personaId?: string
    scheduledAt?: string
  }

  if (!body.userId || !body.personaId || !body.scheduledAt) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MISSING_FIELDS", message: "userId, personaId, scheduledAt are required" },
      },
      { status: 400 }
    )
  }

  // 페르소나 존재 확인
  const persona = await prisma.persona.findUnique({
    where: { id: body.personaId },
    select: { id: true, status: true },
  })
  if (!persona || persona.status !== "ACTIVE") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "PERSONA_NOT_FOUND", message: "Persona not found or inactive" },
      },
      { status: 404 }
    )
  }

  try {
    const dp = buildReservationProvider() as unknown as CallDataProvider
    const result = await createReservation(dp, {
      personaId: body.personaId,
      userId: body.userId,
      scheduledAt: new Date(body.scheduledAt),
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "INSUFFICIENT_CREDITS" || err.message === "INSUFFICIENT_BALANCE")
    ) {
      return NextResponse.json(
        { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "Not enough coins" } },
        { status: 402 }
      )
    }
    console.error("[Call API] createReservation error:", err)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create reservation" },
      },
      { status: 500 }
    )
  }
}
