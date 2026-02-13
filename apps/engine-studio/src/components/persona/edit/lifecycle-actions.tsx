"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAvailableActions, ACTION_LABELS, DANGEROUS_ACTIONS } from "@/lib/lifecycle"
import type { LifecycleAction } from "@/lib/lifecycle"
import type { PersonaStatus } from "@/generated/prisma"
import type { ApiResponse, LifecycleTransitionResponse } from "@/types"

interface LifecycleActionsProps {
  personaId: string
  status: string
  onTransition: () => void
}

const ACTION_VARIANTS: Partial<
  Record<LifecycleAction, "default" | "destructive" | "outline" | "secondary">
> = {
  APPROVE: "default",
  SUBMIT_REVIEW: "default",
  RESUME: "default",
  REJECT: "outline",
  ARCHIVE: "destructive",
  DEPRECATE: "destructive",
}

export function LifecycleActions({ personaId, status, onTransition }: LifecycleActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const actions = getAvailableActions(status as PersonaStatus)

  if (actions.length === 0) return null

  const handleAction = async (action: LifecycleAction) => {
    if (DANGEROUS_ACTIONS.has(action)) {
      const confirmed = window.confirm(
        `'${ACTION_LABELS[action]}' 작업을 실행하시겠습니까? 이 작업은 되돌리기 어려울 수 있습니다.`
      )
      if (!confirmed) return
    }

    setLoading(action)
    setError(null)

    try {
      const response = await fetch(`/api/internal/personas/${personaId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const result: ApiResponse<LifecycleTransitionResponse> = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message ?? "상태 전이 실패")
      }

      onTransition()
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">라이프사이클 관리</h4>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            variant={ACTION_VARIANTS[action] ?? "secondary"}
            size="sm"
            disabled={loading !== null}
            onClick={() => handleAction(action)}
          >
            {loading === action && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {ACTION_LABELS[action]}
          </Button>
        ))}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
