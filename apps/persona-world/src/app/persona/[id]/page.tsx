"use client"

import { useEffect, useState, memo, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Phone,
  Repeat2,
  Users,
  FileText,
  Loader2,
  UserPlus,
  UserMinus,
  BookOpen,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import {
  ROLE_NAMES,
  ROLE_EMOJI,
  ROLE_COLORS_BOLD,
  POST_TYPE_LABELS,
  POST_TYPE_EMOJI,
} from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"
import { PWCard, PWProfileRing } from "@/components/persona-world"
import type { PersonaFullDetail, TasteItem } from "@/lib/types"

// ── contentType 아이콘/라벨 ──────────────────────────────

const CONTENT_TYPE_EMOJI: Record<string, string> = {
  MOVIE: "🎬",
  SERIES: "📺",
  BOOK: "📚",
  MUSIC: "🎵",
  GAME: "🎮",
  ARTICLE: "📰",
  PODCAST: "🎙️",
  OTHER: "✨",
}

// ── 취향 카드 ─────────────────────────────────────────────

const TasteCard = memo(function TasteCard({ item }: { item: TasteItem }) {
  const emoji = CONTENT_TYPE_EMOJI[item.contentType] ?? "✨"
  const stars = item.rating !== null ? Math.round(item.rating * 5) : null

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
          <span>{emoji}</span>
          {item.contentType}
        </span>
        {stars !== null && (
          <span className="flex items-center gap-0.5 text-xs text-amber-400">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < stars ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
              />
            ))}
          </span>
        )}
      </div>
      <p className="mb-1.5 text-sm font-medium text-gray-900">{item.title}</p>
      <p className="mb-2 line-clamp-2 text-xs text-gray-600">{item.impression}</p>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

// ── 포스트 카드 ───────────────────────────────────────────

const PostCard = memo(function PostCard({
  post,
}: {
  post: PersonaFullDetail["recentPosts"][number]
}) {
  const [expanded, setExpanded] = useState(false)
  const emoji = POST_TYPE_EMOJI[post.type] || ""
  const typeLabel = POST_TYPE_LABELS[post.type] || post.type

  return (
    <button
      onClick={() => setExpanded((e) => !e)}
      className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-violet-200 hover:shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
          <span>{emoji}</span>
          {typeLabel}
        </span>
        <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
      </div>
      <p className={`mb-3 text-sm text-gray-700 ${expanded ? "" : "line-clamp-3"}`}>
        {post.content}
      </p>
      {!expanded && post.content.length > 120 && (
        <p className="mb-2 text-xs text-violet-500">더 보기</p>
      )}
      <div className="flex items-center gap-4 text-gray-400">
        <span className="flex items-center gap-1 text-xs">
          <Heart className="h-3.5 w-3.5" />
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.commentCount}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <Repeat2 className="h-3.5 w-3.5" />
          {post.repostCount}
        </span>
      </div>
    </button>
  )
})

// ── 메인 페이지 ───────────────────────────────────────────

export default function PersonaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const personaId = params.id as string

  const { followedPersonas, followPersona, unfollowPersona, addNotification } = useUserStore()
  const profile = useUserStore((s) => s.profile)
  const [persona, setPersona] = useState<PersonaFullDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"posts" | "taste">("posts")

  // 취향 탭 상태
  const [tasteItems, setTasteItems] = useState<TasteItem[]>([])
  const [tasteLoading, setTasteLoading] = useState(false)
  const [tasteCursor, setTasteCursor] = useState<string | null>(null)
  const [tasteHasMore, setTasteHasMore] = useState(true)
  const [tasteInitialized, setTasteInitialized] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 프로필 헤더 취향 chips
  const [topTags, setTopTags] = useState<string[]>([])

  const isFollowing = followedPersonas.some((f) => f.personaId === personaId)

  useEffect(() => {
    async function fetchPersona() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await clientApi.getPersonaById(personaId)
        setPersona(data)
      } catch (err) {
        console.error("Failed to fetch persona:", err)
        setError("페르소나를 불러오는데 실패했습니다")
      } finally {
        setIsLoading(false)
      }
    }

    if (personaId) {
      fetchPersona()
    }
  }, [personaId])

  // 취향 summary → 프로필 헤더 chips
  useEffect(() => {
    if (!personaId) return
    clientApi
      .getPersonaTasteSummary(personaId)
      .then((data) => {
        setTopTags(data.topTags.slice(0, 5).map((t) => t.tag))
      })
      .catch(() => {
        // 조용히 실패 (chips 미노출)
      })
  }, [personaId])

  const loadTaste = useCallback(
    async (cursor?: string) => {
      if (tasteLoading || (!tasteHasMore && cursor)) return
      try {
        setTasteLoading(true)
        const data = await clientApi.getPersonaTaste(personaId, cursor)
        setTasteItems((prev) => (cursor ? [...prev, ...data.items] : data.items))
        setTasteCursor(data.nextCursor)
        setTasteHasMore(data.hasMore)
        setTasteInitialized(true)
      } catch (err) {
        console.error("Failed to fetch taste:", err)
      } finally {
        setTasteLoading(false)
      }
    },
    [personaId, tasteLoading, tasteHasMore]
  )

  // 탭 전환 시 첫 로드
  useEffect(() => {
    if (activeTab === "taste" && !tasteInitialized) {
      loadTaste()
    }
  }, [activeTab, tasteInitialized, loadTaste])

  // 무한 스크롤 sentinel 관찰
  useEffect(() => {
    if (activeTab !== "taste") return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && tasteHasMore && !tasteLoading) {
          loadTaste(tasteCursor ?? undefined)
        }
      },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }
    return () => observerRef.current?.disconnect()
  }, [activeTab, tasteHasMore, tasteLoading, tasteCursor, loadTaste])

  const handleFollowToggle = () => {
    if (!persona) return
    if (isFollowing) {
      unfollowPersona(personaId)
      setPersona((p) => (p ? { ...p, followerCount: Math.max(0, p.followerCount - 1) } : p))
      toast.success(`${persona.name}님을 언팔로우했습니다`)
    } else {
      followPersona(personaId, persona.name)
      setPersona((p) => (p ? { ...p, followerCount: p.followerCount + 1 } : p))
      toast.success(`${persona.name}님을 팔로우했습니다`)
      addNotification({
        type: "recommendation",
        message: `${persona.name}님의 새로운 콘텐츠를 받아보세요!`,
        personaId: persona.id,
        personaName: persona.name,
      })
    }
  }

  const [isStartingChat, setIsStartingChat] = useState(false)
  const [isBookingCall, setIsBookingCall] = useState(false)

  const handleStartChat = async () => {
    if (!profile?.id || !persona) return
    try {
      setIsStartingChat(true)
      const thread = await clientApi.createChatThread(profile.id, personaId)
      router.push(`/chat/${thread.id}`)
    } catch (err) {
      console.error("Failed to start chat:", err)
      toast.error("채팅을 시작할 수 없습니다")
    } finally {
      setIsStartingChat(false)
    }
  }

  const handleBookCall = async () => {
    if (!profile?.id || !persona) return
    try {
      setIsBookingCall(true)
      // 30분 후로 예약
      const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      await clientApi.createCallReservation(profile.id, personaId, scheduledAt)
      toast.success(`${persona.name}와의 통화가 예약되었습니다!`)
      router.push("/calls")
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
        toast.error("코인이 부족합니다. 상점에서 충전해주세요!")
        router.push("/shop")
      } else {
        console.error("Failed to book call:", err)
        toast.error("통화 예약에 실패했습니다")
      }
    } finally {
      setIsBookingCall(false)
    }
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500">페르소나 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error || !persona) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">페르소나를 찾을 수 없습니다</h1>
          <p className="mb-6 text-gray-500">
            {error || "요청하신 페르소나가 존재하지 않거나 비공개 상태입니다"}
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-2 text-white transition-colors hover:bg-violet-600"
          >
            <ArrowLeft className="h-4 w-4" />
            페르소나 탐색하기
          </Link>
        </div>
      </div>
    )
  }

  const roleEmoji = ROLE_EMOJI[persona.role] || "\uD83E\uDD16"
  const colorBold = ROLE_COLORS_BOLD[persona.role] || "from-gray-400 to-gray-500"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-4">
          <Link href="/explore" className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">{persona.name}</h1>
            <p className="text-xs text-gray-500">{persona.postCount}개의 포스트</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* 프로필 카드 */}
        <PWCard className="!p-5">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <PWProfileRing size="xl" animated>
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-3xl text-white`}
                >
                  {roleEmoji}
                </div>
              </PWProfileRing>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{persona.name}</h2>
                <p className="text-sm text-gray-500">{persona.handle}</p>
                <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
                  {ROLE_NAMES[persona.role] || persona.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleFollowToggle}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isFollowing
                  ? "border border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:text-red-500"
                  : "bg-violet-500 text-white hover:bg-violet-600"
              }`}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4" />
                  팔로잉
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  팔로우
                </>
              )}
            </button>
          </div>

          {/* 대화하기 + 통화 예약 버튼 */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleStartChat}
              disabled={isStartingChat}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isStartingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              대화하기
            </button>
            <button
              onClick={handleBookCall}
              disabled={isBookingCall}
              className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-600 transition-all hover:bg-violet-50 disabled:opacity-50"
            >
              {isBookingCall ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              통화 예약
            </button>
          </div>

          {persona.tagline && <p className="mb-2 text-gray-700">{persona.tagline}</p>}
          {persona.description && persona.description !== persona.tagline && (
            <p className="mb-3 text-sm text-gray-600">{persona.description}</p>
          )}

          {persona.expertise && persona.expertise.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {persona.expertise.map((exp) => (
                <span
                  key={exp}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  {exp}
                </span>
              ))}
            </div>
          )}

          {/* 취향 chips (T388) */}
          {topTags.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-400">취향</span>
              {topTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 통계 (AC4: 관계 미니맵) */}
          <div className="flex gap-6 border-t border-gray-100 pt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{persona.postCount}</p>
              <p className="text-xs text-gray-500">포스트</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{persona.followerCount}</p>
              <p className="text-xs text-gray-500">팔로워</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{persona.followingCount}</p>
              <p className="text-xs text-gray-500">팔로잉</p>
            </div>
            {persona.warmth != null && (
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {Math.round(persona.warmth * 100)}%
                </p>
                <p className="text-xs text-gray-500">따뜻함</p>
              </div>
            )}
          </div>
        </PWCard>

        {/* 탭 */}
        <div className="flex overflow-hidden rounded-xl border border-gray-100 bg-white">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "posts" ? "bg-violet-500 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <FileText className="h-4 w-4" />
            포스트
          </button>
          <button
            onClick={() => setActiveTab("taste")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "taste" ? "bg-violet-500 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            취향
          </button>
        </div>

        {/* 포스트 탭 */}
        {activeTab === "posts" && (
          <PWCard className="!p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FileText className="h-4 w-4 text-violet-500" />
              최근 포스트
            </h3>
            {persona.recentPosts && persona.recentPosts.length > 0 ? (
              <div className="space-y-3">
                {persona.recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">아직 작성한 포스트가 없습니다</p>
              </div>
            )}
          </PWCard>
        )}

        {/* 취향 탭 */}
        {activeTab === "taste" && (
          <PWCard className="!p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <BookOpen className="h-4 w-4 text-violet-500" />
              소비 취향
            </h3>
            {tasteInitialized && tasteItems.length === 0 && !tasteLoading ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">아직 공개된 소비 기록이 없어요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasteItems.map((item) => (
                  <TasteCard key={item.id} item={item} />
                ))}
                {/* 무한 스크롤 sentinel */}
                <div ref={sentinelRef} className="h-1" />
                {tasteLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                  </div>
                )}
              </div>
            )}
          </PWCard>
        )}
      </main>
    </div>
  )
}
