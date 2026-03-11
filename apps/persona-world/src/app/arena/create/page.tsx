"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/lib/user-store"
import { clientApi } from "@/lib/api"
import {
  ARENA_ROOM_CONFIGS,
  INVITE_TICKET_PRICES,
  ROUND_ADDON_PRICES,
  ROUND_ADDON_AMOUNT,
  REPLAY_SAVE_PRICE,
  calculateArenaCost,
} from "@deepsight/shared-types"
import type { ArenaRoomType, PWArenaCreateRequest } from "@deepsight/shared-types"

type Step = "room" | "personas" | "topic" | "options" | "confirm"

const ROOM_TYPES: ArenaRoomType[] = ["ROOM_1V1", "ROOM_PANEL", "ROOM_LARGE"]

export default function ArenaCreatePage() {
  const router = useRouter()
  const profile = useUserStore((s) => s.profile)
  const followedPersonas = useUserStore((s) => s.followedPersonas)
  const userId = profile?.id

  const [step, setStep] = useState<Step>("room")
  const [roomType, setRoomType] = useState<ArenaRoomType>("ROOM_1V1")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [extraRoundSets, setExtraRoundSets] = useState(0)
  const [saveReplay, setSaveReplay] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomConfig = ARENA_ROOM_CONFIGS[roomType]

  const costBreakdown = useMemo(() => {
    return calculateArenaCost({
      roomType,
      topic,
      participantIds: selectedPersonas,
      inviteTickets: { normal: selectedPersonas.length, premium: 0 },
      extraRoundSets,
      saveReplay,
    })
  }, [roomType, selectedPersonas.length, extraRoundSets, saveReplay, topic])

  const totalRounds = roomConfig.defaultRounds + extraRoundSets * ROUND_ADDON_AMOUNT
  const roundAddonPrice = ROUND_ADDON_PRICES[roomType]

  async function handleCreate() {
    if (!userId) return
    setCreating(true)
    setError(null)

    try {
      const result = await clientApi.createArenaSession({
        userId,
        roomType,
        topic,
        participantIds: selectedPersonas,
        inviteTickets: { normal: selectedPersonas.length, premium: 0 },
        extraRoundSets,
        saveReplay,
      })
      router.push(`/arena/${result.session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 생성 실패")
    } finally {
      setCreating(false)
    }
  }

  function togglePersona(personaId: string) {
    setSelectedPersonas((prev) => {
      if (prev.includes(personaId)) return prev.filter((id) => id !== personaId)
      if (prev.length >= roomConfig.maxParticipants) return prev
      return [...prev, personaId]
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            ← 뒤로
          </button>
          <h1 className="text-lg font-bold text-gray-900">토론방 만들기</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {/* Step 1: 방 유형 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">토론방 유형</h2>
          <div className="grid grid-cols-3 gap-2">
            {ROOM_TYPES.map((type) => {
              const config = ARENA_ROOM_CONFIGS[type]
              const isSelected = roomType === type
              return (
                <button
                  key={type}
                  onClick={() => {
                    setRoomType(type)
                    setSelectedPersonas([])
                  }}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    isSelected
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="mb-1 text-lg">🏟️</div>
                  <div className="text-xs font-semibold text-gray-800">{config.label}</div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {config.minParticipants}~{config.maxParticipants}명
                  </div>
                  <div className="mt-1 text-xs font-medium text-violet-600">
                    {config.roomPrice} 코인
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Step 2: 페르소나 선택 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            페르소나 초대 ({selectedPersonas.length}/{roomConfig.maxParticipants})
          </h2>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {(followedPersonas ?? []).map((persona) => {
              const isSelected = selectedPersonas.includes(persona.personaId)
              const isFull = selectedPersonas.length >= roomConfig.maxParticipants && !isSelected
              return (
                <button
                  key={persona.personaId}
                  onClick={() => togglePersona(persona.personaId)}
                  disabled={isFull}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-violet-500 bg-violet-50"
                      : isFull
                        ? "border-gray-100 bg-gray-50 opacity-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-xs font-bold text-white">
                    {persona.personaName.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-800">{persona.personaName}</div>
                    <div className="text-xs text-gray-400">{persona.personaName}</div>
                  </div>
                  {isSelected && <span className="text-sm text-violet-500">✓</span>}
                </button>
              )
            })}
            {(!followedPersonas || followedPersonas.length === 0) && (
              <p className="py-4 text-center text-sm text-gray-400">팔로우한 페르소나가 없습니다</p>
            )}
          </div>
        </section>

        {/* Step 3: 주제 입력 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">토론 주제</h2>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: AI가 인간의 창의성을 대체할 수 있을까?"
            className="h-20 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            maxLength={200}
          />
          <div className="mt-1 text-right text-xs text-gray-400">{topic.length}/200</div>
        </section>

        {/* Step 4: 옵션 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">옵션</h2>
          <div className="space-y-3">
            {/* 라운드 추가 */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
              <div>
                <div className="text-sm font-medium text-gray-800">
                  라운드 추가 (+{ROUND_ADDON_AMOUNT})
                </div>
                <div className="text-xs text-gray-400">
                  현재 {totalRounds}라운드 / {roundAddonPrice}코인씩
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExtraRoundSets(Math.max(0, extraRoundSets - 1))}
                  disabled={extraRoundSets === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 disabled:opacity-30"
                >
                  -
                </button>
                <span className="w-4 text-center text-sm font-semibold">{extraRoundSets}</span>
                <button
                  onClick={() => setExtraRoundSets(extraRoundSets + 1)}
                  disabled={totalRounds + ROUND_ADDON_AMOUNT > 20}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            {/* 리플레이 저장 */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
              <div>
                <div className="text-sm font-medium text-gray-800">리플레이 저장</div>
                <div className="text-xs text-gray-400">{REPLAY_SAVE_PRICE}코인</div>
              </div>
              <input
                type="checkbox"
                checked={saveReplay}
                onChange={(e) => setSaveReplay(e.target.checked)}
                className="rounded border-gray-300 text-violet-500 focus:ring-violet-500"
              />
            </label>
          </div>
        </section>

        {/* 비용 요약 */}
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">비용 요약</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>방 임대</span>
              <span>{costBreakdown.roomPrice} 코인</span>
            </div>
            {costBreakdown.inviteNormalPrice > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>초대권 ({selectedPersonas.length}장)</span>
                <span>{costBreakdown.inviteNormalPrice} 코인</span>
              </div>
            )}
            {costBreakdown.roundAddonPrice > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>라운드 추가 ({extraRoundSets}세트)</span>
                <span>{costBreakdown.roundAddonPrice} 코인</span>
              </div>
            )}
            {costBreakdown.replayPrice > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>리플레이 저장</span>
                <span>{costBreakdown.replayPrice} 코인</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
              <span>합계</span>
              <span>{costBreakdown.totalPrice} 코인</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          onClick={handleCreate}
          disabled={
            creating ||
            selectedPersonas.length < roomConfig.minParticipants ||
            topic.trim().length === 0
          }
          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "생성 중..." : `${costBreakdown.totalPrice}코인으로 토론 시작`}
        </button>
      </div>
    </div>
  )
}
