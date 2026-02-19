import { NextRequest, NextResponse } from "next/server"
import { handlers } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request)
  } catch (error) {
    console.error("[Auth] GET error:", error)
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
    console.error("[Auth] POST error:", error)
    return NextResponse.json(
      { error: "Internal auth error", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
