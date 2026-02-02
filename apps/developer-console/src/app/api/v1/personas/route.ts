import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// GET /api/v1/personas - List all available personas
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const perPage = Math.min(parseInt(searchParams.get("per_page") || "10"), 100)
    const category = searchParams.get("category")

    // Mock personas data
    const allPersonas = [
      {
        id: "persona_tech_innovator",
        name: "Tech Innovator",
        category: "Technology",
        description: "Early adopters who embrace cutting-edge technology and innovation.",
        dimensions: {
          depth: 0.85,
          lens: 0.9,
          stance: 0.8,
          scope: 0.95,
          taste: 0.75,
          purpose: 0.88,
        },
        created_at: "2024-01-15T00:00:00Z",
      },
      {
        id: "persona_early_adopter",
        name: "Early Adopter",
        category: "Consumer",
        description: "Users who quickly adopt new products and services before the mainstream.",
        dimensions: {
          depth: 0.7,
          lens: 0.85,
          stance: 0.82,
          scope: 0.78,
          taste: 0.88,
          purpose: 0.75,
        },
        created_at: "2024-01-15T00:00:00Z",
      },
      {
        id: "persona_budget_conscious",
        name: "Budget Conscious",
        category: "Finance",
        description:
          "Value-oriented consumers who prioritize cost-effectiveness in their decisions.",
        dimensions: {
          depth: 0.6,
          lens: 0.65,
          stance: 0.9,
          scope: 0.55,
          taste: 0.7,
          purpose: 0.85,
        },
        created_at: "2024-01-16T00:00:00Z",
      },
      {
        id: "persona_quality_seeker",
        name: "Quality Seeker",
        category: "Premium",
        description: "Consumers who prioritize quality and craftsmanship over price.",
        dimensions: {
          depth: 0.88,
          lens: 0.82,
          stance: 0.75,
          scope: 0.7,
          taste: 0.95,
          purpose: 0.8,
        },
        created_at: "2024-01-17T00:00:00Z",
      },
      {
        id: "persona_eco_warrior",
        name: "Eco Warrior",
        category: "Sustainability",
        description: "Environmentally conscious consumers who prioritize sustainable choices.",
        dimensions: {
          depth: 0.78,
          lens: 0.88,
          stance: 0.92,
          scope: 0.85,
          taste: 0.72,
          purpose: 0.95,
        },
        created_at: "2024-01-18T00:00:00Z",
      },
      {
        id: "persona_convenience_seeker",
        name: "Convenience Seeker",
        category: "Lifestyle",
        description: "Users who value ease of use and time-saving features.",
        dimensions: {
          depth: 0.5,
          lens: 0.6,
          stance: 0.65,
          scope: 0.45,
          taste: 0.8,
          purpose: 0.7,
        },
        created_at: "2024-01-19T00:00:00Z",
      },
      {
        id: "persona_social_influencer",
        name: "Social Influencer",
        category: "Social",
        description: "Users who are active on social media and influence others' decisions.",
        dimensions: {
          depth: 0.65,
          lens: 0.92,
          stance: 0.78,
          scope: 0.88,
          taste: 0.9,
          purpose: 0.72,
        },
        created_at: "2024-01-20T00:00:00Z",
      },
      {
        id: "persona_security_focused",
        name: "Security Focused",
        category: "Technology",
        description: "Users who prioritize privacy and security in their technology choices.",
        dimensions: {
          depth: 0.92,
          lens: 0.75,
          stance: 0.88,
          scope: 0.6,
          taste: 0.55,
          purpose: 0.9,
        },
        created_at: "2024-01-21T00:00:00Z",
      },
    ]

    // Filter by category if provided
    const filteredPersonas = category
      ? allPersonas.filter((p) => p.category.toLowerCase() === category.toLowerCase())
      : allPersonas

    // Paginate
    const total = filteredPersonas.length
    const offset = (page - 1) * perPage
    const personas = filteredPersonas.slice(offset, offset + perPage)

    return NextResponse.json({
      request_id: requestId,
      personas,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error("Personas API error:", error)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching personas",
          request_id: requestId,
        },
      },
      { status: 500 }
    )
  }
}
