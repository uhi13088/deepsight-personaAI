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
}

// ============================================================================
// Vector Utilities (same as match API)
// ============================================================================

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

function analyzeContent(content: string): PersonaVector {
  const lowerContent = content.toLowerCase()
  const wordCount = content.split(/\s+/).length
  const sentenceCount = content.split(/[.!?]+/).filter(Boolean).length

  const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1)
  const depth = Math.min(1, Math.max(0, (avgWordsPerSentence - 5) / 25))

  const subjectiveWords = ["i think", "i feel", "personally", "opinion", "believe", "seems"]
  const subjectiveCount = subjectiveWords.filter((w) => lowerContent.includes(w)).length
  const lens = Math.min(1, subjectiveCount / 3)

  const progressiveWords = ["innovation", "future", "new", "change", "disrupt", "modern"]
  const conservativeWords = ["traditional", "proven", "stable", "established", "classic"]
  const progressiveCount = progressiveWords.filter((w) => lowerContent.includes(w)).length
  const conservativeCount = conservativeWords.filter((w) => lowerContent.includes(w)).length
  const stance =
    progressiveCount + conservativeCount > 0
      ? progressiveCount / (progressiveCount + conservativeCount)
      : 0.5

  const socialWords = ["community", "society", "everyone", "people", "world", "global"]
  const individualWords = ["personal", "individual", "myself", "my own", "private"]
  const socialCount = socialWords.filter((w) => lowerContent.includes(w)).length
  const individualCount = individualWords.filter((w) => lowerContent.includes(w)).length
  const scope =
    socialCount + individualCount > 0 ? socialCount / (socialCount + individualCount) : 0.5

  const nicheWords = ["exclusive", "artisan", "boutique", "niche", "specialized", "unique"]
  const mainstreamWords = ["popular", "mainstream", "common", "standard", "typical"]
  const nicheCount = nicheWords.filter((w) => lowerContent.includes(w)).length
  const mainstreamCount = mainstreamWords.filter((w) => lowerContent.includes(w)).length
  const taste = nicheCount + mainstreamCount > 0 ? nicheCount / (nicheCount + mainstreamCount) : 0.5

  const infoWords = ["data", "facts", "statistics", "research", "study", "analysis"]
  const emotionWords = ["feel", "love", "hate", "amazing", "terrible", "excited", "beautiful"]
  const infoCount = infoWords.filter((w) => lowerContent.includes(w)).length
  const emotionCount = emotionWords.filter((w) => lowerContent.includes(w)).length
  const purpose = infoCount + emotionCount > 0 ? emotionCount / (infoCount + emotionCount) : 0.5

  return { depth, lens, stance, scope, taste, purpose }
}

// ============================================================================
// POST /api/v1/batch-match - Batch match multiple contents to personas
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
    const { contents, options = {} } = body

    // Validate contents
    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONTENTS",
            message: "contents is required and must be an array",
          },
          requestId,
        },
        { status: 400 }
      )
    }

    if (contents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_CONTENTS",
            message: "contents array must not be empty",
          },
          requestId,
        },
        { status: 400 }
      )
    }

    if (contents.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_CONTENTS",
            message: "contents array must not exceed 100 items",
          },
          requestId,
        },
        { status: 400 }
      )
    }

    // Validate each content
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i]
      if (typeof content !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_CONTENT",
              message: `content at index ${i} must be a string`,
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
              message: `content at index ${i} must be at least 10 characters`,
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
              message: `content at index ${i} must not exceed 10,000 characters`,
            },
            requestId,
          },
          { status: 400 }
        )
      }
    }

    const limit = Math.min(Math.max(options.limit || 5, 1), 20)
    const threshold = Math.max(Math.min(options.threshold || 0.0, 1.0), 0.0)

    // Fetch all active personas once
    const personas = await prisma.persona.findMany({
      where: { active: true },
    })

    // Process each content
    const results = contents.map((content: string) => {
      const contentVector = analyzeContent(content)

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
          }
        })
        .filter((m: MatchResult) => m.score >= threshold)
        .sort((a: MatchResult, b: MatchResult) => b.score - a.score)
        .slice(0, limit)

      return {
        content: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
        matches,
      }
    })

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/batch-match",
      200,
      processingTime,
      { contents_count: contents.length, limit, threshold },
      { results_count: results.length }
    )

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        results,
      },
      meta: {
        totalContents: contents.length,
        limit,
        thresholdApplied: threshold,
        processingTimeMs: processingTime,
      },
    })
  } catch (error) {
    console.error("Batch Match API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing the batch match request",
        },
        requestId,
        processingTimeMs: processingTime,
      },
      { status: 500 }
    )
  }
}
