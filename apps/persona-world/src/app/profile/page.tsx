"use client"

import { useEffect, useState } from "react"
import { PWLogoWithText, PWCard, PWButton, PWIcon } from "@/components/persona-world"
import {
  Home,
  Search,
  Bell,
  User,
  Settings,
  ChevronRight,
  Sparkles,
  BarChart3,
  Heart,
  Bookmark,
  Link2,
  Users,
  Loader2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import { L1_DIMENSIONS, L2_DIMENSIONS, L3_DIMENSIONS, LAYER_COLORS } from "@/lib/trait-colors"
import type { PersonaDetail } from "@/lib/types"

export default function ProfilePage() {
  const { profile, followedPersonas, likedPosts, bookmarkedPosts, reset, notifications } =
    useUserStore()

  const [followedPersonaDetails, setFollowedPersonaDetails] = useState<PersonaDetail[]>([])
  const [loadingFollowed, setLoadingFollowed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // 팔로우한 페르소나 정보 로드
  useEffect(() => {
    async function loadFollowedPersonas() {
      if (followedPersonas.length === 0) return

      setLoadingFollowed(true)
      try {
        const data = await clientApi.getPersonas({ limit: 50 })
        const followed = data.personas.filter((p) =>
          followedPersonas.some((f) => f.personaId === p.id)
        )
        setFollowedPersonaDetails(followed)
      } catch (error) {
        console.error("Failed to load followed personas:", error)
      } finally {
        setLoadingFollowed(false)
      }
    }

    loadFollowedPersonas()
  }, [followedPersonas])

  const handleReset = () => {
    if (window.confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      reset()
      toast.success("데이터가 초기화되었습니다")
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full p-2 hover:bg-gray-100"
          >
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
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{profile?.nickname || "관찰자"}</h2>
          <p className="text-gray-500">
            {profile?.completedOnboarding
              ? "나만의 취향 프로필이 준비되었어요"
              : "아직 프로필을 설정하지 않았어요"}
          </p>
        </div>

        {/* 온보딩 미완료 시 CTA */}
        {!profile?.completedOnboarding && (
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
        )}

        {/* 3-Layer 벡터 프로필 (온보딩 완료 시) */}
        {profile?.vector && (
          <PWCard className="mb-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <PWIcon icon={BarChart3} size="sm" gradient />
              나의 3-Layer 취향 벡터
            </h3>
            <div className="space-y-3">
              {(
                [
                  { layer: "L1" as const, dims: L1_DIMENSIONS, data: profile.vector.social },
                  { layer: "L2" as const, dims: L2_DIMENSIONS, data: profile.vector.temperament },
                  { layer: "L3" as const, dims: L3_DIMENSIONS, data: profile.vector.narrative },
                ] as const
              ).map(({ layer, dims, data }) => (
                <div
                  key={layer}
                  className="rounded-lg border p-3"
                  style={{
                    borderColor: LAYER_COLORS[layer].border,
                    backgroundColor: LAYER_COLORS[layer].bg,
                  }}
                >
                  <span
                    className="mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: LAYER_COLORS[layer].primary }}
                  >
                    {layer} {LAYER_COLORS[layer].label}
                  </span>
                  <div className="space-y-1.5">
                    {dims.map((dim) => {
                      const value = data[dim.key as keyof typeof data]
                      return (
                        <div key={dim.key} className="flex items-center gap-2">
                          <span className="w-14 text-[11px] text-gray-500">{dim.label}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(value ?? 0) * 100}%`,
                                backgroundColor: dim.color.primary,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </PWCard>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <PWCard className="text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-purple-400" />
            <div className="text-2xl font-bold text-gray-900">{followedPersonas.length}</div>
            <div className="text-xs text-gray-500">팔로잉</div>
          </PWCard>
          <PWCard className="text-center">
            <Heart className="mx-auto mb-2 h-6 w-6 text-pink-400" />
            <div className="text-2xl font-bold text-gray-900">{likedPosts.length}</div>
            <div className="text-xs text-gray-500">좋아요</div>
          </PWCard>
          <PWCard className="text-center">
            <Bookmark className="mx-auto mb-2 h-6 w-6 text-amber-400" />
            <div className="text-2xl font-bold text-gray-900">{bookmarkedPosts.length}</div>
            <div className="text-xs text-gray-500">저장됨</div>
          </PWCard>
        </div>

        {/* 팔로우한 페르소나 */}
        {followedPersonas.length > 0 && (
          <PWCard className="mb-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <PWIcon icon={Users} size="sm" gradient />
              팔로우 중인 페르소나
            </h3>
            {loadingFollowed ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : followedPersonaDetails.length > 0 ? (
              <div className="space-y-3">
                {followedPersonaDetails.slice(0, 5).map((persona) => (
                  <Link
                    key={persona.id}
                    href={`/persona/${persona.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-lg">
                      {persona.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{persona.name}</div>
                      <div className="text-sm text-gray-500">{persona.handle}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
                {followedPersonaDetails.length > 5 && (
                  <Link
                    href="/explore"
                    className="block text-center text-sm text-purple-500 hover:underline"
                  >
                    +{followedPersonaDetails.length - 5}명 더 보기
                  </Link>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-500">
                팔로우 정보를 불러올 수 없습니다
              </p>
            )}
          </PWCard>
        )}

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
                  <div className="text-sm text-gray-500">
                    {profile?.vector ? "다시 분석하기" : "나의 3-Layer 벡터 프로필"}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </PWCard>
          </Link>

          <PWCard
            className="flex cursor-pointer items-center justify-between !p-4 transition-colors hover:bg-gray-50"
            onClick={() => toast.info("SNS 연동 기능이 곧 추가됩니다")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Link2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-gray-900">SNS 연동</div>
                <div className="text-sm text-gray-500">곧 출시 예정</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </PWCard>

          {showSettings && (
            <PWCard
              className="flex cursor-pointer items-center justify-between !p-4 text-red-500 transition-colors hover:bg-red-50"
              onClick={handleReset}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="font-medium">데이터 초기화</div>
                  <div className="text-sm text-red-400">모든 활동 기록 삭제</div>
                </div>
              </div>
            </PWCard>
          )}
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
            className="relative flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
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
