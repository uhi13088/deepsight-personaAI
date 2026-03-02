"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, ImagePlus, Coins, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import { formatTimeAgo } from "@/lib/format"
import { PWProfileRing } from "@/components/persona-world"
import { ROLE_COLORS_BOLD, ROLE_EMOJI } from "@/lib/role-config"
import type { ChatMessage } from "@/lib/types"

const COST_PER_TURN = 10

export default function ChatMessagePage() {
  const params = useParams()
  const router = useRouter()
  const threadId = params.threadId as string
  const profile = useUserStore((s) => s.profile)
  const creditsBalance = useUserStore((s) => s.onboarding.creditsBalance)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [inputText, setInputText] = useState("")
  const [personaName, setPersonaName] = useState("")
  const [personaRole, setPersonaRole] = useState("")
  const [personaImageUrl, setPersonaImageUrl] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // 초기 메시지 로드 + 스레드 정보 가져오기
  useEffect(() => {
    if (!profile?.id || !threadId) return

    async function load() {
      try {
        setIsLoading(true)
        // 스레드 목록에서 현재 스레드 정보 가져오기
        const threads = await clientApi.getChatThreads(profile!.id)
        const currentThread = threads.find((t) => t.id === threadId)
        if (currentThread) {
          setPersonaName(currentThread.personaName)
          setPersonaImageUrl(currentThread.personaImageUrl)
        }

        // 메시지 로드
        const data = await clientApi.getChatMessages(threadId, profile!.id, { limit: 50 })
        setMessages(data.messages.reverse()) // API returns newest first, we want oldest first
        setHasMore(data.hasMore)
        setNextCursor(data.nextCursor)
      } catch (err) {
        console.error("Failed to load chat:", err)
        toast.error("채팅을 불러오는데 실패했습니다")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [profile?.id, threadId, profile])

  // 메시지 로드 후 스크롤
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom()
    }
  }, [isLoading, messages.length, scrollToBottom])

  // 이전 메시지 로드
  const loadMore = async () => {
    if (!profile?.id || !nextCursor || isLoadingMore) return
    try {
      setIsLoadingMore(true)
      const data = await clientApi.getChatMessages(threadId, profile.id, {
        cursor: nextCursor,
        limit: 30,
      })
      setMessages((prev) => [...data.messages.reverse(), ...prev])
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      toast.error("이전 메시지를 불러오는데 실패했습니다")
    } finally {
      setIsLoadingMore(false)
    }
  }

  // 메시지 전송
  const handleSend = async () => {
    const content = inputText.trim()
    if (!content || isSending || !profile?.id) return

    if (creditsBalance < COST_PER_TURN) {
      toast.error("코인이 부족합니다. 상점에서 충전해주세요!")
      router.push("/shop")
      return
    }

    // 낙관적 업데이트: 유저 메시지 즉시 표시
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setInputText("")
    setIsSending(true)
    scrollToBottom()

    try {
      const result = await clientApi.sendChatMessage(threadId, profile.id, content)

      // 임시 메시지를 실제 메시지로 교체 + 페르소나 응답 추가
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id)
        return [
          ...withoutTemp,
          {
            id: result.userMessageId,
            role: "USER" as const,
            content,
            imageUrl: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: result.personaMessageId,
            role: "PERSONA" as const,
            content: result.personaResponse,
            imageUrl: null,
            createdAt: new Date().toISOString(),
          },
        ]
      })
      scrollToBottom()
    } catch (err) {
      // 에러 시 임시 메시지 제거
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      setInputText(content) // 입력 복원

      if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
        toast.error("코인이 부족합니다. 상점에서 충전해주세요!")
      } else {
        toast.error("메시지 전송에 실패했습니다")
      }
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // Enter로 전송 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const roleEmoji = ROLE_EMOJI[personaRole] || ""
  const colorBold = ROLE_COLORS_BOLD[personaRole] || "from-violet-400 to-purple-500"

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">로그인이 필요합니다</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link href="/chat" className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <PWProfileRing size="sm">
            {personaImageUrl ? (
              <img
                src={personaImageUrl}
                alt={personaName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-sm text-white`}
              >
                {roleEmoji || personaName.charAt(0)}
              </div>
            )}
          </PWProfileRing>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-900">{personaName || "채팅"}</h1>
            {isSending && <p className="text-xs text-violet-500">응답 작성 중...</p>}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
            <Coins className="h-3.5 w-3.5" />
            {creditsBalance}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-4">
          {/* Load more */}
          {hasMore && (
            <div className="mb-4 text-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="rounded-full bg-white px-4 py-1.5 text-xs text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "이전 메시지 불러오기"
                )}
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100">
                <span className="text-2xl">{roleEmoji || "💬"}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {personaName}와 대화를 시작하세요
              </h3>
              <p className="text-sm text-gray-500">
                메시지를 보내면 {COST_PER_TURN} 코인이 차감됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  personaName={personaName}
                  personaImageUrl={personaImageUrl}
                  colorBold={colorBold}
                  roleEmoji={roleEmoji}
                />
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {isSending && (
            <div className="mt-3 flex items-start gap-2">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-xs text-white`}
              >
                {roleEmoji || personaName.charAt(0)}
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${personaName}에게 메시지 보내기... (${COST_PER_TURN}코인/턴)`}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:bg-white focus:outline-none"
            rows={1}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white transition-all hover:shadow-md disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {/* 코인 안내 */}
        <div className="mx-auto max-w-2xl px-4 pb-2">
          <p className="text-center text-[10px] text-gray-400">
            메시지 1회당 {COST_PER_TURN} 코인 · 잔액 {creditsBalance} 코인
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 메시지 버블 컴포넌트 ─────────────────────────────────────

function MessageBubble({
  message,
  personaName,
  personaImageUrl,
  colorBold,
  roleEmoji,
}: {
  message: ChatMessage
  personaName: string
  personaImageUrl: string | null
  colorBold: string
  roleEmoji: string
}) {
  const isUser = message.role === "USER"

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 text-sm text-white">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="mt-1 text-right text-[10px] text-gray-400">
            {formatTimeAgo(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colorBold} text-xs text-white`}
      >
        {personaImageUrl ? (
          <img
            src={personaImageUrl}
            alt={personaName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          roleEmoji || personaName.charAt(0)
        )}
      </div>
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="mt-1 text-[10px] text-gray-400">{formatTimeAgo(message.createdAt)}</p>
      </div>
    </div>
  )
}
