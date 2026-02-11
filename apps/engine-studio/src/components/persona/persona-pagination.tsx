"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PaginationMeta } from "@/types"

interface PersonaPaginationProps {
  pagination: PaginationMeta
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const LIMIT_OPTIONS = [10, 20, 50, 100]

export function PersonaPagination({
  pagination,
  limit,
  onPageChange,
  onLimitChange,
}: PersonaPaginationProps) {
  const { currentPage, totalPages, totalCount, hasNext, hasPrev } = pagination

  // Generate page numbers to display
  const pageNumbers: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)

  for (let i = start; i <= end; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span>총 {totalCount}개</span>
        <span>|</span>
        <span>
          {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalCount)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}개
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasPrev}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {start > 1 && (
            <>
              <Button variant="ghost" size="sm" className="h-8 w-8" onClick={() => onPageChange(1)}>
                1
              </Button>
              {start > 2 && <span className="text-muted-foreground px-1 text-xs">...</span>}
            </>
          )}

          {pageNumbers.map((num) => (
            <Button
              key={num}
              variant={num === currentPage ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8"
              onClick={() => onPageChange(num)}
            >
              {num}
            </Button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && (
                <span className="text-muted-foreground px-1 text-xs">...</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasNext}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
