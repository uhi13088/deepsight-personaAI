"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { PWLogoWithText, PWCard, PWProfileRing, PWBottomNav } from "@/components/persona-world"
import {
  Search,
  Bell,
  Users,
  TrendingUp,
  Sparkles,
  X,
  Loader2,
  MessageCircle,
  Heart,
  Flame,
  Swords,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type {
  ExploreCluster,
  ExploreHotTopic,
  ExploreDebatePost,
  ExploreNewPersona,
} from "@/lib/types"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import {
  ROLE_COLORS_BOLD,
  ROLE_COLORS_LIGHT,
  ROLE_EMOJI,
  ROLE_NAMES,
  POST_TYPE_LABELS,
  POST_TYPE_EMOJI,
  POST_TYPE_COLORS,
} from "@/lib/role-config"
import { formatTimeAgo } from "@/lib/format"

// ── 역할 필터 칩 ──────────────────────────────────────────

const ROLE_OPTIONS = ["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"] as const

// ── 스켈레톤 ──────────────────────────────────────────────

function ExploreSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 rounded-full bg-gray-200" />
      <div className="space-y-3">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-24 rounded bg-gray-200" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── ExploreContent ────────────────────────────────────────

function ExploreContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [activeRoles, setActiveRoles] = useState<string[]>([])

  const [clusters, setClusters] = useState<ExploreCluster[]>([])
  const [hotTopics, setHotTopics] = useState<ExploreHotTopic[]>([])
  const [activeDebates, setActiveDebates] = useState<ExploreDebatePost[]>([])
  const [newPersonas, setNewPersonas] = useState<ExploreNewPersona[]>([])

  const { notifications } = useUserStore()
  const unreadNotifications = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const query = searchParams.get("q")
    if (query) {
      setSearchQuery(query)
    }
  }, [searchParams])

  const fetchExplore = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi.getExplore({
        search: searchQuery || undefined,
        role: activeRoles.length > 0 ? activeRoles.join(",") : undefined,
      })
      setClusters(data.clusters)
      setHotTopics(data.hotTopics)
      setActiveDebates(data.activeDebates)
      setNewPersonas(data.newPersonas)
    } catch (error) {
      console.error("Failed to fetch explore:", error)
      toast.error("탐색 데이터를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, activeRoles])

  useEffect(() => {
    fetchExplore()
  }, [fetchExplore])

  const toggleRole = (role: string) => {
    setActiveRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const clearSearch = () => {
    setSearchQuery("")
    setActiveRoles([])
  }

  const totalPersonas = clusters.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
          <Link href="/notifications" className="relative rounded-full p-2 hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="페르소나, 전문분야 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Role Filter Chips (AC5) */}
        <div className="mb-6 flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((role) => {
            const isActive = activeRoles.includes(role)
            return (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? `bg-gradient-to-r ${ROLE_COLORS_BOLD[role]} text-white`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{ROLE_EMOJI[role]}</span>
                {ROLE_NAMES[role]}
              </button>
            )
          })}
          {activeRoles.length > 0 && (
            <button
              onClick={() => setActiveRoles([])}
              className="rounded-full px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
            >
              초기화
            </button>
          )}
        </div>

        {loading ? (
          <ExploreSkeleton />
        ) : (
          <div className="space-y-8">
            {/* Section 1: 페르소나 클러스터 (AC1) */}
            {clusters.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-gray-800">페르소나 클러스터</h2>
                  <span className="text-xs text-gray-400">{totalPersonas}명</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {clusters.map((cluster) => (
                    <ClusterCard key={cluster.role} cluster={cluster} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: 핫 토픽 (AC2) */}
            {hotTopics.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <h2 className="text-sm font-semibold text-gray-800">핫 토픽</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotTopics.map((topic) => (
                    <HotTopicChip key={topic.type} topic={topic} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 3: 활성 토론 (AC3) */}
            {activeDebates.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Swords className="h-4 w-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-gray-800">활성 토론</h2>
                </div>
                <div className="space-y-3">
                  {activeDebates.map((debate) => (
                    <DebateCard key={debate.id} debate={debate} />
                  ))}
                </div>
              </section>
            )}

            {/* Section 4: 신규 페르소나 (AC4) */}
            {newPersonas.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <h2 className="text-sm font-semibold text-gray-800">신규 페르소나</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {newPersonas.map((persona) => (
                    <NewPersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {clusters.length === 0 &&
              hotTopics.length === 0 &&
              activeDebates.length === 0 &&
              newPersonas.length === 0 && (
                <div className="py-16 text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="font-medium text-gray-500">
                    {searchQuery ? "검색 결과가 없습니다" : "아직 활성화된 페르소나가 없습니다"}
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    {searchQuery
                      ? "다른 키워드로 검색해보세요"
                      : "Engine Studio에서 페르소나를 활성화해주세요"}
                  </p>
                </div>
              )}
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}

// ── 클러스터 카드 ─────────────────────────────────────────

function ClusterCard({ cluster }: { cluster: ExploreCluster }) {
  const roleEmoji = ROLE_EMOJI[cluster.role] || "\uD83E\uDD16"
  const roleName = ROLE_NAMES[cluster.role] || cluster.role
  const colorBold = ROLE_COLORS_BOLD[cluster.role] || "from-gray-400 to-gray-500"

  return (
    <PWCard className="!p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-sm text-white`}
        >
          {roleEmoji}
        </span>
        <div>
          <div className="text-sm font-semibold text-gray-800">{roleName}</div>
          <div className="text-xs text-gray-400">{cluster.count}명</div>
        </div>
      </div>
      <div className="mt-2 flex -space-x-2">
        {cluster.personas.slice(0, 4).map((p) => (
          <Link key={p.id} href={`/persona/${p.id}`}>
            <PWProfileRing size="sm">
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS_LIGHT[p.role] || "from-gray-100 to-gray-200"} text-xs`}
              >
                {roleEmoji}
              </div>
            </PWProfileRing>
          </Link>
        ))}
        {cluster.count > 4 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-medium text-gray-500">
            +{cluster.count - 4}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {cluster.personas.slice(0, 3).map((p) => (
          <Link
            key={p.id}
            href={`/persona/${p.id}`}
            className="text-xs text-gray-500 hover:text-purple-600 hover:underline"
          >
            {p.name}
          </Link>
        ))}
      </div>
    </PWCard>
  )
}

// ── 핫 토픽 칩 ────────────────────────────────────────────

function HotTopicChip({ topic }: { topic: ExploreHotTopic }) {
  const emoji = POST_TYPE_EMOJI[topic.type] || "\uD83D\uDD25"
  const label = POST_TYPE_LABELS[topic.type] || topic.type
  const colorClass = POST_TYPE_COLORS[topic.type] || "bg-gray-50 text-gray-600"

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${colorClass}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      <span className="text-[10px] opacity-60">{topic.postCount}건</span>
      {topic.engagement > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] opacity-50">
          <TrendingUp className="h-2.5 w-2.5" />
          {topic.engagement}
        </span>
      )}
    </div>
  )
}

// ── 토론 카드 ─────────────────────────────────────────────

function DebateCard({ debate }: { debate: ExploreDebatePost }) {
  const typeEmoji = POST_TYPE_EMOJI[debate.type] || "\u2694\uFE0F"
  const typeLabel = POST_TYPE_LABELS[debate.type] || debate.type

  return (
    <Link href={`/persona/${debate.persona.id}`}>
      <PWCard className="!p-3 transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PWProfileRing size="sm">
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS_LIGHT[debate.persona.role] || "from-gray-100 to-gray-200"} text-xs`}
              >
                {ROLE_EMOJI[debate.persona.role] || "\uD83E\uDD16"}
              </div>
            </PWProfileRing>
            <div>
              <div className="text-sm font-medium text-gray-800">{debate.persona.name}</div>
              <div className="text-xs text-gray-400">{debate.persona.handle}</div>
            </div>
          </div>
          <span className="text-xs text-gray-400">{formatTimeAgo(debate.createdAt)}</span>
        </div>
        <div className="mb-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${POST_TYPE_COLORS[debate.type] || "bg-gray-50 text-gray-600"}`}
          >
            {typeEmoji} {typeLabel}
          </span>
        </div>
        <p className="mb-2 line-clamp-2 text-sm text-gray-700">{debate.content}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {debate.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {debate.commentCount}
          </span>
        </div>
      </PWCard>
    </Link>
  )
}

// ── 신규 페르소나 카드 ────────────────────────────────────

function NewPersonaCard({ persona }: { persona: ExploreNewPersona }) {
  const roleEmoji = ROLE_EMOJI[persona.role] || "\uD83E\uDD16"
  const roleName = ROLE_NAMES[persona.role] || persona.role

  return (
    <Link href={`/persona/${persona.id}`} className="shrink-0">
      <PWCard className="w-40 !p-3 transition-shadow hover:shadow-md">
        <div className="mb-2 flex justify-center">
          <PWProfileRing size="lg" animated>
            <div
              className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS_BOLD[persona.role] || "from-gray-400 to-gray-500"} text-2xl text-white`}
            >
              {roleEmoji}
            </div>
          </PWProfileRing>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-800">{persona.name}</div>
          <div className="text-xs text-gray-400">{persona.handle}</div>
          <span
            className={`mt-1 inline-block rounded-full bg-gradient-to-r ${ROLE_COLORS_BOLD[persona.role] || "from-gray-400 to-gray-500"} px-2 py-0.5 text-[10px] font-medium text-white`}
          >
            {roleName}
          </span>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Clock className="h-2.5 w-2.5" />
            {formatTimeAgo(persona.createdAt)}
          </div>
        </div>
      </PWCard>
    </Link>
  )
}

// ── 로딩 폴백 ─────────────────────────────────────────────

function ExploreLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  )
}

// ── 메인 페이지 (Suspense 래퍼) ───────────────────────────

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExploreContent />
    </Suspense>
  )
}
