// ═══════════════════════════════════════════════════════════════
// 프로필 이미지 생성기
// T441: FLUX.2 [pro]로 포토리얼리스틱 프로필 이미지 자동 생성
// T445: 스토리지를 로컬 → Cloudflare R2로 전환
// ═══════════════════════════════════════════════════════════════

import {
  isImageGenerationConfigured,
  generateImageWithFlux,
} from "@/lib/image-generation/image-client"
import {
  buildProfileImagePrompt,
  buildQualityEnhancement,
  type ProfileImagePromptInput,
} from "@/lib/image-generation/prompt-builder"
import { isR2Configured, uploadImageToR2 } from "@/lib/image-generation/r2-storage"

// ── 설정 ──────────────────────────────────────────────────────

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
  /** R2 공개 URL (예: https://r2-public-url/profile-images/2026/03/17/{uuid}.webp) */
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

// ── 메인 함수 ─────────────────────────────────────────────────

/**
 * 페르소나 demographics로 포토리얼리스틱 프로필 이미지를 생성하고 로컬에 저장.
 * API 키 미설정이거나 생성 실패 시 null 반환 (파이프라인 중단 없음).
 */
export async function generateProfileImage(
  input: GenerateProfileImageInput
): Promise<GenerateProfileImageResult | null> {
  if (!isImageGenerationConfigured()) {
    console.log(
      "[ImageGen] Skipping — no image generation API configured (FAL_KEY / REPLICATE_API_TOKEN)"
    )
    return null
  }

  if (!isR2Configured()) {
    console.log(
      "[ImageGen] Skipping — R2 storage not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL)"
    )
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

    // FLUX CDN URL → R2 업로드
    const r2Result = await uploadImageToR2(result.imageUrl)

    console.log(`[ImageGen] Profile image uploaded to R2: ${r2Result.publicUrl}`)
    return { profileImageUrl: r2Result.publicUrl, model: result.model }
  } catch (error) {
    console.error("[ImageGen] Profile image generation failed:", error)
    return null
  }
}
