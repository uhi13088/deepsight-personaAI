"use client"

import { useState, useEffect } from "react"

export interface ArchetypeOption {
  id: string
  label: string
}

interface UseArchetypesReturn {
  archetypes: ArchetypeOption[]
  archetypeMap: Record<string, string>
  isLoading: boolean
}

/**
 * DB에서 아키타입 목록을 동적으로 가져오는 훅.
 * /api/internal/user-insight/archetype GET → archetypes[].id, nameKo
 */
export function useArchetypes(): UseArchetypesReturn {
  const [archetypes, setArchetypes] = useState<ArchetypeOption[]>([])
  const [archetypeMap, setArchetypeMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch("/api/internal/user-insight/archetype")
      .then((r) => r.json())
      .then(
        (json: {
          success: boolean
          data?: {
            archetypes: Array<{ id: string; name: string; nameKo: string }>
          }
        }) => {
          if (cancelled) return
          if (json.success && json.data) {
            const list = json.data.archetypes.map((a) => ({
              id: a.id,
              label: a.nameKo || a.name,
            }))
            setArchetypes(list)

            const map: Record<string, string> = {}
            for (const a of list) {
              map[a.id] = a.label
            }
            setArchetypeMap(map)
          }
        }
      )
      .catch(() => {
        // 실패 시 빈 배열 유지
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { archetypes, archetypeMap, isLoading }
}
