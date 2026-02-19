"use client"

import { useEffect, useState, useCallback } from "react"
import { signOut } from "next-auth/react"
import {
  PWLogoWithText,
  PWCard,
  PWButton,
  PWIcon,
  PWProfileLevelBadge,
} from "@/components/persona-world"
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
  Flame,
  Coins,
  Check,
  X,
  Shield,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import { L1_DIMENSIONS, L2_DIMENSIONS, L3_DIMENSIONS, LAYER_COLORS } from "@/lib/trait-colors"
import { PROFILE_LEVELS } from "@/lib/profile-level"
import { SNS_PROVIDER_CONFIG } from "@/lib/role-config"
import { isBadgeItem, isFrameItem, getShopItemById } from "@/lib/shop"
import type { PersonaDetail, SnsProvider } from "@/lib/types"

export default function ProfilePage() {
  const {
    profile,
    onboarding,
    dailyQuestion,
    snsConnections,
    followedPersonas,
    likedPosts,
    bookmarkedPosts,
    reset,
    notifications,
    answerDailyQuestion,
    connectSns,
    disconnectSns,
    setSnsAnalyzing,
    purchasedItems,
  } = useUserStore()

  const [followedPersonaDetails, setFollowedPersonaDetails] = useState<PersonaDetail[]>([])
  const [loadingFollowed, setLoadingFollowed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSnsConnect, setShowSnsConnect] = useState(false)
  const [dailyAnswered, setDailyAnswered] = useState(false)
  const [consentProvider, setConsentProvider] = useState<SnsProvider | null>(null)

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

  const handleLogout = async () => {
    // Zustand 스토어 초기화
    reset()
    // 브라우저 캐시 정리 (stale 데이터로 인한 redirect loop 방지)
    if ("caches" in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
    localStorage.clear()
    sessionStorage.clear()
    // NextAuth 로그아웃
    await signOut({ callbackUrl: "/" })
  }

  const handleReset = () => {
    if (window.confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      reset()
      toast.success("데이터가 초기화되었습니다")
    }
  }

  const handleDailyAnswer = useCallback(() => {
    answerDailyQuestion(10)
    setDailyAnswered(true)
    toast.success("10 코인 획득! 매칭 정밀도가 향상됩니다")
  }, [answerDailyQuestion])

  const handleSnsConnect = useCallback(
    (provider: SnsProvider) => {
      setConsentProvider(null)
      connectSns(provider, `${provider}_${Date.now()}`)
      setSnsAnalyzing(provider, true)
      toast.success(`${SNS_PROVIDER_CONFIG[provider].label} 연동 완료! 분석을 시작합니다`)
      // 분석 완료 시뮬레이션
      setTimeout(() => {
        setSnsAnalyzing(provider, false)
        toast.success(`${SNS_PROVIDER_CONFIG[provider].label} 분석이 완료되었습니다`)
      }, 3000)
    },
    [connectSns, setSnsAnalyzing]
  )

  const handleSnsDisconnect = useCallback(
    (provider: SnsProvider) => {
      disconnectSns(provider)
      toast.info(`${SNS_PROVIDER_CONFIG[provider].label} 연동이 해제되었습니다`)
    },
    [disconnectSns]
  )

  const unreadNotifications = notifications.filter((n) => !n.read).length
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
              <span className="font-medium">{onboarding.creditsBalance} 코인</span>
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

        {/* ── AC3: SNS 연동 UI ──────────────────────────────── */}
        <PWCard className="mb-6">
          <button
            onClick={() => setShowSnsConnect(!showSnsConnect)}
            className="flex w-full items-center justify-between"
          >
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <PWIcon icon={Link2} size="sm" gradient />
              SNS 연동
              {snsConnections.length > 0 && (
                <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
                  {snsConnections.length}개 연동
                </span>
              )}
            </h3>
            <ChevronRight
              className={`h-5 w-5 text-gray-400 transition-transform ${showSnsConnect ? "rotate-90" : ""}`}
            />
          </button>

          {showSnsConnect && (
            <div className="mt-4 space-y-2">
              <p className="mb-3 text-sm text-gray-500">
                SNS 활동을 분석해서 매칭 정밀도를 더 높일 수 있어요
              </p>
              {(Object.keys(SNS_PROVIDER_CONFIG) as SnsProvider[]).map((provider) => {
                const config = SNS_PROVIDER_CONFIG[provider]
                const connection = snsConnections.find((c) => c.provider === provider)
                const isConnected = connection?.connected ?? false
                const isAnalyzing = connection?.analyzing ?? false

                return (
                  <div
                    key={provider}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      isConnected ? "border-green-200 bg-green-50/50" : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${config.color}`}
                      >
                        {config.emoji}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{config.label}</div>
                        <div className="text-xs text-gray-500">
                          {isAnalyzing
                            ? "분석 중..."
                            : isConnected
                              ? `연동됨 · ${config.description}`
                              : config.description}
                        </div>
                      </div>
                    </div>
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    ) : isConnected ? (
                      <button
                        onClick={() => handleSnsDisconnect(provider)}
                        className="rounded-full px-3 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                      >
                        해제
                      </button>
                    ) : (
                      <button
                        onClick={() => setConsentProvider(provider)}
                        className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200"
                      >
                        연동하기
                      </button>
                    )}
                  </div>
                )
              })}
              <p className="pt-2 text-center text-xs text-gray-400">
                연동할수록 정밀도가 높아져요 — 1개: +2~3% | 2개+: +4~5% (교차검증)
              </p>
            </div>
          )}
        </PWCard>

        {/* SNS 동의 모달 */}
        {consentProvider && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
            <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="h-5 w-5 text-purple-500" />
                  데이터 분석 동의
                </h3>
                <button
                  onClick={() => setConsentProvider(null)}
                  className="rounded-full p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <p className="mb-4 text-sm font-medium text-gray-700">
                {SNS_PROVIDER_CONFIG[consentProvider].label} 데이터 분석 동의
              </p>

              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium text-gray-600">다음 데이터를 분석합니다:</p>
                {[
                  "공개 포스트/트윗 (최근 200개)",
                  "좋아요/관심 표시 기록",
                  "장르/카테고리 선호 패턴",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium text-gray-600">다음은 수집하지 않습니다:</p>
                {["비공개 메시지 (DM)", "개인 식별 정보", "결제 정보"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-red-500">
                    <X className="h-3 w-3" />
                    {item}
                  </div>
                ))}
              </div>

              <p className="mb-6 text-xs text-gray-500">
                분석된 결과는 매칭 정밀도 향상에만 사용되며, 원본 데이터는 분석 후 즉시 삭제됩니다.
                동의는 언제든 철회할 수 있습니다.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConsentProvider(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={() => handleSnsConnect(consentProvider)}
                  className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  동의하고 연동하기
                </button>
              </div>
            </div>
          </div>
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

          {showSettings && (
            <>
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
              <PWCard
                className="flex cursor-pointer items-center justify-between !p-4 text-gray-600 transition-colors hover:bg-gray-50"
                onClick={handleLogout}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <LogOut className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium">로그아웃</div>
                    <div className="text-sm text-gray-400">계정에서 로그아웃합니다</div>
                  </div>
                </div>
              </PWCard>
            </>
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
