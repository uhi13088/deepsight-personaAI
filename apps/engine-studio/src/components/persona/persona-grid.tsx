"use client"

import { PersonaCard } from "./persona-card"
import type { PersonaListItem } from "@/types"

interface PersonaGridProps {
  personas: PersonaListItem[]
  isLoading?: boolean
}

export function PersonaGrid({ personas, isLoading }: PersonaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-border bg-card h-48 animate-pulse rounded-lg border" />
        ))}
      </div>
    )
  }

  if (personas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">조건에 맞는 페르소나가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {personas.map((persona) => (
        <PersonaCard key={persona.id} persona={persona} />
      ))}
    </div>
  )
}
