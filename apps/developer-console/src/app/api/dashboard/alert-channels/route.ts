import { NextRequest, NextResponse } from "next/server"

// ============================================================================
// GET /api/dashboard/alert-channels - Get alert channel configuration
// ============================================================================

export async function GET(_request: NextRequest) {
  // TODO: Implement real alert channel config from DB
  return NextResponse.json({
    success: true,
    data: {
      email: true,
      slack: false,
      webhook: false,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    },
  })
}

// ============================================================================
// PUT /api/dashboard/alert-channels - Update alert channel configuration
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const config = await request.json()

    // TODO: Implement real alert channel config persistence
    return NextResponse.json({
      success: true,
      data: config,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "잘못된 요청입니다." } },
      { status: 400 }
    )
  }
}
