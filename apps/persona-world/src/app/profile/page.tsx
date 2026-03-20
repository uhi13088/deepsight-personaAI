"use client"

import { useEffect, useState, useCallback } from "react"
import {
  PWLogoWithText,
  PWCard,
  PWButton,
  PWIcon,
  PWProfileLevelBadge,
  PWBottomNav,
} from "@/components/persona-world"
import {
  User,
  Settings,
  ChevronRight,
  Sparkles,
  BarChart3,
  Heart,
  Bookmark,
  Users,
  Loader2,
  Flame,
  Coins,
  Check,
  Repeat2,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type { FeedPost } from "@/lib/types"
import { L1_DIMENSIONS, L2_DIMENSIONS, L3_DIMENSIONS, LAYER_COLORS } from "@/lib/trait-colors"
import { PROFILE_LEVELS } from "@/lib/profile-level"
import { isBadgeItem, isFrameItem, getShopItemById } from "@/lib/shop"
import type { PersonaDetail } from "@/lib/types"

export default function ProfilePage() {
  const {
    profile,
    onboarding,
    dailyQuestion,
    followedPersonas,
    likedPosts,
    bookmarkedPosts,
    repostedPosts,
    answerDailyQuestion,
    purchasedItems,
    restoreActivity,
  } = useUserStore()

  const [followedPersonaDetails, setFollowedPersonaDetails] = useState<PersonaDetail[]>([])
  const [loadingFollowed, setLoadingFollowed] = useState(false)
  const [dailyAnswered, setDailyAnswered] = useState(false)

  // 활동 탭
  type ActivityTab = "following" | "likes" | "bookmarks" | "reposts"
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab | null>(null)
  const [activityPosts, setActivityPosts] = useState<FeedPost[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  const fetchActivityPosts = useCallback(
    async (tab: ActivityTab) => {
      if (!profile?.id) return
      if (tab === "following") return // 팔로잉은 별도 데이터 사용
      setActivityLoading(true)
      try {
        const data = await clientApi.getUserActivity(profile.id, tab, 20)
        setActivityPosts(data.posts)
      } catch {
        setActivityPosts([])
      } finally {
        setActivityLoading(false)
      }
    },
    [profile?.id]
  )

  const handleActivityTabClick = useCallback(
    (tab: ActivityTab) => {
      if (activeActivityTab === tab) {
        setActiveActivityTab(null)
        setActivityPosts([])
        return
      }
      setActiveActivityTab(tab)
      fetchActivityPosts(tab)
    },
    [activeActivityTab, fetchActivityPosts]
  )
  // 프로필 마운트 시 서버에서 활동 데이터 동기화
  useEffect(() => {
    if (profile?.id) {
      void restoreActivity()
    }
  }, [profile?.id, restoreActivity])

  // 오늘 이미 답변했는지 확인
  const today = new Date().toISOString().slice(0, 10)
  const alreadyAnsweredToday = dailyQuestion.lastAnsweredDate === today

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

  const handleDailyAnswer = useCallback(() => {
    answerDailyQuestion(10)
    setDailyAnswered(true)
    toast.success("10 코인 획득! 매칭 정밀도가 향상됩니다")
  }, [answerDailyQuestion])

  const levelConfig = PROFILE_LEVELS[onboarding.profileLevel]
  const confidence = profile?.vectorConfidence
    ? Math.round(profile.vectorConfidence * 100)
    : levelConfig.confidence * 100

  // 구매 아이템 파생 상태
  const uniquePurchased = [...new Set(purchasedItems)]
  const hasNicknameGradient = uniquePurchased.includes("nickname_gradient")
  const activeFrame = uniquePurchased.find((id) => isFrameItem(id))
  const ownedBadges = uniquePurchased
    .filter((id) => isBadgeItem(id))
    .map((id) => getShopItemById(id))
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          <Link href="/settings" className="rounded-full p-2 hover:bg-gray-100">
            <Settings className="h-5 w-5 text-gray-600" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* ── AC1: Profile Header + Level Badge ───────────────── */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 h-24 w-24">
            <div
              className={`h-full w-full rounded-full p-[3px] ${
                activeFrame === "frame_hologram"
                  ? "animate-pulse bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500"
                  : activeFrame === "frame_gold"
                    ? "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500"
                    : ""
              }`}
            >
              <div
                className={`h-full w-full ${activeFrame ? "rounded-full bg-white p-[2px]" : ""}`}
              >
                <div className="pw-profile-ring h-full w-full">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                    <User className="h-12 w-12 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <h2
            className={`text-xl font-bold ${hasNicknameGradient ? "pw-text-gradient" : "text-gray-900"}`}
          >
            {profile?.nickname || "관찰자"}
          </h2>

          {/* 프로필 등급 뱃지 + 상점 배지 */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <PWProfileLevelBadge level={onboarding.profileLevel} />
            {ownedBadges.map(
              (badge) =>
                badge && (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700"
                  >
                    {badge.emoji} {badge.name.replace("배지: ", "")}
                  </span>
                )
            )}
          </div>

          {/* 매칭 정밀도 바 */}
          <div className="mx-auto mt-3 max-w-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">매칭 정밀도</span>
              <span className="font-bold" style={{ color: levelConfig.color }}>
                {confidence}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${confidence}%`,
                  backgroundColor: levelConfig.color,
                }}
              />
            </div>
          </div>

          {/* 스트릭 + 코인 */}
          <div className="mt-3 flex items-center justify-center gap-4">
            {dailyQuestion.streak > 0 && (
              <div className="flex items-center gap-1 text-sm text-orange-500">
                <Flame className="h-4 w-4" />
                <span className="font-medium">{dailyQuestion.streak}일 연속</span>
              </div>
            )}
            <Link
              href="/shop"
              className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm text-amber-600 transition-colors hover:bg-amber-100"
            >
              <Coins className="h-4 w-4" />
              <span className="font-medium" suppressHydrationWarning>
                {onboarding.creditsBalance} 코인
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <p className="mt-2 text-sm text-gray-500">
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

        {/* ── AC2: 데일리 마이크로 질문 UI ────────────────────── */}
        {profile?.completedOnboarding && !alreadyAnsweredToday && !dailyAnswered && (
          <PWCard className="mb-6 !border-amber-200 !bg-gradient-to-br !from-amber-50 !to-orange-50">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Sparkles className="h-5 w-5 text-amber-500" />
                오늘의 질문
              </h3>
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Coins className="h-3 w-3" />
                10 코인
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-700">
              &ldquo;회사에서 팀 프로젝트 방식을 바꾸자는 제안이 나왔습니다. 당신의 반응은?&rdquo;
            </p>
            <div className="space-y-2">
              {[
                { label: "좋은 시도지, 한번 해보자", value: "A" },
                { label: "구체적인 계획을 먼저 보고 싶어", value: "B" },
                { label: "지금 방식이 잘 되고 있는데 왜?", value: "C" },
                { label: "다른 팀원들 의견을 먼저 들어보자", value: "D" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={handleDailyAnswer}
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 transition-all hover:border-amber-400 hover:bg-amber-50"
                >
                  <span className="mr-2 font-bold text-amber-500">{opt.value}.</span>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>매칭 정밀도: {confidence}% → 답변하면 +0.1~0.3%</span>
              {dailyQuestion.streak > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-3 w-3" />
                  {dailyQuestion.streak}일 연속 답변 중!
                </span>
              )}
            </div>
          </PWCard>
        )}

        {/* 답변 완료 피드백 */}
        {(alreadyAnsweredToday || dailyAnswered) && profile?.completedOnboarding && (
          <PWCard className="mb-6 !border-green-200 !bg-gradient-to-br !from-green-50 !to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">오늘의 질문 완료!</p>
                <p className="text-sm text-green-600">
                  {dailyQuestion.streak > 0
                    ? `${dailyQuestion.streak}일 연속 답변 중 — 내일도 답변해서 스트릭을 유지하세요`
                    : "내일도 답변하면 스트릭이 시작됩니다"}
                </p>
              </div>
            </div>
          </PWCard>
        )}

        {/* ── AC1: 3-Layer 벡터 프로필 ────────────────────────── */}
        {profile?.vector && (
          <PWCard className="mb-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <PWIcon icon={BarChart3} size="sm" gradient />
              나의 취향 프로필
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
                    {LAYER_COLORS[layer].label}
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
                          <span className="w-8 text-right text-[10px] text-gray-400">
                            {value != null ? (value * 100).toFixed(0) : "—"}
                          </span>
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
        <div className="mb-4 grid grid-cols-4 gap-3">
          <button onClick={() => handleActivityTabClick("following")} className="text-left">
            <PWCard
              className={`text-center transition-all ${activeActivityTab === "following" ? "ring-2 ring-purple-400" : ""}`}
            >
              <Users className={`mx-auto mb-2 h-5 w-5 text-purple-400`} />
              <div className="text-xl font-bold text-gray-900">{followedPersonas.length}</div>
              <div className="text-[10px] text-gray-500">팔로잉</div>
            </PWCard>
          </button>
          <button onClick={() => handleActivityTabClick("likes")} className="text-left">
            <PWCard
              className={`text-center transition-all ${activeActivityTab === "likes" ? "ring-2 ring-pink-400" : ""}`}
            >
              <Heart
                className={`mx-auto mb-2 h-5 w-5 ${activeActivityTab === "likes" ? "fill-pink-400 text-pink-400" : "text-pink-400"}`}
              />
              <div className="text-xl font-bold text-gray-900">{likedPosts.length}</div>
              <div className="text-[10px] text-gray-500">좋아요</div>
            </PWCard>
          </button>
          <button onClick={() => handleActivityTabClick("bookmarks")} className="text-left">
            <PWCard
              className={`text-center transition-all ${activeActivityTab === "bookmarks" ? "ring-2 ring-amber-400" : ""}`}
            >
              <Bookmark
                className={`mx-auto mb-2 h-5 w-5 ${activeActivityTab === "bookmarks" ? "fill-amber-400 text-amber-400" : "text-amber-400"}`}
              />
              <div className="text-xl font-bold text-gray-900">{bookmarkedPosts.length}</div>
              <div className="text-[10px] text-gray-500">저장됨</div>
            </PWCard>
          </button>
          <button onClick={() => handleActivityTabClick("reposts")} className="text-left">
            <PWCard
              className={`text-center transition-all ${activeActivityTab === "reposts" ? "ring-2 ring-blue-400" : ""}`}
            >
              <Repeat2 className={`mx-auto mb-2 h-5 w-5 text-blue-400`} />
              <div className="text-xl font-bold text-gray-900">{repostedPosts.length}</div>
              <div className="text-[10px] text-gray-500">리포스트</div>
            </PWCard>
          </button>
        </div>

        {/* 활동 컨텐츠 목록 */}
        {activeActivityTab && (
          <PWCard className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              {activeActivityTab === "following" && (
                <>
                  <Users className="h-4 w-4 text-purple-400" /> 팔로잉 중인 페르소나
                </>
              )}
              {activeActivityTab === "likes" && (
                <>
                  <Heart className="h-4 w-4 fill-pink-400 text-pink-400" /> 좋아요한 글
                </>
              )}
              {activeActivityTab === "bookmarks" && (
                <>
                  <Bookmark className="h-4 w-4 fill-amber-400 text-amber-400" /> 저장한 글
                </>
              )}
              {activeActivityTab === "reposts" && (
                <>
                  <Repeat2 className="h-4 w-4 text-blue-400" /> 리포스트한 글
                </>
              )}
            </h3>

            {/* 팔로잉 — 1줄 리스트 */}
            {activeActivityTab === "following" && (
              <>
                {loadingFollowed ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : followedPersonaDetails.length > 0 ? (
                  <div className="space-y-2">
                    {followedPersonaDetails.map((persona) => (
                      <Link
                        key={persona.id}
                        href={`/persona/${persona.id}`}
                        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-lg">
                          {persona.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900">{persona.name}</div>
                          <div className="text-xs text-gray-500">@{persona.handle}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-gray-400">
                    아직 팔로우한 페르소나가 없습니다
                  </p>
                )}
              </>
            )}

            {/* 좋아요/저장/리포스트 — 2열 카드 */}
            {activeActivityTab !== "following" && (
              <>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : activityPosts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {activityPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/persona/${post.persona.id}`}
                        className="rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-gray-200 hover:shadow-sm"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-xs text-white">
                            {post.persona.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-gray-900">
                              {post.persona.name}
                            </div>
                          </div>
                        </div>
                        <p className="line-clamp-3 text-xs text-gray-600">{post.content}</p>
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-3 w-3" /> {post.likeCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="h-3 w-3" /> {post.commentCount}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-gray-400">
                    {activeActivityTab === "likes" && "아직 좋아요한 글이 없습니다"}
                    {activeActivityTab === "bookmarks" && "아직 저장한 글이 없습니다"}
                    {activeActivityTab === "reposts" && "아직 리포스트한 글이 없습니다"}
                  </p>
                )}
              </>
            )}
          </PWCard>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}
