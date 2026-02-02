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

    // Mock persona matching - in production, this would use the 6D vector system
    const mockPersonas = [
      {
        id: "persona_tech_innovator",
        name: "Tech Innovator",
        category: "Technology",
        description: "Early adopters who embrace cutting-edge technology",
      },
      {
        id: "persona_early_adopter",
        name: "Early Adopter",
        category: "Consumer",
        description: "Users who quickly adopt new products and services",
      },
      {
        id: "persona_budget_conscious",
        name: "Budget Conscious",
        category: "Finance",
        description: "Value-oriented consumers who prioritize cost-effectiveness",
      },
      {
        id: "persona_quality_seeker",
        name: "Quality Seeker",
        category: "Premium",
        description: "Consumers who prioritize quality over price",
      },
      {
        id: "persona_eco_warrior",
        name: "Eco Warrior",
        category: "Sustainability",
        description: "Environmentally conscious consumers",
      },
    ]

    // Generate mock scores with 6D dimensions
    const matches = mockPersonas
      .slice(0, limit)
      .map((persona, index) => {
        const baseScore = 0.95 - index * 0.08 + (Math.random() * 0.05 - 0.025)
        const score = Math.max(Math.min(baseScore, 1.0), 0.0)

        const dimensions = {
          depth: Math.random() * 0.3 + 0.7,
          lens: Math.random() * 0.3 + 0.7,
          stance: Math.random() * 0.3 + 0.7,
          scope: Math.random() * 0.3 + 0.7,
          taste: Math.random() * 0.3 + 0.7,
          purpose: Math.random() * 0.3 + 0.7,
        }

        return {
          persona_id: persona.id,
          name: persona.name,
          category: persona.category,
          score: Math.round(score * 1000) / 1000,
          ...(includeScores && {
            dimensions: {
              depth: Math.round(dimensions.depth * 1000) / 1000,
              lens: Math.round(dimensions.lens * 1000) / 1000,
              stance: Math.round(dimensions.stance * 1000) / 1000,
              scope: Math.round(dimensions.scope * 1000) / 1000,
              taste: Math.round(dimensions.taste * 1000) / 1000,
              purpose: Math.round(dimensions.purpose * 1000) / 1000,
            },
          }),
        }
      })
      .filter((match) => match.score >= threshold)
      .sort((a, b) => b.score - a.score)

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
