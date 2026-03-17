// ═══════════════════════════════════════════════════════════════
// Cloudflare R2 스토리지 클라이언트
// T445: 프로필 이미지 → R2 업로드 (S3 호환 API)
// ═══════════════════════════════════════════════════════════════

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import crypto from "crypto"

// ── 설정 확인 ──────────────────────────────────────────────────

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  )
}

// ── S3 클라이언트 싱글턴 ───────────────────────────────────────

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

// ── 업로드 ─────────────────────────────────────────────────────

function getDatePath(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}/${month}/${day}`
}

export interface R2UploadResult {
  /** 공개 접근 URL */
  publicUrl: string
  /** R2 내 오브젝트 키 */
  key: string
}

/**
 * 이미지 URL에서 다운로드 → R2에 업로드 → 공개 URL 반환
 */
export async function uploadImageToR2(imageUrl: string): Promise<R2UploadResult> {
  // 이미지 다운로드
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get("content-type") ?? "image/webp"

  // 오브젝트 키 생성
  const datePath = getDatePath()
  const uuid = crypto.randomUUID()
  const ext = contentType.includes("png") ? "png" : contentType.includes("jpeg") ? "jpg" : "webp"
  const key = `profile-images/${datePath}/${uuid}.${ext}`

  // R2 업로드
  const client = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  const publicUrl = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`

  console.log(`[R2] Uploaded: ${key} (${buffer.length} bytes)`)
  return { publicUrl, key }
}

/** 테스트 전용: 싱글턴 클라이언트 리셋 */
export function _resetClientForTest(): void {
  s3Client = null
}
