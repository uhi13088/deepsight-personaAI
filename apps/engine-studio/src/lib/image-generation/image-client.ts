// ═══════════════════════════════════════════════════════════════
// 이미지 생성 클라이언트 — fal.ai (우선) + Replicate (fallback)
// T440: FLUX.2 [pro] via 듀얼 프로바이더
// ═══════════════════════════════════════════════════════════════

import { fal } from "@fal-ai/client"
import Replicate from "replicate"

// ── 프로바이더 설정 확인 ──────────────────────────────────────

export type ImageProvider = "fal" | "replicate"

/**
 * 사용 가능한 이미지 생성 프로바이더를 우선순위 순으로 반환.
 * fal.ai 우선, Replicate fallback.
 */
export function getAvailableProviders(): ImageProvider[] {
  const providers: ImageProvider[] = []
  if (process.env.FAL_KEY) providers.push("fal")
  if (process.env.REPLICATE_API_TOKEN) providers.push("replicate")
  return providers
}

/**
 * 이미지 생성 API가 하나라도 설정되어 있는지 확인
 */
export function isImageGenerationConfigured(): boolean {
  return !!(process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN)
}

// ── 공통 타입 ─────────────────────────────────────────────────

export interface ImageGenerationInput {
  prompt: string
  width?: number
  height?: number
}

export interface ImageGenerationOutput {
  /** 생성된 이미지 URL (CDN) */
  imageUrl: string
  /** 사용된 프로바이더 */
  provider: ImageProvider
  /** 사용된 모델 ID */
  model: string
}

// ── fal.ai 클라이언트 ─────────────────────────────────────────

const FAL_FLUX2_PRO = "fal-ai/flux-pro/v1.1" as const

interface FalFluxOutput {
  images: Array<{ url: string; content_type: string }>
}

async function generateWithFal(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  fal.config({ credentials: process.env.FAL_KEY })

  const result = await fal.subscribe(FAL_FLUX2_PRO, {
    input: {
      prompt: input.prompt,
      image_size: {
        width: input.width ?? 1024,
        height: input.height ?? 1024,
      },
      safety_tolerance: "2",
    },
  })

  const data = result.data as unknown as FalFluxOutput | undefined
  const imageUrl = data?.images?.[0]?.url
  if (!imageUrl) {
    throw new Error("[fal] No image URL in response")
  }

  console.log(`[ImageGen] fal.ai FLUX.2 generated: ${imageUrl.substring(0, 80)}...`)
  return { imageUrl, provider: "fal", model: FAL_FLUX2_PRO }
}

// ── Replicate 클라이언트 ──────────────────────────────────────

const REPLICATE_FLUX2_PRO = "black-forest-labs/flux-1.1-pro" as const

let replicateInstance: Replicate | null = null

function getReplicateClient(): Replicate {
  if (!replicateInstance) {
    replicateInstance = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  }
  return replicateInstance
}

async function generateWithReplicate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  const client = getReplicateClient()

  const output = await client.run(REPLICATE_FLUX2_PRO, {
    input: {
      prompt: input.prompt,
      width: input.width ?? 1024,
      height: input.height ?? 1024,
      prompt_upsampling: true,
      safety_tolerance: 2,
    },
  })

  // Replicate는 문자열, 배열, 또는 {url} 객체로 반환
  let imageUrl: string | null = null
  if (typeof output === "string") {
    imageUrl = output
  } else if (Array.isArray(output) && typeof output[0] === "string") {
    imageUrl = output[0]
  } else if (output && typeof output === "object" && "url" in (output as Record<string, unknown>)) {
    imageUrl = (output as Record<string, string>).url
  }

  if (!imageUrl) {
    throw new Error(`[Replicate] Unexpected output format: ${JSON.stringify(output)}`)
  }

  console.log(`[ImageGen] Replicate FLUX.2 generated: ${imageUrl.substring(0, 80)}...`)
  return { imageUrl, provider: "replicate", model: REPLICATE_FLUX2_PRO }
}

// ── 통합 생성 함수 (fal 우선 → Replicate fallback) ────────────

const PROVIDER_FNS: Record<
  ImageProvider,
  (input: ImageGenerationInput) => Promise<ImageGenerationOutput>
> = {
  fal: generateWithFal,
  replicate: generateWithReplicate,
}

/**
 * FLUX.2 [pro]로 이미지를 생성합니다.
 * fal.ai를 우선 시도하고, 실패 시 Replicate로 fallback.
 * 모든 프로바이더가 실패하면 null 반환.
 */
export async function generateImageWithFlux(
  input: ImageGenerationInput
): Promise<ImageGenerationOutput | null> {
  const providers = getAvailableProviders()
  if (providers.length === 0) return null

  for (const provider of providers) {
    try {
      return await PROVIDER_FNS[provider](input)
    } catch (error) {
      console.warn(`[ImageGen] ${provider} failed:`, error)
      // 다음 프로바이더로 fallback
    }
  }

  console.error("[ImageGen] All providers failed")
  return null
}
