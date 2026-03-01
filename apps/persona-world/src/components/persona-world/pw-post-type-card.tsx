"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import type { FeedPost } from "@/lib/types"
import { POST_TYPE_LABELS, POST_TYPE_EMOJI, POST_TYPE_COLORS } from "@/lib/role-config"
import { parseMentions } from "@/lib/mention-utils"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"

interface PWPostTypeCardProps {
  post: FeedPost
}

/**
 * 17종 포스트 타입별 분화 UI
 *
 * 기본 구조: 타입 뱃지 + 타입별 특화 렌더링 + 공통 본문
 */
export function PWPostTypeCard({ post }: PWPostTypeCardProps) {
  const emoji = POST_TYPE_EMOJI[post.type] ?? ""
  const label = POST_TYPE_LABELS[post.type] ?? post.type
  const colorClass = POST_TYPE_COLORS[post.type] ?? "bg-gray-50 text-gray-600"

  return (
    <div>
      {/* 타입 뱃지 */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
        >
          <span>{emoji}</span>
          {label}
        </span>
      </div>

      {/* 타입별 특화 렌더링 */}
      {post.type === "VS_BATTLE" && <VsBattleContent postId={post.id} metadata={post.metadata} />}
      {post.type === "QNA" && <QnaContent metadata={post.metadata} />}
      {post.type === "CURATION" && <CurationContent metadata={post.metadata} />}
      {post.type === "DEBATE" && <DebateContent metadata={post.metadata} />}
      {post.type === "TRIVIA" && <TriviaContent metadata={post.metadata} />}
      {post.type === "PREDICTION" && <PredictionContent metadata={post.metadata} />}
      {post.type === "REVIEW" && <ReviewContent metadata={post.metadata} />}
      {post.type === "LIST" && <ListContent content={post.content} />}
      {post.type === "COLLAB" && <CollabContent metadata={post.metadata} />}

      {/* 공통 본문 (멘션 하이라이트 포함) */}
      <p className="whitespace-pre-wrap text-gray-800">
        {parseMentions(post.content).map((seg, i) =>
          seg.type === "mention" ? (
            <Link
              key={i}
              href={`/explore?q=${seg.handle}`}
              className="font-medium text-purple-600 hover:underline"
            >
              {seg.content}
            </Link>
          ) : (
            <span key={i}>{seg.content}</span>
          )
        )}
      </p>
    </div>
  )
}

// ── VS_BATTLE ───────────────────────────────────────────────

function VsBattleContent({
  postId,
  metadata,
}: {
  postId: string
  metadata: Record<string, unknown> | null
}) {
  const userId = useUserStore((s) => s.profile?.id)
  const optionA = String(metadata?.optionA ?? "A")
  const optionB = String(metadata?.optionB ?? "B")

  const voters = (metadata?.voters as Record<string, string> | undefined) ?? {}
  const initialChoice = userId ? (voters[userId] as "A" | "B" | undefined) : undefined

  const initialVotes = (metadata?.votes as { A?: number; B?: number } | undefined) ?? {}
  const initialTotalVotes = (initialVotes.A ?? 0) + (initialVotes.B ?? 0)
  const initialPctA =
    initialTotalVotes > 0 ? Math.round(((initialVotes.A ?? 0) / initialTotalVotes) * 100) : 50

  const [myChoice, setMyChoice] = useState<"A" | "B" | undefined>(initialChoice)
  const [pctA, setPctA] = useState(initialPctA)
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes)
  const [voting, setVoting] = useState(false)

  const handleVote = useCallback(
    async (choice: "A" | "B") => {
      if (!userId || voting) return
      setVoting(true)

      // 낙관적 업데이트
      const prevChoice = myChoice
      const prevPctA = pctA
      const prevTotal = totalVotes

      let newTotal = totalVotes
      let newVotesA = Math.round((pctA / 100) * totalVotes)
      let newVotesB = totalVotes - newVotesA

      if (prevChoice) {
        if (prevChoice === "A") newVotesA = Math.max(0, newVotesA - 1)
        else newVotesB = Math.max(0, newVotesB - 1)
        newTotal--
      }
      if (choice === "A") newVotesA++
      else newVotesB++
      newTotal++

      const newPctA = newTotal > 0 ? Math.round((newVotesA / newTotal) * 100) : 50
      setMyChoice(choice)
      setPctA(newPctA)
      setTotalVotes(newTotal)

      try {
        const result = await clientApi.voteOnBattle(postId, userId, choice)
        setPctA(result.pctA)
        setTotalVotes(result.totalVotes)
      } catch {
        // 롤백
        setMyChoice(prevChoice)
        setPctA(prevPctA)
        setTotalVotes(prevTotal)
      } finally {
        setVoting(false)
      }
    },
    [userId, voting, myChoice, pctA, totalVotes, postId]
  )

  if (!metadata) return null

  const hasVoted = myChoice !== undefined
  const pctB = 100 - pctA

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Option A */}
        <button
          onClick={() => handleVote("A")}
          disabled={!userId || voting}
          className={`flex-1 overflow-hidden rounded-lg p-2.5 text-left transition-all ${
            myChoice === "A" ? "bg-red-100 ring-2 ring-red-400" : "bg-red-50 hover:bg-red-100"
          } ${!userId ? "cursor-default" : "cursor-pointer"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">
              {myChoice === "A" && "\u2714 "}
              {optionA}
            </span>
            {(hasVoted || totalVotes > 0) && (
              <span className="text-xs font-bold text-red-600">{pctA}%</span>
            )}
          </div>
          {(hasVoted || totalVotes > 0) && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-red-100">
              <div
                className="h-full rounded-full bg-red-400 transition-all duration-300"
                style={{ width: `${pctA}%` }}
              />
            </div>
          )}
        </button>

        <span className="text-xs font-bold text-gray-400">VS</span>

        {/* Option B */}
        <button
          onClick={() => handleVote("B")}
          disabled={!userId || voting}
          className={`flex-1 overflow-hidden rounded-lg p-2.5 text-left transition-all ${
            myChoice === "B" ? "bg-blue-100 ring-2 ring-blue-400" : "bg-blue-50 hover:bg-blue-100"
          } ${!userId ? "cursor-default" : "cursor-pointer"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {myChoice === "B" && "\u2714 "}
              {optionB}
            </span>
            {(hasVoted || totalVotes > 0) && (
              <span className="text-xs font-bold text-blue-600">{pctB}%</span>
            )}
          </div>
          {(hasVoted || totalVotes > 0) && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-300"
                style={{ width: `${pctB}%` }}
              />
            </div>
          )}
        </button>
      </div>
      {totalVotes > 0 && <p className="text-center text-xs text-gray-400">{totalVotes}명 참여</p>}
      {!userId && <p className="text-center text-xs text-gray-400">로그인 후 투표할 수 있습니다</p>}
    </div>
  )
}

// ── QNA ─────────────────────────────────────────────────────

function QnaContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const questions = metadata.questions as Array<{ q?: string; a?: string }> | undefined
  if (!questions?.length) return null

  return (
    <div className="mb-3 space-y-2">
      {questions.slice(0, 3).map((item, i) => (
        <div key={i} className="rounded-lg border border-teal-100 bg-teal-50/50 p-3">
          {item.q && <p className="text-sm font-medium text-teal-800">Q: {item.q}</p>}
          {item.a && <p className="mt-1 text-sm text-teal-600">A: {item.a}</p>}
        </div>
      ))}
    </div>
  )
}

// ── CURATION ────────────────────────────────────────────────

function CurationContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const items = metadata.items as
    | Array<{ rank?: number; title?: string; reason?: string }>
    | undefined
  if (!items?.length) return null

  return (
    <div className="mb-3 space-y-1.5">
      {items.slice(0, 5).map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-violet-50/50 px-3 py-2">
          <span className="text-sm font-bold text-violet-500">{item.rank ?? i + 1}.</span>
          <div>
            <p className="text-sm font-medium text-gray-800">{item.title}</p>
            {item.reason && <p className="text-xs text-gray-500">{item.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── DEBATE ──────────────────────────────────────────────────

function DebateContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const positions = metadata.positions as
    | Array<{ position?: string; argument?: string }>
    | undefined
  if (!positions?.length) return null

  const positionColors: Record<string, string> = {
    찬성: "bg-green-100 text-green-700",
    반대: "bg-red-100 text-red-700",
    중립: "bg-gray-100 text-gray-600",
  }

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {positions.map((p, i) => (
        <span
          key={i}
          className={`rounded-full px-3 py-1 text-xs font-medium ${positionColors[p.position ?? ""] ?? "bg-gray-100 text-gray-600"}`}
        >
          {p.position ?? "입장"}
        </span>
      ))}
    </div>
  )
}

// ── TRIVIA ──────────────────────────────────────────────────

function TriviaContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const options = metadata.options as string[] | undefined
  if (!options?.length) return null

  return (
    <div className="mb-3 space-y-1.5">
      {options.map((opt, i) => (
        <div
          key={i}
          className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/50 px-3 py-2 text-sm text-gray-700"
        >
          <span className="mr-2 font-bold text-fuchsia-500">{String.fromCharCode(65 + i)}.</span>
          {opt}
        </div>
      ))}
    </div>
  )
}

// ── PREDICTION ──────────────────────────────────────────────

function PredictionContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const confidence = Number(metadata.confidence ?? 0)
  if (!confidence) return null

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2">
      <span className="text-sm text-indigo-600">신뢰도</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${confidence}%` }} />
        </div>
      </div>
      <span className="text-sm font-bold text-indigo-700">{confidence}%</span>
    </div>
  )
}

// ── REVIEW ──────────────────────────────────────────────────

function ReviewContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const rating = Number(metadata.rating ?? 0)
  if (!rating) return null

  return (
    <div className="mb-2 flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`text-sm ${i < rating ? "text-yellow-400" : "text-gray-200"}`}>
          {"\u2605"}
        </span>
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating}/5</span>
    </div>
  )
}

// ── LIST ────────────────────────────────────────────────────

function ListContent({ content }: { content: string }) {
  // 리스트 타입은 본문을 번호 리스트로 파싱
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length <= 1) return null

  return (
    <div className="mb-3 space-y-1">
      {lines.slice(0, 10).map((line, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
            {i + 1}
          </span>
          <span className="text-gray-700">{line.replace(/^\d+[.)]\s*/, "")}</span>
        </div>
      ))}
    </div>
  )
}

// ── COLLAB ──────────────────────────────────────────────────

function CollabContent({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const participants = metadata.participants as string[] | undefined
  if (!participants?.length) return null

  return (
    <div className="mb-3 flex items-center gap-1.5">
      <span className="text-xs text-cyan-600">참여:</span>
      {participants.slice(0, 4).map((name, i) => (
        <span key={i} className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700">
          {name}
        </span>
      ))}
      {participants.length > 4 && (
        <span className="text-xs text-gray-400">+{participants.length - 4}</span>
      )}
    </div>
  )
}
