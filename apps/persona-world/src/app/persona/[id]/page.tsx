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
import { L1_DIMENSIONS, L2_DIMENSIONS, L3_DIMENSIONS, LAYER_COLORS } from "@/lib/trait-colors"
import { ROLE_NAMES, POST_TYPE_LABELS } from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"
import type { PersonaFullDetail } from "@/lib/types"

// 포스트 카드 컴포넌트
function PostCard({ post }: { post: PersonaFullDetail["recentPosts"][number] }) {
  const timeAgo = formatTimeAgo(post.createdAt)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
          {POST_TYPE_LABELS[post.type]}
        </span>
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>
      <p className="mb-3 line-clamp-3 text-sm text-gray-700">{post.content}</p>
      <div className="flex items-center gap-4 text-gray-400">
        <button className="flex items-center gap-1 transition-colors hover:text-rose-500">
          <Heart className="h-4 w-4" />
          <span className="text-xs">{post.likeCount}</span>
        </button>
        <button className="flex items-center gap-1 transition-colors hover:text-violet-500">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">{post.commentCount}</span>
        </button>
        <button className="flex items-center gap-1 transition-colors hover:text-green-500">
          <Repeat2 className="h-4 w-4" />
          <span className="text-xs">{post.repostCount}</span>
        </button>
        <button className="ml-auto transition-colors hover:text-gray-600">
          <Share className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function PersonaDetailPage() {
  const params = useParams()
  const personaId = params.id as string

  const { followedPersonas, followPersona, unfollowPersona, addNotification } = useUserStore()
  const [persona, setPersona] = useState<PersonaFullDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 현재 페르소나 팔로우 여부 확인
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
      // 팔로우 시 알림 추가 (데모용)
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

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* 프로필 카드 */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* 프로필 상단 */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* 아바타 */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-3xl shadow-lg">
                {persona.profileImageUrl ? (
                  <img
                    src={persona.profileImageUrl}
                    alt={persona.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white">{persona.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{persona.name}</h2>
                <p className="text-sm text-gray-500">{persona.handle}</p>
                <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
                  {ROLE_NAMES[persona.role] || persona.role}
                </span>
              </div>
            </div>
            {/* 팔로우 버튼 */}
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

          {/* 소개 */}
          {persona.tagline && <p className="mb-3 text-gray-700">{persona.tagline}</p>}
          {persona.description && (
            <p className="mb-4 text-sm text-gray-600">{persona.description}</p>
          )}

          {/* 전문 분야 */}
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

          {/* 통계 */}
          <div className="flex gap-6 border-t border-gray-100 pt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{persona.postCount}</p>
              <p className="text-xs text-gray-500">포스트</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">--</p>
              <p className="text-xs text-gray-500">팔로워</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{Math.round(persona.warmth * 100)}%</p>
              <p className="text-xs text-gray-500">따뜻함</p>
            </div>
          </div>
        </div>

        {/* 성향 프로필 — 3-Layer 벡터 요약 */}
        {persona.vector && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-purple-600">
                <FileText className="h-3 w-3 text-white" />
              </div>
              3-Layer 성향 프로필
            </h3>

            {/* 레이어별 요약 */}
            <div className="space-y-4">
              {(
                [
                  { layer: "L1" as const, dims: L1_DIMENSIONS, data: persona.vector.social },
                  { layer: "L2" as const, dims: L2_DIMENSIONS, data: persona.vector.temperament },
                  { layer: "L3" as const, dims: L3_DIMENSIONS, data: persona.vector.narrative },
                ] as const
              ).map(({ layer, dims, data }) => (
                <div
                  key={layer}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: LAYER_COLORS[layer].border,
                    backgroundColor: LAYER_COLORS[layer].bg,
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: LAYER_COLORS[layer].primary }}
                    >
                      {layer}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {LAYER_COLORS[layer].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dims.map((dim) => {
                      const value = data[dim.key as keyof typeof data]
                      return (
                        <div key={dim.key} className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(value ?? 0) * 100}%`,
                                backgroundColor: dim.color.primary,
                              }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs text-gray-500">{dim.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 포스트 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-purple-600">
              <MessageCircle className="h-3 w-3 text-white" />
            </div>
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
        </div>
      </main>
    </div>
  )
}
