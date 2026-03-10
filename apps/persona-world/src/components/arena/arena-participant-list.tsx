"use client"

import { cn } from "@/lib/utils"

interface PersonaInfo {
  id: string
  name: string
  avatarUrl?: string
  role?: string
}

interface ArenaParticipantListProps {
  personas: PersonaInfo[]
  className?: string
}

export function ArenaParticipantList({ personas, className }: ArenaParticipantListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">참여자</h4>
      <div className="flex flex-wrap gap-2">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[10px] font-bold text-white">
              {persona.name.charAt(0)}
            </div>
            <span className="text-xs font-medium text-gray-700">{persona.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
