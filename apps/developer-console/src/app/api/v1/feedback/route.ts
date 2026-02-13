import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import type { FeedbackType } from "@/generated/prisma"

// ============================================================================
// Types
// ============================================================================

const VALID_FEEDBACK_TYPES = ["LIKE", "DISLIKE"] as const
type FeedbackInput = (typeof VALID_FEEDBACK_TYPES)[number]

function mapFeedbackToEnum(feedback: FeedbackInput): FeedbackType {
  return feedback as FeedbackType
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
// POST /api/v1/feedback — v3 피드백 전송 (스펙 §9.3.4)
// ============================================================================

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { user_id, persona_id, feedback_type, content_id, comment } = body

    // Validate user_id
    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_USER_ID",
            message: "user_id is required and must be a string",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate persona_id
    if (!persona_id || typeof persona_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PERSONA_ID",
            message: "persona_id is required and must be a string",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate feedback_type
    if (!feedback_type || !VALID_FEEDBACK_TYPES.includes(feedback_type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FEEDBACK_TYPE",
            message: `feedback_type must be one of: ${VALID_FEEDBACK_TYPES.join(", ")}`,
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate comment (optional)
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_COMMENT",
              message: "comment must be a string",
            },
            meta: { request_id: requestId },
          },
          {
            status: 400,
            headers: getRateLimitHeaders(validation.apiKey),
          }
        )
      }
      if (comment.length > 1000) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "COMMENT_TOO_LONG",
              message: "comment must not exceed 1000 characters",
            },
            meta: { request_id: requestId },
          },
          {
            status: 400,
            headers: getRateLimitHeaders(validation.apiKey),
          }
        )
      }
    }

    // Verify persona exists
    const persona = await prisma.persona.findUnique({
      where: { id: persona_id },
      select: { id: true, name: true },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PERSONA_NOT_FOUND",
            message: `Persona with id '${persona_id}' not found`,
          },
          meta: { request_id: requestId },
        },
        {
          status: 404,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Create a match result entry to associate feedback with
    const matchResult = await prisma.matchResult.create({
      data: {
        requestId: `feedback_${requestId}`,
        userId: user_id,
        personaId: persona_id,
        matchingTier: "BASIC",
        overallScore: null,
        context: content_id ? { content_id } : undefined,
        processingTimeMs: 0,
      },
    })

    // Create feedback
    const newFeedback = await prisma.matchFeedback.create({
      data: {
        matchResultId: matchResult.id,
        feedback: mapFeedbackToEnum(feedback_type),
        comment: comment || null,
      },
    })

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/feedback",
      200,
      processingTime,
      { user_id, persona_id, feedback_type },
      { feedback_id: newFeedback.id }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          feedback_id: newFeedback.id,
          processed: true,
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
    console.error("Feedback API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while submitting feedback",
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
