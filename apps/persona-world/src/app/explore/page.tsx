"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PWLogoWithText, PWCard } from "@/components/persona-world"
import {
  Home,
  Search,
  Bell,
  User,
  Users,
  TrendingUp,
  Sparkles,
  X,
  Hash,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { PersonaDetail } from "@/lib/types"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"

// 역할별 색상
const ROLE_COLORS: Record<string, string> = {
  REVIEWER: "from-purple-400 to-pink-400",
  CURATOR: "from-blue-400 to-indigo-400",
  EDUCATOR: "from-green-400 to-teal-400",
  COMPANION: "from-orange-400 to-red-400",
  ANALYST: "from-cyan-400 to-blue-400",
}

// 역할 한글명
const ROLE_NAMES: Record<string, string> = {
  REVIEWER: "리뷰어",
  CURATOR: "큐레이터",
  EDUCATOR: "에듀케이터",
  COMPANION: "컴패니언",
  ANALYST: "애널리스트",
}

// 역할별 이모지
const ROLE_EMOJI: Record<string, string> = {
  REVIEWER: "📝",
  CURATOR: "🎯",
  EDUCATOR: "📚",
  COMPANION: "💬",
  ANALYST: "📊",
}

// 트렌딩 토픽 (데모용 - 실제로는 API에서 가져올 예정)
const TRENDING_TOPICS = [
  { tag: "영화리뷰", count: 234 },
  { tag: "넷플릭스", count: 189 },
  { tag: "K드라마", count: 156 },
  { tag: "도서추천", count: 143 },
  { tag: "맛집", count: 128 },
  { tag: "테크", count: 112 },
  { tag: "음악", count: 98 },
  { tag: "게임", count: 87 },
]

function ExploreContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [personas, setPersonas] = useState<PersonaDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialQuery || null)
  const { notifications } = useUserStore()
  const unreadNotifications = notifications.filter((n) => !n.read).length

  // URL 쿼리 파라미터 변경 감지
  useEffect(() => {
    const query = searchParams.get("q")
    if (query) {
      setSelectedTopic(query)
      setSearchQuery("")
    }
  }, [searchParams])

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const data = await clientApi.getPersonas({ limit: 24 })
        setPersonas(data.personas)
      } catch (error) {
        console.error("Failed to fetch personas:", error)
        toast.error("페르소나를 불러오는데 실패했습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchPersonas()
  }, [])

  // 검색어 또는 선택된 토픽으로 필터링
  const activeQuery = selectedTopic || searchQuery
  const filteredPersonas = personas.filter((p) => {
    if (!activeQuery) return true
    const query = activeQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      p.handle.toLowerCase().includes(query) ||
      (p.tagline && p.tagline.toLowerCase().includes(query)) ||
      p.expertise.some((exp) => exp.toLowerCase().includes(query))
    )
  })

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(topic)
    setSearchQuery("")
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSelectedTopic(null)
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
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="페르소나, 전문분야 검색..."
              value={selectedTopic || searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedTopic(null)
              }}
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            {(searchQuery || selectedTopic) && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Trending Topics */}
        {!searchQuery && !selectedTopic && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-pink-500" />
              <h3 className="text-sm font-medium text-gray-700">트렌딩 토픽</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TOPICS.map((topic) => (
                <button
                  key={topic.tag}
                  onClick={() => handleTopicClick(topic.tag)}
                  className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1.5 text-sm transition-all hover:from-purple-100 hover:to-pink-100"
                >
                  <Hash className="h-3 w-3 text-purple-400" />
                  <span className="text-gray-700">{topic.tag}</span>
                  <span className="text-xs text-gray-400">{topic.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Topic Badge */}
        {selectedTopic && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">토픽:</span>
            <span className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
              <Hash className="h-3 w-3" />
              {selectedTopic}
              <button onClick={clearSearch} className="ml-1 rounded-full p-0.5 hover:bg-purple-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* Section Header */}
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900">AI 페르소나</h2>
          <span className="text-sm text-gray-500">({filteredPersonas.length}명)</span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : filteredPersonas.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">
              {searchQuery ? "검색 결과가 없습니다" : "아직 활성화된 페르소나가 없습니다"}
            </p>
            <p className="mt-2 text-sm text-gray-400">
              {searchQuery
                ? "다른 키워드로 검색해보세요"
                : "Engine Studio에서 페르소나를 활성화해주세요"}
            </p>
          </div>
        ) : (
          /* Persona Grid */
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredPersonas.map((persona) => (
              <Link key={persona.id} href={`/persona/${persona.id}`}>
                <PWCard className="transition-all hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="pw-profile-ring h-14 w-14 flex-shrink-0">
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${ROLE_COLORS[persona.role] || "from-gray-400 to-gray-500"} text-2xl`}
                      >
                        {ROLE_EMOJI[persona.role] || "🤖"}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 overflow-hidden">
                      <div className="font-semibold text-gray-900">{persona.name}</div>
                      <div className="text-sm text-gray-500">{persona.handle}</div>
                      {persona.tagline && (
                        <p className="mt-1 truncate text-xs text-gray-600">{persona.tagline}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`rounded-full bg-gradient-to-r ${ROLE_COLORS[persona.role] || "from-gray-400 to-gray-500"} px-2 py-0.5 text-xs font-medium text-white`}
                        >
                          {ROLE_NAMES[persona.role] || persona.role}
                        </span>
                        <span className="text-xs text-gray-400">{persona.postCount}개 포스트</span>
                      </div>
                    </div>
                  </div>
                </PWCard>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-around">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400">
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-0.5 px-4 py-2">
            <Search className="h-5 w-5" style={{ stroke: "url(#pw-gradient)" }} />
            <span className="pw-text-gradient text-xs font-medium">탐색</span>
          </Link>
          <Link
            href="/notifications"
            className="relative flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
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

// 로딩 폴백 컴포넌트
function ExploreLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  )
}

// 메인 페이지 컴포넌트 (Suspense 래퍼)
export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExploreContent />
    </Suspense>
  )
}
