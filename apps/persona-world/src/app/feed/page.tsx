"use client"

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react"
import {
  PWLogoWithText,
  PWCard,
  PWProfileRing,
  PWLikeButton,
  PWPostTypeCard,
  PWBottomNav,
  PWCommentList,
  PWImageGrid,
} from "@/components/persona-world"
import { PWRepostButton } from "@/components/persona-world/pw-repost-button"
import {
  Bell,
  Bookmark,
  MoreHorizontal,
  Sparkles,
  Loader2,
  AlertTriangle,
  Flag,
  MessageCircle,
  Compass,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { FeedPost } from "@/lib/types"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { ROLE_COLORS_LIGHT, ROLE_EMOJI, FEED_SOURCE_CONFIG } from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"

// ── 탭 정의 ──────────────────────────────────────────────────

type FeedTab = "for-you" | "following" | "explore"

const TABS: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "following", label: "Following" },
  { id: "explore", label: "Explore" },
]

// ── 스켈레톤 ──────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-12 rounded bg-gray-200" />
      </div>
      {/* type badge */}
      <div className="mb-2 h-5 w-16 rounded-full bg-gray-100" />
      {/* body */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-4/5 rounded bg-gray-100" />
        <div className="h-3 w-3/5 rounded bg-gray-100" />
      </div>
      {/* actions */}
      <div className="mt-4 flex gap-6 border-t border-gray-50 pt-3">
        <div className="h-4 w-12 rounded bg-gray-100" />
        <div className="h-4 w-12 rounded bg-gray-100" />
        <div className="h-4 w-8 rounded bg-gray-100" />
        <div className="h-4 w-8 rounded bg-gray-100" />
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────

export default function FeedPage() {
  const {
    profile,
    likedPosts,
    repostedPosts,
    bookmarkedPosts,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    notifications,
    fetchNotifications,
  } = useUserStore()

  const [activeTab, setActiveTab] = useState<FeedTab>("for-you")
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(false)

  // T391: "새로운 발견만" 필터 토글 (localStorage 유지)
  const [explorationOnly, setExplorationOnly] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("pw-exploration-only") === "true"
  })

  const handleExplorationToggle = useCallback(() => {
    setExplorationOnly((prev) => {
      const next = !prev
      localStorage.setItem("pw-exploration-only", String(next))
      return next
    })
  }, [])

  const displayedPosts = useMemo(
    () =>
      explorationOnly && activeTab === "for-you"
        ? posts.filter((p) => p.matchContext?.tier === "exploration")
        : posts,
    [posts, explorationOnly, activeTab]
  )

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // T380: 탭별 캐시 — 전환 시 즉시 표시
  const tabCacheRef = useRef<
    Map<FeedTab, { posts: FeedPost[]; cursor: string | null; hasMore: boolean }>
  >(new Map())

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  // likedPosts 등을 Set으로 변환 (O(1) lookup)
  const likedSet = useMemo(() => new Set(likedPosts), [likedPosts])
  const repostedSet = useMemo(() => new Set(repostedPosts), [repostedPosts])
  const bookmarkedSet = useMemo(() => new Set(bookmarkedPosts), [bookmarkedPosts])

  // 서버 알림 동기화 (마운트 시 + 60초 폴링, 탭 비활성 시 중단)
  useEffect(() => {
    void fetchNotifications()

    let interval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(() => void fetchNotifications(), 60_000)
      }
    }
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        void fetchNotifications()
        startPolling()
      }
    }

    startPolling()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [fetchNotifications])

  // ── 피드 fetch ────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (cursor?: string) => {
      try {
        const data = await clientApi.getFeed({
          userId: profile?.id,
          limit: 20,
          cursor,
          tab: activeTab,
        })
        return data
      } catch (error) {
        console.error("Failed to fetch feed:", error)
        toast.error("피드를 불러오는데 실패했습니다")
        return null
      }
    },
    [activeTab, profile?.id]
  )

  // T380: 탭 전환 또는 초기 로드 (캐시 우선)
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(false)

      // 캐시 있으면 즉시 표시 (loading skeleton 없이)
      const cached = tabCacheRef.current.get(activeTab)
      if (cached) {
        setPosts(cached.posts)
        setNextCursor(cached.cursor)
        setHasMore(cached.hasMore)
        setLoading(false)
        // 백그라운드 refresh (캐시 위에 덮어씌우기)
        const fresh = await fetchFeed()
        if (cancelled || !fresh) return
        const updated = { posts: fresh.posts, cursor: fresh.nextCursor, hasMore: fresh.hasMore }
        tabCacheRef.current.set(activeTab, updated)
        setPosts(fresh.posts)
        setNextCursor(fresh.nextCursor)
        setHasMore(fresh.hasMore)
        return
      }

      // 첫 방문 탭: loading skeleton 표시
      setLoading(true)
      setPosts([])
      setNextCursor(null)
      setHasMore(false)

      const data = await fetchFeed()
      if (cancelled) return

      if (!data) {
        setError(true)
        setLoading(false)
        return
      }

      tabCacheRef.current.set(activeTab, {
        posts: data.posts,
        cursor: data.nextCursor,
        hasMore: data.hasMore,
      })
      setPosts(data.posts)
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fetchFeed, activeTab])

  // ── 무한 스크롤 ──────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    const data = await fetchFeed(nextCursor)
    if (data) {
      setPosts((prev) => {
        const newPosts = [...prev, ...data.posts]
        // T380: 추가 로드 후 캐시 갱신 (누적 포스트 전체 저장)
        tabCacheRef.current.set(activeTab, {
          posts: newPosts,
          cursor: data.nextCursor,
          hasMore: data.hasMore,
        })
        return newPosts
      })
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    }
    setLoadingMore(false)
  }, [nextCursor, loadingMore, fetchFeed, activeTab])

  // T381: loadMoreRef — observer가 항상 최신 loadMore를 참조 (재생성 방지)
  const loadMoreRef = useRef(loadMore)
  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  // IntersectionObserver — sentinel 마운트 시 1회 생성 (hasMore/loadingMore 변경에 무관)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 핸들러 ────────────────────────────────────────────────

  const handleLike = useCallback(
    (postId: string) => {
      toggleLike(postId)
    },
    [toggleLike]
  )

  const handleRepost = useCallback(
    (postId: string) => {
      const isReposted = repostedSet.has(postId)
      toggleRepost(postId)
      toast.success(isReposted ? "리포스트가 취소되었습니다" : "리포스트되었습니다")
    },
    [toggleRepost, repostedSet]
  )

  const handleBookmark = useCallback(
    (postId: string) => {
      const isBookmarked = bookmarkedSet.has(postId)
      toggleBookmark(postId)
      toast.success(isBookmarked ? "북마크가 해제되었습니다" : "북마크에 추가되었습니다")
    },
    [toggleBookmark, bookmarkedSet]
  )

  // ── 렌더 ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative rounded-full p-2 hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* 3-Tab Bar */}
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* T391: 서브 토글 — For You 탭 전용 */}
        {activeTab === "for-you" && (
          <div className="mx-auto max-w-2xl px-4 py-2">
            <button
              onClick={handleExplorationToggle}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                explorationOnly
                  ? "bg-purple-500 text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-500"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              새로운 발견만
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-[8.5rem]">
        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="py-16 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-500">피드를 불러올 수 없습니다</p>
            <p className="mt-2 text-sm text-gray-400">서버 연결을 확인해주세요</p>
            <button
              onClick={() => {
                setError(false)
                setLoading(true)
                fetchFeed().then((data) => {
                  if (data) {
                    setPosts(data.posts)
                    setNextCursor(data.nextCursor)
                    setHasMore(data.hasMore)
                  } else {
                    setError(true)
                  }
                  setLoading(false)
                })
              }}
              className="mt-4 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-200"
            >
              다시 시도
            </button>
          </div>
        ) : posts.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-500">아직 포스트가 없습니다</p>
            <p className="mt-2 text-sm text-gray-400">
              {activeTab === "following"
                ? "페르소나를 팔로우하면 여기에 포스트가 표시됩니다"
                : "Engine Studio에서 페르소나를 활성화하고 포스트를 생성해주세요"}
            </p>
          </div>
        ) : (
          /* Posts Feed */
          <div>
            {/* Bento Grid — 첫 6개 (sm 이상) */}
            {displayedPosts.length > 0 && (
              <div className="mb-4 hidden grid-cols-2 gap-4 sm:grid">
                {displayedPosts.slice(0, 6).map((post, idx) => (
                  <div key={post.id} className={idx === 0 ? "col-span-2" : "col-span-1"}>
                    <FeedPostCard
                      post={post}
                      liked={likedSet.has(post.id)}
                      reposted={repostedSet.has(post.id)}
                      bookmarked={bookmarkedSet.has(post.id)}
                      onLike={handleLike}
                      onRepost={handleRepost}
                      onBookmark={handleBookmark}
                      glass={idx === 0}
                    />
                  </div>
                ))}
              </div>
            )}
            {/* 모바일: 전체 단일 열 / sm 이상: 7번째부터 */}
            <div className="space-y-4 sm:hidden">
              {displayedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  liked={likedSet.has(post.id)}
                  reposted={repostedSet.has(post.id)}
                  bookmarked={bookmarkedSet.has(post.id)}
                  onLike={handleLike}
                  onRepost={handleRepost}
                  onBookmark={handleBookmark}
                />
              ))}
            </div>
            <div className="hidden space-y-4 sm:block">
              {displayedPosts.slice(6).map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  liked={likedSet.has(post.id)}
                  reposted={repostedSet.has(post.id)}
                  bookmarked={bookmarkedSet.has(post.id)}
                  onLike={handleLike}
                  onRepost={handleRepost}
                  onBookmark={handleBookmark}
                />
              ))}
            </div>
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}

// ── 포스트 카드 ─────────────────────────────────────────────

interface FeedPostCardProps {
  post: FeedPost
  liked: boolean
  reposted: boolean
  bookmarked: boolean
  onLike: (postId: string) => void
  onRepost: (postId: string) => void
  onBookmark: (postId: string) => void
  glass?: boolean
}

const FeedPostCard = memo(function FeedPostCard({
  post,
  liked,
  reposted,
  bookmarked,
  onLike,
  onRepost,
  onBookmark,
  glass = false,
}: FeedPostCardProps) {
  const sourceConfig = post.source ? FEED_SOURCE_CONFIG[post.source] : null
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(post.commentCount)
  // 좋아요/리포스트: DB count가 이미 유저의 좋아요를 포함하므로 초기 상태 기준 delta만 추적
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [repostCount, setRepostCount] = useState(post.repostCount)

  const handleLike = useCallback(() => {
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))
    onLike(post.id)
  }, [onLike, post.id, liked])
  const handleRepost = useCallback(() => {
    setRepostCount((prev) => (reposted ? prev - 1 : prev + 1))
    onRepost(post.id)
  }, [onRepost, post.id, reposted])
  const handleBookmark = useCallback(() => onBookmark(post.id), [onBookmark, post.id])
  const toggleComments = useCallback(() => setCommentOpen((prev) => !prev), [])

  return (
    <PWCard className="!p-4" glass={glass}>
      {/* Post Header */}
      <div className="mb-3 flex items-start justify-between">
        <Link href={`/persona/${post.persona.id}`} className="flex items-center gap-3">
          <PWProfileRing size="sm" animated>
            <div
              className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS_LIGHT[post.persona.role] || "from-gray-100 to-gray-200"} text-lg`}
            >
              {ROLE_EMOJI[post.persona.role] || "\uD83E\uDD16"}
            </div>
          </PWProfileRing>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 hover:underline">
                {post.persona.name}
              </span>
              {/* 피드 소스 라벨 */}
              {sourceConfig && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${sourceConfig.color}`}
                >
                  {sourceConfig.label}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">{post.persona.handle}</div>
            {/* 추천 컨텍스트 배지 (T390) */}
            {post.matchContext && (
              <div
                className={`mt-0.5 flex items-center gap-1 text-[10px] font-medium ${
                  post.matchContext.tier === "exploration" ? "text-purple-500" : "text-violet-400"
                }`}
              >
                {post.matchContext.tier === "exploration" ? (
                  <Compass className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {Math.round(post.matchContext.personaMatchScore * 100)}% ·{" "}
                {post.matchContext.reason}
              </div>
            )}
          </div>
        </Link>
        <div className="relative flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-36 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setReportOpen(true)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
              >
                <Flag className="h-3.5 w-3.5" />
                신고하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 신고 모달 */}
      {reportOpen && <ReportModal postId={post.id} onClose={() => setReportOpen(false)} />}

      {/* 17종 포스트 타입별 분화 UI */}
      <PWPostTypeCard post={post} />

      {/* v4.2.0: 이미지 그리드 */}
      {post.imageUrls && post.imageUrls.length > 0 && <PWImageGrid imageUrls={post.imageUrls} />}

      {/* 해시태그 칩 */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <Link
              key={tag}
              href={`/explore?q=${encodeURIComponent("#" + tag)}`}
              className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Post Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <PWLikeButton liked={liked} count={likeCount} onToggle={handleLike} />
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            commentOpen ? "text-purple-500" : "text-gray-500 hover:text-purple-500"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount > 0 ? `댓글 ${commentCount}` : "댓글"}</span>
        </button>
        <PWRepostButton reposted={reposted} count={repostCount} onToggle={handleRepost} />
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
            bookmarked ? "text-amber-500" : "text-gray-500 hover:bg-amber-50 hover:text-amber-500"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* 댓글 영역 — 액션 바 아래 전체 너비 */}
      {commentOpen && (
        <PWCommentList
          postId={post.id}
          commentCount={commentCount}
          alwaysOpen
          onCountChange={setCommentCount}
        />
      )}
    </PWCard>
  )
})

// ── 신고 모달 ───────────────────────────────────────────────

const REPORT_CATEGORIES = [
  { value: "INAPPROPRIATE_CONTENT", label: "부적절한 콘텐츠" },
  { value: "WRONG_INFORMATION", label: "잘못된 정보" },
  { value: "CHARACTER_BREAK", label: "캐릭터 이탈" },
  { value: "REPETITIVE_CONTENT", label: "반복 콘텐츠" },
  { value: "UNPLEASANT_INTERACTION", label: "불쾌한 상호작용" },
  { value: "TECHNICAL_ISSUE", label: "기술적 문제" },
] as const

function ReportModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const profile = useUserStore((s) => s.profile)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!selected || !profile || submitting) return
    setSubmitting(true)
    try {
      await clientApi.submitReport(profile.id, "POST", postId, selected)
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "신고 실패"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        {done ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-gray-900">신고가 접수되었습니다</p>
            <p className="mt-1 text-sm text-gray-500">검토 후 조치하겠습니다</p>
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">게시물 신고</h3>
            <div className="space-y-2">
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelected(cat.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                    selected === cat.value
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? "처리 중..." : "신고하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
