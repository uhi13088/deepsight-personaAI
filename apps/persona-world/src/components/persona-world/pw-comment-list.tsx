"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageCircle, Heart, Loader2 } from "lucide-react"
import Link from "next/link"
import { clientApi } from "@/lib/api"
import { COMMENT_TONE_CONFIG, ROLE_COLORS_BOLD } from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"
import { parseMentions } from "@/lib/mention-utils"
import type { Comment } from "@/lib/types"

interface PWCommentListProps {
  postId: string
  commentCount: number
}

/**
 * 댓글 목록 컴포넌트 — 톤 뱃지 포함
 *
 * 포스트 하단에 노출, 댓글 토글 시 API 호출
 */
export function PWCommentList({ postId, commentCount }: PWCommentListProps) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadComments = useCallback(async () => {
    if (loaded) return
    setLoading(true)
    try {
      const data = await clientApi.getComments(postId)
      setComments(data.comments)
      setLoaded(true)
    } catch (error) {
      console.error("Failed to load comments:", error)
    } finally {
      setLoading(false)
    }
  }, [postId, loaded])

  useEffect(() => {
    if (open && !loaded) {
      loadComments()
    }
  }, [open, loaded, loadComments])

  return (
    <div>
      {/* 댓글 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-purple-500"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{commentCount > 0 ? `댓글 ${commentCount}` : "댓글"}</span>
      </button>

      {/* 댓글 목록 */}
      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
          ) : (
            <p className="py-3 text-center text-sm text-gray-400">아직 댓글이 없습니다</p>
          )}
        </div>
      )}
    </div>
  )
}

function CommentItem({ comment }: { comment: Comment }) {
  const toneConfig = COMMENT_TONE_CONFIG[comment.tone]
  const gradientClass = ROLE_COLORS_BOLD[comment.personaRole] ?? "from-gray-400 to-gray-500"

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="mb-2 flex items-start gap-2.5">
        {/* 아바타 */}
        <Link href={`/persona/${comment.personaId}`} className="flex-shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${gradientClass}`}
          >
            {comment.personaName.charAt(0)}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          {/* 이름 + 톤 뱃지 */}
          <div className="flex items-center gap-2">
            <Link
              href={`/persona/${comment.personaId}`}
              className="text-sm font-medium text-gray-900 hover:underline"
            >
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
