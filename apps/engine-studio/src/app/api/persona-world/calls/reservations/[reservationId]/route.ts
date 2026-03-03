import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { cancelReservation } from "@/lib/persona-world/call-service"
import type { CallDataProvider } from "@/lib/persona-world/call-service"

// ── GET: 예약 상세 ──────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  const { reservationId } = await params

  const reservation = await prisma.callReservation.findUnique({
    where: { id: reservationId },
    include: {
      persona: { select: { name: true, profileImageUrl: true } },
      session: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          totalTurns: true,
          totalDurationSec: true,
        },
      },
    },
  })

  if (!reservation) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Reservation not found" } },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      reservation: {
        id: reservation.id,
        personaId: reservation.personaId,
        personaName: reservation.persona.name,
        personaImageUrl: reservation.persona.profileImageUrl,
        userId: reservation.userId,
        scheduledAt: reservation.scheduledAt.toISOString(),
        status: reservation.status,
        coinSpent: reservation.coinSpent,
        session: reservation.session
          ? {
              id: reservation.session.id,
              startedAt: reservation.session.startedAt.toISOString(),
              endedAt: reservation.session.endedAt?.toISOString() ?? null,
              totalTurns: reservation.session.totalTurns,
              totalDurationSec: reservation.session.totalDurationSec,
            }
          : null,
      },
    },
  })
}

// ── DELETE: 예약 취소 ────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const authError = verifyInternalToken(req)
  if (authError) return authError

  const { reservationId } = await params
  const userId = req.nextUrl.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_USER_ID", message: "userId is required" } },
      { status: 400 }
    )
  }

  try {
    const dp: Pick<CallDataProvider, "getReservation" | "updateReservationStatus"> = {
      async getReservation(id) {
        const r = await prisma.callReservation.findUnique({ where: { id } })
        if (!r) return null
        return {
          id: r.id,
          personaId: r.personaId,
          userId: r.userId,
          scheduledAt: r.scheduledAt,
          status: r.status,
          coinSpent: r.coinSpent,
        }
      },
      async updateReservationStatus(id, status) {
        await prisma.callReservation.update({
          where: { id },
          data: { status: status as "CANCELLED" },
        })
      },
    }

    await cancelReservation(dp as CallDataProvider, { reservationId, userId })

    return NextResponse.json({ success: true, data: { cancelled: true } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "RESERVATION_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Reservation not found" } },
          { status: 404 }
        )
      }
      if (err.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Not authorized" } },
          { status: 403 }
        )
      }
      if (err.message === "CANNOT_CANCEL") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CANNOT_CANCEL",
              message: "Reservation cannot be cancelled in current status",
            },
          },
          { status: 400 }
        )
      }
    }
    console.error("[Call API] cancelReservation error:", err)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to cancel reservation" },
      },
      { status: 500 }
    )
  }
}
