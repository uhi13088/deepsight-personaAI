"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Shuffle, ChevronDown, Loader2 } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { PersonaGrid } from "@/components/persona/persona-grid"
import { PersonaFilters, DEFAULT_FILTERS } from "@/components/persona/persona-filters"
import type { PersonaFilterState } from "@/components/persona/persona-filters"
import { PersonaPagination } from "@/components/persona/persona-pagination"
import { usePersonas } from "@/hooks/use-personas"
import { ARCHETYPE_LABELS } from "@/constants/v3/interpretation-tables"

const ARCHETYPE_OPTIONS = Object.entries(ARCHETYPE_LABELS).map(([id, label]) => ({
  id,
  label,
}))

export default function PersonaListPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<PersonaFilterState>(DEFAULT_FILTERS)
  const { data, isLoading, error, refetch } = usePersonas(filters)

  // 랜덤 생성 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [showArchetypeMenu, setShowArchetypeMenu] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 삭제 확인 다이얼로그 상태
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleFiltersChange = useCallback((next: PersonaFilterState) => {
    setFilters(next)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleLimitChange = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  const handleRandomGenerate = useCallback(
    async (archetypeId?: string) => {
      setIsGenerating(true)
      setGenerateError(null)
      setShowArchetypeMenu(false)

      try {
        const res = await fetch("/api/internal/personas/generate-random", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archetypeId }),
        })

        const json = await res.json()

        if (!json.success) {
          setGenerateError(json.error?.message ?? "생성에 실패했습니다.")
          return
        }

        // 목록 새로고침 후 수정 페이지로 이동
        refetch()
        router.push(`/persona-studio/edit/${json.data.id}`)
      } catch {
        setGenerateError("네트워크 오류가 발생했습니다.")
      } finally {
        setIsGenerating(false)
      }
    },
    [refetch, router]
  )

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name })
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/internal/personas/${deleteTarget.id}`, {
        method: "DELETE",
      })

      const json = await res.json()

      if (!json.success) {
        setGenerateError(json.error?.message ?? "삭제에 실패했습니다.")
      } else {
        refetch()
      }
    } catch {
      setGenerateError("네트워크 오류가 발생했습니다.")
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, refetch])

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  return (
    <>
      <Header title="Persona List" description="페르소나 목록 조회 및 관리" />

      <div className="space-y-6 p-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">페르소나 관리</h2>
          <div className="flex items-center gap-2">
            {/* 랜덤 생성 버튼 (드롭다운) */}
            <div className="relative">
              <div className="flex">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRandomGenerate()}
                  disabled={isGenerating}
                  className="rounded-r-none"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Shuffle className="mr-1 h-4 w-4" />
                  )}
                  {isGenerating ? "생성 중..." : "랜덤 생성"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowArchetypeMenu((prev) => !prev)}
                  disabled={isGenerating}
                  className="rounded-l-none border-l-0 px-1.5"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* 아키타입 드롭다운 메뉴 */}
              {showArchetypeMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowArchetypeMenu(false)} />
                  <div className="border-border bg-popover absolute right-0 z-20 mt-1 w-56 rounded-md border py-1 shadow-lg">
                    <button
                      type="button"
                      className="text-popover-foreground hover:bg-accent w-full px-3 py-1.5 text-left text-sm"
                      onClick={() => handleRandomGenerate()}
                    >
                      완전 랜덤 (아키타입 없음)
                    </button>
                    <div className="border-border my-1 border-t" />
                    {ARCHETYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className="text-popover-foreground hover:bg-accent w-full px-3 py-1.5 text-left text-sm"
                        onClick={() => handleRandomGenerate(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 수동 생성 버튼 */}
            <Link href="/persona-studio/create">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />새 페르소나
              </Button>
            </Link>
          </div>
        </div>

        {/* 생성/삭제 에러 */}
        {generateError && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {generateError}
          </div>
        )}

        {/* Filters */}
        <PersonaFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalCount={data?.pagination.totalCount ?? 0}
        />

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            데이터를 불러오는 중 오류가 발생했습니다: {error}
          </div>
        )}

        {/* Grid */}
        <PersonaGrid
          personas={data?.personas ?? []}
          isLoading={isLoading}
          onDelete={handleDeleteRequest}
        />

        {/* Pagination */}
        {data && data.pagination.totalPages > 0 && (
          <PersonaPagination
            pagination={data.pagination}
            limit={filters.limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background mx-4 w-full max-w-sm rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold">페르소나 삭제</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              <strong className="text-foreground">{deleteTarget.name}</strong>을(를)
              삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  "삭제"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
