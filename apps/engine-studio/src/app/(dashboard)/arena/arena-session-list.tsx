"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ── Shared types ────────────────────────────────────────────

export interface ExtraParticipantEntry {
  id: string
  name: string
}

export interface ArenaTurn {
  turnNumber: number
  speakerId: string
  content: string
  tokensUsed: number
  timestamp: string
}

export interface ArenaSessionSummary {
  id: string
  mode: string
  participantA: string
  participantAName: string
  participantARole: string | null
  participantB: string
  participantBName: string
  participantBRole: string | null
  extraParticipants: ExtraParticipantEntry[]
  profileLoadLevel: string
  topic: string
  maxTurns: number
  budgetTokens: number
  usedTokens: number
  status: string
  turnCount: number
  overallScore: number | null
  judgmentMethod: string | null
  createdAt: string
  completedAt: string | null
}

export interface PersonaOption {
  id: string
  name: string
  role: string | null
  profileImageUrl: string | null
}

export type ProfileLevel = "FULL" | "STANDARD" | "LITE"
export type ArenaMode = "1v1" | "1vN"

export const PROFILE_LEVELS: { key: ProfileLevel; label: string; desc: string; tokens: string }[] =
  [
    { key: "LITE", label: "Lite", desc: "L1 + Stance", tokens: "~600" },
    { key: "STANDARD", label: "Standard", desc: "L1 + L2 + Voice", tokens: "~1,800" },
    { key: "FULL", label: "Full", desc: "3-Layer + Voice + RAG", tokens: "~3,200" },
  ]

// ── 상태 Badge ───────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "대기 중", variant: "outline" },
  RUNNING: { label: "실행 중", variant: "secondary" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소됨", variant: "destructive" },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

// ── 시간 포맷 ────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "방금"
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// ── 턴 뷰어 모달 ────────────────────────────────────────────

export function TurnViewer({
  session,
  onClose,
}: {
  session: ArenaSessionSummary
  onClose: () => void
}) {
  const [turns, setTurns] = useState<ArenaTurn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/internal/arena/sessions/${session.id}/turns`)
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { turns: ArenaTurn[] } }) => {
        if (json.success && json.data) setTurns(json.data.turns)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-inherit px-5 py-4">
          <div>
            <p className="text-sm font-semibold">{session.topic}</p>
            <p className="text-muted-foreground text-xs">
              {session.participantAName} vs {session.participantBName}
              {session.overallScore !== null && (
                <span className="ml-2 font-medium text-blue-500">
                  점수: {session.overallScore.toFixed(2)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 턴 목록 */}
        <div className="space-y-3 p-5">
          {loading && <p className="text-muted-foreground text-sm">불러오는 중...</p>}
          {!loading && turns.length === 0 && (
            <p className="text-muted-foreground text-sm">턴 데이터가 없습니다.</p>
          )}
          {turns.map((t) => {
            const isA = t.speakerId === session.participantA
            const name = isA ? session.participantAName : session.participantBName
            return (
              <div
                key={t.turnNumber}
                className={`rounded-lg border p-3 ${isA ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20" : "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold">{name}</span>
                  <span className="text-muted-foreground text-xs">턴 {t.turnNumber}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{t.tokensUsed}tok</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 세션 카드 ───────────────────────────────────────────────

export function SessionCard({
  session,
  onRun,
  onDelete,
  onViewTurns,
  running,
  deleting,
}: {
  session: ArenaSessionSummary
  onRun: (id: string) => void
  onDelete: (id: string) => void
  onViewTurns: (session: ArenaSessionSummary) => void
  running: boolean
  deleting: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-gray-50 dark:hover:bg-gray-900">
      {/* 메인 정보 */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => session.status === "COMPLETED" && onViewTurns(session)}
          disabled={session.status !== "COMPLETED"}
        >
          <p className="truncate text-sm font-medium">
            {session.topic}
            {session.status === "COMPLETED" && (
              <span className="text-muted-foreground ml-1 text-xs">(클릭하여 대화 보기)</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {session.participantAName} vs {session.participantBName}
          </p>
        </button>
      </div>

      {/* 오른쪽 정보 */}
      <div className="flex shrink-0 items-center gap-2">
        {session.overallScore !== null && (
          <span className="text-xs font-medium text-blue-500">
            {session.overallScore.toFixed(2)}점
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {session.turnCount}/{session.maxTurns}턴
        </span>
        <StatusBadge status={session.status} />
        <span className="text-muted-foreground w-14 text-right text-xs">
          {timeAgo(session.createdAt)}
        </span>

        {/* 실행 버튼 (PENDING만) */}
        {session.status === "PENDING" && (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => onRun(session.id)}
            disabled={running}
          >
            {running ? "실행 중..." : "▶ 실행"}
          </Button>
        )}

        {/* 삭제 버튼 (RUNNING 제외) */}
        {session.status !== "RUNNING" && (
          <button
            type="button"
            className="text-muted-foreground text-xs transition hover:text-red-500"
            onClick={() => onDelete(session.id)}
            disabled={deleting}
            title="세션 삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
