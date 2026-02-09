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
          requestId,
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { matchId, feedback, comment } = body

    // Validate matchId
    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MATCH_ID",
            message: "matchId is required and must be a string",
          },
          requestId,
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
          requestId,
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
            requestId,
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
            requestId,
          },
          { status: 400 }
        )
      }
    }

    // Find the match result by requestId
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
            message: "Match result not found with the given matchId",
          },
          requestId,
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
        { matchId, feedback, comment: comment ? "[provided]" : null },
        { feedbackId: updatedFeedback.id, action: "updated" }
      )

      return NextResponse.json({
        success: true,
        requestId,
        data: {
          feedbackId: updatedFeedback.id,
          matchId,
          personaId: matchResult.persona.id,
          personaName: matchResult.persona.name,
          feedback,
          comment: comment || null,
          updatedAt: updatedFeedback.createdAt.toISOString(),
        },
        meta: {
          action: "updated",
          processingTimeMs: processingTime,
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
      { matchId, feedback, comment: comment ? "[provided]" : null },
      { feedbackId: newFeedback.id, action: "created" }
    )

    return NextResponse.json(
      {
        success: true,
        requestId,
        data: {
          feedbackId: newFeedback.id,
          matchId,
          personaId: matchResult.persona.id,
          personaName: matchResult.persona.name,
          feedback,
          comment: comment || null,
          createdAt: newFeedback.createdAt.toISOString(),
        },
        meta: {
          action: "created",
          processingTimeMs: processingTime,
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
        requestId,
        processingTimeMs: processingTime,
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
          requestId,
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get("matchId")

    // Validate matchId
    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_MATCH_ID",
            message: "matchId query parameter is required",
          },
          requestId,
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
            message: "Match result not found with the given matchId",
          },
          requestId,
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
      { matchId },
      { hasFeedback: !!matchResult.feedback }
    )

    if (!matchResult.feedback) {
      return NextResponse.json({
        success: true,
        requestId,
        data: null,
        meta: {
          matchId,
          hasFeedback: false,
          processingTimeMs: processingTime,
        },
      })
    }

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        feedbackId: matchResult.feedback.id,
        matchId,
        personaId: matchResult.persona.id,
        personaName: matchResult.persona.name,
        feedback: matchResult.feedback.feedback.toLowerCase(),
        comment: matchResult.feedback.comment,
        createdAt: matchResult.feedback.createdAt.toISOString(),
      },
      meta: {
        hasFeedback: true,
        processingTimeMs: processingTime,
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
        requestId,
        processingTimeMs: processingTime,
      },
      { status: 500 }
    )
  }
}
