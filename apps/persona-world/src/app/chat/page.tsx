"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageCircle, Loader2, Sparkles } from "lucide-react"
import { PWLogoWithText, PWBottomNav, PWProfileRing } from "@/components/persona-world"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { formatTimeAgo } from "@/lib/format"
import { ROLE_COLORS_BOLD, ROLE_EMOJI } from "@/lib/role-config"
import type { ChatThread } from "@/lib/types"

export default function ChatListPage() {
  const profile = useUserStore((s) => s.profile)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    async function loadThreads() {
      try {
        setIsLoading(true)
        const data = await clientApi.getChatThreads(profile!.id)
        setThreads(data)
      } catch (err) {
        console.error("Failed to load chat threads:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadThreads()
  }, [profile?.id, profile])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <PWLogoWithText size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
        {/* Section Header */}
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-violet-500" />
          <h2 className="font-semibold text-gray-900">채팅</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : threads.length > 0 ? (
          <div className="space-y-2">
            {threads.map((thread) => (
              <ChatThreadItem key={thread.id} thread={thread} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100">
              <Sparkles className="h-10 w-10 text-violet-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">아직 대화가 없어요</h3>
            <p className="mb-6 text-gray-500">
              좋아하는 페르소나의 프로필에서
              <br />
              &ldquo;대화하기&rdquo; 버튼을 눌러보세요
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
            >
              <MessageCircle className="h-4 w-4" />
              페르소나 찾아보기
            </Link>
          </div>
        )}
      </main>

      <PWBottomNav />
    </div>
  )
}

// ── 스레드 아이템 ─────────────────────────────────────────

function ChatThreadItem({ thread }: { thread: ChatThread }) {
  const colorBold = ROLE_COLORS_BOLD["COMPANION"] || "from-violet-400 to-purple-500"

  return (
    <Link
      href={`/chat/${thread.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-sm"
    >
      <PWProfileRing size="md">
        {thread.personaImageUrl ? (
          <img
            src={thread.personaImageUrl}
            alt={thread.personaName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-lg text-white`}
          >
            {thread.personaName.charAt(0)}
          </div>
        )}
      </PWProfileRing>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{thread.personaName}</h3>
          {thread.lastMessageAt && (
            <span className="text-[10px] text-gray-400">{formatTimeAgo(thread.lastMessageAt)}</span>
          )}
        </div>
        {thread.lastMessageContent ? (
          <p className="mt-0.5 truncate text-xs text-gray-500">{thread.lastMessageContent}</p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-400">대화를 시작해보세요</p>
        )}
      </div>
      <div className="flex-shrink-0">
        <div className="flex h-6 items-center rounded-full bg-gray-100 px-2 text-[10px] text-gray-500">
          {thread.totalMessages}
        </div>
      </div>
    </Link>
  )
}
