import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { validateApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import {
  validateFilterRequest,
  executePersonaFilter,
  getRateLimitHeaders,
  type FilterRequest,
} from "@/lib/services/persona-filter-service"

// ── POST /api/v1/personas/filter — v3 다차원 필터 (스펙 §9.3.9) ──

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
    const body: FilterRequest = await request.json()
    const { filters = {} } = body

    // Validate filters
    const validationError = validateFilterRequest(body)
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Execute filter
    const result = await executePersonaFilter(body)
    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/personas/filter",
      200,
      processingTime,
      {
        filters_count: Object.keys(filters).length,
        page: result.meta.pagination.current_page,
        limit: result.meta.pagination.total_count,
      },
      { total_matched: result.data.filterStats.totalMatched }
    )

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        meta: {
          request_id: requestId,
          pagination: result.meta.pagination,
          processing_time_ms: processingTime,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Persona Filter API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while filtering personas",
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
