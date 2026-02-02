import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Email and password are required" } },
        { status: 400 }
      )
    }

    // TODO: Implement actual authentication logic
    // For now, return a mock response
    const mockUser = {
      id: "user_abc123",
      email,
      name: "Developer",
      organizations: [
        {
          id: "org_xyz789",
          name: "Acme Corp",
          role: "OWNER",
        },
      ],
    }

    const mockToken = "mock_jwt_token_" + Date.now()

    return NextResponse.json({
      user: mockUser,
      token: mockToken,
      expiresIn: 3600 * 24 * 7, // 7 days
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An error occurred during login" } },
      { status: 500 }
    )
  }
}
