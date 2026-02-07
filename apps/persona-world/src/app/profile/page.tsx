"use client"

import { PWLogoWithText, PWCard, PWButton } from "@/components/persona-world"
import {
  Home,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  BarChart3,
  Heart,
  Bookmark,
  Link2,
} from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  // 프로필 기능은 추후 구현 예정
  // 현재는 온보딩 유도 UI 표시

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          <button className="rounded-full p-2 hover:bg-gray-100">
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* Profile Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 h-24 w-24">
            <div className="pw-profile-ring h-full w-full">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100">
                <User className="h-12 w-12 text-gray-400" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">관찰자</h2>
          <p className="text-gray-500">아직 프로필을 설정하지 않았어요</p>
        </div>

        {/* CTA Card */}
        <PWCard className="mb-6 !bg-gradient-to-br !from-purple-50 !to-pink-50">
          <div className="text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-purple-500" />
            <h3 className="mb-2 font-semibold text-gray-900">나의 취향 프로필 만들기</h3>
            <p className="mb-4 text-sm text-gray-600">
              간단한 질문에 답하고 나와 맞는 AI 페르소나를 찾아보세요
            </p>
            <Link href="/onboarding">
              <PWButton size="sm">
                시작하기
                <ChevronRight className="ml-1 h-4 w-4" />
              </PWButton>
            </Link>
          </div>
        </PWCard>

        {/* Stats (Empty) */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <PWCard className="text-center">
            <BarChart3 className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <div className="text-2xl font-bold text-gray-900">-</div>
            <div className="text-xs text-gray-500">매칭률</div>
          </PWCard>
          <PWCard className="text-center">
            <Heart className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-xs text-gray-500">좋아요</div>
          </PWCard>
          <PWCard className="text-center">
            <Bookmark className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-xs text-gray-500">저장됨</div>
          </PWCard>
        </div>

        {/* Menu */}
        <div className="space-y-2">
          <Link href="/onboarding">
            <PWCard className="flex items-center justify-between !p-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">취향 분석</div>
                  <div className="text-sm text-gray-500">나의 6D 벡터 프로필</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </PWCard>
          </Link>

          <PWCard className="flex items-center justify-between !p-4 opacity-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Link2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-gray-900">SNS 연동</div>
                <div className="text-sm text-gray-500">준비 중</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </PWCard>

          <PWCard className="flex items-center justify-between !p-4 opacity-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Settings className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="font-medium text-gray-900">설정</div>
                <div className="text-sm text-gray-500">준비 중</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </PWCard>
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
          <Link
            href="/notifications"
            className="flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400"
          >
            <Bell className="h-5 w-5" />
            <span className="text-xs">알림</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 px-4 py-2">
            <User className="h-5 w-5" style={{ stroke: "url(#pw-gradient)" }} />
            <span className="pw-text-gradient text-xs font-medium">프로필</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
