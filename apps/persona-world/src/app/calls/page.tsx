"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Phone, Loader2, Sparkles, Clock, X, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { PWLogoWithText, PWBottomNav, PWProfileRing } from "@/components/persona-world"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { ROLE_COLORS_BOLD } from "@/lib/role-config"
import type { CallReservation } from "@/lib/types"

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  PENDING: { label: "대기 중", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50" },
  CONFIRMED: {
    label: "확인됨",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  IN_PROGRESS: {
    label: "통화 중",
    icon: Phone,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  COMPLETED: {
    label: "완료",
    icon: CheckCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
  CANCELLED: { label: "취소됨", icon: X, color: "text-red-500", bgColor: "bg-red-50" },
  EXPIRED: {
    label: "만료됨",
    icon: AlertCircle,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
  },
}

export default function CallsPage() {
  const profile = useUserStore((s) => s.profile)
  const [reservations, setReservations] = useState<CallReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    async function load() {
      try {
        setIsLoading(true)
        const data = await clientApi.getCallReservations(profile!.id)
        setReservations(data)
      } catch (err) {
        console.error("Failed to load reservations:", err)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [profile?.id, profile])

  const handleCancel = async (reservationId: string) => {
    if (!profile?.id) return
    try {
      await clientApi.cancelCallReservation(reservationId, profile.id)
      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? { ...r, status: "CANCELLED" as const } : r))
      )
      toast.success("예약이 취소되었습니다")
    } catch {
      toast.error("예약 취소에 실패했습니다")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        <div className="mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-violet-500" />
          <h2 className="font-semibold text-gray-900">통화 예약</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : reservations.length > 0 ? (
          <div className="space-y-3">
            {reservations.map((r) => (
              <ReservationCard key={r.id} reservation={r} onCancel={() => handleCancel(r.id)} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100">
              <Sparkles className="h-10 w-10 text-violet-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">통화 예약이 없어요</h3>
            <p className="mb-6 text-gray-500">
              좋아하는 페르소나의 프로필에서
              <br />
              &ldquo;통화 예약&rdquo; 버튼을 눌러보세요
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
            >
              <Phone className="h-4 w-4" />
              페르소나 찾아보기
            </Link>
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}

// ── 예약 카드 ─────────────────────────────────────────────

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: CallReservation
  onCancel: () => void
}) {
  const colorBold = ROLE_COLORS_BOLD["COMPANION"] || "from-violet-400 to-purple-500"
  const statusConfig = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.PENDING
  const StatusIcon = statusConfig.icon
  const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED"

  const scheduledDate = new Date(reservation.scheduledAt)
  const dateStr = scheduledDate.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })
  const timeStr = scheduledDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 transition-all hover:shadow-sm">
      <div className="flex items-center gap-3">
        <PWProfileRing size="md">
          {reservation.personaImageUrl ? (
            <img
              src={reservation.personaImageUrl}
              alt={reservation.personaName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-lg text-white`}
            >
              {reservation.personaName.charAt(0)}
            </div>
          )}
        </PWProfileRing>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{reservation.personaName}</h3>
          <div className="mt-1 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">
              {dateStr} {timeStr}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </span>
          <span className="text-[10px] text-gray-400">{reservation.coinSpent} 코인</span>
        </div>
      </div>
      {canCancel && (
        <div className="mt-3 border-t border-gray-50 pt-3">
          <button
            onClick={onCancel}
            className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-red-300 hover:text-red-500"
          >
            예약 취소
          </button>
        </div>
      )}
    </div>
  )
}
