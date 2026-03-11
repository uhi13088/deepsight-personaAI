"use client"

import { cn } from "@/lib/utils"

interface Turn {
  id: string
  roundNumber: number
  speakerId: string
  content: string
  createdAt: string
}

interface PersonaInfo {
  id: string
  name: string
  avatarUrl?: string
}

interface ArenaChatProps {
  turns: Turn[]
  personas: Map<string, PersonaInfo>
  currentRound: number
  className?: string
}

const PERSONA_COLORS = [
  "bg-blue-50 border-blue-200",
  "bg-purple-50 border-purple-200",
  "bg-emerald-50 border-emerald-200",
  "bg-amber-50 border-amber-200",
  "bg-rose-50 border-rose-200",
  "bg-cyan-50 border-cyan-200",
  "bg-indigo-50 border-indigo-200",
  "bg-orange-50 border-orange-200",
]

export function ArenaChat({ turns, personas, currentRound, className }: ArenaChatProps) {
  // 페르소나별 색상 매핑
  const colorMap = new Map<string, string>()
  let colorIdx = 0
  for (const id of personas.keys()) {
    colorMap.set(id, PERSONA_COLORS[colorIdx % PERSONA_COLORS.length])
    colorIdx++
  }

  // 라운드별 그룹
  const rounds = new Map<number, Turn[]>()
  for (const turn of turns) {
    const existing = rounds.get(turn.roundNumber) ?? []
    existing.push(turn)
    rounds.set(turn.roundNumber, existing)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {Array.from(rounds.entries())
        .sort(([a], [b]) => a - b)
        .map(([roundNum, roundTurns]) => (
          <div key={roundNum}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="px-2 text-xs font-medium text-gray-400">라운드 {roundNum}</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-3">
              {roundTurns.map((turn) => {
                const persona = personas.get(turn.speakerId)
                const color = colorMap.get(turn.speakerId) ?? PERSONA_COLORS[0]

                return (
                  <div key={turn.id} className={cn("rounded-xl border p-4", color)}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {persona?.name ?? turn.speakerId}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {turn.content}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

      {currentRound === 0 && turns.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          토론이 아직 시작되지 않았습니다
        </div>
      )}
    </div>
  )
}
