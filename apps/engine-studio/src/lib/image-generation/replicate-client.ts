// ═══════════════════════════════════════════════════════════════
// Replicate API 클라이언트 — FLUX.2 [pro] 이미지 생성
// T440: 싱글턴 클라이언트 + graceful degradation
// ═══════════════════════════════════════════════════════════════

import Replicate from "replicate"

// ── 싱글턴 ────────────────────────────────────────────────────

let replicateInstance: Replicate | null = null

function getReplicateClient(): Replicate | null {
  if (replicateInstance) return replicateInstance

  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    console.warn("[ImageGen] REPLICATE_API_TOKEN not set — image generation disabled")
    return null
  }

  replicateInstance = new Replicate({ auth: token })
  return replicateInstance
}

/**
 * Replicate API가 사용 가능한지 확인
 */
export function isImageGenerationConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN
}

// ── FLUX.2 [pro] 모델 호출 ────────────────────────────────────

const FLUX2_PRO_MODEL = "black-forest-labs/flux-1.1-pro" as const

export interface ImageGenerationInput {
  prompt: string
  width?: number
  height?: number
  /** 프롬프트 일치도 (기본 3.5) */
  guidanceScale?: number
}

export interface ImageGenerationOutput {
  /** 생성된 이미지 URL (Replicate CDN) */
  imageUrl: string
  /** 모델 ID */
  model: string
}

/**
 * FLUX.2 [pro] via Replicate로 이미지 생성
 * @returns 생성된 이미지 URL 또는 null (실패/미설정 시)
 */
export async function generateImageWithFlux(
  input: ImageGenerationInput
): Promise<ImageGenerationOutput | null> {
  const client = getReplicateClient()
  if (!client) return null

  try {
    const output = await client.run(FLUX2_PRO_MODEL, {
      input: {
        prompt: input.prompt,
        width: input.width ?? 1024,
        height: input.height ?? 1024,
        prompt_upsampling: true,
        safety_tolerance: 2,
      },
    })

    // Replicate는 단일 이미지 URL을 문자열로 반환하거나 배열로 반환
    let imageUrl: string | null = null
    if (typeof output === "string") {
      imageUrl = output
    } else if (Array.isArray(output) && typeof output[0] === "string") {
      imageUrl = output[0]
    } else if (
      output &&
      typeof output === "object" &&
      "url" in (output as Record<string, unknown>)
    ) {
      imageUrl = (output as Record<string, string>).url
    }

    if (!imageUrl) {
      console.error("[ImageGen] Unexpected FLUX output format:", output)
      return null
    }

    console.log(`[ImageGen] FLUX.2 image generated: ${imageUrl.substring(0, 80)}...`)
    return { imageUrl, model: FLUX2_PRO_MODEL }
  } catch (error) {
    console.error("[ImageGen] FLUX.2 generation failed:", error)
    return null
  }
}
