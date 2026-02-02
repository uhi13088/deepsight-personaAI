import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// POST /api/v1/feedback - Submit feedback for a match result
export async function POST(request: NextRequest) {
  const requestId = "req_" + crypto.randomBytes(12).toString("hex")

  try {
    // Validate API key from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid Authorization header",
            request_id: requestId,
          },
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
          error: {
            code: "INVALID_MATCH_ID",
            message: "match_id is required and must be a string",
            request_id: requestId,
          },
        },
        { status: 400 }
      )
    }

    // Validate feedback
    const validFeedback = ["positive", "negative", "neutral"]
    if (!feedback || !validFeedback.includes(feedback)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FEEDBACK",
            message: `feedback must be one of: ${validFeedback.join(", ")}`,
            request_id: requestId,
          },
        },
        { status: 400 }
      )
    }

    // Validate comment (optional)
    if (comment && (typeof comment !== "string" || comment.length > 1000)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_COMMENT",
            message: "comment must be a string with max 1000 characters",
            request_id: requestId,
          },
        },
        { status: 400 }
      )
    }

    // Mock feedback submission
    const feedbackId = "fb_" + crypto.randomBytes(12).toString("hex")

    return NextResponse.json(
      {
        request_id: requestId,
        feedback_id: feedbackId,
        match_id,
        feedback,
        comment: comment || null,
        message: "Feedback submitted successfully",
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Feedback API error:", error)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while submitting feedback",
          request_id: requestId,
        },
      },
      { status: 500 }
    )
  }
}
