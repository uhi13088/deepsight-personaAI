import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

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
// GET /api/v1/users/:id/profile — v3 사용자 프로필 (스펙 §9.3.5)
// ============================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = "req_" + crypto.randomBytes(12).toString("hex")
  const startTime = Date.now()

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

    // Fetch user vector
    const userVector = await prisma.userVector.findUnique({
      where: { userId },
    })

    if (!userVector) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
          meta: { request_id: requestId },
        },
        {
          status: 404,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Check third_party_sharing consent
    const thirdPartyConsent = await prisma.userConsent.findUnique({
      where: {
        userId_organizationId_consentType: {
          userId,
          organizationId: validation.apiKey.organizationId,
          consentType: "THIRD_PARTY_SHARING",
        },
      },
    })

    if (!thirdPartyConsent?.granted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONSENT_REQUIRED",
            message: "User has not consented to third-party data sharing",
          },
          meta: { request_id: requestId },
        },
        {
          status: 403,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Fetch all consents
    const consents = await prisma.userConsent.findMany({
      where: {
        userId,
        organizationId: validation.apiKey.organizationId,
      },
    })

    // Build consent map
    const consentMap: Record<string, boolean> = {
      data_collection: false,
      sns_analysis: false,
      third_party_sharing: false,
      marketing: false,
    }
    let lastConsentUpdate: string | null = null
    for (const c of consents) {
      const key = c.consentType.toLowerCase()
      consentMap[key] = c.granted
      if (c.updatedAt) {
        const ts = c.updatedAt.toISOString()
        if (!lastConsentUpdate || ts > lastConsentUpdate) {
          lastConsentUpdate = ts
        }
      }
    }

    // Build vector response
    const vector: Record<string, unknown> = {
      l1_social: {
        depth: Number(userVector.depth),
        lens: Number(userVector.lens),
        stance: Number(userVector.stance),
        scope: Number(userVector.scope),
        taste: Number(userVector.taste),
        purpose: Number(userVector.purpose),
        sociability: Number(userVector.sociability),
      },
      l2_temperament:
        userVector.openness !== null
          ? {
              openness: Number(userVector.openness),
              conscientiousness: Number(userVector.conscientiousness),
              extraversion: Number(userVector.extraversion),
              agreeableness: Number(userVector.agreeableness),
              neuroticism: Number(userVector.neuroticism),
            }
          : null,
      has_l2: userVector.hasOceanProfile,
    }

    // Count feedback and match results
    const feedbackCount = await prisma.matchFeedback.count({
      where: {
        matchResult: { userId },
      },
    })

    const data = {
      user_id: userId,
      archetype: userVector.archetype,
      onboarding_level: userVector.onboardingLevel,
      profile_quality: userVector.profileQuality,
      vector,
      confidence_scores: userVector.confidenceScores || null,
      cross_axes: userVector.crossAxes || null,
      consent: {
        ...consentMap,
        last_updated: lastConsentUpdate,
      },
      feedback_count: feedbackCount,
      precision_estimate: null, // Computed by engine
      created_at: userVector.createdAt.toISOString(),
      updated_at: userVector.updatedAt.toISOString(),
    }

    const latencyMs = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      `/api/v1/users/${userId}/profile`,
      200,
      latencyMs,
      { userId },
      { found: true }
    )

    return NextResponse.json(
      {
        success: true,
        data,
        meta: {
          request_id: requestId,
          processing_time_ms: latencyMs,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("User Profile API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching user profile",
        },
        meta: { request_id: requestId },
      },
      { status: 500 }
    )
  }
}
