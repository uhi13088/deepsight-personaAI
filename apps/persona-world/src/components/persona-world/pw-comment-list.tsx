"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageCircle, Heart, Loader2, Send, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { COMMENT_TONE_CONFIG, ROLE_COLORS_BOLD } from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"
import { parseMentions } from "@/lib/mention-utils"
import type { Comment } from "@/lib/types"

interface PWCommentListProps {
  postId: string
  commentCount: number
  /** true면 토글 버튼 없이 항상 열린 상태로 렌더링 (부모가 visibility 제어) */
  alwaysOpen?: boolean
  /** 댓글 수 변경 시 부모에 알림 */
  onCountChange?: (count: number) => void
}

/**
 * 댓글 목록 + 작성 컴포넌트 — 톤 뱃지 포함
 *
 * 포스트 하단에 노출, 댓글 토글 시 API 호출
 */
export function PWCommentList({
  postId,
  commentCount,
  alwaysOpen,
  onCountChange,
}: PWCommentListProps) {
  const [open, setOpen] = useState(alwaysOpen ?? false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [displayCount, setDisplayCount] = useState(commentCount)

  const loadComments = useCallback(async () => {
    if (loaded) return
    setLoading(true)
    try {
      const data = await clientApi.getComments(postId)
      setComments(data.comments)
      // 서버 실제 댓글 수와 동기화 (숨김/삭제된 댓글 반영)
      if (data.total !== displayCount) {
        setDisplayCount(data.total)
        onCountChange?.(data.total)
      }
      setLoaded(true)
    } catch (error) {
      console.error("Failed to load comments:", error)
    } finally {
      setLoading(false)
    }
  }, [postId, loaded, displayCount])

  useEffect(() => {
    if (open && !loaded) {
      loadComments()
    }
  }, [open, loaded, loadComments])

  const handleCommentPosted = (newComment: Comment) => {
    setComments((prev) => [newComment, ...prev])
    const next = displayCount + 1
    setDisplayCount(next)
    onCountChange?.(next)
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    const next = Math.max(0, displayCount - 1)
    setDisplayCount(next)
    onCountChange?.(next)
  }

  // alwaysOpen 모드: 토글 버튼 없이 댓글 영역만 렌더링 (부모가 visibility 제어)
  if (alwaysOpen) {
    return (
      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-2">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onDeleted={handleCommentDeleted}
              />
            ))}
          </div>
        ) : (
          <p className="py-3 text-center text-sm text-gray-400">아직 댓글이 없습니다</p>
        )}
        <CommentInput postId={postId} onPosted={handleCommentPosted} />
      </div>
    )
  }

  return (
    <div>
      {/* 댓글 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-purple-500"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{displayCount > 0 ? `댓글 ${displayCount}` : "댓글"}</span>
      </button>

      {/* 댓글 영역 */}
      {open && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-2">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  onDeleted={handleCommentDeleted}
                />
              ))}
            </div>
          ) : (
            <p className="py-3 text-center text-sm text-gray-400">아직 댓글이 없습니다</p>
          )}
          <CommentInput postId={postId} onPosted={handleCommentPosted} />
        </div>
      )}
    </div>
  )
}

// ── 댓글 입력 ─────────────────────────────────────────────────

function CommentInput({
  postId,
  onPosted,
}: {
  postId: string
  onPosted: (comment: Comment) => void
}) {
  const profile = useUserStore((s) => s.profile)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!profile) return null

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      const comment = await clientApi.postComment(postId, profile.id, trimmed)
      onPosted(comment)
      setContent("")
    } catch (error) {
      console.error("Failed to post comment:", error)
      toast.error("댓글 작성에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-start gap-2.5 border-t border-gray-100 pt-2">
      {/* 유저 아바타 */}
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-xs font-bold text-white shadow-sm">
        {profile.nickname.charAt(0)}
      </div>
      {/* 입력 영역 */}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 transition-all focus-within:border-purple-300 focus-within:bg-white focus-within:shadow-sm">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSubmit()}
            placeholder={`${profile.nickname}(으)로 댓글 달기...`}
            maxLength={1000}
            disabled={submitting}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="flex-shrink-0 rounded-full p-0.5 text-purple-500 transition-colors hover:text-purple-600 disabled:text-gray-300"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {content.length > 900 && (
          <p className="px-1 text-right text-[10px] text-gray-400">{content.length}/1000</p>
        )}
      </div>
    </div>
  )
}

// ── 댓글 아이템 ───────────────────────────────────────────────

function CommentItem({
  comment,
  postId,
  onDeleted,
}: {
  comment: Comment
  postId: string
  onDeleted: (commentId: string) => void
}) {
  const profile = useUserStore((s) => s.profile)
  const [deleting, setDeleting] = useState(false)

  const toneConfig = COMMENT_TONE_CONFIG[comment.tone]
  const gradientClass = ROLE_COLORS_BOLD[comment.personaRole] ?? "from-gray-400 to-gray-500"
  const isPersona = comment.personaId != null
  const linkHref = isPersona ? `/persona/${comment.personaId}` : "#"
  const isOwn = !isPersona && comment.userId != null && comment.userId === profile?.id

  const handleDelete = async () => {
    if (deleting || !profile) return
    setDeleting(true)
    try {
      await clientApi.deleteComment(postId, comment.id, profile.id)
      onDeleted(comment.id)
      toast.success("댓글이 삭제되었습니다")
    } catch (error) {
      console.error("Failed to delete comment:", error)
      toast.error("댓글 삭제에 실패했습니다")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex items-start gap-2.5">
        {/* 아바타 */}
        <Link href={linkHref} className="flex-shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${gradientClass}`}
          >
            {comment.personaName.charAt(0)}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          {/* 이름 + 톤 뱃지 + 삭제 버튼 */}
          <div className="flex items-center gap-2">
            <Link href={linkHref} className="text-sm font-medium text-gray-900 hover:underline">
              {comment.personaName}
            </Link>
            {toneConfig && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${toneConfig.color}`}
              >
                <span>{toneConfig.emoji}</span>
                {toneConfig.label}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
            {isOwn && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto flex-shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:text-red-400 disabled:opacity-50"
                title="댓글 삭제"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          {/* 댓글 본문 (멘션 하이라이트) */}
          <p className="mt-1 text-sm text-gray-700">
            {parseMentions(comment.content).map((seg, i) =>
              seg.type === "mention" ? (
                <Link
                  key={i}
                  href={`/explore?q=${seg.handle}`}
                  className="font-medium text-purple-600 hover:underline"
                >
                  {seg.content}
                </Link>
              ) : (
                <span key={i}>{seg.content}</span>
              )
            )}
          </p>

          {/* 좋아요 */}
          {comment.likeCount > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
              <Heart className="h-3 w-3" />
              <span>{comment.likeCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
