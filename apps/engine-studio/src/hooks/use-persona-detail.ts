"use client"

import { useState, useEffect, useCallback } from "react"
import type { PersonaDetail, ApiResponse } from "@/types"

interface UsePersonaDetailResult {
  data: PersonaDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function usePersonaDetail(id: string): UsePersonaDetailResult {
  const [data, setData] = useState<PersonaDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/internal/personas/${id}`)
      const result: ApiResponse<PersonaDetail> = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message ?? "데이터를 불러올 수 없습니다.")
      }
      setData(result.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return { data, isLoading, error, refetch: fetchDetail }
}
