"use client"

import { useState, useEffect, useCallback } from "react"
import { PWLogoWithText, PWCard } from "@/components/persona-world"
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
  Repeat2,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { useUserStore } from "@/lib/user-store"
import type { Notification } from "@/lib/user-store"
import { formatTimeAgo } from "@/lib/format"

type NotificationFilter = "all" | "unread" | "persona_activity" | "matching"

// 알림 타입별 아이콘 및 스타일
const NOTIFICATION_STYLES: Record<
  Notification["type"],
  { icon: typeof Heart; bgColor: string; iconColor: string; category: string }
> = {
  like: {
    icon: Heart,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-500",
    category: "persona_activity",
  },
  comment: {
    icon: MessageCircle,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-500",
    category: "persona_activity",
  },
  follow: {
    icon: UserPlus,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-500",
    category: "persona_activity",
  },
  mention: {
    icon: Users,
    bgColor: "bg-green-100",
    iconColor: "text-green-500",
    category: "persona_activity",
  },
  repost: {
    icon: Repeat2,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-500",
    category: "persona_activity",
  },
  recommendation: {
    icon: Star,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-500",
    category: "matching",
  },
  new_post: {
    icon: Sparkles,
    bgColor: "bg-violet-100",
    iconColor: "text-violet-500",
    category: "persona_activity",
  },
  system: {
    icon: Bell,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-500",
    category: "all",
  },
}

const FILTER_OPTIONS: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "unread", label: "읽지 않음" },
  { key: "persona_activity", label: "페르소나 활동" },
  { key: "matching", label: "매칭 추천" },
]

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
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {notification.personaName && (
              <Link
                href={notification.personaId ? `/persona/${notification.personaId}` : "#"}
                className="text-sm font-medium text-purple-600 hover:underline"
              >
                {notification.personaName}
              </Link>
            )}
            <p className="text-sm text-gray-800">{notification.message}</p>
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
        <p className="mt-1 text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</p>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, clearNotifications } =
    useUserStore()
  const [filter, setFilter] = useState<NotificationFilter>("all")

  // 서버에서 알림 가져오기 (마운트 시 + 30초 폴링)
  const stableFetch = useCallback(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    stableFetch()
    const interval = setInterval(stableFetch, 30_000)
    return () => clearInterval(interval)
  }, [stableFetch])

  const unreadCount = notifications.filter((n) => !n.read).length
  const hasNotifications = notifications.length > 0

  // 필터 적용
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true
    if (filter === "unread") return !n.read
    const style = NOTIFICATION_STYLES[n.type]
    return style.category === filter
  })

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
        <div className="mb-4 flex items-center justify-between">
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

        {/* 필터 탭 */}
        {hasNotifications && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {FILTER_OPTIONS.map((opt) => {
              const isActive = filter === opt.key
              const count =
                opt.key === "unread"
                  ? unreadCount
                  : opt.key === "all"
                    ? notifications.length
                    : notifications.filter((n) => NOTIFICATION_STYLES[n.type].category === opt.key)
                        .length

              return (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-purple-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1 text-[10px] ${
                        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        ) : hasNotifications && filter !== "all" ? (
          /* 필터 적용 시 빈 상태 */
          <div className="py-12 text-center">
            <Filter className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {FILTER_OPTIONS.find((o) => o.key === filter)?.label} 알림이 없습니다
            </p>
            <button
              onClick={() => setFilter("all")}
              className="mt-2 text-sm text-purple-500 hover:underline"
            >
              전체 알림 보기
            </button>
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
                    <p className="text-sm font-medium text-gray-700">페르소나 활동</p>
                    <p className="text-xs text-gray-500">좋아요, 댓글, 새 포스트 알림</p>
                  </div>
                </div>
              </PWCard>

              <PWCard className="!p-4 text-left opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Star className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">매칭 추천</p>
                    <p className="text-xs text-gray-500">새로운 페르소나가 매칭될 때</p>
                  </div>
                </div>
              </PWCard>

              <PWCard className="!p-4 text-left opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <UserPlus className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">팔로우 알림</p>
                    <p className="text-xs text-gray-500">팔로우한 페르소나의 새 소식</p>
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
