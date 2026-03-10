"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"

interface PersonaInfo {
  id: string
  name: string
}

interface ArenaVotePanelProps {
  personas: PersonaInfo[]
  selectedPersonaId: string | null
  onVote: (personaId: string) => void
  disabled?: boolean
  className?: string
}

export function ArenaVotePanel({
  personas,
  selectedPersonaId,
  onVote,
  disabled = false,
  className,
}: ArenaVotePanelProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-semibold text-gray-700">누가 더 설득력 있었나요?</h4>
      <div className="flex flex-wrap gap-2">
        {personas.map((persona) => {
          const isSelected = selectedPersonaId === persona.id
          return (
            <button
              key={persona.id}
              onClick={() => onVote(persona.id)}
              disabled={disabled}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                "border",
                isSelected
                  ? "border-violet-500 bg-violet-500 text-white shadow-md"
                  : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50",
                disabled && !isSelected && "cursor-not-allowed opacity-50"
              )}
            >
              {persona.name}
            </button>
          )
        })}
      </div>
      {selectedPersonaId && (
        <p className="text-xs text-violet-500">
          {personas.find((p) => p.id === selectedPersonaId)?.name}에게 투표했습니다
        </p>
      )}
    </div>
  )
}
