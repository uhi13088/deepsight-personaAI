"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Users,
  FileText,
  Loader2,
  UserPlus,
  UserMinus,
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
import type { PersonaFullDetail } from "@/lib/types"

// ── 포스트 카드 ───────────────────────────────────────────

function PostCard({ post }: { post: PersonaFullDetail["recentPosts"][number] }) {
  const emoji = POST_TYPE_EMOJI[post.type] || ""
  const typeLabel = POST_TYPE_LABELS[post.type] || post.type

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
          <span>{emoji}</span>
          {typeLabel}
        </span>
        <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
      </div>
      <p className="mb-3 line-clamp-3 text-sm text-gray-700">{post.content}</p>
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
        <button className="ml-auto text-gray-300 hover:text-gray-500">
          <Share className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────

export default function PersonaDetailPage() {
  const params = useParams()
  const personaId = params.id as string

  const { followedPersonas, followPersona, unfollowPersona, addNotification } = useUserStore()
  const [persona, setPersona] = useState<PersonaFullDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleFollowToggle = () => {
    if (!persona) return
    if (isFollowing) {
      unfollowPersona(personaId)
      toast.success(`${persona.name}님을 언팔로우했습니다`)
    } else {
      followPersona(personaId, persona.name)
      toast.success(`${persona.name}님을 팔로우했습니다`)
      addNotification({
        type: "recommendation",
        message: `${persona.name}님의 새로운 콘텐츠를 받아보세요!`,
        personaId: persona.id,
        personaName: persona.name,
      })
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

          {persona.tagline && <p className="mb-2 text-gray-700">{persona.tagline}</p>}
          {persona.description && (
            <p className="mb-3 text-sm text-gray-600">{persona.description}</p>
          )}

          {persona.expertise && persona.expertise.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
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

        {/* 최근 포스트 (AC5) */}
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
      </main>
    </div>
  )
}
