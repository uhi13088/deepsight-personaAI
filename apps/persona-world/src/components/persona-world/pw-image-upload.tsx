"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import { ImagePlus, X, AlertCircle, Loader2 } from "lucide-react"

// ── 설정 ─────────────────────────────────────────────────────

const MAX_IMAGES = 4
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif"

// ── 타입 ─────────────────────────────────────────────────────

export interface UploadedImage {
  /** 업로드 완료 후 서버에서 반환한 URL */
  url: string
  /** 로컬 프리뷰 URL (blob:) */
  previewUrl: string
  /** 원본 파일명 */
  fileName: string
}

interface ImageUploadState {
  file: File
  previewUrl: string
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  url?: string
  error?: string
}

interface PWImageUploadProps {
  /** 업로드 완료된 이미지 URL 목록 변경 콜백 */
  onImagesChange: (images: UploadedImage[]) => void
  /** 업로드 엔드포인트 (기본: /api/persona-world/images/upload) */
  uploadEndpoint?: string
  /** 현재 업로드 중 여부 (부모에게 알림) */
  onUploadingChange?: (uploading: boolean) => void
}

// ── 컴포넌트 ─────────────────────────────────────────────────

export function PWImageUpload({
  onImagesChange,
  uploadEndpoint = "/api/persona-world/images/upload",
  onUploadingChange,
}: PWImageUploadProps) {
  const [images, setImages] = useState<ImageUploadState[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 완료된 이미지 목록 → 부모에게 전달
  const notifyParent = useCallback(
    (items: ImageUploadState[]) => {
      const completed: UploadedImage[] = items
        .filter((img) => img.status === "done" && img.url)
        .map((img) => ({
          url: img.url!,
          previewUrl: img.previewUrl,
          fileName: img.file.name,
        }))
      onImagesChange(completed)
      onUploadingChange?.(items.some((img) => img.status === "uploading"))
    },
    [onImagesChange, onUploadingChange]
  )

  // 파일 검증
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return `지원하지 않는 형식입니다. (${ACCEPTED_TYPES.map((t) => t.split("/")[1]).join(", ")}만 가능)`
      }
      if (file.size > MAX_FILE_SIZE) {
        return `파일 크기가 너무 큽니다. (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`
      }
      if (images.length >= MAX_IMAGES) {
        return `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`
      }
      return null
    },
    [images.length]
  )

  // 업로드 실행
  const uploadFile = useCallback(
    async (imageState: ImageUploadState, index: number, currentImages: ImageUploadState[]) => {
      const formData = new FormData()
      formData.append("file", imageState.file)

      try {
        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`업로드 실패 (${response.status})`)
        }

        const result = (await response.json()) as {
          success: boolean
          data?: { url: string }
          error?: { message: string }
        }

        if (!result.success || !result.data?.url) {
          throw new Error(result.error?.message ?? "업로드에 실패했습니다.")
        }

        const updated = [...currentImages]
        updated[index] = {
          ...updated[index],
          status: "done",
          progress: 100,
          url: result.data.url,
        }
        setImages(updated)
        notifyParent(updated)
      } catch (err) {
        const updated = [...currentImages]
        updated[index] = {
          ...updated[index],
          status: "error",
          error: err instanceof Error ? err.message : "업로드에 실패했습니다.",
        }
        setImages(updated)
        notifyParent(updated)
      }
    },
    [uploadEndpoint, notifyParent]
  )

  // 파일 추가 처리
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const remaining = MAX_IMAGES - images.length
      const toAdd = fileArray.slice(0, remaining)

      const newImages: ImageUploadState[] = []
      const errors: string[] = []

      for (const file of toAdd) {
        const error = validateFile(file)
        if (error) {
          errors.push(`${file.name}: ${error}`)
          continue
        }
        newImages.push({
          file,
          previewUrl: URL.createObjectURL(file),
          status: "uploading",
          progress: 0,
        })
      }

      if (errors.length > 0) {
        // 에러가 있으면 첫 번째만 표시 (UI 깔끔하게)
        console.warn("[PWImageUpload]", errors.join("; "))
      }

      if (newImages.length === 0) return

      const updated = [...images, ...newImages]
      setImages(updated)
      onUploadingChange?.(true)

      // 각 파일 업로드 시작
      const startIndex = images.length
      newImages.forEach((img, i) => {
        void uploadFile(img, startIndex + i, updated)
      })
    },
    [images, validateFile, uploadFile, onUploadingChange]
  )

  // 이미지 삭제
  const removeImage = useCallback(
    (index: number) => {
      const updated = images.filter((_, i) => i !== index)
      // Blob URL 해제
      URL.revokeObjectURL(images[index].previewUrl)
      setImages(updated)
      notifyParent(updated)
    },
    [images, notifyParent]
  )

  // 드래그앤드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files)
        // input 초기화 (같은 파일 재선택 가능)
        e.target.value = ""
      }
    },
    [addFiles]
  )

  return (
    <div className="space-y-2">
      {/* 이미지 첨부 버튼 */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={images.length >= MAX_IMAGES}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ImagePlus className="h-4 w-4" />
        <span>이미지 {images.length > 0 ? `(${images.length}/${MAX_IMAGES})` : ""}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 드래그앤드롭 영역 (이미지가 없을 때만 표시) */}
      {images.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            dragOver ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <ImagePlus className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-1 text-xs text-gray-400">
            이미지를 드래그하거나 클릭하여 첨부 (최대 {MAX_IMAGES}장, 5MB 이하)
          </p>
        </div>
      )}

      {/* 이미지 프리뷰 */}
      {images.length > 0 && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(images.length, 4)}, 1fr)`,
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {images.map((img, index) => (
            <div
              key={img.previewUrl}
              className="group relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={img.previewUrl}
                alt={img.file.name}
                fill
                className="object-cover"
                sizes="25vw"
              />

              {/* 업로드 중 오버레이 */}
              {img.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}

              {/* 에러 오버레이 */}
              {img.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/60 p-2">
                  <AlertCircle className="h-5 w-5 text-red-200" />
                  <span className="text-center text-[10px] leading-tight text-red-100">
                    {img.error}
                  </span>
                </div>
              )}

              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 포맷/크기 안내 */}
      {images.length > 0 && images.length < MAX_IMAGES && (
        <p className="text-[10px] text-gray-400">
          + 이미지를 더 추가할 수 있습니다 ({MAX_IMAGES - images.length}장 남음)
        </p>
      )}
    </div>
  )
}
