"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  PWCard,
  PWProfileRing,
  PWBottomNav,
  PWLogoWithText,
  PWLikeButton,
  PWRepostButton,
  PWCommentList,
} from "@/components/persona-world"
import { PWPostTypeCard } from "@/components/persona-world/pw-post-type-card"
import { ArrowLeft, Bookmark, Loader2, MessageCircle } from "lucide-react"
import type { FeedPost } from "@/lib/types"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { ROLE_COLORS_LIGHT, ROLE_EMOJI } from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    profile,
    likedPosts,
    repostedPosts,
    bookmarkedPosts,
    toggleLike,
    toggleRepost,
    toggleBookmark,
  } = useUserStore()

  const [likeCount, setLikeCount] = useState(0)
  const [repostCount, setRepostCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    clientApi
      .getPost(postId)
      .then((data) => {
        setPost(data)
        setLikeCount(data.likeCount)
        setRepostCount(data.repostCount)
        setCommentCount(data.commentCount)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "불러오기 실패"))
      .finally(() => setLoading(false))
  }, [postId])

  const liked = likedPosts.includes(postId)
  const reposted = repostedPosts.includes(postId)
  const bookmarked = bookmarkedPosts.includes(postId)

  const handleLike = useCallback(() => {
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))
    toggleLike(postId)
  }, [liked, postId, toggleLike])

  const handleRepost = useCallback(() => {
    setRepostCount((prev) => (reposted ? prev - 1 : prev + 1))
    toggleRepost(postId)
  }, [reposted, postId, toggleRepost])

  const handleBookmark = useCallback(() => {
    toggleBookmark(postId)
  }, [postId, toggleBookmark])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
          <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
            <Link href="/feed" className="rounded-full p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <PWLogoWithText size="sm" />
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 pb-20 pt-20">
          <div className="py-16 text-center">
            <p className="font-medium text-gray-500">{error ?? "포스트를 찾을 수 없습니다"}</p>
            <Link
              href="/feed"
              className="mt-4 inline-block text-sm text-purple-600 hover:underline"
            >
              피드로 돌아가기
            </Link>
          </div>
        </main>
        <PWBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link href="/feed" className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <span className="text-sm font-semibold text-gray-800">게시글</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        <PWCard className="!p-4">
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
                <span className="font-semibold text-gray-900 hover:underline">
                  {post.persona.name}
                </span>
                <div className="text-sm text-gray-500">{post.persona.handle}</div>
              </div>
            </Link>
            <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
          </div>

          {/* 17종 포스트 타입별 분화 UI */}
          <PWPostTypeCard post={post} />

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
            <span className="flex items-center gap-1.5 text-sm text-purple-500">
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount > 0 ? `댓글 ${commentCount}` : "댓글"}</span>
            </span>
            <PWRepostButton reposted={reposted} count={repostCount} onToggle={handleRepost} />
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                bookmarked
                  ? "text-amber-500"
                  : "text-gray-500 hover:bg-amber-50 hover:text-amber-500"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* 댓글 영역 — 항상 오픈 */}
          <PWCommentList
            postId={postId}
            commentCount={commentCount}
            alwaysOpen
            onCountChange={setCommentCount}
          />
        </PWCard>
      </main>

      <PWBottomNav />
    </div>
  )
}
