"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react"

// ── 이미지 그리드 ─────────────────────────────────────────────

interface PWImageGridProps {
  imageUrls: string[]
}

/**
 * 이미지 포스트 그리드.
 *
 * 1장: 풀 너비
 * 2장: 2열
 * 3장: 2+1 (첫 행 2열, 둘째 행 1장 풀)
 * 4장: 2×2 그리드
 */
export function PWImageGrid({ imageUrls }: PWImageGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [errorSet, setErrorSet] = useState<Set<number>>(new Set())
  const [loadingSet, setLoadingSet] = useState<Set<number>>(
    () => new Set(imageUrls.map((_, i) => i))
  )

  const handleLoad = useCallback((index: number) => {
    setLoadingSet((prev) => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }, [])

  const handleError = useCallback((index: number) => {
    setErrorSet((prev) => new Set(prev).add(index))
    setLoadingSet((prev) => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }, [])

  const count = imageUrls.length
  if (count === 0) return null

  const gridClass =
    count === 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-2"
        : count === 3
          ? "grid-cols-2"
          : "grid-cols-2"

  return (
    <>
      <div className={`mt-3 grid gap-1.5 overflow-hidden rounded-xl ${gridClass}`}>
        {imageUrls.map((url, index) => {
          const isError = errorSet.has(index)
          const isLoading = loadingSet.has(index)
          // 3장일 때 마지막 이미지는 풀 너비
          const spanFull = count === 3 && index === 2

          return (
            <button
              key={url}
              onClick={() => !isError && setLightboxIndex(index)}
              className={`relative overflow-hidden bg-gray-100 ${
                spanFull ? "col-span-2" : ""
              } ${count === 1 ? "aspect-video" : "aspect-square"}`}
              disabled={isError}
            >
              {/* 로딩 스켈레톤 */}
              {isLoading && !isError && (
                <div className="absolute inset-0 animate-pulse bg-gray-200" />
              )}

              {/* 에러 폴백 */}
              {isError ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
                  <ImageOff className="h-8 w-8" />
                  <span className="text-xs">이미지를 불러올 수 없습니다</span>
                </div>
              ) : (
                <Image
                  src={url}
                  alt={`포스트 이미지 ${index + 1}`}
                  fill
                  sizes={count === 1 ? "100vw" : "50vw"}
                  className="object-cover transition-transform hover:scale-105"
                  loading="lazy"
                  onLoad={() => handleLoad(index)}
                  onError={() => handleError(index)}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* 라이트박스 */}
      {lightboxIndex !== null && (
        <ImageLightbox
          imageUrls={imageUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

// ── 라이트박스 ────────────────────────────────────────────────

interface ImageLightboxProps {
  imageUrls: string[]
  initialIndex: number
  onClose: () => void
}

function ImageLightbox({ imageUrls, initialIndex, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(initialIndex)
  const total = imageUrls.length

  const prev = useCallback(() => setCurrent((c) => (c > 0 ? c - 1 : total - 1)), [total])
  const next = useCallback(() => setCurrent((c) => (c < total - 1 ? c + 1 : 0)), [total])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>

      {/* 이미지 카운터 */}
      {total > 1 && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {current + 1} / {total}
        </div>
      )}

      {/* 이전/다음 네비게이션 */}
      {total > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* 메인 이미지 */}
      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={imageUrls[current]}
          alt={`이미지 ${current + 1}`}
          width={1200}
          height={800}
          className="max-h-[85vh] w-auto rounded-lg object-contain"
          priority
        />
      </div>
    </div>
  )
}
