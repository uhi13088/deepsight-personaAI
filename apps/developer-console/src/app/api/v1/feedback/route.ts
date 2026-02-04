import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import type { FeedbackType } from "@prisma/client"

// ============================================================================
// Types
// ============================================================================

const VALID_FEEDBACK_TYPES = ["positive", "negative", "neutral"] as const
type FeedbackInput = (typeof VALID_FEEDBACK_TYPES)[number]

function mapFeedbackToEnum(feedback: FeedbackInput): FeedbackType {
  const mapping: Record<FeedbackInput, FeedbackType> = {
    positive: "POSITIVE",
    negative: "NEGATIVE",
    neutral: "NEUTRAL",
  }
  return mapping[feedback]
}

// ============================================================================
// POST /api/v1/feedback - Submit feedback for a match result
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
          request_id: requestId,
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { match_id, feedback, comment } = body

    // Validate match_id
    if (!match_id || typeof match_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MATCH_ID",
            message: "match_id is required and must be a string",
          },
          request_id: requestId,
        },
        { status: 400 }
      )
    }

    // Validate feedback
    if (!feedback || !VALID_FEEDBACK_TYPES.includes(feedback)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FEEDBACK",
            message: `feedback must be one of: ${VALID_FEEDBACK_TYPES.join(", ")}`,
          },
          request_id: requestId,
        },
        { status: 400 }
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
            request_id: requestId,
          },
          { status: 400 }
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
            request_id: requestId,
          },
          { status: 400 }
        )
      }
    }

    // Find the match result by requestId
    const matchResult = await prisma.matchResult.findFirst({
      where: { requestId: match_id },
      include: {
        feedback: true,
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!matchResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MATCH_NOT_FOUND",
            message: "Match result not found with the given match_id",
          },
          request_id: requestId,
        },
        { status: 404 }
      )
    }

    // Check if feedback already exists for this match
    if (matchResult.feedback) {
      // Update existing feedback
      const updatedFeedback = await prisma.matchFeedback.update({
        where: { id: matchResult.feedback.id },
        data: {
          feedback: mapFeedbackToEnum(feedback),
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
        { match_id, feedback, comment: comment ? "[provided]" : null },
        { feedback_id: updatedFeedback.id, action: "updated" }
      )

      return NextResponse.json({
        success: true,
        request_id: requestId,
        data: {
          feedback_id: updatedFeedback.id,
          match_id,
          persona_id: matchResult.persona.id,
          persona_name: matchResult.persona.name,
          feedback,
          comment: comment || null,
          updated_at: updatedFeedback.createdAt.toISOString(),
        },
        meta: {
          action: "updated",
          processing_time_ms: processingTime,
        },
      })
    }

    // Create new feedback
    const newFeedback = await prisma.matchFeedback.create({
      data: {
        matchResultId: matchResult.id,
        feedback: mapFeedbackToEnum(feedback),
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
      201,
      processingTime,
      { match_id, feedback, comment: comment ? "[provided]" : null },
      { feedback_id: newFeedback.id, action: "created" }
    )

    return NextResponse.json(
      {
        success: true,
        request_id: requestId,
        data: {
          feedback_id: newFeedback.id,
          match_id,
          persona_id: matchResult.persona.id,
          persona_name: matchResult.persona.name,
          feedback,
          comment: comment || null,
          created_at: newFeedback.createdAt.toISOString(),
        },
        meta: {
          action: "created",
          processing_time_ms: processingTime,
        },
      },
      { status: 201 }
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
        request_id: requestId,
        processing_time_ms: processingTime,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/v1/feedback - Get feedback for a match result
// ============================================================================

export async function GET(request: NextRequest) {
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
          request_id: requestId,
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get("match_id")

    // Validate match_id
    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_MATCH_ID",
            message: "match_id query parameter is required",
          },
          request_id: requestId,
        },
        { status: 400 }
      )
    }

    // Find the match result with feedback
    const matchResult = await prisma.matchResult.findFirst({
      where: { requestId: matchId },
      include: {
        feedback: true,
        persona: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!matchResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MATCH_NOT_FOUND",
            message: "Match result not found with the given match_id",
          },
          request_id: requestId,
        },
        { status: 404 }
      )
    }

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/feedback",
      200,
      processingTime,
      { match_id: matchId },
      { has_feedback: !!matchResult.feedback }
    )

    if (!matchResult.feedback) {
      return NextResponse.json({
        success: true,
        request_id: requestId,
        data: null,
        meta: {
          match_id: matchId,
          has_feedback: false,
          processing_time_ms: processingTime,
        },
      })
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      data: {
        feedback_id: matchResult.feedback.id,
        match_id: matchId,
        persona_id: matchResult.persona.id,
        persona_name: matchResult.persona.name,
        feedback: matchResult.feedback.feedback.toLowerCase(),
        comment: matchResult.feedback.comment,
        created_at: matchResult.feedback.createdAt.toISOString(),
      },
      meta: {
        has_feedback: true,
        processing_time_ms: processingTime,
      },
    })
  } catch (error) {
    console.error("Feedback GET API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching feedback",
        },
        request_id: requestId,
        processing_time_ms: processingTime,
      },
      { status: 500 }
    )
  }
}
