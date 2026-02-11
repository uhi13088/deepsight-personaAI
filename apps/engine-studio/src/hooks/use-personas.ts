"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { PersonaFilterState } from "@/components/persona/persona-filters"
import type { ApiResponse, PersonaListResponse, PaginationMeta } from "@/types"

interface UsePersonasReturn {
  data: PersonaListResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

function buildQueryString(filters: PersonaFilterState): string {
  const params = new URLSearchParams()

  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  params.set("sort", filters.sort)
  params.set("order", filters.order)

  if (filters.search) {
    params.set("search", filters.search)
  }
  if (filters.status !== "all") {
    params.set("status", filters.status)
  }
  if (filters.archetypeIds.length > 0) {
    params.set("archetype", filters.archetypeIds.join(","))
  }
  if (filters.paradoxRange[0] > 0) {
    params.set("paradoxMin", String(filters.paradoxRange[0]))
  }
  if (filters.paradoxRange[1] < 1) {
    params.set("paradoxMax", String(filters.paradoxRange[1]))
  }
  if (Object.keys(filters.vectorFilters).length > 0) {
    params.set("vectorFilters", JSON.stringify(filters.vectorFilters))
  }
  if (filters.crossAxisFilters.length > 0) {
    params.set("crossAxisFilters", JSON.stringify(filters.crossAxisFilters))
  }

  return params.toString()
}

const EMPTY_PAGINATION: PaginationMeta = {
  currentPage: 1,
  totalPages: 0,
  totalCount: 0,
  hasNext: false,
  hasPrev: false,
}

export function usePersonas(filters: PersonaFilterState): UsePersonasReturn {
  const [data, setData] = useState<PersonaListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchPersonas = useCallback(async () => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const queryString = buildQueryString(filters)
      const response = await fetch(`/api/internal/personas?${queryString}`, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result: ApiResponse<PersonaListResponse> = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? "Failed to fetch personas")
      }

      setData(result.data)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      setData({
        personas: [],
        pagination: EMPTY_PAGINATION,
        filterStats: { totalMatched: 0, statusDistribution: {} },
      })
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [filters])

  useEffect(() => {
    fetchPersonas()
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [fetchPersonas])

  return { data, isLoading, error, refetch: fetchPersonas }
}
