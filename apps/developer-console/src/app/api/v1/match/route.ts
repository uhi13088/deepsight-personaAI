import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// POST /api/v1/match - Match content to personas
export async function POST(request: NextRequest) {
  const startTime = Date.now()
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

    const apiKey = authHeader.replace("Bearer ", "")
    if (!apiKey.startsWith("pk_live_") && !apiKey.startsWith("pk_test_")) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_API_KEY",
            message: "Invalid API key format",
            request_id: requestId,
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { content, options = {} } = body

    // Validate content
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CONTENT",
            message: "Content is required and must be a string",
            request_id: requestId,
          },
        },
        { status: 400 }
      )
    }

    if (content.length < 10) {
      return NextResponse.json(
        {
          error: {
            code: "CONTENT_TOO_SHORT",
            message: "Content must be at least 10 characters",
            request_id: requestId,
          },
        },
        { status: 400 }
      )
    }

    if (content.length > 10000) {
      return NextResponse.json(
        {
          error: {
            code: "CONTENT_TOO_LONG",
            message: "Content must not exceed 10,000 characters",
            request_id: requestId,
          },
        },
        { status: 400 }
      )
    }

    const limit = Math.min(Math.max(options.limit || 5, 1), 20)
    const threshold = Math.max(Math.min(options.threshold || 0.0, 1.0), 0.0)
    const includeScores = options.include_scores !== false

    // Persona matching - will be connected to the actual 6D vector matching engine
    // Currently returns empty results as the matching engine is not yet configured
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unusedVars = { limit, threshold, includeScores }

    const matches: {
      persona_id: string
      name: string
      category: string
      score: number
      dimensions?: {
        depth: number
        lens: number
        stance: number
        scope: number
        taste: number
        purpose: number
      }
    }[] = []

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      request_id: requestId,
      matches,
      metadata: {
        content_length: content.length,
        matches_found: matches.length,
        threshold_applied: threshold,
        processing_time_ms: processingTime,
      },
    })
  } catch (error) {
    console.error("Match API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing the match request",
          request_id: requestId,
        },
        processing_time_ms: processingTime,
      },
      { status: 500 }
    )
  }
}
