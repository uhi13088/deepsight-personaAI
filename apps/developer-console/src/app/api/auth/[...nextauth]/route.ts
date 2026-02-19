import { NextRequest, NextResponse } from "next/server"
import { handlers } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request)
  } catch (error) {
    console.error("[Auth] GET /api/auth/session error:", error)
    // Return valid JSON so SessionProvider doesn't crash
    return NextResponse.json(
      { error: "Internal auth error", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request)
  } catch (error) {
    console.error("[Auth] POST /api/auth error:", error)
    return NextResponse.json(
      { error: "Internal auth error", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
