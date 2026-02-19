import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import type { CoreTemperamentVector } from "@/types"
import {
  OCEAN_L1_MAPPINGS,
  REVERSAL_THRESHOLD,
  predictL1FromL2,
  detectReversals,
  extractLatentTraits,
} from "@/lib/user-insight/psychometric"
import type {
  PsychometricMapping,
  ReversalDetection,
  LatentTrait,
} from "@/lib/user-insight/psychometric"
import type { SocialDimension } from "@/types"

// ── Response types ──────────────────────────────────────────────

interface PsychometricConfigResponse {
  mappings: PsychometricMapping[]
  reversalThreshold: number
}

// ── GET: Return psychometric config (mappings + threshold) ──────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    return NextResponse.json<ApiResponse<PsychometricConfigResponse>>({
      success: true,
      data: {
        mappings: OCEAN_L1_MAPPINGS,
        reversalThreshold: REVERSAL_THRESHOLD,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "심리측정 설정 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Compute predictions / reversals / latent traits ───────

interface PsychometricPostRequest {
  action: "predict_l1" | "detect_reversals" | "extract_latent_traits"
  // For predict_l1
  l2?: CoreTemperamentVector
  // For detect_reversals and extract_latent_traits
  explicit?: Record<string, number>
  implicit?: Record<string, number>
}

interface PredictL1Response {
  predictedL1: Partial<Record<SocialDimension, number>>
}

interface ReversalResponse {
  reversals: ReversalDetection[]
}

interface LatentTraitsResponse {
  latentTraits: LatentTrait[]
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as PsychometricPostRequest

    if (body.action === "predict_l1") {
      if (!body.l2) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "L2 벡터가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const predictedL1 = predictL1FromL2(body.l2)

      return NextResponse.json<ApiResponse<PredictL1Response>>({
        success: true,
        data: { predictedL1 },
      })
    }

    if (body.action === "detect_reversals") {
      if (!body.explicit || !body.implicit) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "explicit/implicit 점수가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const reversals = detectReversals(body.explicit, body.implicit)

      return NextResponse.json<ApiResponse<ReversalResponse>>({
        success: true,
        data: { reversals },
      })
    }

    if (body.action === "extract_latent_traits") {
      if (!body.explicit || !body.implicit) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "explicit/implicit 점수가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const latentTraits = extractLatentTraits(body.explicit, body.implicit)

      return NextResponse.json<ApiResponse<LatentTraitsResponse>>({
        success: true,
        data: { latentTraits },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message:
            "유효한 action이 필요합니다: predict_l1, detect_reversals, extract_latent_traits",
        },
      },
      { status: 400 }
    )
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "심리측정 분석 실패" },
      },
      { status: 500 }
    )
  }
}
