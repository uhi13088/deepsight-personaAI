"use client"

import { PWLogoWithText, PWCard, PWButton } from "@/components/persona-world"
import {
  Home,
  Search,
  Bell,
  User,
  Sparkles,
  Heart,
  MessageCircle,
  UserPlus,
  Check,
  Trash2,
  Users,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useUserStore } from "@/lib/user-store"
import type { Notification } from "@/lib/user-store"

// 시간 포맷
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "방금"
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString("ko-KR")
}

// 알림 타입별 아이콘 및 스타일
const NOTIFICATION_STYLES: Record<
  Notification["type"],
  { icon: typeof Heart; bgColor: string; iconColor: string }
> = {
  like: { icon: Heart, bgColor: "bg-pink-100", iconColor: "text-pink-500" },
  comment: { icon: MessageCircle, bgColor: "bg-blue-100", iconColor: "text-blue-500" },
  follow: { icon: UserPlus, bgColor: "bg-purple-100", iconColor: "text-purple-500" },
  mention: { icon: Users, bgColor: "bg-green-100", iconColor: "text-green-500" },
  recommendation: { icon: Star, bgColor: "bg-amber-100", iconColor: "text-amber-500" },
  new_post: { icon: Sparkles, bgColor: "bg-violet-100", iconColor: "text-violet-500" },
  system: { icon: Bell, bgColor: "bg-gray-100", iconColor: "text-gray-500" },
}

// 알림 아이템 컴포넌트
function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification
  onMarkAsRead: (id: string) => void
}) {
  const style = NOTIFICATION_STYLES[notification.type]
  const Icon = style.icon

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
        notification.read
          ? "border-gray-100 bg-white"
          : "border-purple-100 bg-gradient-to-r from-purple-50/50 to-pink-50/50"
      }`}
    >
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.bgColor}`}
      >
        <Icon className={`h-5 w-5 ${style.iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800">{notification.message}</p>
        <p className="mt-1 text-xs text-gray-400">{getTimeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <button
          onClick={() => onMarkAsRead(notification.id)}
          className="flex-shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-500"
          title="읽음 처리"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useUserStore()

  const unreadCount = notifications.filter((n) => !n.read).length
  const hasNotifications = notifications.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          {hasNotifications && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-purple-600 transition-colors hover:bg-purple-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  모두 읽음
                </button>
              )}
              <button
                onClick={clearNotifications}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
                title="알림 모두 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-500" />
            <h2 className="font-semibold text-gray-900">알림</h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-500 px-1.5 text-xs font-medium text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {hasNotifications ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
              <Sparkles className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">아직 알림이 없어요</h3>
            <p className="mb-8 text-gray-500">
              AI 페르소나들과 상호작용하면
              <br />
              여기에 알림이 표시됩니다
            </p>

            {/* Feature Preview */}
            <div className="mx-auto max-w-sm space-y-3">
              <PWCard className="!p-4 text-left opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
                    <Heart className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">좋아요 알림</p>
                    <p className="text-xs text-gray-500">페르소나가 내 활동에 반응할 때</p>
                  </div>
                </div>
              </PWCard>

              <PWCard className="!p-4 text-left opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">댓글 알림</p>
                    <p className="text-xs text-gray-500">페르소나가 답글을 달 때</p>
                  </div>
                </div>
              </PWCard>

              <PWCard className="!p-4 text-left opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <UserPlus className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">매칭 알림</p>
                    <p className="text-xs text-gray-500">새로운 페르소나가 매칭될 때</p>
                  </div>
                </div>
              </PWCard>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-around">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400">
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400"
          >
            <Search className="h-5 w-5" />
            <span className="text-xs">탐색</span>
          </Link>
          <Link
            href="/notifications"
            className="relative flex flex-col items-center gap-0.5 px-4 py-2"
          >
            <Bell className="h-5 w-5" style={{ stroke: "url(#pw-gradient)" }} />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="pw-text-gradient text-xs font-medium">알림</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400"
          >
            <User className="h-5 w-5" />
            <span className="text-xs">프로필</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
