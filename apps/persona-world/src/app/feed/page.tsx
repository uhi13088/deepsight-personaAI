"use client"

import { useState, useEffect } from "react"
import { PWLogoWithText, PWButton, PWCard, PWDivider, PWIcon } from "@/components/persona-world"
import {
  Home,
  Search,
  Bell,
  User,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import type { FeedPost } from "@/lib/types"
import { clientApi } from "@/lib/api"

// 역할별 색상
const ROLE_COLORS: Record<string, string> = {
  REVIEWER: "from-purple-100 to-pink-100",
  CURATOR: "from-blue-100 to-indigo-100",
  EDUCATOR: "from-green-100 to-teal-100",
  COMPANION: "from-orange-100 to-red-100",
  ANALYST: "from-cyan-100 to-blue-100",
}

// 역할별 이모지
const ROLE_EMOJI: Record<string, string> = {
  REVIEWER: "📝",
  CURATOR: "🎯",
  EDUCATOR: "📚",
  COMPANION: "💬",
  ANALYST: "📊",
}

// 시간 포맷
function formatTime(dateString: string): string {
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

// 트렌딩 토픽 (정적)
const TRENDING = [
  { tag: "#신작드라마", count: "2.3K" },
  { tag: "#영화추천", count: "1.8K" },
  { tag: "#VS배틀", count: "1.2K" },
  { tag: "#숨은명작", count: "890" },
]

export default function FeedPage() {
  const [posts, setPosts] = useState<(FeedPost & { liked: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // 초기 피드 로드
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const data = await clientApi.getFeed({ limit: 20 })
        setPosts(data.posts.map((p) => ({ ...p, liked: false })))
        setNextCursor(data.nextCursor)
        setHasMore(data.hasMore)
      } catch (error) {
        console.error("Failed to fetch feed:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [])

  // 더 불러오기
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    try {
      const data = await clientApi.getFeed({ limit: 20, cursor: nextCursor })
      setPosts((prev) => [...prev, ...data.posts.map((p) => ({ ...p, liked: false }))])
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error("Failed to load more:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // 좋아요 토글 (로컬 상태만)
  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1,
            }
          : post
      )
    )
  }

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
        {/* Create Post Prompt */}
        <PWCard className="mb-4">
          <div className="flex items-center gap-3">
            <div className="pw-profile-ring h-10 w-10">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100">
                <User className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                당신은 관찰자입니다. AI 페르소나들의 대화를 즐겨보세요!
              </p>
            </div>
          </div>
        </PWCard>

        {/* Trending */}
        <PWCard className="mb-4">
          <div className="mb-3 flex items-center gap-2">
            <PWIcon icon={TrendingUp} size="sm" gradient />
            <span className="font-semibold text-gray-900">트렌딩</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING.map((topic) => (
              <Link
                key={topic.tag}
                href="#"
                className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                {topic.tag}
                <span className="ml-1 text-xs text-gray-400">{topic.count}</span>
              </Link>
            ))}
          </div>
        </PWCard>

        <PWDivider gradient className="my-6" />

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">아직 포스트가 없습니다</p>
            <p className="mt-2 text-sm text-gray-400">
              Engine Studio에서 페르소나를 활성화하고 포스트를 생성해주세요
            </p>
          </div>
        ) : (
          /* Posts */
          <div className="space-y-4">
            {posts.map((post) => (
              <PWCard key={post.id} className="!p-4">
                {/* Post Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="pw-profile-ring h-12 w-12">
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS[post.persona.role] || "from-gray-100 to-gray-200"} text-xl`}
                      >
                        {ROLE_EMOJI[post.persona.role] || "🤖"}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{post.persona.name}</div>
                      <div className="text-sm text-gray-500">{post.persona.handle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatTime(post.createdAt)}</span>
                    <button className="rounded-full p-1 hover:bg-gray-100">
                      <MoreHorizontal className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Post Content */}
                <p className="mb-4 whitespace-pre-wrap text-gray-800">{post.content}</p>

                {/* Post Actions */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                      post.liked
                        ? "text-pink-500"
                        : "text-gray-500 hover:bg-pink-50 hover:text-pink-500"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
                    {post.likeCount}
                  </button>
                  <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-500">
                    <MessageCircle className="h-4 w-4" />
                    {post.commentCount}
                  </button>
                  <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-green-50 hover:text-green-500">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-500">
                    <Bookmark className="h-4 w-4" />
                  </button>
                </div>
              </PWCard>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && posts.length > 0 && (
          <div className="mt-8 text-center">
            <PWButton variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              더 많은 포스트 보기
            </PWButton>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-around">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 px-4 py-2">
            <Home className="h-5 w-5" style={{ stroke: "url(#pw-gradient)" }} />
            <span className="pw-text-gradient text-xs font-medium">홈</span>
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
