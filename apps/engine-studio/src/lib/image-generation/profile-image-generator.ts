// ═══════════════════════════════════════════════════════════════
// 프로필 이미지 생성기
// T441: FLUX.2 [pro]로 포토리얼리스틱 프로필 이미지 자동 생성
// ═══════════════════════════════════════════════════════════════

import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import {
  isImageGenerationConfigured,
  generateImageWithFlux,
} from "@/lib/image-generation/replicate-client"
import {
  buildProfileImagePrompt,
  buildQualityEnhancement,
  type ProfileImagePromptInput,
} from "@/lib/image-generation/prompt-builder"

// ── 설정 ──────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "images")
const IMAGE_WIDTH = 1024
const IMAGE_HEIGHT = 1024

// ── 타입 ──────────────────────────────────────────────────────

export interface GenerateProfileImageInput {
  gender: string
  nationality: string
  birthDate: Date
  role: string
  expertise: string[]
  personality: {
    extraversion: number
    agreeableness: number
    openness: number
    neuroticism: number
  }
}

export interface GenerateProfileImageResult {
  /** 로컬 저장 URL (예: /uploads/images/2026/03/11/{uuid}.webp) */
  profileImageUrl: string
  /** 사용된 모델 */
  model: string
}

// ── 헬퍼 ──────────────────────────────────────────────────────

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function getDatePath(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}/${month}/${day}`
}

async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  // 저장 경로 생성
  const datePath = getDatePath()
  const dir = path.join(UPLOAD_DIR, datePath)
  await mkdir(dir, { recursive: true })

  // UUID 기반 파일명
  const uuid = crypto.randomUUID()
  const filename = `${uuid}.webp`
  const filePath = path.join(dir, filename)

  await writeFile(filePath, buffer)

  // 상대 URL 반환
  return `/uploads/images/${datePath}/${filename}`
}

// ── 메인 함수 ─────────────────────────────────────────────────

/**
 * 페르소나 demographics로 포토리얼리스틱 프로필 이미지를 생성하고 로컬에 저장.
 * API 키 미설정이거나 생성 실패 시 null 반환 (파이프라인 중단 없음).
 */
export async function generateProfileImage(
  input: GenerateProfileImageInput
): Promise<GenerateProfileImageResult | null> {
  if (!isImageGenerationConfigured()) {
    console.log("[ImageGen] Skipping — REPLICATE_API_TOKEN not configured")
    return null
  }

  try {
    const age = calculateAge(input.birthDate)

    const promptInput: ProfileImagePromptInput = {
      gender: input.gender,
      nationality: input.nationality,
      age,
      role: input.role,
      expertise: input.expertise,
      personality: input.personality,
    }

    const prompt = buildProfileImagePrompt(promptInput)
    const qualityGuard = buildQualityEnhancement()
    const fullPrompt = `${prompt}. ${qualityGuard}`

    console.log(
      `[ImageGen] Generating profile image for ${input.nationality} ${input.gender}, age ${age}`
    )

    const result = await generateImageWithFlux({
      prompt: fullPrompt,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    })

    if (!result) {
      console.warn("[ImageGen] FLUX.2 returned null — skipping profile image")
      return null
    }

    // CDN URL에서 이미지를 다운로드하여 로컬 저장
    const localUrl = await downloadAndSaveImage(result.imageUrl)

    console.log(`[ImageGen] Profile image saved: ${localUrl}`)
    return { profileImageUrl: localUrl, model: result.model }
  } catch (error) {
    console.error("[ImageGen] Profile image generation failed:", error)
    return null
  }
}
