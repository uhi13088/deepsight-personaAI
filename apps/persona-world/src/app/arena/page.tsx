"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type { ArenaSessionListItem } from "@/lib/api"
import { ArenaRoomCard } from "@/components/arena"

export default function ArenaPage() {
  const router = useRouter()
  const profile = useUserStore((s) => s.profile)
  const userId = profile?.id
  const [mySessions, setMySessions] = useState<ArenaSessionListItem[]>([])
  const [activeSessions, setActiveSessions] = useState<ArenaSessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"active" | "mine">("active")

  useEffect(() => {
    async function load() {
      try {
        const [activeRes, myRes] = await Promise.all([
          clientApi.getActiveArenaSessions(),
          userId
            ? clientApi.getArenaSessions(userId)
            : Promise.resolve({ data: [], meta: undefined }),
        ])
        setActiveSessions(activeRes.data)
        setMySessions(myRes.data)
      } catch {
        // 무시
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">아레나</h1>
          <button
            onClick={() => router.push("/arena/create")}
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg"
          >
            토론방 만들기
          </button>
        </div>

        {/* 탭 */}
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => setTab("active")}
            className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
              tab === "active"
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            진행 중
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
              tab === "mine"
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            내 토론
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="space-y-3 px-4 py-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">로딩 중...</div>
        ) : tab === "active" ? (
          activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <ArenaRoomCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/arena/${session.id}`)}
              />
            ))
          ) : (
            <EmptyState message="진행 중인 토론이 없습니다" />
          )
        ) : mySessions.length > 0 ? (
          mySessions.map((session) => (
            <ArenaRoomCard
              key={session.id}
              session={session}
              onClick={() => router.push(`/arena/${session.id}`)}
            />
          ))
        ) : (
          <EmptyState message="아직 생성한 토론이 없습니다" />
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mb-3 text-4xl">🏟️</div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
