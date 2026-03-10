"use client"

import { cn } from "@/lib/utils"
import type { ArenaSessionListItem } from "@/lib/api"

interface ArenaRoomCardProps {
  session: ArenaSessionListItem
  onClick?: () => void
  className?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WAITING: { label: "대기 중", color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS: { label: "진행 중", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "취소됨", color: "bg-red-100 text-red-600" },
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  ROOM_1V1: "1:1",
  ROOM_PANEL: "패널",
  ROOM_LARGE: "대형",
}

export function ArenaRoomCard({ session, onClick, className }: ArenaRoomCardProps) {
  const statusInfo = STATUS_LABELS[session.status] ?? STATUS_LABELS.WAITING
  const roomLabel = ROOM_TYPE_LABELS[session.roomType] ?? session.roomType

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm",
        "transition-all hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">{roomLabel}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusInfo.color)}>
            {statusInfo.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">{session.participantIds.length}명</span>
      </div>

      <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900">{session.topic}</h3>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {session.currentRound}/{session.maxRounds} 라운드
        </span>
        <span>{new Date(session.createdAt).toLocaleDateString("ko-KR")}</span>
      </div>
    </button>
  )
}
