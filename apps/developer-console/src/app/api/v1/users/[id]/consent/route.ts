import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

// ============================================================================
// Constants
// ============================================================================

const VALID_CONSENT_TYPES = [
  "data_collection",
  "sns_analysis",
  "third_party_sharing",
  "marketing",
] as const
const CURRENT_CONSENT_VERSION = "v2.0"

const CONSENT_LABELS: Record<string, { label: string; description: string; required: boolean }> = {
  data_collection: {
    label: "프로필 데이터 수집 및 분석",
    description: "콘텐츠 추천을 위한 성향 데이터 수집·분석에 동의합니다.",
    required: true,
  },
  sns_analysis: {
    label: "SNS 연동 데이터 분석",
    description: "연동된 SNS 활동 데이터를 성향 분석에 활용하는 것에 동의합니다.",
    required: false,
  },
  third_party_sharing: {
    label: "제3자 데이터 제공",
    description: "파트너 플랫폼에 익명화된 성향 데이터를 제공하는 것에 동의합니다.",
    required: false,
  },
  marketing: {
    label: "마케팅 활용",
    description: "맞춤형 콘텐츠 추천 및 프로모션 알림 수신에 동의합니다.",
    required: false,
  },
}

function consentTypeToEnum(
  type: string
): "DATA_COLLECTION" | "SNS_ANALYSIS" | "THIRD_PARTY_SHARING" | "MARKETING" {
  return type.toUpperCase() as
    | "DATA_COLLECTION"
    | "SNS_ANALYSIS"
    | "THIRD_PARTY_SHARING"
    | "MARKETING"
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
// GET /api/v1/users/:id/consent — v3 동의 조회 (스펙 §9.3.10)
// ============================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = "req_" + crypto.randomBytes(12).toString("hex")
  const startTime = Date.now()

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

    const { id: userId } = await params

    // Fetch consents
    const consents = await prisma.userConsent.findMany({
      where: {
        userId,
        organizationId: validation.apiKey.organizationId,
      },
    })

    // Build consent list with all 4 types
    const consentMap = new Map(consents.map((c) => [c.consentType, c]))

    let lastUpdated: string | null = null
    const consentList = VALID_CONSENT_TYPES.map((type) => {
      const enumType = consentTypeToEnum(type)
      const record = consentMap.get(enumType)
      const meta = CONSENT_LABELS[type]

      if (record?.updatedAt) {
        const ts = record.updatedAt.toISOString()
        if (!lastUpdated || ts > lastUpdated) lastUpdated = ts
      }

      return {
        type,
        label: meta.label,
        description: meta.description,
        required: meta.required,
        granted: record?.granted ?? false,
        granted_at: record?.grantedAt?.toISOString() ?? null,
        expires_at: null, // SNS analysis gets 1-year expiry in production
      }
    })

    const latencyMs = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      `/api/v1/users/${userId}/consent`,
      200,
      latencyMs,
      { userId },
      { consents_count: consents.length }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id: userId,
          consents: consentList,
          consent_version: CURRENT_CONSENT_VERSION,
          last_updated: lastUpdated,
        },
        meta: {
          request_id: requestId,
          processing_time_ms: latencyMs,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Consent GET API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching consent status",
        },
        meta: { request_id: requestId },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/v1/users/:id/consent — v3 동의 생성/변경 (스펙 §9.3.11)
// ============================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: userId } = await params

    // Parse request body
    const body = await request.json()
    const { consents, consent_version } = body

    // Validate consent_version
    if (!consent_version || consent_version !== CURRENT_CONSENT_VERSION) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FIELD",
            message: `consent_version "${consent_version || ""}" is outdated. Current: "${CURRENT_CONSENT_VERSION}"`,
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate consents array
    if (!consents || !Array.isArray(consents) || consents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FIELD",
            message: "consents is required and must be a non-empty array",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate each consent item
    for (const item of consents) {
      if (!(VALID_CONSENT_TYPES as readonly string[]).includes(item.type)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_FIELD",
              message: `consent type "${item.type}" is not valid`,
            },
            meta: { request_id: requestId },
          },
          {
            status: 400,
            headers: getRateLimitHeaders(validation.apiKey),
          }
        )
      }

      if (typeof item.granted !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_FIELD",
              message: `granted must be a boolean for type "${item.type}"`,
            },
            meta: { request_id: requestId },
          },
          {
            status: 400,
            headers: getRateLimitHeaders(validation.apiKey),
          }
        )
      }

      // Cannot revoke required consent (data_collection)
      if (item.type === "data_collection" && !item.granted) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_REQUEST",
              message: "data_collection cannot be revoked while active. Use DELETE /v1/users/{id}",
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

    // Process consent updates
    const now = new Date()
    const updated: Array<{ type: string; granted: boolean; granted_at: string }> = []
    const sideEffects: Record<string, unknown> = {}

    for (const item of consents) {
      const enumType = consentTypeToEnum(item.type)

      await prisma.userConsent.upsert({
        where: {
          userId_organizationId_consentType: {
            userId,
            organizationId: validation.apiKey.organizationId,
            consentType: enumType,
          },
        },
        create: {
          userId,
          organizationId: validation.apiKey.organizationId,
          consentType: enumType,
          granted: item.granted,
          grantedAt: item.granted ? now : null,
          revokedAt: item.granted ? null : now,
          version: CURRENT_CONSENT_VERSION,
        },
        update: {
          granted: item.granted,
          grantedAt: item.granted ? now : undefined,
          revokedAt: item.granted ? null : now,
          version: CURRENT_CONSENT_VERSION,
        },
      })

      updated.push({
        type: item.type,
        granted: item.granted,
        granted_at: now.toISOString(),
      })

      // Determine side effects
      if (item.type === "sns_analysis") {
        sideEffects.sns_analysis_enabled = item.granted
        if (item.granted) {
          sideEffects.l2_vector_generation_queued = true
          sideEffects.profile_quality_upgrade = "STANDARD → ADVANCED"
        } else {
          sideEffects.l2_vector_deleted = true
        }
      }

      if (item.type === "third_party_sharing") {
        sideEffects.external_api_access = item.granted ? "enabled" : "blocked"
      }
    }

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      `/api/v1/users/${userId}/consent`,
      200,
      processingTime,
      { userId, consent_count: consents.length },
      { updated_count: updated.length }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id: userId,
          updated,
          consent_version: CURRENT_CONSENT_VERSION,
          side_effects: Object.keys(sideEffects).length > 0 ? sideEffects : null,
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
    console.error("Consent POST API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while updating consent",
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
