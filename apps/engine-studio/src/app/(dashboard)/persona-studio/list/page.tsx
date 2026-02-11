"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { PersonaGrid } from "@/components/persona/persona-grid"
import { PersonaFilters, DEFAULT_FILTERS } from "@/components/persona/persona-filters"
import type { PersonaFilterState } from "@/components/persona/persona-filters"
import { PersonaPagination } from "@/components/persona/persona-pagination"
import { usePersonas } from "@/hooks/use-personas"

export default function PersonaListPage() {
  const [filters, setFilters] = useState<PersonaFilterState>(DEFAULT_FILTERS)
  const { data, isLoading, error } = usePersonas(filters)

  const handleFiltersChange = useCallback((next: PersonaFilterState) => {
    setFilters(next)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const handleLimitChange = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  return (
    <>
      <Header title="Persona List" description="페르소나 목록 조회 및 관리" />

      <div className="space-y-6 p-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">페르소나 관리</h2>
          <Link href="/persona-studio/create">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />새 페르소나
            </Button>
          </Link>
        </div>

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
        <PersonaGrid personas={data?.personas ?? []} isLoading={isLoading} />

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
    </>
  )
}
