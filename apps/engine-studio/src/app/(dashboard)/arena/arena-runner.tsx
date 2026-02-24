"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import type { PersonaOption, ArenaMode, ProfileLevel } from "./arena-session-list"
import { PROFILE_LEVELS } from "./arena-session-list"

// ── PersonaSelector ─────────────────────────────────────────

export function PersonaSelector({
  label,
  value,
  excludeIds,
  onChange,
}: {
  label: string
  value: PersonaOption | null
  excludeIds?: string[]
  onChange: (persona: PersonaOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<PersonaOption[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: "20" })
        if (query.trim()) params.set("search", query.trim())
        const res = await fetch(`/api/internal/personas?${params}`)
        const json = (await res.json()) as {
          success: boolean
          data?: { personas: PersonaOption[] }
        }
        if (json.success && json.data) {
          setOptions(
            json.data.personas
              .filter((p) => !(excludeIds ?? []).includes(p.id))
              .map((p) => ({
                id: p.id,
                name: p.name,
                role: p.role ?? null,
                profileImageUrl: p.profileImageUrl ?? null,
              }))
          )
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [query, open, excludeIds])

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  if (value && !open) {
    return (
      <div ref={containerRef}>
        <label className="text-muted-foreground mb-1 block text-xs">{label}</label>
        <button
          type="button"
          className="bg-background flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:border-blue-400"
          onClick={() => {
            setOpen(true)
            setQuery("")
          }}
        >
          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {initials(value.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            {value.role && <p className="text-muted-foreground truncate text-xs">{value.role}</p>}
          </div>
          <span className="text-muted-foreground text-xs">변경</span>
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-muted-foreground mb-1 block text-xs">{label}</label>
      <input
        type="text"
        className="bg-background w-full rounded-lg border px-3 py-2.5 text-sm placeholder:text-gray-400"
        placeholder="페르소나 이름으로 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg">
          {loading && <p className="text-muted-foreground px-3 py-2 text-xs">검색 중...</p>}
          {!loading && options.length === 0 && (
            <p className="text-muted-foreground px-3 py-2 text-xs">
              {query ? "검색 결과 없음" : "페르소나가 없습니다"}
            </p>
          )}
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left transition"
              onClick={() => {
                onChange(p)
                setOpen(false)
                setQuery("")
              }}
            >
              <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                {initials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}</p>
                {p.role && <p className="text-muted-foreground truncate text-xs">{p.role}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Session Creation Form ───────────────────────────────────

export interface ArenaFormState {
  arenaMode: ArenaMode
  personaA: PersonaOption | null
  personaB: PersonaOption | null
  extraPersonas: (PersonaOption | null)[]
  topic: string
  maxTurns: number
  budgetTokens: number
  profileLoadLevel: ProfileLevel
}

export function ArenaCreationForm({
  form,
  onFormChange,
  onCreate,
  creating,
  createError,
}: {
  form: ArenaFormState
  onFormChange: (updater: (prev: ArenaFormState) => ArenaFormState) => void
  onCreate: () => void
  creating: boolean
  createError: string | null
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    arenaMode,
    personaA,
    personaB,
    extraPersonas,
    topic,
    maxTurns,
    budgetTokens,
    profileLoadLevel,
  } = form

  const allSelectedIds = [personaA?.id, personaB?.id, ...extraPersonas.map((p) => p?.id)].filter(
    Boolean
  ) as string[]

  return (
    <div className="rounded-lg border p-5">
      <h3 className="mb-4 text-sm font-semibold">새 아레나 세션</h3>

      {/* 모드 선택 */}
      <div className="mb-4">
        <label className="text-muted-foreground mb-2 block text-xs">아레나 모드</label>
        <div className="flex gap-2">
          {(["1v1", "1vN"] as ArenaMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() =>
                onFormChange((prev) => ({
                  ...prev,
                  arenaMode: m,
                  extraPersonas: [null],
                }))
              }
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                arenaMode === m
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "hover:border-gray-400"
              }`}
            >
              {m === "1v1" ? "1 : 1  스파링" : "1 : N  다자 대결"}
            </button>
          ))}
        </div>
      </div>

      {/* 참가자 선택 */}
      {arenaMode === "1v1" ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <PersonaSelector
            label="참가자 A"
            value={personaA}
            excludeIds={allSelectedIds.filter((id) => id !== personaA?.id)}
            onChange={(v) => onFormChange((prev) => ({ ...prev, personaA: v }))}
          />
          <div className="hidden items-end justify-center pb-2 sm:flex">
            <span className="text-muted-foreground text-lg font-bold">VS</span>
          </div>
          <PersonaSelector
            label="참가자 B"
            value={personaB}
            excludeIds={allSelectedIds.filter((id) => id !== personaB?.id)}
            onChange={(v) => onFormChange((prev) => ({ ...prev, personaB: v }))}
          />
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          <PersonaSelector
            label="호스트 (주인공)"
            value={personaA}
            excludeIds={allSelectedIds.filter((id) => id !== personaA?.id)}
            onChange={(v) => onFormChange((prev) => ({ ...prev, personaA: v }))}
          />
          <div className="space-y-2 border-l-2 border-blue-500/30 pl-4">
            <p className="text-muted-foreground text-xs">상대방 (최대 4명)</p>
            <PersonaSelector
              label="상대방 1"
              value={personaB}
              excludeIds={allSelectedIds.filter((id) => id !== personaB?.id)}
              onChange={(v) => onFormChange((prev) => ({ ...prev, personaB: v }))}
            />
            {extraPersonas.map((p, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <PersonaSelector
                    label={`상대방 ${idx + 2}`}
                    value={p}
                    excludeIds={allSelectedIds.filter((id) => id !== p?.id)}
                    onChange={(selected) => {
                      onFormChange((prev) => ({
                        ...prev,
                        extraPersonas: prev.extraPersonas.map((ep, i) =>
                          i === idx ? selected : ep
                        ),
                      }))
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onFormChange((prev) => ({
                      ...prev,
                      extraPersonas: prev.extraPersonas.filter((_, i) => i !== idx),
                    }))
                  }
                  className="text-muted-foreground hover:text-foreground mb-2.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {extraPersonas.length < 3 && (
              <button
                type="button"
                onClick={() =>
                  onFormChange((prev) => ({
                    ...prev,
                    extraPersonas: [...prev.extraPersonas, null],
                  }))
                }
                className="text-muted-foreground hover:text-foreground text-xs hover:underline"
              >
                + 상대방 추가
              </button>
            )}
          </div>
        </div>
      )}

      {/* VS 배너 */}
      {personaA && personaB && (
        <div className="bg-muted/50 mb-4 flex items-center justify-center gap-3 rounded-lg py-2 text-sm">
          <span className="font-medium">{personaA.name}</span>
          <span className="text-muted-foreground text-xs">{arenaMode === "1v1" ? "vs" : "vs"}</span>
          <span className="font-medium">{personaB.name}</span>
          {arenaMode === "1vN" && extraPersonas.filter(Boolean).length > 0 && (
            <span className="text-muted-foreground text-xs">
              +{" "}
              {extraPersonas
                .filter(Boolean)
                .map((p) => p?.name)
                .join(", ")}
            </span>
          )}
        </div>
      )}

      {/* 주제 */}
      <div className="mb-4">
        <label className="text-muted-foreground mb-1 block text-xs">토론 주제</label>
        <input
          type="text"
          className="bg-background w-full rounded-lg border px-3 py-2.5 text-sm"
          value={topic}
          onChange={(e) => onFormChange((prev) => ({ ...prev, topic: e.target.value }))}
          placeholder="예: AI가 인간의 창의성을 대체할 수 있는가?"
        />
      </div>

      {/* 프로필 로드 수준 */}
      <div className="mb-4">
        <label className="text-muted-foreground mb-2 block text-xs">프로필 로드 수준</label>
        <div className="grid grid-cols-3 gap-2">
          {PROFILE_LEVELS.map((pl) => (
            <button
              key={pl.key}
              type="button"
              className={`rounded-lg border p-3 text-left transition ${
                profileLoadLevel === pl.key
                  ? "border-blue-500 bg-blue-500/5"
                  : "hover:border-gray-400"
              }`}
              onClick={() => onFormChange((prev) => ({ ...prev, profileLoadLevel: pl.key }))}
            >
              <p className="text-sm font-medium">{pl.label}</p>
              <p className="text-muted-foreground text-xs">
                {pl.desc} ({pl.tokens} tok)
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 고급 설정 */}
      <div className="mb-4">
        <button
          type="button"
          className="text-muted-foreground text-xs hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "- 고급 설정 닫기" : "+ 고급 설정"}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">최대 턴</label>
              <input
                type="number"
                className="bg-background w-full rounded-lg border px-3 py-2 text-sm"
                value={maxTurns}
                onChange={(e) =>
                  onFormChange((prev) => ({ ...prev, maxTurns: Number(e.target.value) }))
                }
                min={2}
                max={20}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">예산 (토큰)</label>
              <input
                type="number"
                className="bg-background w-full rounded-lg border px-3 py-2 text-sm"
                value={budgetTokens}
                onChange={(e) =>
                  onFormChange((prev) => ({
                    ...prev,
                    budgetTokens: Number(e.target.value),
                  }))
                }
                min={1000}
                step={1000}
              />
            </div>
          </div>
        )}
      </div>

      {createError && <p className="mb-3 text-sm text-red-500">{createError}</p>}

      <button
        type="button"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
        onClick={onCreate}
        disabled={creating || !personaA || !personaB}
      >
        {creating ? "생성 중..." : "세션 생성"}
      </button>
    </div>
  )
}
