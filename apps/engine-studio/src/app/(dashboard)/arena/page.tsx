"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ── 타입 ────────────────────────────────────────────────────

interface ArenaSessionSummary {
  id: string
  mode: string
  participantA: string
  participantB: string
  profileLoadLevel: string
  topic: string
  maxTurns: number
  budgetTokens: number
  usedTokens: number
  status: string
  createdAt: string
}

type CreateFormState = {
  participantA: string
  participantB: string
  topic: string
  maxTurns: number
  budgetTokens: number
  profileLoadLevel: "FULL" | "STANDARD" | "LITE"
}

const INITIAL_FORM: CreateFormState = {
  participantA: "",
  participantB: "",
  topic: "",
  maxTurns: 6,
  budgetTokens: 10000,
  profileLoadLevel: "STANDARD",
}

const PROFILE_DESCRIPTIONS = {
  FULL: "Full: 3-Layer + Voice + RAG (~3,200 tok)",
  STANDARD: "Standard: L1 + L2 + Voice (~1,800 tok)",
  LITE: "Lite: L1 + Stance (~600 tok)",
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function ArenaAdminPage() {
  const [sessions, setSessions] = useState<ArenaSessionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM)
  const [creating, setCreating] = useState(false)

  // 예산 현황
  const [budgetInfo, setBudgetInfo] = useState<{
    usedTokens: number
    budgetTokens: number
    usagePercent: number
    alertLevel: "normal" | "warning" | "blocked"
  } | null>(null)

  const fetchSessions = useCallback(async () => {
    // 세션 목록은 향후 GET API 추가 시 연동
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCreate = async () => {
    if (!form.participantA || !form.participantB || !form.topic) {
      setError("참가자 2명과 주제를 입력하세요.")
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/internal/arena/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const json = (await res.json()) as {
        success: boolean
        data?: { session: ArenaSessionSummary }
        error?: { message: string }
      }

      if (json.success && json.data) {
        setSessions((prev) => [json.data!.session, ...prev])
        setForm(INITIAL_FORM)
      } else {
        setError(json.error?.message ?? "세션 생성 실패")
      }
    } catch {
      setError("네트워크 오류")
    } finally {
      setCreating(false)
    }
  }

  // 예산 사용률에 따른 색상
  const budgetColor =
    budgetInfo?.alertLevel === "blocked"
      ? "text-red-500"
      : budgetInfo?.alertLevel === "warning"
        ? "text-yellow-500"
        : "text-green-500"

  return (
    <div className="flex flex-col gap-6">
      <Header title="아레나 관리" description="1:1 스파링 세션 생성 및 결과 리뷰" />

      {/* 예산 현황 (AC4) */}
      {budgetInfo && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-medium">월간 아레나 예산</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="bg-muted mb-1 h-2 rounded-full">
                <div
                  className={`h-2 rounded-full ${
                    budgetInfo.alertLevel === "blocked"
                      ? "bg-red-500"
                      : budgetInfo.alertLevel === "warning"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, budgetInfo.usagePercent)}%` }}
                />
              </div>
            </div>
            <span className={`font-mono text-sm ${budgetColor}`}>{budgetInfo.usagePercent}%</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {budgetInfo.usedTokens.toLocaleString()} / {budgetInfo.budgetTokens.toLocaleString()}{" "}
            tokens
          </p>
        </div>
      )}

      {/* 세션 생성 패널 (AC3) */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-medium">새 아레나 세션</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">참가자 A (ID)</label>
            <input
              type="text"
              className="bg-background w-full rounded border px-3 py-2 text-sm"
              value={form.participantA}
              onChange={(e) => setForm((f) => ({ ...f, participantA: e.target.value }))}
              placeholder="persona-id-1"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">참가자 B (ID)</label>
            <input
              type="text"
              className="bg-background w-full rounded border px-3 py-2 text-sm"
              value={form.participantB}
              onChange={(e) => setForm((f) => ({ ...f, participantB: e.target.value }))}
              placeholder="persona-id-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-muted-foreground mb-1 block text-xs">주제</label>
            <input
              type="text"
              className="bg-background w-full rounded border px-3 py-2 text-sm"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="영화 취향 토론"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">프로필 로드 수준</label>
            <select
              className="bg-background w-full rounded border px-3 py-2 text-sm"
              value={form.profileLoadLevel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  profileLoadLevel: e.target.value as "FULL" | "STANDARD" | "LITE",
                }))
              }
            >
              <option value="FULL">{PROFILE_DESCRIPTIONS.FULL}</option>
              <option value="STANDARD">{PROFILE_DESCRIPTIONS.STANDARD}</option>
              <option value="LITE">{PROFILE_DESCRIPTIONS.LITE}</option>
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-muted-foreground mb-1 block text-xs">최대 턴</label>
              <input
                type="number"
                className="bg-background w-full rounded border px-3 py-2 text-sm"
                value={form.maxTurns}
                onChange={(e) => setForm((f) => ({ ...f, maxTurns: Number(e.target.value) }))}
                min={2}
                max={20}
              />
            </div>
            <div className="flex-1">
              <label className="text-muted-foreground mb-1 block text-xs">예산 (토큰)</label>
              <input
                type="number"
                className="bg-background w-full rounded border px-3 py-2 text-sm"
                value={form.budgetTokens}
                onChange={(e) => setForm((f) => ({ ...f, budgetTokens: Number(e.target.value) }))}
                min={1000}
                step={1000}
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <Button className="mt-4" onClick={handleCreate} disabled={creating}>
          {creating ? "생성 중..." : "세션 생성"}
        </Button>
      </div>

      {/* 세션 목록 + 결과 리뷰 (AC3) */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-medium">세션 목록</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">로딩 중...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 세션이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded border p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.topic}</p>
                  <p className="text-muted-foreground text-xs">
                    {s.participantA} vs {s.participantB}
                  </p>
                </div>
                <Badge
                  variant={
                    s.status === "COMPLETED"
                      ? "default"
                      : s.status === "RUNNING"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {s.status}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {s.usedTokens.toLocaleString()} / {s.budgetTokens.toLocaleString()} tok
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
