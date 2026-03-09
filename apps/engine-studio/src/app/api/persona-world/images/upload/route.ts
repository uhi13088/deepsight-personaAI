import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { verifyInternalToken } from "@/lib/internal-auth"

// ── 설정 ─────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DIMENSION = 4096
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "images")

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
])

// 매직 바이트 검증 (파일 타입 위조 방지)
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
}

// ── POST /api/persona-world/images/upload ────────────────────

/**
 * 이미지 업로드 엔드포인트.
 * multipart/form-data로 이미지를 수신하고, 로컬 스토리지에 저장 후 URL을 반환.
 *
 * Response: { success: true, data: { url, width, height, fileSize } }
 */
export async function POST(request: NextRequest) {
  // 인증 확인 (null = 성공, NextResponse = 실패)
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get("image")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "이미지 파일이 필요합니다." } },
        { status: 400 }
      )
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `파일 크기가 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다.`,
          },
        },
        { status: 400 }
      )
    }

    // MIME 타입 검증
    const ext = ALLOWED_MIME_TYPES.get(file.type)
    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FORMAT",
            message: `지원하지 않는 이미지 포맷: ${file.type}. 허용: JPEG, PNG, GIF, WebP`,
          },
        },
        { status: 400 }
      )
    }

    // 파일 바이트 읽기
    const buffer = Buffer.from(await file.arrayBuffer())

    // 매직 바이트 검증 (파일 타입 위조 방지)
    const expectedMagic = MAGIC_BYTES[file.type]
    if (expectedMagic) {
      const matches = expectedMagic.every((byte, i) => buffer[i] === byte)
      if (!matches) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_FILE",
              message: "파일 내용이 선언된 이미지 포맷과 일치하지 않습니다.",
            },
          },
          { status: 400 }
        )
      }
    }

    // 이미지 해상도 추출 (간이 파서 — 라이브러리 의존 없이)
    const dimensions = extractDimensions(buffer, file.type)

    if (dimensions && (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DIMENSION_TOO_LARGE",
            message: `이미지 해상도가 ${MAX_DIMENSION}x${MAX_DIMENSION}을 초과합니다.`,
          },
        },
        { status: 400 }
      )
    }

    // UUID 파일명 생성 (원본 파일명 노출 방지)
    const fileName = `${crypto.randomUUID()}${ext}`
    const datePath = getDatePath() // YYYY/MM/DD 하위 디렉토리
    const fullDir = path.join(UPLOAD_DIR, datePath)
    const filePath = path.join(fullDir, fileName)

    // 디렉토리 생성 + 파일 저장
    await mkdir(fullDir, { recursive: true })
    await writeFile(filePath, buffer)

    // 상대 URL 반환 (프론트엔드에서 사용)
    const url = `/uploads/images/${datePath}/${fileName}`

    return NextResponse.json({
      success: true,
      data: {
        url,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        fileSize: file.size,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "이미지 업로드에 실패했습니다."
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

function getDatePath(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}/${m}/${d}`
}

/**
 * 이미지 바이트에서 해상도를 추출 (간이 파서).
 * JPEG: SOF0/SOF2 마커, PNG: IHDR 청크.
 */
function extractDimensions(
  buffer: Buffer,
  mimeType: string
): { width: number; height: number } | null {
  try {
    if (mimeType === "image/png" && buffer.length >= 24) {
      // PNG: IHDR는 offset 16에 width(4), offset 20에 height(4)
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return { width, height }
    }

    if (mimeType === "image/jpeg") {
      // JPEG: SOF0 (0xFFC0) 또는 SOF2 (0xFFC2) 마커 탐색
      let offset = 2
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break
        const marker = buffer[offset + 1]
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5)
          const width = buffer.readUInt16BE(offset + 7)
          return { width, height }
        }
        const segmentLength = buffer.readUInt16BE(offset + 2)
        offset += 2 + segmentLength
      }
    }

    // GIF: offset 6에 width(2LE), offset 8에 height(2LE)
    if (mimeType === "image/gif" && buffer.length >= 10) {
      const width = buffer.readUInt16LE(6)
      const height = buffer.readUInt16LE(8)
      return { width, height }
    }

    return null
  } catch {
    return null
  }
}
