"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { clientApi } from "@/lib/api"
import type { ArenaSessionDetail } from "@/lib/api"
import { ArenaChat, ArenaRoundIndicator, ArenaParticipantList } from "@/components/arena"

export default function ArenaReplayPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<ArenaSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleRound, setVisibleRound] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)

  const loadSession = useCallback(async () => {
    try {
      const data = await clientApi.getArenaSession(sessionId)
      setSession(data)
    } catch {
      // 무시
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // 자동 재생
  useEffect(() => {
    if (!autoPlay || !session) return
    const maxRound = Math.max(...session.turns.map((t) => t.roundNumber), 0)
    if (visibleRound >= maxRound) {
      setAutoPlay(false)
      return
    }

    const timer = setTimeout(() => {
      setVisibleRound((prev) => prev + 1)
    }, 3000)

    return () => clearTimeout(timer)
  }, [autoPlay, visibleRound, session])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="text-sm text-gray-400">로딩 중...</span>
      </div>
    )
  }

  if (!session || !session.replaySaved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50">
        <span className="text-sm text-gray-400">리플레이를 찾을 수 없습니다</span>
        <button onClick={() => router.back()} className="text-sm text-violet-500">
          돌아가기
        </button>
      </div>
    )
  }

  const maxRound = Math.max(...session.turns.map((t) => t.roundNumber), 0)
  const visibleTurns = session.turns.filter((t) => t.roundNumber <= visibleRound)

  const personaIds = session.participantIds as string[]
  const personaMap = new Map(personaIds.map((id) => [id, { id, name: id.slice(0, 8) + "..." }]))
  const personaList = personaIds.map((id) => ({
    id,
    name: personaMap.get(id)?.name ?? id,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="space-y-3 border-b border-gray-100 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            ← 뒤로
          </button>
          <h1 className="line-clamp-1 flex-1 text-base font-bold text-gray-900">
            리플레이: {session.topic}
          </h1>
        </div>

        <ArenaRoundIndicator currentRound={visibleRound} maxRounds={maxRound} />
        <ArenaParticipantList personas={personaList} />
      </div>

      {/* 리플레이 컨트롤 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setVisibleRound(Math.max(0, visibleRound - 1))}
          disabled={visibleRound === 0}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 disabled:opacity-30"
        >
          ◀ 이전
        </button>
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            autoPlay ? "bg-violet-500 text-white" : "border border-gray-300 text-gray-600"
          }`}
        >
          {autoPlay ? "⏸ 일시정지" : "▶ 자동 재생"}
        </button>
        <button
          onClick={() => setVisibleRound(Math.min(maxRound, visibleRound + 1))}
          disabled={visibleRound >= maxRound}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 disabled:opacity-30"
        >
          다음 ▶
        </button>
        <button
          onClick={() => setVisibleRound(maxRound)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600"
        >
          전체 보기
        </button>
      </div>

      {/* 채팅 */}
      <div className="px-4 py-4">
        <ArenaChat turns={visibleTurns} personas={personaMap} currentRound={visibleRound} />
      </div>
    </div>
  )
}
