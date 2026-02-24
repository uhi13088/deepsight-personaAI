import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

// ============================================================================
// Types & Constants
// ============================================================================

const ONBOARDING_LEVELS = {
  QUICK: { minResponses: 12, label: "QUICK" },
  STANDARD: { minResponses: 30, label: "STANDARD" },
  DEEP: { minResponses: 60, label: "DEEP" },
} as const

type OnboardingLevel = keyof typeof ONBOARDING_LEVELS

interface OnboardingResponse {
  question_id: string
  answer: string | number
  target_dimensions?: string[]
  /** Structured L1 weights from question option (e.g. {"depth": 0.25, "lens": -0.15}) */
  l1_weights?: Record<string, number>
  /** Structured L2 weights from question option (e.g. {"openness": 0.2}) */
  l2_weights?: Record<string, number>
}

// ============================================================================
// Rate Limit Helpers
// ============================================================================

function getRateLimitHeaders(apiKey: ValidatedApiKey) {
  const limit = apiKey.rateLimit
  const resetTime = Math.floor(Date.now() / 60000) * 60 + 60
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, limit - 1)),
    "X-RateLimit-Reset": String(resetTime),
  }
}

// ============================================================================
// Vector computation from onboarding responses
// ============================================================================

const L1_DIMS = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
const L2_DIMS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}

/**
 * Compute L1 + L2 vectors from onboarding responses.
 *
 * 설계서 §9.2:
 * - l1_weights / l2_weights가 제공되면: base(0.5)에 delta 누적 후 clamp
 * - target_dimensions만 제공되면: 기존 heuristic (하위 호환)
 * - STANDARD/DEEP 레벨에서 l2_weights가 제공되면 L2 벡터도 생성
 */
function computeVectorFromResponses(
  responses: OnboardingResponse[],
  level: OnboardingLevel
): {
  l1: Record<string, number>
  l2: Record<string, number> | null
  hasL2: boolean
  profileQuality: "BASIC" | "STANDARD" | "ADVANCED"
} {
  // Initialize base vectors (neutral 0.5)
  const l1: Record<string, number> = {}
  const l2: Record<string, number> = {}
  const l1Delta: Record<string, number> = {}
  const l2Delta: Record<string, number> = {}
  const l1Counts: Record<string, number> = {}
  let hasStructuredL1 = false
  let hasL2Data = false

  for (const dim of L1_DIMS) {
    l1[dim] = 0.5
    l1Delta[dim] = 0
    l1Counts[dim] = 0
  }
  for (const dim of L2_DIMS) {
    l2[dim] = 0.5
    l2Delta[dim] = 0
  }

  for (const resp of responses) {
    // Structured weights path: use l1_weights/l2_weights from question options
    if (resp.l1_weights) {
      hasStructuredL1 = true
      for (const [dim, weight] of Object.entries(resp.l1_weights)) {
        if (L1_DIMS.includes(dim as (typeof L1_DIMS)[number])) {
          l1Delta[dim] = (l1Delta[dim] ?? 0) + weight
        }
      }
    } else if (resp.target_dimensions) {
      // Legacy path: simple heuristic (backward compat)
      const dims = resp.target_dimensions
      for (const dim of dims) {
        if (L1_DIMS.includes(dim as (typeof L1_DIMS)[number])) {
          const val =
            typeof resp.answer === "number" ? resp.answer : resp.answer === "A" ? 0.3 : 0.7
          l1[dim] = (l1[dim] * l1Counts[dim] + val) / (l1Counts[dim] + 1)
          l1Counts[dim]++
        }
      }
    }

    // L2 weights (only from structured weights)
    if (resp.l2_weights) {
      hasL2Data = true
      for (const [dim, weight] of Object.entries(resp.l2_weights)) {
        if (L2_DIMS.includes(dim as (typeof L2_DIMS)[number])) {
          l2Delta[dim] = (l2Delta[dim] ?? 0) + weight
        }
      }
    }
  }

  // Apply structured L1 deltas (base 0.5 + accumulated delta)
  if (hasStructuredL1) {
    for (const dim of L1_DIMS) {
      l1[dim] = clamp(0.5 + l1Delta[dim])
    }
  }

  // Apply L2 deltas
  const l2Result: Record<string, number> | null = hasL2Data ? {} : null
  if (hasL2Data && l2Result) {
    for (const dim of L2_DIMS) {
      l2Result[dim] = clamp(0.5 + l2Delta[dim])
    }
  }

  const profileQuality = level === "DEEP" ? "ADVANCED" : level === "STANDARD" ? "STANDARD" : "BASIC"

  return { l1, l2: l2Result, hasL2: hasL2Data, profileQuality }
}

// ============================================================================
// POST /api/v1/users/:id/onboarding — v3 온보딩 (스펙 §9.3.6)
// ============================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const requestId = "req_" + crypto.randomBytes(12).toString("hex")

  try {
    // Validate API key
    const validation = await validateApiKey(request)
    if (!validation.valid || !validation.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: validation.error?.code || "UNAUTHORIZED",
            message: validation.error?.message || "Invalid API key",
          },
          meta: { request_id: requestId },
        },
        { status: 401 }
      )
    }

    const { id: userId } = await params

    // Parse request body
    const body = await request.json()
    const { level, responses, consent } = body

    // Validate level
    if (!level || !ONBOARDING_LEVELS[level as OnboardingLevel]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FIELD",
            message: "level must be one of: QUICK, STANDARD, DEEP",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    const onboardingLevel = level as OnboardingLevel

    // Validate responses
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FIELD",
            message: "responses is required and must be an array",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    const minResponses = ONBOARDING_LEVELS[onboardingLevel].minResponses
    if (responses.length < minResponses) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FIELD",
            message: `${onboardingLevel} requires minimum ${minResponses} responses`,
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate consent
    if (!consent || !consent.data_collection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FIELD",
            message: "consent.data_collection is required",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Check for existing user vector (conflict)
    const existingVector = await prisma.userVector.findUnique({
      where: { userId },
    })

    if (existingVector) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "User already completed onboarding. Use daily check instead",
          },
          meta: { request_id: requestId },
        },
        {
          status: 409,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Compute vectors from responses
    const { l1, l2, hasL2, profileQuality } = computeVectorFromResponses(
      responses as OnboardingResponse[],
      onboardingLevel
    )

    // Create user vector (L1 + optional L2)
    const userVector = await prisma.userVector.create({
      data: {
        userId,
        organizationId: validation.apiKey.organizationId,
        onboardingLevel: onboardingLevel,
        depth: l1.depth,
        lens: l1.lens,
        stance: l1.stance,
        scope: l1.scope,
        taste: l1.taste,
        purpose: l1.purpose,
        sociability: l1.sociability,
        ...(hasL2 && l2
          ? {
              openness: l2.openness,
              conscientiousness: l2.conscientiousness,
              extraversion: l2.extraversion,
              agreeableness: l2.agreeableness,
              neuroticism: l2.neuroticism,
              hasOceanProfile: true,
            }
          : {}),
        profileQuality,
      },
    })

    // Store consent records
    const consentTypes = [
      { type: "DATA_COLLECTION" as const, granted: !!consent.data_collection },
      { type: "SNS_ANALYSIS" as const, granted: !!consent.sns_analysis },
      { type: "THIRD_PARTY_SHARING" as const, granted: !!consent.third_party_sharing },
      { type: "MARKETING" as const, granted: !!consent.marketing },
    ]

    for (const ct of consentTypes) {
      if (ct.granted) {
        await prisma.userConsent.upsert({
          where: {
            userId_organizationId_consentType: {
              userId,
              organizationId: validation.apiKey.organizationId,
              consentType: ct.type,
            },
          },
          create: {
            userId,
            organizationId: validation.apiKey.organizationId,
            consentType: ct.type,
            granted: true,
            grantedAt: new Date(),
            version: "2.0",
          },
          update: {
            granted: true,
            grantedAt: new Date(),
            version: "2.0",
          },
        })
      }
    }

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      `/api/v1/users/${userId}/onboarding`,
      200,
      processingTime,
      { userId, level: onboardingLevel, responses_count: responses.length },
      { profile_quality: profileQuality }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id: userId,
          archetype: userVector.archetype,
          vector_updated: true,
          profile_quality: profileQuality,
          vector: {
            l1_social: l1,
            l2_temperament: l2,
          },
          precision_estimate: hasL2
            ? onboardingLevel === "DEEP"
              ? 0.93
              : onboardingLevel === "STANDARD"
                ? 0.8
                : 0.65
            : onboardingLevel === "DEEP"
              ? 0.75
              : onboardingLevel === "STANDARD"
                ? 0.62
                : 0.45,
          next_steps: {
            daily_check_available: true,
            sns_connection_suggested: true,
            suggested_sns: ["instagram", "spotify"],
          },
        },
        meta: {
          request_id: requestId,
          processing_time_ms: processingTime,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Onboarding API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing onboarding",
        },
        meta: {
          request_id: requestId,
          processing_time_ms: processingTime,
        },
      },
      { status: 500 }
    )
  }
}
