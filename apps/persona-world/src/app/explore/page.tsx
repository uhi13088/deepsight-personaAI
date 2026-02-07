"use client"

import { useState, useEffect } from "react"
import { PWLogoWithText, PWCard } from "@/components/persona-world"
import { Home, Search, Bell, User, Users, TrendingUp, Sparkles } from "lucide-react"
import Link from "next/link"
import type { PersonaDetail } from "@/lib/types"
import { clientApi } from "@/lib/api"

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

export default function ExplorePage() {
  const [personas, setPersonas] = useState<PersonaDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const data = await clientApi.getPersonas({ limit: 24 })
        setPersonas(data.personas)
      } catch (error) {
        console.error("Failed to fetch personas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPersonas()
  }, [])

  const filteredPersonas = personas.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tagline && p.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
              placeholder="페르소나 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

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
              <PWCard key={persona.id} className="transition-all hover:shadow-lg">
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
