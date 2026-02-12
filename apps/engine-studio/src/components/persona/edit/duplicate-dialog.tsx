"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ApiResponse } from "@/types"

interface DuplicateDialogProps {
  personaId: string
  personaName: string
  open: boolean
  onClose: () => void
  onDuplicated: (newId: string) => void
}

export function DuplicateDialog({
  personaId,
  personaName,
  open,
  onClose,
  onDuplicated,
}: DuplicateDialogProps) {
  const [newName, setNewName] = useState(`${personaName} (복사)`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleDuplicate = async () => {
    const trimmed = newName.trim()
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("이름은 2~30자여야 합니다.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/internal/personas/${personaId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: trimmed }),
      })

      const result: ApiResponse<{ id: string; name: string }> = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message ?? "복제 실패")
      }

      onDuplicated(result.data!.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border-border w-full max-w-md rounded-lg border p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">페르소나 복제</h3>

        <div className="mb-2">
          <p className="text-muted-foreground mb-3 text-sm">
            &quot;{personaName}&quot;의 모든 설정을 복사하여 새 페르소나를 만듭니다.
          </p>

          <label className="mb-1 block text-sm font-medium">새 이름</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 페르소나 이름"
            maxLength={30}
          />
        </div>

        {error && <p className="text-destructive mb-3 text-xs">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button size="sm" onClick={handleDuplicate} disabled={loading}>
            {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            복제
          </Button>
        </div>
      </div>
    </div>
  )
}
