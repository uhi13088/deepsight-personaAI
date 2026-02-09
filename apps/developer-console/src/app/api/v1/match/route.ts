import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import type { PersonaVector } from "@deepsight/shared-types"
import type { Persona } from "@prisma/client"

type MatchResult = {
  personaId: string
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
}

// ============================================================================
// Vector Utilities
// ============================================================================

/**
 * Calculate cosine similarity between two 6D vectors
 */
function cosineSimilarity(v1: PersonaVector, v2: PersonaVector): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  for (const dim of dimensions) {
    dotProduct += v1[dim] * v2[dim]
    magnitude1 += v1[dim] ** 2
    magnitude2 += v2[dim] ** 2
  }

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  return dotProduct / (magnitude1 * magnitude2)
}

/**
 * Simple content analysis to extract a 6D vector
 * This is a heuristic-based approach - in production, you might use ML models
 */
function analyzeContent(content: string): PersonaVector {
  const lowerContent = content.toLowerCase()
  const wordCount = content.split(/\s+/).length
  const sentenceCount = content.split(/[.!?]+/).filter(Boolean).length

  // Depth: Longer, more detailed content = higher depth
  const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1)
  const depth = Math.min(1, Math.max(0, (avgWordsPerSentence - 5) / 25))

  // Lens: Presence of subjective language
  const subjectiveWords = ["i think", "i feel", "personally", "opinion", "believe", "seems"]
  const subjectiveCount = subjectiveWords.filter((w) => lowerContent.includes(w)).length
  const lens = Math.min(1, subjectiveCount / 3)

  // Stance: Forward-looking vs traditional language
  const progressiveWords = ["innovation", "future", "new", "change", "disrupt", "modern"]
  const conservativeWords = ["traditional", "proven", "stable", "established", "classic"]
  const progressiveCount = progressiveWords.filter((w) => lowerContent.includes(w)).length
  const conservativeCount = conservativeWords.filter((w) => lowerContent.includes(w)).length
  const stance =
    progressiveCount + conservativeCount > 0
      ? progressiveCount / (progressiveCount + conservativeCount)
      : 0.5

  // Scope: Social vs individual focus
  const socialWords = ["community", "society", "everyone", "people", "world", "global"]
  const individualWords = ["personal", "individual", "myself", "my own", "private"]
  const socialCount = socialWords.filter((w) => lowerContent.includes(w)).length
  const individualCount = individualWords.filter((w) => lowerContent.includes(w)).length
  const scope =
    socialCount + individualCount > 0 ? socialCount / (socialCount + individualCount) : 0.5

  // Taste: Niche vs mainstream indicators
  const nicheWords = ["exclusive", "artisan", "boutique", "niche", "specialized", "unique"]
  const mainstreamWords = ["popular", "mainstream", "common", "standard", "typical"]
  const nicheCount = nicheWords.filter((w) => lowerContent.includes(w)).length
  const mainstreamCount = mainstreamWords.filter((w) => lowerContent.includes(w)).length
  const taste = nicheCount + mainstreamCount > 0 ? nicheCount / (nicheCount + mainstreamCount) : 0.5

  // Purpose: Information vs emotion
  const infoWords = ["data", "facts", "statistics", "research", "study", "analysis"]
  const emotionWords = ["feel", "love", "hate", "amazing", "terrible", "excited", "beautiful"]
  const infoCount = infoWords.filter((w) => lowerContent.includes(w)).length
  const emotionCount = emotionWords.filter((w) => lowerContent.includes(w)).length
  const purpose = infoCount + emotionCount > 0 ? emotionCount / (infoCount + emotionCount) : 0.5

  return { depth, lens, stance, scope, taste, purpose }
}

// POST /api/v1/match - Match content to personas
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
    const { content, options = {} } = body

    // Validate content
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONTENT",
            message: "Content is required and must be a string",
          },
          requestId,
        },
        { status: 400 }
      )
    }

    if (content.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_TOO_SHORT",
            message: "Content must be at least 10 characters",
          },
          requestId,
        },
        { status: 400 }
      )
    }

    if (content.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_TOO_LONG",
            message: "Content must not exceed 10,000 characters",
          },
          requestId,
        },
        { status: 400 }
      )
    }

    const limit = Math.min(Math.max(options.limit || 5, 1), 20)
    const threshold = Math.max(Math.min(options.threshold || 0.0, 1.0), 0.0)
    const includeScores = options.includeScores !== false

    // Analyze content to get a content vector
    const contentVector = analyzeContent(content)

    // Fetch all active personas
    const personas = await prisma.persona.findMany({
      where: { active: true },
    })

    // Calculate similarity scores
    const matches = personas
      .map((persona: Persona) => {
        const personaVector: PersonaVector = {
          depth: Number(persona.depth),
          lens: Number(persona.lens),
          stance: Number(persona.stance),
          scope: Number(persona.scope),
          taste: Number(persona.taste),
          purpose: Number(persona.purpose),
        }

        const score = cosineSimilarity(contentVector, personaVector)

        return {
          personaId: persona.id,
          name: persona.name,
          category: persona.category || "General",
          score: Math.round(score * 1000) / 1000,
          dimensions: includeScores
            ? {
                depth:
                  Math.round(Math.abs(contentVector.depth - personaVector.depth) * 1000) / 1000,
                lens: Math.round(Math.abs(contentVector.lens - personaVector.lens) * 1000) / 1000,
                stance:
                  Math.round(Math.abs(contentVector.stance - personaVector.stance) * 1000) / 1000,
                scope:
                  Math.round(Math.abs(contentVector.scope - personaVector.scope) * 1000) / 1000,
                taste:
                  Math.round(Math.abs(contentVector.taste - personaVector.taste) * 1000) / 1000,
                purpose:
                  Math.round(Math.abs(contentVector.purpose - personaVector.purpose) * 1000) / 1000,
              }
            : undefined,
        }
      })
      .filter((m: MatchResult) => m.score >= threshold)
      .sort((a: MatchResult, b: MatchResult) => b.score - a.score)
      .slice(0, limit)

    const processingTime = Date.now() - startTime

    // Store match results in database
    const contentHash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 32)

    // Store top match in database (async, don't await)
    if (matches.length > 0) {
      prisma.matchResult
        .create({
          data: {
            requestId,
            content: content.slice(0, 5000), // Truncate for storage
            contentHash,
            personaId: matches[0].personaId,
            score: matches[0].score,
            depthScore: matches[0].dimensions?.depth,
            lensScore: matches[0].dimensions?.lens,
            stanceScore: matches[0].dimensions?.stance,
            scopeScore: matches[0].dimensions?.scope,
            tasteScore: matches[0].dimensions?.taste,
            purposeScore: matches[0].dimensions?.purpose,
            processingTimeMs: processingTime,
          },
        })
        .catch((err: Error) => console.error("Failed to store match result:", err))
    }

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/match",
      200,
      processingTime,
      { content_length: content.length, limit, threshold },
      { matches_found: matches.length }
    )

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        matches,
        contentVector: includeScores ? contentVector : undefined,
      },
      meta: {
        contentLength: content.length,
        matchesFound: matches.length,
        thresholdApplied: threshold,
        processingTimeMs: processingTime,
      },
    })
  } catch (error) {
    console.error("Match API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing the match request",
        },
        requestId,
        processingTimeMs: processingTime,
      },
      { status: 500 }
    )
  }
}
