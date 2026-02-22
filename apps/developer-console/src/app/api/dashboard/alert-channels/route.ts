import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"

interface AlertChannelConfig {
  email: boolean
  slack: boolean
  webhook: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

const DEFAULT_CONFIG: AlertChannelConfig = {
  email: true,
  slack: false,
  webhook: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
}

function isValidTimeString(t: unknown): boolean {
  if (typeof t !== "string") return false
  return /^\d{2}:\d{2}$/.test(t)
}

// ============================================================================
// GET /api/dashboard/alert-channels - Get alert channel configuration
// NOTE: AlertChannel preferences require a schema migration to persist.
//       Until then, this endpoint returns the default config.
// ============================================================================

export async function GET(_request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  return NextResponse.json({
    success: true,
    data: DEFAULT_CONFIG,
  })
}

// ============================================================================
// PUT /api/dashboard/alert-channels - Update alert channel configuration
// NOTE: Persistence requires a schema migration (no AlertChannel model yet).
//       Input is validated and echoed back.
// ============================================================================

export async function PUT(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()

    // Validate booleans
    const boolFields = ["email", "slack", "webhook", "quietHoursEnabled"] as const
    for (const field of boolFields) {
      if (field in body && typeof body[field] !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: `${field}은(는) boolean이어야 합니다.` },
          },
          { status: 400 }
        )
      }
    }

    // Validate time strings
    if ("quietHoursStart" in body && !isValidTimeString(body.quietHoursStart)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "quietHoursStart 형식이 잘못되었습니다. (HH:MM)",
          },
        },
        { status: 400 }
      )
    }
    if ("quietHoursEnd" in body && !isValidTimeString(body.quietHoursEnd)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "quietHoursEnd 형식이 잘못되었습니다. (HH:MM)" },
        },
        { status: 400 }
      )
    }

    const config: AlertChannelConfig = {
      email: typeof body.email === "boolean" ? body.email : DEFAULT_CONFIG.email,
      slack: typeof body.slack === "boolean" ? body.slack : DEFAULT_CONFIG.slack,
      webhook: typeof body.webhook === "boolean" ? body.webhook : DEFAULT_CONFIG.webhook,
      quietHoursEnabled:
        typeof body.quietHoursEnabled === "boolean"
          ? body.quietHoursEnabled
          : DEFAULT_CONFIG.quietHoursEnabled,
      quietHoursStart: isValidTimeString(body.quietHoursStart)
        ? body.quietHoursStart
        : DEFAULT_CONFIG.quietHoursStart,
      quietHoursEnd: isValidTimeString(body.quietHoursEnd)
        ? body.quietHoursEnd
        : DEFAULT_CONFIG.quietHoursEnd,
    }

    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "잘못된 요청입니다." } },
      { status: 400 }
    )
  }
}
