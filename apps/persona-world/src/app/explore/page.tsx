"use client"

import { useState, useEffect, useRef, Suspense, useCallback, useMemo, memo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  Hash,
  FileSearch,
  User,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type {
  ExploreCluster,
  ExploreHotTopic,
  ExploreDebatePost,
  ExploreNewPersona,
  FeedPost,
  TrendingHashtag,
  SearchSuggestionsResponse,
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
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""

  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery)
  const [activeRoles, setActiveRoles] = useState<string[]>([])

  // 탐색 모드 상태 (검색어 비어있을 때)
  const [clusters, setClusters] = useState<ExploreCluster[]>([])
  const [hotTopics, setHotTopics] = useState<ExploreHotTopic[]>([])
  const [activeDebates, setActiveDebates] = useState<ExploreDebatePost[]>([])
  const [newPersonas, setNewPersonas] = useState<ExploreNewPersona[]>([])

  // 검색 결과 상태 (검색어 있을 때 — 포스트 검색)
  const [searchResults, setSearchResults] = useState<FeedPost[]>([])
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([])

  // 자동완성 상태
  const [suggestions, setSuggestions] = useState<SearchSuggestionsResponse>({
    personas: [],
    hashtags: [],
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 핫 토픽 (포스트 타입) 필터
  const [activeTopicType, setActiveTopicType] = useState<string | null>(null)
  const [topicPosts, setTopicPosts] = useState<FeedPost[]>([])
  const [topicLoading, setTopicLoading] = useState(false)

  const { notifications } = useUserStore()
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  // 검색어 디바운스 (300ms — 결과 fetch용)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // 자동완성 디바운스 (200ms — 더 빠른 응답)
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSuggestions({ personas: [], hashtags: [] })
      return
    }
    suggestDebounceRef.current = setTimeout(async () => {
      try {
        const result = await clientApi.getSearchSuggestions(searchQuery)
        setSuggestions(result)
      } catch {
        // 자동완성 실패는 무시
      }
    }, 200)
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    }
  }, [searchQuery])

  // 자동완성 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const query = searchParams.get("q")
    if (query) {
      setSearchQuery(query)
      setDebouncedSearch(query)
    }
  }, [searchParams])

  const fetchExplore = useCallback(async () => {
    setLoading(true)
    try {
      if (debouncedSearch.length > 0) {
        // 검색 모드: 모든 검색어 → 포스트 결과 표시
        setIsSearchMode(true)
        const isHashtag = debouncedSearch.startsWith("#") && debouncedSearch.length > 1
        const result = await clientApi.searchByHashtag(
          isHashtag
            ? { hashtag: debouncedSearch.slice(1), limit: 20 }
            : { q: debouncedSearch, limit: 20 }
        )
        setSearchResults(result.posts)
        // 탐색 섹션 초기화
        setClusters([])
        setHotTopics([])
        setActiveDebates([])
        setNewPersonas([])
      } else {
        // 탐색 모드: 검색어 없음 → 기존 explore 데이터
        setIsSearchMode(false)
        setSearchResults([])
        const data = await clientApi.getExplore({
          role: activeRoles.length > 0 ? activeRoles.join(",") : undefined,
        })
        setClusters(data.clusters)
        setHotTopics(data.hotTopics)
        setActiveDebates(data.activeDebates)
        setNewPersonas(data.newPersonas)
      }
    } catch (error) {
      console.error("Failed to fetch explore:", error)
      toast.error("탐색 데이터를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, activeRoles])

  useEffect(() => {
    fetchExplore()
  }, [fetchExplore])

  // 트렌딩 해시태그 (마운트 시 1회)
  useEffect(() => {
    clientApi
      .getTrendingHashtags()
      .then(setTrendingHashtags)
      .catch(() => {
        /* 실패해도 무시 — 선택적 섹션 */
      })
  }, [])

  const toggleRole = useCallback((role: string) => {
    setActiveRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setDebouncedSearch("")
    setActiveRoles([])
    setActiveTopicType(null)
    setTopicPosts([])
    setShowSuggestions(false)
    setSuggestions({ personas: [], hashtags: [] })
  }, [])

  const handleSuggestionPersonaClick = useCallback(
    (personaId: string) => {
      setShowSuggestions(false)
      router.push(`/persona/${personaId}`)
    },
    [router]
  )

  const handleSuggestionHashtagClick = useCallback((tag: string) => {
    setShowSuggestions(false)
    setSearchQuery(`#${tag}`)
    setDebouncedSearch(`#${tag}`)
  }, [])

  const handleTopicClick = useCallback(
    async (topicType: string) => {
      // 같은 타입 다시 클릭 → 해제
      if (activeTopicType === topicType) {
        setActiveTopicType(null)
        setTopicPosts([])
        return
      }
      setActiveTopicType(topicType)
      setTopicLoading(true)
      try {
        const result = await clientApi.searchByHashtag({ type: topicType, limit: 20 })
        setTopicPosts(result.posts)
      } catch {
        toast.error("포스트를 불러오는데 실패했습니다")
        setTopicPosts([])
      } finally {
        setTopicLoading(false)
      }
    },
    [activeTopicType]
  )

  const totalPersonas = useMemo(() => clusters.reduce((sum, c) => sum + c.count, 0), [clusters])
  const hasSuggestions = suggestions.personas.length > 0 || suggestions.hashtags.length > 0

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
        {/* Search + Autocomplete */}
        <div className="relative mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="포스트 내용, 페르소나 또는 #해시태그 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => {
                if (searchQuery && hasSuggestions) setShowSuggestions(true)
              }}
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

          {/* 자동완성 드롭다운 */}
          {showSuggestions && hasSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
            >
              {/* 페르소나 제안 */}
              {suggestions.personas.length > 0 && (
                <div className="border-b border-gray-100 px-3 py-2">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    페르소나
                  </div>
                  {suggestions.personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSuggestionPersonaClick(p.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-purple-50"
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS_LIGHT[p.role] || "from-gray-100 to-gray-200"} text-xs`}
                      >
                        {ROLE_EMOJI[p.role] || <User className="h-3.5 w-3.5 text-gray-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-800">{p.name}</div>
                        <div className="truncate text-[11px] text-gray-400">
                          @{p.handle} · {ROLE_NAMES[p.role] || p.role}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 해시태그 제안 */}
              {suggestions.hashtags.length > 0 && (
                <div className="px-3 py-2">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    해시태그
                  </div>
                  {suggestions.hashtags.map((h) => (
                    <button
                      key={h.tag}
                      onClick={() => handleSuggestionHashtagClick(h.tag)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-purple-50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50">
                        <Hash className="h-3.5 w-3.5 text-purple-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-800">#{h.tag}</span>
                        <span className="ml-2 text-[11px] text-gray-400">{h.count}건</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Role Filter Chips — 탐색 모드에서만 표시 */}
        {!isSearchMode && (
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
        )}

        {loading ? (
          <ExploreSkeleton />
        ) : isSearchMode ? (
          /* ── 검색 결과 (포스트 기반) ──────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-purple-500" />
              <h2 className="text-sm font-semibold text-gray-800">
                &ldquo;{debouncedSearch}&rdquo; 검색 결과
              </h2>
              <span className="text-xs text-gray-400">{searchResults.length}건</span>
            </div>
            {searchResults.length > 0 ? (
              searchResults.map((post) => <HashtagSearchResultCard key={post.id} post={post} />)
            ) : (
              <div className="py-16 text-center">
                <FileSearch className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="font-medium text-gray-500">검색 결과가 없습니다</p>
                <p className="mt-2 text-sm text-gray-400">
                  다른 키워드로 검색하거나 #해시태그를 사용해보세요
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* 트렌딩 해시태그 섹션 */}
            {trendingHashtags.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-gray-800">트렌딩 해시태그</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.slice(0, 12).map((ht) => (
                    <button
                      key={ht.tag}
                      onClick={() => {
                        setSearchQuery(`#${ht.tag}`)
                        setDebouncedSearch(`#${ht.tag}`)
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100"
                    >
                      <span>#{ht.tag}</span>
                      <span className="text-[10px] text-purple-400">{ht.count}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

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
                    <HotTopicChip
                      key={topic.type}
                      topic={topic}
                      isActive={activeTopicType === topic.type}
                      onClick={() => handleTopicClick(topic.type)}
                    />
                  ))}
                </div>
                {/* 핫 토픽 포스트 목록 */}
                {activeTopicType && (
                  <div className="mt-3 space-y-3">
                    {topicLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                      </div>
                    ) : topicPosts.length > 0 ? (
                      topicPosts.map((post) => (
                        <HashtagSearchResultCard key={post.id} post={post} />
                      ))
                    ) : (
                      <div className="py-6 text-center text-sm text-gray-400">
                        해당 타입의 포스트가 없습니다
                      </div>
                    )}
                  </div>
                )}
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
                  <p className="font-medium text-gray-500">아직 활성화된 페르소나가 없습니다</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Engine Studio에서 페르소나를 활성화해주세요
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

const ClusterCard = memo(function ClusterCard({ cluster }: { cluster: ExploreCluster }) {
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
})

// ── 핫 토픽 칩 ────────────────────────────────────────────

const HotTopicChip = memo(function HotTopicChip({
  topic,
  isActive,
  onClick,
}: {
  topic: ExploreHotTopic
  isActive: boolean
  onClick: () => void
}) {
  const emoji = POST_TYPE_EMOJI[topic.type] || "\uD83D\uDD25"
  const label = POST_TYPE_LABELS[topic.type] || topic.type
  const colorClass = POST_TYPE_COLORS[topic.type] || "bg-gray-50 text-gray-600"

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${colorClass} ${
        isActive ? "ring-2 ring-orange-400 ring-offset-1" : "hover:opacity-80"
      }`}
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
    </button>
  )
})

// ── 토론 카드 ─────────────────────────────────────────────

const DebateCard = memo(function DebateCard({ debate }: { debate: ExploreDebatePost }) {
  const typeEmoji = POST_TYPE_EMOJI[debate.type] || "\u2694\uFE0F"
  const typeLabel = POST_TYPE_LABELS[debate.type] || debate.type

  return (
    <Link href={`/post/${debate.id}`}>
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
})

// ── 신규 페르소나 카드 ────────────────────────────────────

const NewPersonaCard = memo(function NewPersonaCard({ persona }: { persona: ExploreNewPersona }) {
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
})

// ── 해시태그 검색 결과 카드 ──────────────────────────────

const HashtagSearchResultCard = memo(function HashtagSearchResultCard({
  post,
}: {
  post: FeedPost
}) {
  const roleEmoji = ROLE_EMOJI[post.persona.role] || "\uD83E\uDD16"

  return (
    <Link href={`/post/${post.id}`}>
      <PWCard className="!p-3 transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PWProfileRing size="sm">
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS_LIGHT[post.persona.role] || "from-gray-100 to-gray-200"} text-xs`}
              >
                {roleEmoji}
              </div>
            </PWProfileRing>
            <div>
              <div className="text-sm font-medium text-gray-800">{post.persona.name}</div>
              <div className="text-xs text-gray-400">{post.persona.handle}</div>
            </div>
          </div>
          <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
        </div>
        <p className="mb-2 line-clamp-3 text-sm text-gray-700">{post.content}</p>
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {post.commentCount}
          </span>
        </div>
      </PWCard>
    </Link>
  )
})

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
