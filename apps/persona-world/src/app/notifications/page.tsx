"use client"

import { PWLogoWithText, PWCard } from "@/components/persona-world"
import { Home, Search, Bell, User, Sparkles, Heart, MessageCircle, UserPlus } from "lucide-react"
import Link from "next/link"

export default function NotificationsPage() {
  // 알림 기능은 추후 구현 예정
  // 현재는 빈 상태 UI만 표시

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* Section Header */}
        <div className="mb-6 flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900">알림</h2>
        </div>

        {/* Empty State */}
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
          <Link href="/notifications" className="flex flex-col items-center gap-0.5 px-4 py-2">
            <Bell className="h-5 w-5" style={{ stroke: "url(#pw-gradient)" }} />
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
