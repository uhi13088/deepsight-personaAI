import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"

// ============================================================================
// GET /api/dashboard/alerts - Get dashboard alerts
// ============================================================================

export async function GET(_request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  // TODO: Implement real alert fetching from DB
  return NextResponse.json({
    success: true,
    data: [],
  })
}

// ============================================================================
// PATCH /api/dashboard/alerts/:id - Mark alert as read
// ============================================================================

export async function PATCH(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { read } = body as { read: boolean }

    // TODO: Implement real alert update
    return NextResponse.json({
      success: true,
      data: { read },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "잘못된 요청입니다." } },
      { status: 400 }
    )
  }
}
