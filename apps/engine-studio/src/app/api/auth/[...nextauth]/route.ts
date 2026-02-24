import { NextRequest, NextResponse } from "next/server"
import { handlers } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request)
  } catch (error) {
    console.error("[Auth] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal auth error" } },
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal auth error" } },
      { status: 500 }
    )
  }
}
