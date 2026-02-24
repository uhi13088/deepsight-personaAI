import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import { computeVectorsFromApiResponses } from "@deepsight/vector-core"
import type { OnboardingApiResponse } from "@deepsight/vector-core"

// ============================================================================
// Types & Constants
// ============================================================================

const ONBOARDING_LEVELS = {
  QUICK: { minResponses: 12, label: "QUICK" },
  STANDARD: { minResponses: 30, label: "STANDARD" },
  DEEP: { minResponses: 60, label: "DEEP" },
} as const

type OnboardingLevel = keyof typeof ONBOARDING_LEVELS

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

    // Compute vectors from responses (delegated to @deepsight/vector-core)
    const apiResponses: OnboardingApiResponse[] = (
      responses as {
        question_id: string
        answer: string | number
        target_dimensions?: string[]
        l1_weights?: Record<string, number>
        l2_weights?: Record<string, number>
      }[]
    ).map((r) => ({
      question_id: r.question_id,
      answer: r.answer,
      target_dimensions: r.target_dimensions,
      l1_weights: r.l1_weights,
      l2_weights: r.l2_weights,
    }))
    const { l1, l2, hasL2 } = computeVectorsFromApiResponses(apiResponses)
    const profileQuality =
      onboardingLevel === "DEEP"
        ? ("ADVANCED" as const)
        : onboardingLevel === "STANDARD"
          ? ("STANDARD" as const)
          : ("BASIC" as const)

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
