"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import type { ArenaSessionDetail } from "@/lib/api"
import {
  ArenaChat,
  ArenaRoundIndicator,
  ArenaParticipantList,
  ArenaVotePanel,
} from "@/components/arena"

export default function ArenaSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  const profile = useUserStore((s) => s.profile)
  const userId = profile?.id

  const [session, setSession] = useState<ArenaSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [votedPersonaId, setVotedPersonaId] = useState<string | null>(null)

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

  async function handleNextRound() {
    if (!userId || !session) return
    setExecuting(true)
    try {
      const result = await clientApi.executeArenaRound(sessionId, userId)
      // 세션 다시 로드
      await loadSession()
    } catch (err) {
      alert(err instanceof Error ? err.message : "라운드 실행 실패")
    } finally {
      setExecuting(false)
    }
  }

  async function handleComplete() {
    if (!userId || !session) return
    try {
      await clientApi.updateArenaSession(sessionId, userId, "complete")
      await loadSession()
    } catch (err) {
      alert(err instanceof Error ? err.message : "완료 처리 실패")
    }
  }

  function handleVote(personaId: string) {
    setVotedPersonaId(personaId)
    // TODO: API 연동 (투표 저장)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="text-sm text-gray-400">로딩 중...</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="text-sm text-gray-400">세션을 찾을 수 없습니다</span>
      </div>
    )
  }

  const isOwner = session.userId === userId
  const isActive = session.status === "WAITING" || session.status === "IN_PROGRESS"
  const isCompleted = session.status === "COMPLETED"
  const canExecute = isOwner && isActive && session.currentRound < session.maxRounds

  // 페르소나 정보 (간이)
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
          <button
            onClick={() => router.push("/arena")}
            className="text-gray-400 hover:text-gray-600"
          >
            ← 뒤로
          </button>
          <h1 className="line-clamp-1 flex-1 text-base font-bold text-gray-900">{session.topic}</h1>
          {isCompleted && session.replaySaved && (
            <button
              onClick={() => router.push(`/arena/${sessionId}/replay`)}
              className="text-xs font-medium text-violet-500"
            >
              리플레이
            </button>
          )}
        </div>

        <ArenaRoundIndicator currentRound={session.currentRound} maxRounds={session.maxRounds} />
        <ArenaParticipantList personas={personaList} />
      </div>

      {/* 채팅 영역 */}
      <div className="px-4 py-4">
        <ArenaChat
          turns={session.turns}
          personas={personaMap}
          currentRound={session.currentRound}
        />
      </div>

      {/* 하단 액션 */}
      <div className="sticky bottom-0 space-y-3 border-t border-gray-100 bg-white px-4 py-4">
        {isCompleted && (
          <ArenaVotePanel
            personas={personaList}
            selectedPersonaId={votedPersonaId}
            onVote={handleVote}
          />
        )}

        {canExecute && (
          <div className="flex gap-2">
            <button
              onClick={handleNextRound}
              disabled={executing}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
            >
              {executing ? "생성 중..." : `라운드 ${session.currentRound + 1} 시작`}
            </button>
            <button
              onClick={handleComplete}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              종료
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="text-center text-xs text-gray-400">
            토론이 완료되었습니다 ({session.currentRound}/{session.maxRounds} 라운드)
          </div>
        )}
      </div>
    </div>
  )
}
